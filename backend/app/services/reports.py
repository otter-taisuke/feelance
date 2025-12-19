import os
from datetime import datetime
from typing import Generator, Iterable, List

import pandas as pd
from fastapi import HTTPException
from openai import OpenAI
from dotenv import load_dotenv

from app.repositories.csv_store import read_reports, write_reports
from app.schemas.reports import ChatMessage, GenerateReportResponse
from app.services.transactions import get_transaction


load_dotenv()
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def _ensure_client() -> OpenAI:
    if client is None:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")
    return client


def _build_system_prompt(event: dict) -> str:
    return (
        "あなたはユーザーの日記作成を支援するアシスタントです。\n"
        "以下のイベント情報を踏まえ、あなたが主体となって質問を投げかけ、ユーザーから詳細を引き出してください。\n"
        "各ターンは必ず質問で終わり、ユーザーの回答を待って次の質問をする流れにしてください（ユーザーからの質問には回答せず、会話を主導する）。\n"
        "最終的にはレポートタイトルと本文を組み立てやすい情報を集めます。\n"
        f"- 日付: {event['date']}\n"
        f"- イベント名: {event['item']}\n"
        f"- 金額: {event['amount']} 円\n"
        f"- 感情スコア: {event['mood_score']}\n"
        f"- Happy Money: {event['happy_amount']} 円\n"
    )


def _format_messages(system_prompt: str, messages: Iterable[ChatMessage]):
    formatted = [{"role": "system", "content": system_prompt}]
    for m in messages:
        formatted.append({"role": m.role, "content": m.content})
    return formatted


def stream_chat(tx_id: str, messages: List[ChatMessage], user_id: str) -> Generator[str, None, None]:
    event = get_transaction(tx_id)
    system_prompt = _build_system_prompt(event.model_dump())
    formatted_messages = _format_messages(system_prompt, messages)
    try:
        stream = _ensure_client().chat.completions.create(
            model=MODEL,
            messages=formatted_messages,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - OpenAIエラーは上位で処理
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def generate_report(tx_id: str, messages: List[ChatMessage], user_id: str) -> GenerateReportResponse:
    event = get_transaction(tx_id)
    system_prompt = _build_system_prompt(event.model_dump()) + (
        "\nこれまでの会話を踏まえ、JSON形式で日記レポートを返してください。"
        '\nキーは "report_title", "report_body" とし、文章は日本語で書いてください。'
    )
    formatted_messages = _format_messages(system_prompt, messages)
    try:
        res = _ensure_client().chat.completions.create(
            model=MODEL,
            messages=formatted_messages,
            response_format={"type": "json_object"},
        )
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    content = res.choices[0].message.content
    try:
        data = GenerateReportResponse.model_validate_json(content)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to parse report response")
    return data


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

