import os
from datetime import date, datetime, timedelta
from typing import List, Optional

import pandas as pd
from openai import OpenAI

from app.repositories.csv_store import read_diary, read_transactions
from app.repositories.summary_cache import read_summary_cache, write_summary_cache
from app.schemas.retrospective import (
    DailyMood,
    EmotionBucket,
    RetrospectiveDiary,
    RetrospectiveEvent,
    RetrospectiveSummary,
)
SUMMARY_CACHE_TTL_HOURS = int(os.getenv("SUMMARY_CACHE_TTL_HOURS", "24"))
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def _ensure_client() -> OpenAI:
    if _client is None:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return _client



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
        daily_moods=[],
        summary_text="まだ日記付きのイベントがありませんっピィ。日記を書いてね！",
        diary_top_insufficient=True,
        diary_worst_insufficient=True,
        event_top_insufficient=True,
        event_worst_insufficient=True,
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
        # マージ後は diary.id が id_diary になり、取引側の id は id_tx になるため安全に取得する
        diary_id_raw = row.get("id_diary")
        if diary_id_raw is None:
            diary_id_raw = row.get("id")
        if diary_id_raw is None:
            diary_id_raw = row.get("tx_id")

        event_id_raw = row.get("tx_id")
        if event_id_raw is None:
            event_id_raw = row.get("id_tx")
        if event_id_raw is None:
            event_id_raw = row.get("id")

        if diary_id_raw is None or event_id_raw is None:
            continue

        diary_id = str(diary_id_raw)
        event_id = str(event_id_raw)
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


def _fallback_summary_text(
    diaries_top: List[RetrospectiveDiary],
    diaries_worst: List[RetrospectiveDiary],
    diary_top_insufficient: bool,
    diary_worst_insufficient: bool,
) -> str:
    if diary_top_insufficient and diary_worst_insufficient:
        return "まだ日記の数が足りないっピィ！楽しかったことも、しょんぼりしたことも日記を書いてねっピィ。"
    if diary_top_insufficient:
        return "ポジティブな日記がまだ足りないっピィ。嬉しかったことを教えてほしいっピィ！"
    if diary_worst_insufficient:
        return "ネガティブな日記がまだ足りないっピィ。つらかったことも少しずつ教えてねっピィ。"
    top_title = diaries_top[0].title if diaries_top else ""
    worst_title = diaries_worst[0].title if diaries_worst else ""
    return (
        f"一番ハッピーだったのは「{top_title}」、一番しょんぼりは「{worst_title}」だったっピィ。"
        "この調子で日記を続けてね！"
    )


def _build_daily_moods(tx_df: pd.DataFrame, start_date: date) -> List[DailyMood]:
    """過去1年分の日単位ムードをGitHub草形式で使いやすい配列に整形"""
    if tx_df.empty:
        return []

    # Pythonのdate型に揃えたキーで平均値と件数を持つ辞書を構築
    mean_by_date: dict[date, int] = {}
    count_by_date: dict[date, int] = {}

    mood_means = (
        tx_df.groupby("__date_only")["mood_score"]
        .mean()
        .apply(lambda v: int(round(max(min(v, 2), -2))))
    )
    for idx, val in mood_means.items():
        key = idx.date() if hasattr(idx, "date") else idx
        mean_by_date[key] = int(val)

    mood_counts = tx_df["__date_only"].value_counts()
    for idx, val in mood_counts.items():
        key = idx.date() if hasattr(idx, "date") else idx
        count_by_date[key] = int(val)

    today = date.today()
    daily: List[DailyMood] = []
    current = start_date
    while current <= today:
        daily.append(
            DailyMood(
                date=current,
                mood_score=mean_by_date.get(current, 0),
                count=count_by_date.get(current, 0),
            )
        )
        current += timedelta(days=1)
    return daily


def _format_diary_lines(diaries: List[RetrospectiveDiary], label: str) -> str:
    if not diaries:
        return f"{label}: なし"
    lines = [f"{label}:"]
    for idx, d in enumerate(diaries, start=1):
        lines.append(
            f"{idx}. タイトル: {d.title or 'タイトルなし'} / 感情スコア: {d.sentiment} / ハッピーマネー: {d.amount} / 本文: {d.content}"
        )
    return "\n".join(lines)


