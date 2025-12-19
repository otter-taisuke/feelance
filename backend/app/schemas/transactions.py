from datetime import date as date_type, datetime
from typing import Optional

from pydantic import BaseModel, Field


class TransactionBase(BaseModel):
    user_id: str
    date: date_type
    item: str
    amount: float
    mood_score: int = Field(ge=-2, le=2)


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    # Optional fields for partial updates; each can be omitted or supplied.
    date: Optional[date_type] = None
    item: Optional[str] = None
    amount: Optional[float] = None
    mood_score: Optional[int] = Field(default=None, ge=-2, le=2)


class TransactionOut(TransactionBase):
    id: str
    happy_amount: float
    created_at: datetime
    updated_at: datetime

