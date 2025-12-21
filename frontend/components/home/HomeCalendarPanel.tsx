"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { CalendarView } from "@/components/calendar/CalendarView";
import { DayModal } from "@/components/modals/DayModal";
import { DiarySelectEventModal } from "@/components/modals/DiarySelectEventModal";
import { useTransactions } from "@/hooks/useTransactions";
import { fetchDiaries } from "@/lib/api";
import { moodOptions } from "@/lib/mood";
import type { DiaryEntry, Transaction, TransactionForm, User } from "@/lib/types";

type Granularity = "day" | "month" | "year";

const HAPPY_POSITIVE_COLOR = "#2563eb";
const HAPPY_NEGATIVE_COLOR = "#ef4444";
const HAPPY_NEUTRAL_COLOR = "#f3f4f6";
const HAPPY_NEUTRAL_TEXT_COLOR = "#0f172a";
const HAPPY_NEUTRAL_BORDER_COLOR = "#d4d4d8";

type HappyStatDatum = { label: string; positive: number; negative: number };
type HappyStats = { data: HappyStatDatum[]; total: number; label: string };

const formatDateLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getToday = () => formatDateLocal(new Date());

const getFirstDayFromMonthStr = (monthStr: string) => {
  const [y, m] = monthStr.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return getToday();
  return formatDateLocal(new Date(y, m - 1, 1));
};

const getAllDaysInMonth = (year: number, month: number) => {
  const days: string[] = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d += 1) {
    days.push(formatDateLocal(new Date(year, month, d)));
  }
  return days;
};

const formatMonthParam = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

type HomeCalendarPanelProps = {
  user: User | null;
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
};

