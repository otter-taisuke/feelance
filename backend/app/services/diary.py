import os
import json
import textwrap
import logging
from datetime import datetime
from typing import Generator, Iterable, List, Optional
from uuid import uuid4

import pandas as pd
from fastapi import HTTPException
from openai import OpenAI
from dotenv import load_dotenv

from app.constants.mood import get_mood_label
from app.repositories.csv_store import append_chat_log, read_chat_log, read_diary, read_transactions, write_diary
from app.schemas.diary import ChatMessage, DiaryEntry, GenerateDiaryResponse
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


def _load_chat_messages(tx_id: str, user_id: str) -> List[ChatMessage]:
    """CSVからチャット履歴をロードし、user/assistantのみを返す。"""
    df = read_chat_log(tx_id, user_id)
    if df.empty:
        return []
    try:
        raw = json.loads(df.iloc[-1]["messages_json"])
        if not isinstance(raw, list):
            return []
    except Exception:
        return []

    messages: List[ChatMessage] = []
    for m in raw:
        try:
            role = m.get("role")
            content = m.get("content")
        except Exception:
            continue
        if role not in ("user", "assistant"):
            # systemなどはUIには返さない
            continue
        if not isinstance(content, str):
            continue
        messages.append(ChatMessage(role=role, content=content))
    return messages


def _build_conversation_history_text(event, messages: Iterable[ChatMessage]) -> str:
    """イベント情報 + 会話ログを1本のテキストにまとめる（生成用のみ）。"""
    lines = []
    # イベント情報を先頭に付ける
    try:
        event_date = getattr(event, "date", None) or (event.get("date") if isinstance(event, dict) else None)
        event_item = getattr(event, "item", None) or (event.get("item") if isinstance(event, dict) else None)
        event_amount = getattr(event, "amount", None) or (event.get("amount") if isinstance(event, dict) else None)
        event_mood = getattr(event, "mood_score", None) or (event.get("mood_score") if isinstance(event, dict) else None)
        event_happy = getattr(event, "happy_amount", None) or (event.get("happy_amount") if isinstance(event, dict) else None)
    except Exception:
        event_date = event_item = event_amount = event_mood = event_happy = None

    lines.append("イベント情報:")
    lines.append(f"- 日付: {event_date or '不明'}")
    lines.append(f"- イベント名: {event_item or '不明'}")
    lines.append(f"- 金額: {event_amount if event_amount is not None else '不明'}")
    mood_label = get_mood_label(event_mood)
    lines.append(f"- 感情: {mood_label}")
    lines.append(f"- Happy Money: {event_happy if event_happy is not None else '不明'}")
    lines.append("")  # 区切り
    lines.append("会話ログ:")

    has_messages = False
    # 最後のメッセージがAIならそれを含めない
    messages_list = list(messages)
    if messages_list and messages_list[-1].role == "assistant":
        messages_list = messages_list[:-1]
    for idx, m in enumerate(messages_list, start=1):
        speaker = "ユーザー" if m.role == "user" else "アシスタント"
        lines.append(f"{idx}. {speaker}: {m.content}")
        has_messages = True

    if not has_messages:
        lines.append("（会話ログはまだありません）")

    print(lines)

    return "\n".join(lines)


def stream_chat(tx_id: str, messages: List[ChatMessage], user_id: str) -> Generator[str, None, None]:
    event = get_transaction(tx_id)
    mood_label = get_mood_label(event.mood_score)
    system_prompt = (
        "あなたはユーザーの日記作成を支援するアシスタントです。\n"
        "以下のイベント情報を踏まえ、あなたが主体となって質問を投げかけ、ユーザーから詳細を引き出してください。\n"
        "【やりたいこと】 以下の「出来事」と「実際の金額」「得られた価値」をもとに、ユーザー自身の感情がリアルに伝わる日記を書きたいです。\n"
        " 商品の購入場所や商品・サービスの詳しい説明などの「ハード面」の情報は不要です。\n"
        "それよりも、ユーザーの期待や落胆、もしくは感動、そしてそこから得た教訓など、**「主観的な感情のドラマ」**に焦点を当てて、魅力的な文章にしたい。\n"
        "質問は1ターンに1つのみを厳守し、分かりやすく平易な言葉を用いてください。簡単・簡潔に答えられるものにしてください。\n"
        "最終的には日記タイトルと本文を組み立てやすい情報を集めます。\n"
        "日記を生成するために十分の情報が得られた場合、その旨を伝えてください。最大でも7個の質問までにしてください"
        f"- 日付: {event.date}\n"
        f"- イベント名: {event.item}\n"
        f"- 金額: {event.amount} 円\n"
        f"- 感情: {mood_label}\n"
        f"- ユーザー自身が感じた価値: {event.happy_amount} 円\n"
    )
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
            "services/diary.py:stream_chat",
            "chat_log_append_failed",
            {"tx_id": tx_id},
        )


def get_chat_history(tx_id: str, user_id: str) -> List[ChatMessage]:
    """保存済みチャット履歴を返す。なければ空配列。"""
    return _load_chat_messages(tx_id, user_id)


