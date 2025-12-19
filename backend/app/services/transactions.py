from datetime import datetime, date
from typing import List, Optional
from uuid import uuid4

import pandas as pd
from fastapi import HTTPException

from app.repositories.csv_store import (
    read_transactions,
    read_users,
    write_transactions,
)
from app.schemas.transactions import (
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)
from app.utils.happy import compute_happy


def _ensure_user(user_id: str) -> None:
    users = read_users()
    if users[users["user_id"] == user_id].empty:
        raise HTTPException(status_code=400, detail="User not registered")


def _row_to_out(row: pd.Series) -> TransactionOut:
    return TransactionOut(
        id=row["id"],
        user_id=row["user_id"],
        date=pd.to_datetime(row["date"]).date(),
        item=row["item"],
        amount=float(row["amount"]),
        mood_score=int(row["mood_score"]),
        happy_amount=float(row["happy_amount"]),
        created_at=pd.to_datetime(row["created_at"]).to_pydatetime(),
        updated_at=pd.to_datetime(row["updated_at"]).to_pydatetime(),
    )


def list_transactions(
    user_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    date_exact: Optional[date] = None,
) -> List[TransactionOut]:
    df = read_transactions()
    if df.empty:
        return []
    df = df[df["user_id"] == user_id]
    if date_exact:
        df = df[df["date"].dt.date == date_exact]
    if start_date:
        df = df[df["date"].dt.date >= start_date]
    if end_date:
        df = df[df["date"].dt.date <= end_date]
    df = df.sort_values(by="date")
    return [_row_to_out(row) for _, row in df.iterrows()]


def get_transaction(tx_id: str) -> TransactionOut:
    df = read_transactions()
    if df.empty:
        raise HTTPException(status_code=404, detail="Transaction not found")
    match = df[df["id"] == tx_id]
    if match.empty:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return _row_to_out(match.iloc[0])


def create_transaction(payload: TransactionCreate) -> TransactionOut:
    _ensure_user(payload.user_id)
    now = datetime.utcnow()
    tx_id = str(uuid4())
    happy_amount = compute_happy(payload.amount, payload.mood_score)
    new_row = {
        "id": tx_id,
        "user_id": payload.user_id,
        "date": pd.to_datetime(payload.date),
        "item": payload.item,
        "amount": payload.amount,
        "mood_score": payload.mood_score,
        "happy_amount": happy_amount,
        "created_at": now,
        "updated_at": now,
    }

    df = read_transactions()
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    write_transactions(df)
    return _row_to_out(df.iloc[-1])


def update_transaction(tx_id: str, payload: TransactionUpdate) -> TransactionOut:
    df = read_transactions()
    idx = df.index[df["id"] == tx_id]
    if idx.empty:
        raise HTTPException(status_code=404, detail="Transaction not found")
    idx = idx[0]

    if payload.date is not None:
        df.at[idx, "date"] = pd.to_datetime(payload.date)
    if payload.item is not None:
        df.at[idx, "item"] = payload.item
    if payload.amount is not None:
        df.at[idx, "amount"] = float(payload.amount)
    if payload.mood_score is not None:
        df.at[idx, "mood_score"] = int(payload.mood_score)

    amount = float(df.at[idx, "amount"])
    mood = int(df.at[idx, "mood_score"])
    df.at[idx, "happy_amount"] = compute_happy(amount, mood)
    df.at[idx, "updated_at"] = datetime.utcnow()

    write_transactions(df)
    return _row_to_out(df.iloc[idx])


def delete_transaction(tx_id: str) -> None:
    df = read_transactions()
    if df.empty:
        raise HTTPException(status_code=404, detail="Transaction not found")
    new_df = df[df["id"] != tx_id]
    if len(new_df) == len(df):
        raise HTTPException(status_code=404, detail="Transaction not found")
    write_transactions(new_df)

