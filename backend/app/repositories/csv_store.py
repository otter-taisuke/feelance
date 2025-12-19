from pathlib import Path
from datetime import datetime

import pandas as pd

from app.core.config import DATA_DIR

USERS_FILE = DATA_DIR / "users.csv"
TX_FILE = DATA_DIR / "transactions.csv"
REPORTS_FILE = DATA_DIR / "reports.csv"
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
    if not REPORTS_FILE.exists():
        REPORTS_FILE.write_text(
            "event_name,report_title,report_body,created_at,user_id\n",
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


def read_reports() -> pd.DataFrame:
    ensure_data_files()
    df = pd.read_csv(
        REPORTS_FILE,
        dtype={
            "event_name": str,
            "report_title": str,
            "report_body": str,
            "user_id": str,
        },
        parse_dates=["created_at"],
    )
    if df.empty:
        return df
    return df


def write_reports(df: pd.DataFrame) -> None:
    df.to_csv(REPORTS_FILE, index=False, date_format="%Y-%m-%dT%H:%M:%S")


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

