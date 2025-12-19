import os
import json
import textwrap
import logging
from datetime import datetime
from typing import Generator, Iterable, List

import pandas as pd
from fastapi import HTTPException
from openai import OpenAI
from dotenv import load_dotenv

from app.repositories.csv_store import append_chat_log, read_reports, write_reports
from app.schemas.reports import ChatMessage, GenerateReportResponse
from app.services.transactions import get_transaction


load_dotenv()
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
SESSION_ID = "debug-session"
RUN_ID = "run1"
logger = logging.getLogger("uvicorn.error")
logger.setLevel(logging.DEBUG)


def _ensure_client() -> OpenAI:
    if client is None:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")
    return client


def _build_system_prompt(event: dict) -> str:
    mood_label_map = {
        -2: "最悪",
        -1: "やや悪",
        0: "普通",
        1: "やや良",
        2: "最高",
    }
    mood_label = mood_label_map.get(int(event["mood_score"]), "不明")
    return (
        "あなたはユーザーの日記作成を支援するアシスタントです。\n"
        "以下のイベント情報を踏まえ、あなたが主体となって質問を投げかけ、ユーザーから詳細を引き出してください。\n"
        "各ターンは必ず質問で終わり、ユーザーの回答を待って次の質問をする流れにしてください（ユーザーからの質問には回答せず、会話を主導する）。\n"
        "最終的にはレポートタイトルと本文を組み立てやすい情報を集めます。\n"
        f"- 日付: {event['date']}\n"
        f"- イベント名: {event['item']}\n"
        f"- 金額: {event['amount']} 円\n"
        f"- 感情: {mood_label}\n"
        f"- Happy Money: {event['happy_amount']} 円\n"
    )


def _log_debug(hypothesis_id: str, location: str, message: str, data: dict) -> None:
    payload = {
        "sessionId": SESSION_ID,
        "runId": RUN_ID,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(datetime.utcnow().timestamp() * 1000),
    }
    try:
        line = json.dumps(payload, ensure_ascii=False)
        logger.debug(line)
    except Exception:
        # ログ失敗は処理を妨げない
        pass


def _format_messages(system_prompt: str, messages: Iterable[ChatMessage]):
    formatted = [{"role": "system", "content": system_prompt}]
    for m in messages:
        formatted.append({"role": m.role, "content": m.content})
    return formatted


def stream_chat(tx_id: str, messages: List[ChatMessage], user_id: str) -> Generator[str, None, None]:
    event = get_transaction(tx_id)
    system_prompt = _build_system_prompt(event.model_dump())
    formatted_messages = _format_messages(system_prompt, messages)
    assistant_chunks: List[str] = []
    try:
        stream = _ensure_client().chat.completions.create(
            model=MODEL,
            messages=formatted_messages,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                assistant_chunks.append(delta)
                yield delta
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - OpenAIエラーは上位で処理
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    assistant_content = "".join(assistant_chunks)
    # 生成されたアシスタント発話も含めて保存する
    final_messages = [*formatted_messages, {"role": "assistant", "content": assistant_content}]
    try:
        append_chat_log(
            tx_id=tx_id,
            user_id=user_id,
            messages_json=json.dumps(final_messages, ensure_ascii=False),
            created_at=datetime.utcnow(),
        )
    except Exception:
        _log_debug(
            "H2",
            "services/reports.py:stream_chat",
            "chat_log_append_failed",
            {"tx_id": tx_id},
        )


def generate_report(tx_id: str, messages: List[ChatMessage], user_id: str) -> GenerateReportResponse:
    event = get_transaction(tx_id)
    system_prompt = _build_system_prompt(event.model_dump()) + (
        "\nこれまでの会話を踏まえ、JSON形式で日記レポートを返してください。"
        '\nキーは "report_title", "report_body" とし、文章は日本語で書いてください。'
        "\n前置きや説明文は不要で、純粋なJSONだけを返してください。"
    )
    formatted_messages = _format_messages(system_prompt, messages)
    try:
        # region agent log
        _log_debug(
            "H1",
            "services/reports.py:generate_report:before_call",
            "call_openai_generate",
            {"tx_id": tx_id, "messages_count": len(formatted_messages), "model": MODEL},
        )
        # endregion
        res = _ensure_client().chat.completions.create(
            model=MODEL,
            messages=formatted_messages,
            response_format={"type": "json_object"},
        )
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    content = res.choices[0].message.content or ""
    # region agent log
    _log_debug(
        "H1",
        "services/reports.py:generate_report:after_call",
        "openai_response_content",
        {"tx_id": tx_id, "content_preview": content[:500]},
    )
    # endregion
    final_messages = [*formatted_messages, {"role": "assistant", "content": content}]
    try:
        append_chat_log(
            tx_id=tx_id,
            user_id=user_id,
            messages_json=json.dumps(final_messages, ensure_ascii=False),
            created_at=datetime.utcnow(),
        )
    except Exception:
        _log_debug(
            "H2",
            "services/reports.py:generate_report",
            "chat_log_append_failed",
            {"tx_id": tx_id},
        )
    return _parse_report_content(content)


def _parse_report_content(content: str) -> GenerateReportResponse:
    # 1. 期待通りのJSON
    try:
        return GenerateReportResponse.model_validate_json(content)
    except Exception:
        pass

    # 2. ```json ... ``` で返ってきた場合をトリム
    if "```" in content:
        parts = content.split("```")
        for i in range(len(parts)):
            chunk = parts[i].strip()
            if chunk.startswith("json"):
                json_body = "\n".join(parts[i + 1 : i + 2]).strip()
                if json_body:
                    try:
                        return GenerateReportResponse.model_validate_json(json_body)
                    except Exception:
                        continue

    # 3. 素朴に JSON デコードを試す
    try:
        data = json.loads(content)
        return GenerateReportResponse.model_validate(data)
    except Exception:
        # region agent log
        _log_debug(
            "H1",
            "services/reports.py:_parse_report_content",
            "parse_failed",
            {"content_preview": content[:500]},
        )
        # endregion
        pass

    snippet = textwrap.shorten(content.replace("\n", " "), width=200, placeholder="...")
    raise HTTPException(
        status_code=500,
        detail=f"Failed to parse report response: {snippet}",
    )


def save_report(tx_id: str, report_title: str, report_body: str, user_id: str) -> dict:
    event = get_transaction(tx_id)
    now = datetime.utcnow()
    df = read_reports()
    new_row = {
        "event_name": event.item,
        "report_title": report_title,
        "report_body": report_body,
        "created_at": now,
        "user_id": user_id,
    }
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    write_reports(df)
    return new_row