export function HomeCalendarPanel({ user, selectedMonth, onChangeMonth }: HomeCalendarPanelProps) {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<string>(() => getFirstDayFromMonthStr(selectedMonth));
  const [showModal, setShowModal] = useState(false);
  const [showDiarySelectModal, setShowDiarySelectModal] = useState(false);
  const [startInEventList, setStartInEventList] = useState(false);
  const [statsYear, setStatsYear] = useState<number | null>(null);
  const [statsPickerOpen, setStatsPickerOpen] = useState(false);
  const [statsDraftYear, setStatsDraftYear] = useState<number | null>(null);
  const [statsDraftMonth, setStatsDraftMonth] = useState<number | null>(null);
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [form, setForm] = useState<TransactionForm>({
    date: getToday(),
    item: "",
    amount: "",
    mood_score: 0,
  });
  const [diaryMap, setDiaryMap] = useState<Record<string, string>>({});
  const [diaryModal, setDiaryModal] = useState<{
    title: string;
    body: string;
    eventTitle: string;
    date?: string;
  } | null>(null);
  const [diaryModalLoading, setDiaryModalLoading] = useState(false);

  const {
    transactions,
    loading,
    saving,
    error,
    setError,
    loadTransactions,
    upsertTransaction,
    removeTransaction,
    resetTransactions,
  } = useTransactions();

  useEffect(() => {
    if (!user) {
      resetTransactions();
      return;
    }
    loadTransactions(user.user_id);
  }, [user, loadTransactions, resetTransactions]);

  useEffect(() => {
    const firstDay = getFirstDayFromMonthStr(selectedMonth);
    setSelectedDate((prev) => {
      const prevDate = new Date(`${prev}T00:00:00`);
      if (!Number.isNaN(prevDate.getTime()) && formatMonthParam(prevDate) === selectedMonth) {
        return prev;
      }
      return firstDay;
    });
  }, [selectedMonth]);

  const setDateAndSyncMonth = (dateStr: string) => {
    setSelectedDate(dateStr);
    const parsed = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    const monthStr = formatMonthParam(parsed);
    if (monthStr !== selectedMonth) {
      onChangeMonth(monthStr);
    }
  };

  const dayTransactions = useMemo(
    () => transactions.filter((t) => t.date === selectedDate),
    [transactions, selectedDate],
  );

  const events = useMemo(
    () =>
      transactions.map((t) => ({
        id: t.id,
        title: `${t.happy_amount >= 0 ? "+" : ""}${t.happy_amount.toLocaleString("ja-JP")}♡`,
        start: t.date,
        color: t.mood_score === 0 ? HAPPY_NEUTRAL_COLOR : t.happy_amount < 0 ? HAPPY_NEGATIVE_COLOR : HAPPY_POSITIVE_COLOR,
        textColor: t.mood_score === 0 ? HAPPY_NEUTRAL_TEXT_COLOR : "#fff",
        borderColor: t.mood_score === 0 ? HAPPY_NEUTRAL_BORDER_COLOR : "transparent",
        hasDiary: Boolean(diaryMap[t.id]),
        diaryId: diaryMap[t.id] ?? null,
      })),
    [transactions, diaryMap],
  );

  const selectedMonthInfo = useMemo(() => {
    if (!selectedDate) return null;
    const base = new Date(`${selectedDate}T00:00:00`);
    return {
      year: base.getFullYear(),
      month: base.getMonth(),
      label: base.toLocaleDateString("ja-JP", { year: "numeric", month: "long" }),
    };
  }, [selectedDate]);

  const happyStats: HappyStats = useMemo(() => {
    if (!transactions.length) {
      return { data: [] as HappyStatDatum[], total: 0, label: "" };
    }

    if (granularity === "day") {
      if (!selectedMonthInfo) return { data: [], total: 0, label: "" };
      const grouped = new Map<string, { positive: number; negative: number }>();
      transactions.forEach((t) => {
        const d = new Date(`${t.date}T00:00:00`);
        if (d.getFullYear() === selectedMonthInfo.year && d.getMonth() === selectedMonthInfo.month) {
          const current = grouped.get(t.date) ?? { positive: 0, negative: 0 };
          if (t.happy_amount >= 0) {
            current.positive += t.happy_amount;
          } else {
            current.negative += t.happy_amount;
          }
          grouped.set(t.date, current);
        }
      });
      const fullDays = getAllDaysInMonth(selectedMonthInfo.year, selectedMonthInfo.month);
      const data = fullDays.map((date) => {
        const happy = grouped.get(date) ?? { positive: 0, negative: 0 };
        return {
          label: date,
          positive: happy.positive,
          negative: happy.negative,
        };
      });
      const total = data.reduce((sum, entry) => sum + entry.positive + entry.negative, 0);
      return { data, total, label: `${selectedMonthInfo.label}` };
    }

    if (granularity === "month") {
      const baseYear = statsYear ?? selectedMonthInfo?.year ?? new Date().getFullYear();
      const grouped = new Map<number, { positive: number; negative: number }>();
      transactions.forEach((t) => {
        const d = new Date(`${t.date}T00:00:00`);
        if (d.getFullYear() === baseYear) {
          const current = grouped.get(d.getMonth()) ?? { positive: 0, negative: 0 };
          if (t.happy_amount >= 0) {
            current.positive += t.happy_amount;
          } else {
            current.negative += t.happy_amount;
          }
          grouped.set(d.getMonth(), current);
        }
      });
      const data = Array.from(grouped.entries())
        .map(([month, happy]) => ({
          label: `${baseYear}-${String(month + 1).padStart(2, "0")}`,
          positive: happy.positive,
          negative: happy.negative,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      const total = data.reduce((sum, entry) => sum + entry.positive + entry.negative, 0);
      return { data, total, label: `${baseYear}年` };
    }

    const grouped = new Map<number, { positive: number; negative: number }>();
    transactions.forEach((t) => {
      const d = new Date(`${t.date}T00:00:00`);
      const current = grouped.get(d.getFullYear()) ?? { positive: 0, negative: 0 };
      if (t.happy_amount >= 0) {
        current.positive += t.happy_amount;
      } else {
        current.negative += t.happy_amount;
      }
      grouped.set(d.getFullYear(), current);
    });
    const data = Array.from(grouped.entries())
      .map(([year, happy]) => ({
        label: String(year),
        positive: happy.positive,
        negative: happy.negative,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const total = data.reduce((sum, entry) => sum + entry.positive + entry.negative, 0);
    return { data, total, label: "全期間" };
  }, [granularity, selectedMonthInfo, transactions, statsYear]);

  const happyScaleDomain = useMemo<[number, number]>(() => {
    if (happyStats.data.length === 0) {
      return [0, 0];
    }
    const maxAbs = happyStats.data.reduce(
      (max, entry) => Math.max(max, Math.abs(entry.positive), Math.abs(entry.negative)),
      0,
    );
    const safeMax = maxAbs === 0 ? 1 : maxAbs;
    const padded = safeMax * 1.3;
    return [-padded, padded];
  }, [happyStats.data]);

  const todayStr = useMemo(() => getToday(), []);
  const todayInRange = useMemo(
    () => happyStats.data.some((d) => d.label === todayStr),
    [happyStats.data, todayStr],
  );

  useEffect(() => {
    if (granularity === "month") {
      if (statsYear === null) {
        setStatsYear(selectedMonthInfo?.year ?? new Date().getFullYear());
      }
    } else if (granularity !== "day") {
      setStatsPickerOpen(false);
    }
  }, [granularity, selectedMonthInfo, statsYear]);

  const statsYearDisplay = statsYear ?? selectedMonthInfo?.year ?? new Date().getFullYear();

  const changeStatsYear = (delta: number) => {
    setStatsYear((prev) => (prev ?? statsYearDisplay) + delta);
  };

  const moveStatsMonth = (delta: number) => {
    const base = selectedMonthInfo
      ? new Date(selectedMonthInfo.year, selectedMonthInfo.month, 1)
      : new Date();
    const target = new Date(base.getFullYear(), base.getMonth() + delta, 1);
    setDateAndSyncMonth(formatDateLocal(target));
  };

  const jumpToCurrentMonth = () => {
    const now = new Date();
    const firstDay = formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 1));
    setDateAndSyncMonth(firstDay);
  };

  const openStatsPicker = () => {
    const base = selectedMonthInfo
      ? { year: selectedMonthInfo.year, month: selectedMonthInfo.month + 1 }
      : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
    setStatsDraftYear(base.year);
    setStatsDraftMonth(base.month);
    setStatsPickerOpen(true);
  };

  const applyStatsPicker = () => {
    if (statsDraftYear && statsDraftMonth) {
      const target = new Date(statsDraftYear, statsDraftMonth - 1, 1);
      setDateAndSyncMonth(formatDateLocal(target));
    }
    setStatsPickerOpen(false);
  };

  const cancelStatsPicker = () => setStatsPickerOpen(false);

  const totalBadgeClass = useMemo(() => {
    if (happyStats.total > 0) return "border-blue-300 bg-blue-50 text-blue-900";
    if (happyStats.total < 0) return "border-red-300 bg-red-50 text-red-900";
    return "border-zinc-300 bg-zinc-100 text-zinc-700";
  }, [happyStats.total]);

  const renderPositiveLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (typeof value !== "number" || value <= 0) return null;
    const centerX = (x ?? 0) + (width ?? 0) / 2;
    const labelY = (y ?? 0) - 6; // 少し上に配置
    return (
      <text x={centerX} y={labelY} textAnchor="middle" fill={HAPPY_POSITIVE_COLOR} fontSize={12}>
        {formatSigned(value)}
      </text>
    );
  };

  const renderNegativeLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (typeof value !== "number" || value >= 0) return null;
    const centerX = (x ?? 0) + (width ?? 0) / 2;
    // 負のバーは下方向に伸びるため、上端(ゼロライン付近)の少し下に配置する
    const labelY = (y ?? 0) + 12;
    return (
      <text x={centerX} y={labelY} textAnchor="middle" fill={HAPPY_NEGATIVE_COLOR} fontSize={12}>
        {formatSigned(value)}
      </text>
    );
  };

  const todayLabelProps = {
    value: "今日",
    position: "bottom" as const,
    fill: "#f97316",
    fontSize: 11,
    fontWeight: "bold" as const,
    offset: 26,
  };

  const handleChangeGranularity = (g: Granularity) => {
    setGranularity(g);
    if (g === "month") {
      setStatsYear((prev) => prev ?? selectedMonthInfo?.year ?? new Date().getFullYear());
      setStatsPickerOpen(false);
    } else {
      setStatsPickerOpen(false);
    }
  };

  const formatSigned = (v: number) => {
    const sign = v > 0 ? "+" : v < 0 ? "-" : "";
    const absTruncated = Math.trunc(Math.abs(v));
    return `${sign}${absTruncated.toLocaleString("ja-JP")}`;
  };

  const resetForm = (dateStr: string) => {
    setForm({
      id: undefined,
      date: dateStr,
      item: "",
      amount: "",
      mood_score: 0,
    });
  };

  const handleSave = async () => {
    if (!user) {
      setError("ログインしてください");
      return;
    }
    if (!form.item || !form.amount || !form.date) {
      setError("日付・イベント名・金額は必須です");
      return;
    }
    try {
      const saved = await upsertTransaction(user.user_id, form);
      setForm({
        id: saved.id,
        date: saved.date,
        item: saved.item,
        amount: String(saved.amount),
        mood_score: saved.mood_score,
      });
    } catch {
      /* エラー状態はフック側で管理 */
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    try {
      await removeTransaction(id);
      resetForm(selectedDate);
    } catch {
      /* エラー状態はフック側で管理 */
    }
  };

  const startNewEntry = () => resetForm(selectedDate);

  const handleDiaryExisting = () => {
    if (!form.id) return;
    setShowModal(false);
    router.push(`/diary/create?tx_id=${form.id}`);
  };

  const handleOpenDiary = async (txId: string) => {
    setShowModal(false);
    setDiaryModalLoading(true);
    setError(null);
    const tx = transactions.find((t) => t.id === txId);
    try {
      const diaries = await fetchDiaries({ tx_id: txId });
      const entry: DiaryEntry | undefined = diaries[0];
      if (!entry) {
        setError("このイベントの日記が見つかりませんでした");
        return;
      }
      setDiaryModal({
        title: entry.diary_title || tx?.item || "タイトルなし",
        body: entry.diary_body,
        eventTitle: entry.event_name || tx?.item || "イベント",
        date: entry.transaction_date ?? undefined,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDiaryModalLoading(false);
    }
  };

  const openModalForDate = (dateStr: string) => {
    setDateAndSyncMonth(dateStr);
    resetForm(dateStr);
    const hasEventsForDate = transactions.some((t) => t.date === dateStr);
    setStartInEventList(hasEventsForDate);
    setShowModal(true);
  };

  const handleEventClick = (eventId: string) => {
    const target = transactions.find((t) => t.id === eventId);
    if (!target) return;
    setDateAndSyncMonth(target.date);
    resetForm(target.date);
    setStartInEventList(true);
    setShowModal(true);
  };

  const pickTransaction = (tx: Transaction) => {
    setForm({
      id: tx.id,
      date: tx.date,
      item: tx.item,
      amount: String(tx.amount),
      mood_score: tx.mood_score,
    });
  };

  useEffect(() => {
    if (!user) {
      setDiaryMap({});
      return;
    }
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return;

    let cancelled = false;
    const loadDiaries = async () => {
      try {
        const diaries = await fetchDiaries({ year, month });
        if (cancelled) return;
        const map: Record<string, string> = {};
        diaries.forEach((d) => {
          if (d.tx_id) {
            map[d.tx_id] = d.id;
          }
        });
        setDiaryMap(map);
      } catch {
        if (!cancelled) {
          setDiaryMap({});
        }
      }
    };
    loadDiaries();
    return () => {
      cancelled = true;
    };
  }, [user, selectedMonth]);

  const formatYen = (v: number) =>
    new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(v);

  if (!user) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-600 shadow-sm">
        ログインするとカレンダーと日記作成を利用できます。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">カレンダー</h2>
          <button
            className="rounded border border-blue-500 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            onClick={() => setShowDiarySelectModal(true)}
            disabled={transactions.length === 0}
          >
            日記を作成
          </button>
        </div>
        <CalendarView
          events={events}
          selectedDate={selectedDate}
          onDateClick={openModalForDate}
          onEventClick={handleEventClick}
          onMonthChange={(year, month) => {
            const monthStart = new Date(year, month, 1);
            const monthStr = formatMonthParam(monthStart);
            if (monthStr === selectedMonth) return;
            const firstDayOfMonth = formatDateLocal(monthStart);
            setDateAndSyncMonth(firstDayOfMonth);
          }}
        />
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="relative flex items-center justify-center">
          <h2 className="absolute left-0 text-lg font-semibold">心の動き</h2>
          <div className="relative flex items-center justify-center gap-2">
            {granularity === "day" && (
              <>
                <button
                  className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700 hover:border-zinc-500"
                  onClick={() => moveStatsMonth(-1)}
                  disabled={loading}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={openStatsPicker}
                  className="text-sm font-semibold text-zinc-800"
                  disabled={loading}
                >
                  {happyStats.label || selectedMonthInfo?.label || ""}
                </button>
                <button
                  className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700 hover:border-zinc-500"
                  onClick={() => moveStatsMonth(1)}
                  disabled={loading}
                >
                  →
                </button>
                <button
                  className="rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:border-zinc-500"
                  onClick={jumpToCurrentMonth}
                  disabled={loading}
                >
                  今月
                </button>
                {statsPickerOpen && (
                  <div className="absolute left-1/2 z-20 mt-10 w-64 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
                    <div className="mb-2 text-sm font-semibold text-zinc-800">年と月を選択</div>
                    <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-zinc-700">
                      <label className="flex items-center gap-1">
                        年
                        <select
                          value={statsDraftYear ?? ""}
                          onChange={(e) => setStatsDraftYear(Number(e.target.value))}
                          className="w-full rounded border border-zinc-300 bg-white px-2 py-1"
                        >
                          {Array.from({ length: 21 }, (_, i) => statsYearDisplay - 10 + i).map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-1">
                        月
                        <select
                          value={statsDraftMonth ?? ""}
                          onChange={(e) => setStatsDraftMonth(Number(e.target.value))}
                          className="w-full rounded border border-zinc-300 bg-white px-2 py-1"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="flex justify-end gap-2 text-sm">
                      <button
                        onClick={cancelStatsPicker}
                        className="rounded border border-zinc-300 px-3 py-1 text-zinc-700 hover:border-zinc-500"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={applyStatsPicker}
                        className="rounded bg-black px-3 py-1 text-white hover:bg-zinc-800"
                      >
                        決定
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            {granularity === "month" && (
              <div className="flex items-center gap-2">
                <button
                  className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700 hover:border-zinc-500"
                  onClick={() => changeStatsYear(-1)}
                  disabled={loading}
                >
                  ←
                </button>
                <span className="text-sm font-semibold text-zinc-800">
                  {statsYearDisplay}年
                </span>
                <button
                  className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700 hover:border-zinc-500"
                  onClick={() => changeStatsYear(1)}
                  disabled={loading}
                >
                  →
                </button>
              </div>
            )}
            {granularity === "year" && (
              <span className="text-sm font-semibold text-zinc-800">全期間</span>
            )}
          </div>
        </div>

        <div className="mt-3 flex justify-center">
          {(["day", "month", "year"] as Granularity[]).map((g) => (
            <button
              key={g}
              className={`rounded border px-3 py-1 text-sm ${
                granularity === g
                  ? "border-black bg-black text-white"
                  : "border-zinc-300 text-zinc-700 hover:border-zinc-500"
              }`}
              onClick={() => handleChangeGranularity(g)}
              disabled={loading}
            >
              {g === "day" ? "日別" : g === "month" ? "月別" : "年別"}
            </button>
          ))}
        </div>

        <div className="mt-3 border-y border-zinc-200 py-2">
          <div className="flex items-end justify-end text-right">
            <span className="text-sm font-semibold leading-none text-zinc-800">合計 Happy Money</span>
            <span
              className={`ml-3 text-xl font-semibold leading-none ${
                happyStats.total > 0
                  ? "text-blue-800"
                  : happyStats.total < 0
                    ? "text-red-700"
                    : "text-zinc-700"
              }`}
            >
              {formatSigned(happyStats.total)}♡
            </span>
          </div>
        </div>

        <div className="mt-4 h-64 rounded" style={{ backgroundColor: "#fffaf3" }}>
          <div className="h-full px-2 py-1">
            {happyStats.data.length === 0 ? (
              <p className="text-sm text-zinc-500">データがありません</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={happyStats.data}
                  stackOffset="sign"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  <XAxis
                    dataKey="label"
                    tickFormatter={(label) => {
                      if (granularity === "day") {
                        return label.replace(/-/g, "/");
                      }
                      if (granularity === "month") {
                        return label.replace(/-/g, "/");
                      }
                      return label;
                    }}
                  />
                  <YAxis hide domain={happyScaleDomain} />
                  <ReferenceLine y={0} stroke="#0f172a" />
                  {todayInRange && (
                    <ReferenceLine
                      x={todayStr}
                      stroke="#f97316"
                      strokeDasharray="4 4"
                      label={todayLabelProps}
                    />
                  )}
                  <Bar dataKey="positive" stackId="happy" fill={HAPPY_POSITIVE_COLOR} name="プラス">
                    <LabelList dataKey="positive" content={renderPositiveLabel} />
                  </Bar>
                  <Bar dataKey="negative" stackId="happy" fill={HAPPY_NEGATIVE_COLOR} name="マイナス">
                    <LabelList dataKey="negative" content={renderNegativeLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <DayModal
        open={showModal}
        selectedDate={selectedDate}
        dayTransactions={dayTransactions}
        diaryMap={diaryMap}
        form={form}
        moodOptions={moodOptions}
        saving={saving}
        error={error}
        onChangeForm={(changes) => setForm((prev) => ({ ...prev, ...changes }))}
        onSave={handleSave}
        onNew={startNewEntry}
        onDelete={form.id ? () => handleDelete(form.id!) : undefined}
        onSelectTx={pickTransaction}
        onDiaryExisting={form.id ? handleDiaryExisting : undefined}
        onOpenDiary={handleOpenDiary}
        onClose={() => {
          setShowModal(false);
          setStartInEventList(false);
        }}
        startInEventList={startInEventList}
        formatYen={formatYen}
      />
      <DiarySelectEventModal
        open={showDiarySelectModal}
        selectedDate={selectedDate}
        transactions={transactions}
        onSelectEvent={(eventId) => {
          setShowDiarySelectModal(false);
          router.push(`/diary/create?tx_id=${eventId}`);
        }}
        onClose={() => setShowDiarySelectModal(false)}
      />
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
      {diaryModalLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 text-white">
          日記を読み込み中…
        </div>
      )}
    </div>
  );
}
