from pathlib import Path

import pandas as pd

from app.core.config import DATA_DIR

USERS_FILE = DATA_DIR / "users.csv"
TX_FILE = DATA_DIR / "transactions.csv"


def ensure_data_files() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    if not USERS_FILE.exists():
        USERS_FILE.write_text("user_id,display_name\n", encoding="utf-8")
    if not TX_FILE.exists():
        TX_FILE.write_text(
            "id,user_id,date,item,amount,mood_score,happy_amount,created_at,updated_at\n",
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