def _generate_summary_with_openai(
    diaries_top: List[RetrospectiveDiary],
    diaries_worst: List[RetrospectiveDiary],
    diary_top_insufficient: bool,
    diary_worst_insufficient: bool,
) -> str:
    if not diaries_top and not diaries_worst:
        return _fallback_summary_text(
            diaries_top, diaries_worst, diary_top_insufficient, diary_worst_insufficient
        )

    messages = [
        {
            "role": "system",
            "content": (
                "あなたは幸せを運ぶ青い鳥の妖精『ハッピーちゃん』です。"
                "語尾は『っピィ』にしてください。"
                "ユーザーに寄り添い、優しく短く（3文以内）要約します。"
            ),
        },
        {
            "role": "user",
            "content": (
                "以下はランキングに入った日記の情報です。"
                "順位を踏まえて、ハッピーちゃんの口調でまとめてください。\n\n"
                f"{_format_diary_lines(diaries_top, 'ハッピーTOP')}\n\n"
                f"{_format_diary_lines(diaries_worst, 'しょんぼりWORST')}\n"
                "不足しているランキングがあれば『まだ日記の数が足りないっピィ』と教えてください。"
            ),
        },
    ]

    try:
        client = _ensure_client()
        res = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=300,
        )
        content = res.choices[0].message.content or ""
        return content.strip()
    except Exception:
        return _fallback_summary_text(
            diaries_top, diaries_worst, diary_top_insufficient, diary_worst_insufficient
        )


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
    diaries_positive = [d for d in diaries_sorted if d.sentiment > 0]
    diaries_negative = [d for d in diaries_sorted if d.sentiment < 0]
    diary_top_insufficient = len(diaries_positive) == 0
    diary_worst_insufficient = len(diaries_negative) == 0
    diaries_top3 = sorted(diaries_positive, key=lambda d: d.amount, reverse=True)[:3]
    diaries_worst3 = sorted(diaries_negative, key=lambda d: d.amount)[:3]

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

    tx_positive = tx_df[tx_df["mood_score"] > 0]
    tx_negative = tx_df[tx_df["mood_score"] < 0]

    event_top_insufficient = tx_positive.empty
    event_worst_insufficient = tx_negative.empty

    events_top3 = [
        to_event_row(row)
        for _, row in tx_positive.sort_values(by="happy_amount", ascending=False)
        .head(3)
        .iterrows()
    ]
    events_worst3 = [
        to_event_row(row)
        for _, row in tx_negative.sort_values(by="happy_amount", ascending=True)
        .head(3)
        .iterrows()
    ]

    # Emotion buckets (5段階)
    mood_labels = {
        2: ("最高", "最高"),
        1: ("やや良", "やや良"),
        0: ("普通", "普通"),
        -1: ("やや悪", "やや悪"),
        -2: ("最悪", "最悪"),
    }

    if tx_df.empty:
        buckets: List[EmotionBucket] = []
    else:
        mood_values = tx_df["mood_score"].dropna().apply(
            lambda x: max(min(int(x), 2), -2)
        )
        counts = mood_values.value_counts().to_dict()
        buckets = []
        for val in [2, 1, 0, -1, -2]:
            count = counts.get(val, 0)
            if count <= 0:
                continue
            label, short_label = mood_labels.get(val, (f"スコア{val}", f"スコア{val}"))
            buckets.append(
                EmotionBucket(
                    value=val,
                    label=label,
                    short_label=short_label,
                    count=int(count),
                )
            )

    cache_ttl = timedelta(hours=SUMMARY_CACHE_TTL_HOURS)
    cached_summary = read_summary_cache(user_id, months, cache_ttl)
    if cached_summary:
        summary_text = cached_summary
    else:
        summary_text = _generate_summary_with_openai(
            diaries_top3,
            diaries_worst3,
            diary_top_insufficient,
            diary_worst_insufficient,
        )
        write_summary_cache(user_id, months, summary_text)

    daily_moods = _build_daily_moods(tx_df, start_date)

    return RetrospectiveSummary(
        happy_money_top3_diaries=diaries_top3,
        happy_money_worst3_diaries=diaries_worst3,
        yearly_happy_money_top3=events_top3,
        yearly_happy_money_worst3=events_worst3,
        emotion_buckets=buckets,
        daily_moods=daily_moods,
        summary_text=summary_text,
        diary_top_insufficient=diary_top_insufficient,
        diary_worst_insufficient=diary_worst_insufficient,
        event_top_insufficient=event_top_insufficient,
        event_worst_insufficient=event_worst_insufficient,
    )

