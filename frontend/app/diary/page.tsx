"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LoginPanel } from "@/components/auth/LoginPanel";
import { fetchDiaries, login, logout, me } from "@/lib/api";
import type { DiaryEntry, User } from "@/lib/types";

const formatDateLabel = (iso?: string | null) => {
  if (!iso) return "日付不明";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
};

const formatMonthLabel = (d: Date) =>
  d.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

const truncate = (text: string, limit = 180) => {
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
};

export default function DiaryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userIdInput, setUserIdInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewDate, setViewDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftYear, setDraftYear] = useState<number | null>(null);
  const [draftMonth, setDraftMonth] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");

  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth() + 1;

  const yearOptions = useMemo(() => {
    const center = currentYear;
    return Array.from({ length: 9 }, (_, i) => center - 4 + i);
  }, [currentYear]);

  useEffect(() => {
    const restore = async () => {
      setAuthLoading(true);
      try {
        const res = await me();
        setUser(res);
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    restore();
  }, []);

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDiaries({ year: currentYear, month: currentMonth });
        setDiaries(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user, currentYear, currentMonth]);

  const handleLogin = async () => {
    setAuthLoading(true);
    setError(null);
    try {
      const res = await login(userIdInput.trim());
      setUser(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    setError(null);
    try {
      await logout();
      setUser(null);
      setUserIdInput("");
      setDiaries([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const moveMonth = (delta: number) => {
    const target = new Date(currentYear, currentMonth - 1 + delta, 1);
    setViewDate(target);
  };

  const openPicker = () => {
    setDraftYear(currentYear);
    setDraftMonth(currentMonth);
    setPickerOpen(true);
  };

  const applyPicker = () => {
    if (draftYear && draftMonth) {
      setViewDate(new Date(draftYear, draftMonth - 1, 1));
    }
    setPickerOpen(false);
  };

  const cancelPicker = () => setPickerOpen(false);

  const filteredDiaries = useMemo(() => {
    if (!keyword) return diaries;
    const lower = keyword.toLowerCase();
    return diaries.filter((d) => {
      const target = `${d.diary_title || ""} ${d.diary_body || ""} ${d.event_name || ""}`.toLowerCase();
      return target.includes(lower);
    });
  }, [diaries, keyword]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">日記一覧</h1>
            <p className="text-sm text-zinc-600">作成済みの日記を月別に閲覧できます</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:border-zinc-500"
            >
              ホームに戻る
            </Link>
            {user ? (
              <button
                className="rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:border-zinc-500 disabled:opacity-50"
                onClick={handleLogout}
                disabled={authLoading}
              >
                {authLoading ? "処理中..." : "ログアウト"}
              </button>
            ) : null}
          </div>
        </header>

        {!user ? (
          <LoginPanel
            userIdInput={userIdInput}
            onChange={setUserIdInput}
            onLogin={handleLogin}
            loading={authLoading}
            error={error}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  className="rounded border border-zinc-300 px-2 py-1 text-sm hover:border-zinc-500"
                  onClick={() => moveMonth(-1)}
                >
                  ← 先月
                </button>
                <button
                  className="rounded border border-zinc-300 px-3 py-2 text-base font-semibold hover:border-zinc-500"
                  onClick={openPicker}
                >
                  {formatMonthLabel(viewDate)}
                </button>
                <button
                  className="rounded border border-zinc-300 px-2 py-1 text-sm hover:border-zinc-500"
                  onClick={() => moveMonth(1)}
                >
                  来月 →
                </button>
              </div>
              <div className="text-sm text-zinc-500">クリックで年月選択</div>
            </div>

            {pickerOpen && (
              <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-zinc-600">年</label>
                  <select
                    className="rounded border border-zinc-300 px-2 py-2"
                    value={draftYear ?? ""}
                    onChange={(e) => setDraftYear(Number(e.target.value))}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}年
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-zinc-600">月</label>
                  <select
                    className="rounded border border-zinc-300 px-2 py-2"
                    value={draftMonth ?? ""}
                    onChange={(e) => setDraftMonth(Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m}月
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded bg-black px-4 py-2 text-white"
                    onClick={applyPicker}
                  >
                    移動
                  </button>
                  <button
                    className="rounded border border-zinc-300 px-4 py-2 text-zinc-700"
                    onClick={cancelPicker}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <label className="text-sm text-zinc-600">キーワード検索（タイトル/本文/イベント）</label>
              <input
                className="mt-2 w-full rounded border border-zinc-300 p-2"
                placeholder="例: ラーメン, 旅行, 嬉しい"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            {loading ? (
              <div className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-600 shadow-sm">
                読み込み中...
              </div>
            ) : filteredDiaries.length === 0 ? (
              <div className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-600 shadow-sm">
                この月の日記はまだありません
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {filteredDiaries.map((d) => (
                  <button
                    key={d.id}
                    className="group flex aspect-square flex-col rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    onClick={() => setSelectedDiary(d)}
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{formatDateLabel(d.transaction_date || d.created_at)}</span>
                      <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600">
                        {d.event_name || "イベント"}
                      </span>
                    </div>
                    <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-zinc-900">
                      {d.diary_title || d.event_name || "タイトルなし"}
                    </h3>
                    <p className="mt-2 flex-1 text-sm text-zinc-700">
                      {truncate(d.diary_body || "")}
                    </p>
                    <div className="mt-3 text-right text-xs text-zinc-500">
                      作成: {formatDateLabel(d.created_at)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selectedDiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500">
                  {formatDateLabel(selectedDiary.transaction_date || selectedDiary.created_at)}
                </p>
                <h2 className="text-xl font-bold text-zinc-900">
                  {selectedDiary.diary_title || selectedDiary.event_name || "タイトルなし"}
                </h2>
                <p className="text-sm text-zinc-600">{selectedDiary.event_name}</p>
              </div>
              <button
                className="rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:border-zinc-500"
                onClick={() => setSelectedDiary(null)}
              >
                閉じる
              </button>
            </div>
            <div className="prose prose-sm max-w-none whitespace-pre-line text-zinc-800">
              {selectedDiary.diary_body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

