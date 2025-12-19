"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useTransactions } from "@/hooks/useTransactions";
import { login, logout, me } from "@/lib/api";
import { moodOptions } from "@/lib/constants";
import type { Transaction, TransactionForm, User } from "@/lib/types";

type Granularity = "day" | "month" | "year";

const HAPPY_POSITIVE_COLOR = "#2563eb";
const HAPPY_NEGATIVE_COLOR = "#ef4444";

type HappyStatDatum = { label: string; positive: number; negative: number };
type HappyStats = { data: HappyStatDatum[]; total: number; label: string };

const getToday = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const [userIdInput, setUserIdInput] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => getToday());
  const [showModal, setShowModal] = useState(false);
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
        color: t.happy_amount < 0 ? HAPPY_NEGATIVE_COLOR : HAPPY_POSITIVE_COLOR,
        textColor: "#fff",
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
      return { data, total, label: `${selectedMonth.label}（日別）` };
    }

    if (granularity === "month") {
      const baseYear = selectedMonth?.year ?? new Date().getFullYear();
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
      return { data, total, label: `${baseYear}年（月別）` };
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
    return { data, total, label: "全期間（年別）" };
  }, [granularity, selectedMonth, transactions]);

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
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.item || !form.amount || !form.date) {
      setError("日付・商品名・金額は必須です");
      return;
    }
    try {
      await upsertTransaction(user.user_id, form);
      resetForm(form.date);
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

  const handleEventClick = (eventId: string) => {
    const target = transactions.find((t) => t.id === eventId);
    if (!target) return;
    setSelectedDate(target.date);
    setForm({
      id: target.id,
      date: target.date,
      item: target.item,
      amount: String(target.amount),
      mood_score: target.mood_score,
    });
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
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Feelance</h1>
          <p className="text-sm text-zinc-600">
            家計簿＋感情スコアでHappy Moneyを可視化
          </p>
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
            <div className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-zinc-600">ユーザー</p>
                <p className="text-lg font-semibold">
                  {user.display_name || user.user_id}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-zinc-500">
                  取引: {loading ? "取得中..." : `${transactions.length}件`}
                </div>
                <button
                  className="rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:border-zinc-500 disabled:opacity-50"
                  onClick={handleLogout}
                  disabled={authLoading}
                >
                  ログアウト
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">カレンダー</h2>
              </div>
              <div className="mt-4">
                <CalendarView
                  events={events}
                  selectedDate={selectedDate}
                  onDateClick={openModalForDate}
                  onEventClick={handleEventClick}
                />
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Happy Money 統計</h2>
                {happyStats.label && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-zinc-500">{happyStats.label}</p>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800 shadow-sm">
                      合計 {formatYen(happyStats.total)} Happy Money
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                {(["day", "month", "year"] as Granularity[]).map((g) => (
                  <button
                    key={g}
                    className={`rounded border px-3 py-1 text-sm ${
                      granularity === g
                        ? "border-black bg-black text-white"
                        : "border-zinc-300 text-zinc-700 hover:border-zinc-500"
                    }`}
                    onClick={() => setGranularity(g)}
                  >
                    {g === "day" ? "日別" : g === "month" ? "月別" : "年別"}
                  </button>
                ))}
              </div>
              <div className="mt-4 h-64">
                {happyStats.data.length === 0 ? (
                  <p className="text-sm text-zinc-500">データがありません</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={happyStats.data} stackOffset="sign">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
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
        onClose={() => setShowModal(false)}
        formatYen={formatYen}
      />
    </div>
  );
}
