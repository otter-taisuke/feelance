from datetime import date, datetime, timedelta
from typing import List, Optional

import pandas as pd

from app.repositories.csv_store import read_diary, read_transactions
from app.schemas.retrospective import (
    EmotionBucket,
    RetrospectiveDiary,
    RetrospectiveEvent,
    RetrospectiveSummary,
)


def _safe_date(val: object) -> Optional[date]:
    try:
        ts = pd.to_datetime(val)
    except Exception:
        return None
    if pd.isna(ts):
        return None
    try:
        return ts.date()
    except Exception:
        return None


def _default_summary() -> RetrospectiveSummary:
    return RetrospectiveSummary(
        happy_money_top3_diaries=[],
        happy_money_worst3_diaries=[],
        yearly_happy_money_top3=[],
        yearly_happy_money_worst3=[],
        emotion_buckets=[],
    )


def _filter_last_year(df: pd.DataFrame, date_col: str, start_date: date) -> pd.DataFrame:
    if df.empty:
        return df
    df = df.copy()
    df["__effective_date"] = df[date_col].apply(_safe_date)
    df = df[df["__effective_date"].notna()]
    df = df[df["__effective_date"] >= start_date]
    return df


def _pick_diary_rows(df: pd.DataFrame) -> List[RetrospectiveDiary]:
    diaries: List[RetrospectiveDiary] = []
    for _, row in df.iterrows():
        diary_id = str(row["id"])
        event_id = str(row["tx_id"])
        title = row.get("diary_title") or ""
        content = row.get("diary_body") or ""
        amount = float(row.get("happy_amount_tx", row.get("happy_amount", 0)) or 0)
        sentiment = int(row.get("mood_score_tx", row.get("mood_score", 0)) or 0)
        event_date = _safe_date(row.get("__effective_date"))
        if event_date is None:
            continue
        diaries.append(
            RetrospectiveDiary(
                diary_id=diary_id,
                event_id=event_id,
                title=title,
                date=event_date,
                amount=amount,
                sentiment=sentiment,
                content=content,
            )
        )
    return diaries


def summarize_retrospective(user_id: str, months: int = 12) -> RetrospectiveSummary:
    start_date = date.today() - timedelta(days=months * 30)

    tx_df = read_transactions()
    if tx_df.empty:
        return _default_summary()
    tx_df = tx_df[tx_df["user_id"] == user_id].copy()
    tx_df["__date_only"] = tx_df["date"].dt.date
    tx_df = _filter_last_year(tx_df, "__date_only", start_date)
    if tx_df.empty:
        return _default_summary()

    diary_df = read_diary()
    diary_df = diary_df[diary_df["user_id"] == user_id].copy()
    if not diary_df.empty:
        diary_df = diary_df.merge(
            tx_df,
            left_on="tx_id",
            right_on="id",
            how="inner",
            suffixes=("_diary", "_tx"),
        )
        diary_df["__effective_date"] = diary_df["transaction_date"].fillna(
            diary_df["date"]
        )
        diary_df = _filter_last_year(diary_df, "__effective_date", start_date)
    else:
        diary_df = pd.DataFrame()

    diaries_sorted = _pick_diary_rows(diary_df)
    diaries_top3 = sorted(diaries_sorted, key=lambda d: d.amount, reverse=True)[:3]
    diaries_worst3 = sorted(diaries_sorted, key=lambda d: d.amount)[:3]

    # Map event_id -> diary_id for quick lookup
    diary_by_event = {}
    for diary in diaries_sorted:
        diary_by_event.setdefault(diary.event_id, diary.diary_id)

    def to_event_row(row) -> RetrospectiveEvent:
        event_id = str(row["id"])
        title = row.get("item") or ""
        amount = float(row.get("happy_amount", 0) or 0)
        sentiment = int(row.get("mood_score", 0) or 0)
        event_date = _safe_date(row.get("__date_only")) or date.today()
        diary_id = diary_by_event.get(event_id)
        return RetrospectiveEvent(
            event_id=event_id,
            title=title,
            date=event_date,
            amount=amount,
            sentiment=sentiment,
            has_diary=diary_id is not None,
            diary_id=diary_id,
        )

    events_top3 = [
        to_event_row(row)
        for _, row in tx_df.sort_values(by="happy_amount", ascending=False).head(3).iterrows()
    ]
    events_worst3 = [
        to_event_row(row)
        for _, row in tx_df.sort_values(by="happy_amount", ascending=True).head(3).iterrows()
    ]

    # Emotion buckets by mood_score
    def _label(mood: Optional[float]) -> str:
        if mood is None:
            return "neutral"
        try:
            mood_int = int(mood)
        except Exception:
            return "neutral"
        if mood_int > 0:
            return "positive"
        if mood_int < 0:
            return "negative"
        return "neutral"

    if tx_df.empty:
        buckets: List[EmotionBucket] = []
    else:
        labels = tx_df["mood_score"].apply(_label)
        counts = labels.value_counts().to_dict()
        buckets = [
            EmotionBucket(label=lbl, count=int(counts.get(lbl, 0)))
            for lbl in ["positive", "neutral", "negative"]
            if counts.get(lbl, 0) > 0
        ]

    return RetrospectiveSummary(
        happy_money_top3_diaries=diaries_top3,
        happy_money_worst3_diaries=diaries_worst3,
        yearly_happy_money_top3=events_top3,
        yearly_happy_money_worst3=events_worst3,
        emotion_buckets=buckets,
    )

