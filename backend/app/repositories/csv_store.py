from pathlib import Path
from datetime import datetime
from uuid import uuid4

import pandas as pd

from app.core.config import DATA_DIR

USERS_FILE = DATA_DIR / "users.csv"
TX_FILE = DATA_DIR / "transactions.csv"
DIARY_FILE = DATA_DIR / "diary.csv"
CHAT_FILE = DATA_DIR / "chat.csv"


def ensure_data_files() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    if not USERS_FILE.exists():
        USERS_FILE.write_text("user_id,display_name\n", encoding="utf-8")
    if not TX_FILE.exists():
        TX_FILE.write_text(
            "id,user_id,date,item,amount,mood_score,happy_amount,created_at,updated_at\n",
            encoding="utf-8",
        )
    if not DIARY_FILE.exists():
        DIARY_FILE.write_text(
            "id,tx_id,event_name,diary_title,diary_body,transaction_date,created_at,user_id\n",
            encoding="utf-8",
        )
    if not CHAT_FILE.exists():
        CHAT_FILE.write_text(
            "tx_id,user_id,messages_json,created_at\n",
            encoding="utf-8",
        )


def read_users() -> pd.DataFrame:
    ensure_data_files()
    return pd.read_csv(USERS_FILE, dtype={"user_id": str, "display_name": str})


def read_transactions() -> pd.DataFrame:
    ensure_data_files()
    df = pd.read_csv(
        TX_FILE,
        dtype={"id": str, "user_id": str, "item": str},
        parse_dates=["date", "created_at", "updated_at"],
    )
    if df.empty:
        return df
    return df


def write_transactions(df: pd.DataFrame) -> None:
    df.to_csv(TX_FILE, index=False, date_format="%Y-%m-%dT%H:%M:%S")


def read_diary() -> pd.DataFrame:
    """日記CSVを読み込み、欠損列を補完し、IDと日付型を整える。"""
    ensure_data_files()
    df = pd.read_csv(
        DIARY_FILE,
        dtype={
            "id": str,
            "tx_id": str,
            "event_name": str,
            "diary_title": str,
            "diary_body": str,
            "transaction_date": str,
            "created_at": str,
            "user_id": str,
        },
        keep_default_na=False,
    )
    if df.empty:
        return df

    expected_cols = [
        "id",
        "tx_id",
        "event_name",
        "diary_title",
        "diary_body",
        "transaction_date",
        "created_at",
        "user_id",
    ]

    changed = False
    for col in expected_cols:
        if col not in df.columns:
            df[col] = ""
            changed = True

    # ID補完
    missing_id = df["id"].astype(str).str.strip() == ""
    if missing_id.any():
        df.loc[missing_id, "id"] = [str(uuid4()) for _ in range(missing_id.sum())]
        changed = True

    if "tx_id" in df.columns:
        missing_tx = df["tx_id"].astype(str).str.strip() == ""
        if missing_tx.any():
            df.loc[missing_tx, "tx_id"] = ""
            changed = True

    # 日付型に変換（欠損はNaT）
    df["transaction_date"] = pd.to_datetime(df["transaction_date"], errors="coerce")
    df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")

    # カラム順を固定
    df = df[expected_cols]

    if changed:
        write_diary(df)
    return df


def write_diary(df: pd.DataFrame) -> None:
    df.to_csv(DIARY_FILE, index=False, date_format="%Y-%m-%dT%H:%M:%S")


def append_chat_log(tx_id: str, user_id: str, messages_json: str, created_at: datetime) -> None:
    ensure_data_files()
    try:
        df = pd.read_csv(
            CHAT_FILE,
            dtype={"tx_id": str, "user_id": str, "messages_json": str},
            parse_dates=["created_at"],
        )
    except Exception:
        df = pd.DataFrame(columns=["tx_id", "user_id", "messages_json", "created_at"])

    # tx_id & user_id 単位で最新を上書き
    df = df[(df["tx_id"] != tx_id) | (df["user_id"] != user_id)]
    new_row = {
        "tx_id": tx_id,
        "user_id": user_id,
        "messages_json": messages_json,
        "created_at": created_at,
    }
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    df.to_csv(CHAT_FILE, index=False, date_format="%Y-%m-%dT%H:%M:%S")

