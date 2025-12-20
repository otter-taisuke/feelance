from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class RetrospectiveDiary(BaseModel):
    diary_id: str
    event_id: str
    title: str
    date: date
    amount: float
    sentiment: int
    content: str


class RetrospectiveEvent(BaseModel):
    event_id: str
    title: str
    date: date
    amount: float
    sentiment: int
    has_diary: bool
    diary_id: Optional[str] = None


class EmotionBucket(BaseModel):
    value: int
    label: str
    count: int
    short_label: Optional[str] = None


class RetrospectiveSummary(BaseModel):
    happy_money_top3_diaries: List[RetrospectiveDiary]
    happy_money_worst3_diaries: List[RetrospectiveDiary]
    yearly_happy_money_top3: List[RetrospectiveEvent]
    yearly_happy_money_worst3: List[RetrospectiveEvent]
    emotion_buckets: List[EmotionBucket]
    summary_text: str
    diary_top_insufficient: bool = False
    diary_worst_insufficient: bool = False
    event_top_insufficient: bool = False
    event_worst_insufficient: bool = False

