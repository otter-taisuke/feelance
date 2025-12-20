"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { HappyChan } from "@/components/common/HappyChan";
import { fetchDiaries, fetchRetrospectiveSummary } from "@/lib/api";
import moodConfig from "@/config/mood.json";
import type {
  DiaryEntry,
  EmotionBucket,
  RetrospectiveDiary,
  RetrospectiveEvent,
  RetrospectiveSummary,
  User,
} from "@/lib/types";

type Props = {
  user: User;
  months?: number;
};

type DiaryModal = {
  title: string;
  body: string;
  eventTitle: string;
  date?: string;
};

const MOOD_COLORS: Record<number, string> = {
  2: "#2563eb", // text-blue-600
  1: "#3b82f6", // text-blue-500
  0: "#4b5563", // text-gray-600
  [-1]: "#ef4444", // text-red-500
  [-2]: "#dc2626", // text-red-600
};

const SECTION_CLASS = "rounded-lg bg-white p-4 shadow-sm";

const formatYen = (value: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(value);

const formatSigned = (value: number) => (value >= 0 ? `+${value}` : `${value}`);
const formatHappy = (value: number) => `${formatSigned(value)}♡`;

export function RetrospectivePanel({ user, months = 12 }: Props) {
  const [summary, setSummary] = useState<RetrospectiveSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diaryModal, setDiaryModal] = useState<DiaryModal | null>(null);
  const [fetchingDiaryId, setFetchingDiaryId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchRetrospectiveSummary(months);
        setSummary(res);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      run();
    }
  }, [months, user]);

  const diaryIndex = useMemo(() => {
    const index = new Map<string, RetrospectiveDiary>();
    summary?.happy_money_top3_diaries.forEach((d) => index.set(d.event_id, d));
    summary?.happy_money_worst3_diaries.forEach((d) => {
      if (!index.has(d.event_id)) index.set(d.event_id, d);
    });
    return index;
  }, [summary]);

  const happySummaryText = useMemo(() => {
    if (!summary) return "";
    return summary.summary_text || "まだ日記付きのイベントがありませんっピィ。";
  }, [summary]);

  const openDiary = async (event: RetrospectiveEvent) => {
    const cached = diaryIndex.get(event.event_id);
    if (cached) {
      setDiaryModal({
        title: cached.title || event.title,
        body: cached.content,
        eventTitle: event.title,
        date: cached.date,
      });
      return;
    }
    if (!event.has_diary) return;
    setFetchingDiaryId(event.event_id);
    try {
      const diaries = await fetchDiaries({ tx_id: event.event_id });
      if (diaries.length > 0) {
        showDiaryEntry(event, diaries[0]);
      } else {
        setError("このイベントの日記が見つかりませんでした");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFetchingDiaryId(null);
    }
  };

  const showDiaryEntry = (event: RetrospectiveEvent, entry: DiaryEntry) => {
    setDiaryModal({
      title: entry.diary_title || event.title,
      body: entry.diary_body,
      eventTitle: event.title,
      date: entry.transaction_date ?? undefined,
    });
  };

  const openDiaryFromCard = useCallback((diary: RetrospectiveDiary) => {
    setDiaryModal({
      title: diary.title || "タイトルなし",
      body: diary.content,
      eventTitle: diary.title || "イベント",
      date: diary.date,
    });
  }, []);

  const renderDiaryCard = (diary: RetrospectiveDiary) => (
    <button
      key={diary.diary_id}
      onClick={() => openDiaryFromCard(diary)}
      className="w-full rounded border border-zinc-200 bg-zinc-50 p-3 text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-800">{diary.title || "タイトルなし"}</div>
        <span
          className={`text-xs font-semibold ${
            diary.amount >= 0 ? "text-blue-700" : "text-red-700"
          }`}
        >
          {formatHappy(Math.trunc(diary.amount))}
        </span>
      </div>
      <div className="mt-1 text-xs text-zinc-500">{diary.date}</div>
      <p className="mt-2 line-clamp-3 text-sm text-zinc-700 whitespace-pre-line">{diary.content}</p>
    </button>
  );

  const renderEventItem = (event: RetrospectiveEvent) => (
    <div
      key={event.event_id}
      className="flex items-start justify-between gap-3 rounded border border-zinc-200 bg-white p-3 shadow-sm"
    >
      <div>
        <div className="text-sm font-semibold text-zinc-800">{event.title}</div>
        <div className="text-xs text-zinc-500">{event.date}</div>
        <div className="mt-1 text-xs text-zinc-600">感情: {getMoodLabel(event.sentiment)}</div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-semibold ${
            event.amount >= 0 ? "text-blue-700" : "text-red-700"
          }`}
        >
          {formatHappy(Math.trunc(event.amount))}
        </span>
        {event.has_diary && (
          <button
            className="rounded border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            onClick={() => openDiary(event)}
            disabled={fetchingDiaryId === event.event_id}
          >
            日記を読む
          </button>
        )}
      </div>
    </div>
  );

  const moodLabelMap = useMemo(() => {
    const map = new Map<number, { label: string; short_label: string }>();
    (moodConfig as any)?.moods?.forEach(
      (m: { value: number; label: string; short_label: string }) => {
        map.set(m.value, { label: m.label, short_label: m.short_label ?? m.label });
      },
    );
    return map;
  }, []);

  const getMoodLabel = useCallback(
    (value: number) => {
      const labels = moodLabelMap.get(value);
      return labels?.label ?? `スコア${value}`;
    },
    [moodLabelMap],
  );

  const emotionData: (EmotionBucket & { short_label?: string })[] = useMemo(() => {
    const buckets = summary?.emotion_buckets ?? [];
    return buckets.map((b) => {
      const labels = moodLabelMap.get(b.value);
      return {
        ...b,
        label: labels?.label ?? b.label ?? `スコア${b.value}`,
        short_label: labels?.short_label ?? labels?.label ?? b.short_label ?? b.label,
      };
    });
  }, [summary, moodLabelMap]);

  return (
    <div className="flex flex-col gap-6">
      <div className={`${SECTION_CLASS} flex flex-col gap-4`}>
        <div className="flex items-center gap-3">
          <HappyChan size="small" />
          <div>
            <h2 className="text-lg font-semibold">ハッピーちゃんのまとめ（過去1年）</h2>
            <p className="text-sm text-zinc-600">
              {loading ? "読み込み中…" : error ? error : happySummaryText}
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-semibold text-blue-800">日記あり TOP3</div>
            {summary?.happy_money_top3_diaries?.length ? (
              <div className="space-y-2">
                {summary.happy_money_top3_diaries.map(renderDiaryCard)}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                {summary?.diary_top_insufficient
                  ? "ポジティブな日記がまだ足りないっピィ。"
                  : "まだデータがありません"}
              </p>
            )}
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-red-800">日記あり WORST3</div>
            {summary?.happy_money_worst3_diaries?.length ? (
              <div className="space-y-2">
                {summary.happy_money_worst3_diaries.map(renderDiaryCard)}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                {summary?.diary_worst_insufficient
                  ? "ネガティブな日記がまだ足りないっピィ。"
                  : "まだデータがありません"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={SECTION_CLASS}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Happy Money ランキング（過去1年）</h2>
          {loading && <span className="text-xs text-zinc-500">読み込み中…</span>}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-blue-800">TOP3</div>
            {summary?.yearly_happy_money_top3?.length ? (
              summary.yearly_happy_money_top3.map(renderEventItem)
            ) : (
              <p className="text-sm text-zinc-500">
                {summary?.event_top_insufficient
                  ? "ポジティブなイベントがまだ足りないっピィ。"
                  : "データがありません"}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-red-800">WORST3</div>
            {summary?.yearly_happy_money_worst3?.length ? (
              summary.yearly_happy_money_worst3.map(renderEventItem)
            ) : (
              <p className="text-sm text-zinc-500">
                {summary?.event_worst_insufficient
                  ? "ネガティブなイベントがまだ足りないっピィ。"
                  : "データがありません"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={SECTION_CLASS}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">感情スコア別の件数（円グラフ）</h2>
          {loading && <span className="text-xs text-zinc-500">読み込み中…</span>}
        </div>
        {emotionData.length === 0 ? (
          <p className="text-sm text-zinc-500">データがありません</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={emotionData}
                  dataKey="count"
                  nameKey="short_label"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${entry.short_label ?? entry.label}: ${entry.count}`}
                >
                  {emotionData.map((entry) => (
                    <Cell key={entry.label} fill={MOOD_COLORS[entry.value] ?? "#cbd5e1"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | string | undefined) => `${value ?? 0}件`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {diaryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setDiaryModal(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-600">{diaryModal.date}</div>
                <h3 className="text-lg font-semibold text-zinc-900">{diaryModal.title}</h3>
                <p className="text-sm text-zinc-500">イベント: {diaryModal.eventTitle}</p>
              </div>
              <button
                className="text-sm text-zinc-500 hover:font-semibold"
                onClick={() => setDiaryModal(null)}
              >
                閉じる
              </button>
            </div>
            <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-800">
              {diaryModal.body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

