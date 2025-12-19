"use client";

import { useEffect, useMemo, useState } from "react";

import { LoginPanel } from "@/components/auth/LoginPanel";
import { CalendarView } from "@/components/calendar/CalendarView";
import { DayModal } from "@/components/modals/DayModal";
import { useTransactions } from "@/hooks/useTransactions";
import { login } from "@/lib/api";
import { moodOptions } from "@/lib/constants";
import type { Transaction, TransactionForm, User } from "@/lib/types";

export default function Home() {
  const [userIdInput, setUserIdInput] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TransactionForm>({
    date: "",
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
  } = useTransactions();

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSelectedDate(today);
    setForm((f) => ({ ...f, date: today }));
  }, []);

  const dayTransactions = useMemo(
    () => transactions.filter((t) => t.date === selectedDate),
    [transactions, selectedDate],
  );

  const events = useMemo(
    () =>
      transactions.map((t) => ({
        id: t.id,
        title: `${t.item} ¥${t.amount} (happy ¥${t.happy_amount})`,
        start: t.date,
      })),
    [transactions],
  );

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
              <div className="text-sm text-zinc-500">
                取引: {loading ? "取得中..." : `${transactions.length}件`}
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">カレンダー</h2>
                <button
                  className="rounded bg-zinc-900 px-3 py-2 text-sm text-white"
                  onClick={() => openModalForDate(selectedDate)}
                >
                  選択日のイベントを追加
                </button>
              </div>
              <div className="mt-4">
                <CalendarView
                  events={events}
                  onDateClick={openModalForDate}
                  onEventClick={handleEventClick}
                />
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
