"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { HappyChan } from "@/components/common/HappyChan";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { AppHeader } from "@/components/layout/AppHeader";
import { fetchDiaries, login, logout, me } from "@/lib/api";
import { moodOptions } from "@/lib/mood";
import type { DiaryEntry, User } from "@/lib/types";

type DiaryListPanelProps = {
  variant?: "standalone" | "embedded";
  user?: User | null;
};

const formatDateLabel = (iso?: string | null) => {
  if (!iso) return "日付不明";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
};

const formatMonthLabel = (d: Date) =>
  d.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

type ViewMode = "month" | "year";

export function DiaryListPanel({ variant = "standalone", user: externalUser = null }: DiaryListPanelProps) {
  const useExternalAuth = variant === "embedded";

  const [user, setUser] = useState<User | null>(externalUser);
  const [userIdInput, setUserIdInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewDate, setViewDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftYear, setDraftYear] = useState<number | null>(null);
  const [draftMonth, setDraftMonth] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [priceMinInput, setPriceMinInput] = useState("");
  const [priceMaxInput, setPriceMaxInput] = useState("");
  const [sentiment, setSentiment] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null);

  const closeModal = () => setSelectedDiary(null);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth() + 1;

  const yearOptions = useMemo(() => {
    const center = currentYear;
    return Array.from({ length: 9 }, (_, i) => center - 4 + i);
  }, [currentYear]);

  const parseNumberInput = (value: string) => {
    if (!value.trim()) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };

  const hasSearchFilters = useMemo(() => {
    const hasKeyword = Boolean(keyword.trim());
    const hasMin = parseNumberInput(priceMinInput) !== undefined;
    const hasMax = parseNumberInput(priceMaxInput) !== undefined;
    const hasSentiment = sentiment !== null;
    return hasKeyword || hasMin || hasMax || hasSentiment;
  }, [keyword, priceMinInput, priceMaxInput, sentiment]);

  useEffect(() => {
    if (hasSearchFilters) {
      setFiltersOpen(true);
    }
  }, [hasSearchFilters]);

  useEffect(() => {
    if (useExternalAuth) {
      setUser(externalUser);
      return;
    }
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
  }, [useExternalAuth, externalUser]);

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: {
          year?: number;
          month?: number;
          price_min?: number;
          price_max?: number;
          sentiment?: number;
        } = {};

        if (!hasSearchFilters) {
          params.year = currentYear;
          if (viewMode === "month") {
            params.month = currentMonth;
          }
        }

        const min = parseNumberInput(priceMinInput);
        const max = parseNumberInput(priceMaxInput);
        if (min !== undefined) params.price_min = min;
        if (max !== undefined) params.price_max = max;
        if (sentiment !== null) params.sentiment = sentiment;

        const data = await fetchDiaries(params);
        setDiaries(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [
    user,
    currentYear,
    currentMonth,
    viewMode,
    hasSearchFilters,
    priceMinInput,
    priceMaxInput,
    sentiment,
    keyword,
  ]);

  const handleLogin = async () => {
    if (useExternalAuth) return;
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
    if (useExternalAuth) return;
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
    const step = viewMode === "year" ? 12 : 1;
    const target = new Date(currentYear, currentMonth - 1 + delta * step, 1);
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

  const useAllTime = hasSearchFilters;

  const filteredDiaries = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return diaries;
    return diaries.filter((d) => {
      const target = `${d.diary_title || ""} ${d.diary_body || ""} ${d.event_name || ""}`.toLowerCase();
      return target.includes(q);
    });
  }, [diaries, keyword]);

  const resetFilters = () => {
    setKeyword("");
    setPriceMinInput("");
    setPriceMaxInput("");
    setSentiment(null);
  };

  const periodLabel = useMemo(
    () => (viewMode === "month" ? formatMonthLabel(viewDate) : `${currentYear}年`),
    [currentYear, viewDate, viewMode],
  );

  const emptyMessage = viewMode === "month" ? "この月の日記はまだありません" : "この年の日記はまだありません";

  const bodyContent = (
    <div className="rounded-lg bg-white p-6 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <HappyChan size="medium" variant="excited" />
          <div>
            <h1 className="text-2xl font-bold">日記一覧</h1>
          </div>
        </div>
        {!useExternalAuth && (
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:border-zinc-500"
            >
              ホームに戻る
            </Link>
          </div>
        )}
      </div>

      {!user ? (
        useExternalAuth ? (
          <div className="rounded border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-600 shadow-sm">
            ホームでログインすると日記一覧を表示できます。
          </div>
        ) : (
          <LoginPanel
            userIdInput={userIdInput}
            onChange={setUserIdInput}
            onLogin={handleLogin}
            loading={authLoading}
            error={error}
          />
        )
      ) : (
        <>
          <div className="flex flex-col items-center justify-center gap-2 px-2 py-2">
            <div className="flex items-center gap-2">
              <button
                className="flex h-9 w-9 items-center justify-center rounded border border-zinc-300 text-base hover:border-zinc-500"
                onClick={() => moveMonth(-1)}
              >
                ←
              </button>
              <button
                className="rounded px-3 py-2 text-base font-semibold"
                onClick={openPicker}
              >
                {periodLabel}
              </button>
              <button
                className="flex h-9 w-9 items-center justify-center rounded border border-zinc-300 text-base hover:border-zinc-500"
                onClick={() => moveMonth(1)}
              >
                →
              </button>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                className={`rounded border px-3 py-1 text-sm ${viewMode === "month"
                    ? "border-black bg-black text-white"
                    : "border-zinc-300 text-zinc-700 hover:border-zinc-500"
                  }`}
                onClick={() => setViewMode("month")}
              >
                月別
              </button>
              <button
                className={`rounded border px-3 py-1 text-sm ${viewMode === "year"
                    ? "border-black bg-black text-white"
                    : "border-zinc-300 text-zinc-700 hover:border-zinc-500"
                  }`}
                onClick={() => setViewMode("year")}
              >
                年別
              </button>
            </div>
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

          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-zinc-700">検索・フィルター</label>
                <p className="text-xs text-zinc-500">条件を指定すると全期間を対象に検索します</p>
              </div>
              <div className="flex items-center gap-2">
                {useAllTime && (
                  <div className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                    全期間を検索
                  </div>
                )}
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-zinc-700 transition hover:bg-zinc-100 hover:text-black"
                  onClick={() => setFiltersOpen((v) => !v)}
                  aria-expanded={filtersOpen}
                  aria-label={filtersOpen ? "フィルターを閉じる" : "フィルターを開く"}
                >
                  <span
                    className={`transition-transform duration-200 ${filtersOpen ? "rotate-180" : "rotate-0"}`}
                    aria-hidden
                  >
                    ▾
                  </span>
                </button>
              </div>
            </div>

            {!filtersOpen && (
              <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
                {hasSearchFilters ? (
                  <>
                    <span className="rounded-full bg-zinc-100 px-2 py-1">フィルター適用中</span>
                    {keyword && <span className="rounded-full bg-zinc-100 px-2 py-1">キーワード: {keyword}</span>}
                    {parseNumberInput(priceMinInput) !== undefined && (
                      <span className="rounded-full bg-zinc-100 px-2 py-1">最小: {priceMinInput}</span>
                    )}
                    {parseNumberInput(priceMaxInput) !== undefined && (
                      <span className="rounded-full bg-zinc-100 px-2 py-1">最大: {priceMaxInput}</span>
                    )}
                    {sentiment !== null && (
                      <span className="rounded-full bg-zinc-100 px-2 py-1">
                        感情: {moodOptions.find((m) => m.value === sentiment)?.label ?? sentiment}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-zinc-500">現在フィルターは未指定です</span>
                )}
              </div>
            )}

            <div
              className={`overflow-hidden transition-all duration-300 ${filtersOpen ? "max-h-[1600px] opacity-100" : "max-h-0 opacity-0"
                }`}
              aria-hidden={!filtersOpen}
            >
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">キーワード（タイトル/本文/イベント）</label>
                  <input
                    className="w-full rounded border border-zinc-300 p-2"
                    placeholder="例: ラーメン, 旅行, 嬉しい"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm text-zinc-600">金額（最小）</label>
                    <input
                      type="number"
                      className="w-full rounded border border-zinc-300 p-2"
                      placeholder="下限なし"
                      value={priceMinInput}
                      onChange={(e) => setPriceMinInput(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-zinc-600">金額（最大）</label>
                    <input
                      type="number"
                      className="w-full rounded border border-zinc-300 p-2"
                      placeholder="上限なし"
                      value={priceMaxInput}
                      onChange={(e) => setPriceMaxInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-600">感情スコア（5段階）</label>
                    <button
                      className="text-xs text-zinc-500 underline underline-offset-2"
                      type="button"
                      onClick={() => setSentiment(null)}
                    >
                      クリア
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {moodOptions.map((m) => {
                      const active = sentiment === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          className={`rounded border px-3 py-2 text-sm transition ${active
                              ? "border-black bg-black text-white"
                              : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
                            }`}
                          onClick={() => setSentiment(m.value)}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-500"
                    onClick={resetFilters}
                  >
                    条件をクリア
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {loading ? (
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-600 shadow-sm">
              読み込み中...
            </div>
          ) : filteredDiaries.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-600 shadow-sm">
              {emptyMessage}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 auto-rows-[340px]">
              {filteredDiaries.map((d) => (
                <button
                  key={d.id}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/10"
                  onClick={() => setSelectedDiary(d)}
                >
                  <div className="flex items-center justify-between rounded-t-xl bg-[#f5ede3] px-3 py-2 text-xs text-zinc-700">
                    <span>{formatDateLabel(d.transaction_date || d.created_at)}</span>
                    <span className="rounded-full border border-zinc-300 bg-white/80 px-2 py-0.5 text-[11px] text-zinc-600">
                      {d.event_name || "イベント"}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col px-4 py-3">
                    <h3 className="line-clamp-2 text-lg font-semibold text-zinc-900">
                      {d.diary_title || d.event_name || "タイトルなし"}
                    </h3>
                    <p className="mt-2 flex-1 text-sm text-zinc-700 line-clamp-4">
                      {d.diary_body || ""}
                    </p>
                    <div className="mt-3 text-right text-xs text-zinc-500">
                      作成: {formatDateLabel(d.created_at)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  if (variant === "embedded") {
    return (
      <div className="space-y-6">
        {bodyContent}
        {selectedDiary && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={closeModal}
          >
            <div
              className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
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
                  onClick={closeModal}
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

  return (
    <div className="min-h-screen bg-[var(--background)] text-zinc-900">
      <AppHeader user={user ?? null} onLogout={handleLogout} />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        {bodyContent}
      </main>

      {selectedDiary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
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
                onClick={closeModal}
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


