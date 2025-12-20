from datetime import datetime, timedelta
from typing import Optional

import pandas as pd

from app.core.config import DATA_DIR

CACHE_FILE = DATA_DIR / "retrospective_summary_cache.csv"


def _ensure_cache_file() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    if not CACHE_FILE.exists():
        CACHE_FILE.write_text(
            "user_id,months,summary_text,generated_at\n", encoding="utf-8"
        )


def read_summary_cache(
    user_id: str, months: int, ttl: timedelta
) -> Optional[str]:
    """キャッシュされたまとめテキストを返す。期限切れならNone。"""
    _ensure_cache_file()
    df = pd.read_csv(
        CACHE_FILE,
        dtype={"user_id": str, "months": int, "summary_text": str},
        parse_dates=["generated_at"],
    )
    df = df[(df["user_id"] == user_id) & (df["months"] == int(months))]
    if df.empty:
        return None
    latest = df.sort_values(by="generated_at").iloc[-1]
    generated_at = latest["generated_at"]
    if pd.isna(generated_at):
        return None
    try:
        generated_dt = pd.to_datetime(generated_at).to_pydatetime()
    except Exception:
        return None
    if datetime.utcnow() - generated_dt > ttl:
        return None
    return str(latest["summary_text"])


def write_summary_cache(user_id: str, months: int, summary_text: str) -> None:
    _ensure_cache_file()
    now = datetime.utcnow()
    df = pd.read_csv(
        CACHE_FILE,
        dtype={"user_id": str, "months": int, "summary_text": str},
        parse_dates=["generated_at"],
    )
    new_row = {
        "user_id": user_id,
        "months": int(months),
        "summary_text": summary_text,
        "generated_at": now,
    }
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    df.to_csv(CACHE_FILE, index=False, date_format="%Y-%m-%dT%H:%M:%S")