def generate_diary(tx_id: str, messages: List[ChatMessage], user_id: str) -> GenerateDiaryResponse:
    event = get_transaction(tx_id)
    system_prompt = (
        "あなたはユーザーの代わりに日記を作成するアシスタントです。\n"
        "感情の変化を劇的に描いて、読んでいる人が思わず「わかる！」と共感するような日記にしてください。"
        "\nこれまでの会話を踏まえ、JSON形式で日記を作成してください。"
        '\nキーは "diary_title", "diary_body" とし、文章は日本語で書いてください。'
        "\n前置きや説明文は不要で、純粋なJSONだけを返してください。"
        "\n例: {\"diary_title\": \"日記タイトル\", \"diary_body\": \"日記本文\"}"
    )
    conversation_text = _build_conversation_history_text(event, messages)
    user_generation_prompt = f"{conversation_text}"
    generation_messages = [ChatMessage(role="user", content=user_generation_prompt)]
    formatted_messages = _format_messages(system_prompt, generation_messages)
    try:
        # region agent log
        _log_debug(
            "H1",
            "services/diary.py:generate_diary:before_call",
            "call_openai_generate",
            {"tx_id": tx_id, "messages_count": len(formatted_messages), "model": MODEL},
        )
        print(formatted_messages)
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
        "services/diary.py:generate_diary:after_call",
        "openai_response_content",
        {"tx_id": tx_id, "content_preview": content[:500]},
    )
    # endregion
    return _parse_diary_content(content)


def _parse_diary_content(content: str) -> GenerateDiaryResponse:
    # 1. 期待通りのJSON
    try:
        return GenerateDiaryResponse.model_validate_json(content)
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
                        return GenerateDiaryResponse.model_validate_json(json_body)
                    except Exception:
                        continue

    # 3. 素朴に JSON デコードを試す
    try:
        data = json.loads(content)
        if isinstance(data, dict) and ("diary_title" in data or "diary_body" in data):
            normalized = {
                "diary_title": (data.get("diary_title") or "").strip(),
                "diary_body": (data.get("diary_body") or "").strip(),
            }
            return GenerateDiaryResponse.model_validate(normalized)
        return GenerateDiaryResponse.model_validate(data)
    except Exception:
        # region agent log
        _log_debug(
            "H1",
            "services/diary.py:_parse_diary_content",
            "parse_failed",
            {"content_preview": content[:500]},
        )
        # endregion
        pass

    snippet = textwrap.shorten(content.replace("\n", " "), width=200, placeholder="...")
    raise HTTPException(
        status_code=500,
        detail="日記の生成に失敗しました。少し会話を進めてから、もう一度生成してください。",
    )


def save_diary(tx_id: str, diary_title: str, diary_body: str, user_id: str) -> dict:
    event = get_transaction(tx_id)
    now = datetime.utcnow()
    tx_date = getattr(event, "date", None)
    tx_datetime: Optional[datetime] = None
    if tx_date:
        try:
            tx_datetime = datetime.combine(tx_date, datetime.min.time())
        except Exception:
            tx_datetime = None
    df = read_diary()
    # 同一ユーザー・同一トランザクションの既存日記は上書き
    if not df.empty and "tx_id" in df.columns:
        df = df[~((df["tx_id"] == tx_id) & (df["user_id"] == user_id))]
    new_row = {
        "id": str(uuid4()),
        "tx_id": tx_id,
        "event_name": event.item,
        "diary_title": diary_title,
        "diary_body": diary_body,
        "transaction_date": tx_datetime,
        "created_at": now,
        "user_id": user_id,
    }
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    write_diary(df)
    return new_row


def _row_to_entry(row) -> DiaryEntry:
    def _to_dt(val: Optional[pd.Timestamp]) -> Optional[datetime]:
        if pd.isna(val):
            return None
        return pd.to_datetime(val).to_pydatetime()

    return DiaryEntry(
        id=row["id"],
        tx_id=row.get("tx_id", "") or "",
        event_name=row["event_name"],
        diary_title=row["diary_title"],
        diary_body=row["diary_body"],
        transaction_date=_to_dt(row.get("transaction_date")),
        created_at=_to_dt(row.get("created_at")),
        user_id=row["user_id"],
    )


def list_diaries(
    user_id: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
    tx_id: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    sentiment: Optional[int] = None,
) -> List[DiaryEntry]:
    df = read_diary()
    if df.empty:
        return []
    df = df[df["user_id"] == user_id].copy()
    if tx_id:
        df = df[df["tx_id"] == tx_id]

    # transaction_dateを優先し、なければcreated_atを基準日として使う
    df["effective_date"] = df["transaction_date"].fillna(df["created_at"])

    if year is not None:
        df = df[df["effective_date"].dt.year == int(year)]
    if month is not None:
        df = df[df["effective_date"].dt.month == int(month)]

    # 取引情報を付与して金額・感情スコアでフィルタリング
    tx_df = read_transactions()
    if not tx_df.empty:
        tx_df = tx_df[tx_df["user_id"] == user_id][["id", "amount", "mood_score"]]
        df = df.merge(tx_df, left_on="tx_id", right_on="id", how="left", suffixes=("", "_tx"))
    else:
        df["amount"] = None
        df["mood_score"] = None

    df["amount_value"] = pd.to_numeric(df.get("amount"), errors="coerce")
    df["mood_value"] = pd.to_numeric(df.get("mood_score"), errors="coerce")

    if price_min is not None:
        df = df[df["amount_value"].notna() & (df["amount_value"] >= float(price_min))]
    if price_max is not None:
        df = df[df["amount_value"].notna() & (df["amount_value"] <= float(price_max))]
    if sentiment is not None:
        df = df[df["mood_value"].notna() & (df["mood_value"] == int(sentiment))]

    if df.empty:
        return []

    df = df.sort_values(by=["effective_date", "created_at"], ascending=False)
    return [_row_to_entry(row) for _, row in df.iterrows()]
