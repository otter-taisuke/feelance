"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { LoginPanel } from "@/components/auth/LoginPanel";
import { CalendarView } from "@/components/calendar/CalendarView";
import { DayModal } from "@/components/modals/DayModal";
import { DiarySelectEventModal } from "@/components/modals/DiarySelectEventModal";
import { useTransactions } from "@/hooks/useTransactions";
import { login, logout, me } from "@/lib/api";
import { getMoodLabel, moodOptions } from "@/lib/mood";
import type { Transaction, TransactionForm, User } from "@/lib/types";

type Granularity = "day" | "month" | "year";

const HAPPY_POSITIVE_COLOR = "#2563eb";
const HAPPY_NEGATIVE_COLOR = "#ef4444";
const HAPPY_NEUTRAL_COLOR = "#f3f4f6"; // 薄いグレー
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

export default function Home() {
  const router = useRouter();
  const [userIdInput, setUserIdInput] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => getToday());
  const [showModal, setShowModal] = useState(false);
  const [showDiarySelectModal, setShowDiarySelectModal] = useState(false);
  const [startInEventList, setStartInEventList] = useState(false);
  const [statsYear, setStatsYear] = useState<number | null>(null); // 月別グラフ用
  const [statsPickerOpen, setStatsPickerOpen] = useState(false); // 日別グラフの年月ピッカー
  const [statsDraftYear, setStatsDraftYear] = useState<number | null>(null);
  const [statsDraftMonth, setStatsDraftMonth] = useState<number | null>(null);
  const [form, setForm] = useState<TransactionForm>({
    date: getToday(),
    item: "",
    amount: "",
    mood_score: 0,
  });
  const [authLoading, setAuthLoading] = useState(false);

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
  const [granularity, setGranularity] = useState<Granularity>("day");

  useEffect(() => {
    const restoreLogin = async () => {
      setAuthLoading(true);
      try {
        const res = await me();
        setUser(res);
        await loadTransactions(res.user_id);
      } catch {
        // 未ログインの場合は無視
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    restoreLogin();
  }, [loadTransactions]);

  const dayTransactions = useMemo(
    () => transactions.filter((t) => t.date === selectedDate),
    [transactions, selectedDate],
  );

  const events = useMemo(
    () =>
      transactions.map((t) => ({
        id: t.id,
        title: `${t.happy_amount >= 0 ? "+" : ""}${t.happy_amount.toLocaleString("ja-JP")}`,
        start: t.date,
        color: t.mood_score === 0 ? HAPPY_NEUTRAL_COLOR : t.happy_amount < 0 ? HAPPY_NEGATIVE_COLOR : HAPPY_POSITIVE_COLOR,
        textColor: t.mood_score === 0 ? HAPPY_NEUTRAL_TEXT_COLOR : "#fff",
        borderColor: t.mood_score === 0 ? HAPPY_NEUTRAL_BORDER_COLOR : "transparent",
      })),
    [transactions],
  );

  const selectedMonth = useMemo(() => {
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
      if (!selectedMonth) return { data: [], total: 0, label: "" };
      const grouped = new Map<string, { positive: number; negative: number }>();
      transactions.forEach((t) => {
        const d = new Date(`${t.date}T00:00:00`);
        if (d.getFullYear() === selectedMonth.year && d.getMonth() === selectedMonth.month) {
          const current = grouped.get(t.date) ?? { positive: 0, negative: 0 };
          if (t.happy_amount >= 0) {
            current.positive += t.happy_amount;
          } else {
            current.negative += t.happy_amount;
          }
          grouped.set(t.date, current);
        }
      });
      const data = Array.from(grouped.entries())
        .map(([date, happy]) => ({
          label: date,
          positive: happy.positive,
          negative: happy.negative,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      const total = data.reduce((sum, entry) => sum + entry.positive + entry.negative, 0);
      return { data, total, label: `${selectedMonth.label}` };
    }

    if (granularity === "month") {
      const baseYear = statsYear ?? selectedMonth?.year ?? new Date().getFullYear();
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

    // year
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
  }, [granularity, selectedMonth, transactions, statsYear]);

  useEffect(() => {
    if (granularity === "month") {
      if (statsYear === null) {
        setStatsYear(selectedMonth?.year ?? new Date().getFullYear());
      }
    } else if (granularity !== "day") {
      setStatsPickerOpen(false);
    }
  }, [granularity, selectedMonth, statsYear]);

  const statsYearDisplay = statsYear ?? selectedMonth?.year ?? new Date().getFullYear();

  const changeStatsYear = (delta: number) => {
    setStatsYear((prev) => (prev ?? statsYearDisplay) + delta);
  };

  const moveStatsMonth = (delta: number) => {
    const base = selectedMonth
      ? new Date(selectedMonth.year, selectedMonth.month, 1)
      : new Date();
    const target = new Date(base.getFullYear(), base.getMonth() + delta, 1);
    setSelectedDate(formatDateLocal(target));
  };

  const openStatsPicker = () => {
    const base = selectedMonth
      ? { year: selectedMonth.year, month: selectedMonth.month + 1 }
      : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
    setStatsDraftYear(base.year);
    setStatsDraftMonth(base.month);
    setStatsPickerOpen(true);
  };

  const applyStatsPicker = () => {
    if (statsDraftYear && statsDraftMonth) {
      const target = new Date(statsDraftYear, statsDraftMonth - 1, 1);
      setSelectedDate(formatDateLocal(target));
    }
    setStatsPickerOpen(false);
  };

  const cancelStatsPicker = () => setStatsPickerOpen(false);

  const totalBadgeClass = useMemo(() => {
    if (happyStats.total > 0) return "border-blue-300 bg-blue-50 text-blue-900";
    if (happyStats.total < 0) return "border-red-300 bg-red-50 text-red-900";
    return "border-zinc-300 bg-zinc-100 text-zinc-700";
  }, [happyStats.total]);

  const handleChangeGranularity = (g: Granularity) => {
    setGranularity(g);
    if (g === "month") {
      setStatsYear((prev) => prev ?? selectedMonth?.year ?? new Date().getFullYear());
      setStatsPickerOpen(false);
    } else if (g === "day") {
      setStatsPickerOpen(false);
    } else {
      // year
      setStatsPickerOpen(false);
    }
  };

  const formatYenSigned = (v: number) => {
    const sign = v > 0 ? "+" : v < 0 ? "-" : "";
    return `￥${sign}${Math.abs(v).toLocaleString("ja-JP")}`;
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

  const handleLogin = async () => {
    setError(null);
    setAuthLoading(true);
    try {
      const res = await login(userIdInput.trim());
      setUser(res);
      await loadTransactions(res.user_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setError(null);
    setAuthLoading(true);
    try {
      await logout();
      setUser(null);
      setUserIdInput("");
      resetTransactions();
      setShowModal(false);
      setForm((prev) => ({ ...prev, id: undefined }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const openModalForDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    resetForm(dateStr);
    const hasEventsForDate = transactions.some((t) => t.date === dateStr);
    setStartInEventList(hasEventsForDate);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.item || !form.amount || !form.date) {
      setError("日付・商品名・金額は必須です");
      return;
    }
    try {
      const saved = await upsertTransaction(user.user_id, form);
      // 保存されたトランザクションのIDを設定して編集モードに遷移
      setForm({
        id: saved.id,
        date: saved.date,
        item: saved.item,
        amount: String(saved.amount),
        mood_score: saved.mood_score,
      });
    } catch {
      // error state is set in hook
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    try {
      await removeTransaction(id);
      resetForm(selectedDate);
    } catch {
      // error state is set in hook
    }
  };

  const startNewEntry = () => resetForm(selectedDate);

  const handleDiaryExisting = () => {
    if (!form.id) return;
    setShowModal(false);
    router.push(`/diary/create?tx_id=${form.id}`);
  };

  const handleEventClick = (eventId: string) => {
    const target = transactions.find((t) => t.id === eventId);
    if (!target) return;
    setSelectedDate(target.date);
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

  const formatYen = (v: number) =>
    new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(
      v,
    );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Feelance</h1>
            <p className="text-sm text-zinc-600">
              家計簿＋感情スコアでHappy Moneyを可視化
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold">
                {user.display_name || user.user_id}
              </span>
              <button
                className="rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:border-zinc-500 disabled:opacity-50"
                onClick={handleLogout}
                disabled={authLoading}
              >
                ログアウト
              </button>
            </div>
          )}
        </header>

        {!user && (
          <LoginPanel
            userIdInput={userIdInput}
            onChange={setUserIdInput}
            onLogin={handleLogin}
            loading={authLoading}
            error={error}
          />
        )}

        {user && (
          <>

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
                  const firstDayOfMonth = formatDateLocal(new Date(year, month, 1));
                  if (selectedDate !== firstDayOfMonth) {
                    setSelectedDate(firstDayOfMonth);
                  }
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
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={openStatsPicker}
                        className="text-sm font-semibold text-zinc-800"
                      >
                        {happyStats.label || selectedMonth?.label || ""}
                      </button>
                      <button
                        className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700 hover:border-zinc-500"
                        onClick={() => moveStatsMonth(1)}
                      >
                        →
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
                      >
                        ←
                      </button>
                      <span className="text-sm font-semibold text-zinc-800">
                        {statsYearDisplay}年
                      </span>
                      <button
                        className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700 hover:border-zinc-500"
                        onClick={() => changeStatsYear(1)}
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
                    {formatYenSigned(happyStats.total)}
                  </span>
                </div>
              </div>

              <div className="mt-4 h-64">
                {happyStats.data.length === 0 ? (
                  <p className="text-sm text-zinc-500">データがありません</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={happyStats.data} stackOffset="sign">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tickFormatter={(label) => {
                          if (granularity === "day") {
                            // YYYY-MM-DD形式をYYYY/MM/DD形式に変換
                            return label.replace(/-/g, "/");
                          }
                          if (granularity === "month") {
                            // YYYY-MM形式をYYYY/MM形式に変換
                            return label.replace(/-/g, "/");
                          }
                          return label;
                        }}
                      />
                      <YAxis
                        domain={[
                          (dataMin: number) => Math.min(0, dataMin),
                          (dataMax: number) => Math.max(0, dataMax),
                        ]}
                      />
                      <Tooltip
                        formatter={(value) => formatYen(Number(value))}
                        labelFormatter={(label) => {
                          if (granularity === "day") {
                            return new Date(`${label}T00:00:00`).toLocaleDateString(
                              "ja-JP",
                              { month: "numeric", day: "numeric" },
                            );
                          }
                          if (granularity === "month") {
                            const [y, m] = String(label).split("-");
                            return `${Number(y)}年${Number(m)}月`;
                          }
                          return `${label}年`;
                        }}
                      />
                      <ReferenceLine y={0} stroke="#0f172a" />
                      <Bar
                        dataKey="positive"
                        stackId="happy"
                        fill={HAPPY_POSITIVE_COLOR}
                        name="プラス"
                      />
                      <Bar
                        dataKey="negative"
                        stackId="happy"
                        fill={HAPPY_NEGATIVE_COLOR}
                        name="マイナス"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <DayModal
        open={showModal}
        selectedDate={selectedDate}
        dayTransactions={dayTransactions}
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
        events={events}
        onSelectEvent={(eventId) => {
          setShowDiarySelectModal(false);
          router.push(`/diary/create?tx_id=${eventId}`);
        }}
        onClose={() => setShowDiarySelectModal(false)}
      />
    </div>
  );
}
