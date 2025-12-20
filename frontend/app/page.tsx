"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { LoginPanel } from "@/components/auth/LoginPanel";
import { HomeCalendarPanel } from "@/components/home/HomeCalendarPanel";
import { DiaryListPanel } from "@/components/diary/DiaryListPanel";
import { AppHeader } from "@/components/layout/AppHeader";
import { RetrospectivePanel } from "@/components/home/RetrospectivePanel";
import { login, logout, me } from "@/lib/api";
import type { User } from "@/lib/types";

type TabKey = "calendar" | "diary" | "retrospective";

const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const parseMonthParam = (value: string | null) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const [y, m] = value.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  if (m < 1 || m > 12) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}`;
};

export default function Home() {
  const [userIdInput, setUserIdInput] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("calendar");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonth());
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const restoreLogin = async () => {
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
    restoreLogin();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const nextTab: TabKey =
      tabParam === "diary" ? "diary" : tabParam === "retrospective" ? "retrospective" : "calendar";
    setActiveTab(nextTab);

    const monthParam = parseMonthParam(searchParams.get("month"));
    if (monthParam) {
      setSelectedMonth(monthParam);
    } else {
      const current = getCurrentMonth();
      setSelectedMonth(current);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextTab);
      params.set("month", current);
      router.replace(`/?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router]);

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    const params = new URLSearchParams();
    params.set("tab", key);
    params.set("month", selectedMonth);
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  const handleMonthChange = (monthStr: string) => {
    const normalized = parseMonthParam(monthStr) ?? getCurrentMonth();
    setSelectedMonth(normalized);
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    params.set("month", normalized);
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  const handleLogin = async () => {
    setError(null);
    setAuthLoading(true);
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
    setError(null);
    setAuthLoading(true);
    try {
      await logout();
      setUser(null);
      setUserIdInput("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-zinc-900">
      <AppHeader user={user ?? null} onLogout={user ? handleLogout : undefined} />

      {!user && (
        <div className="mx-auto max-w-2xl px-4 py-8">
          <LoginPanel
            userIdInput={userIdInput}
            onChange={setUserIdInput}
            onLogin={handleLogin}
            loading={authLoading}
            error={error}
          />
        </div>
      )}

      {user && (
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
          <div className="rounded-lg bg-white p-2 shadow-sm">
            <div className="flex gap-2">
              {(["calendar", "diary", "retrospective"] as TabKey[]).map((key) => (
                <button
                  key={key}
                  className={`flex-1 rounded px-4 py-2 text-sm font-semibold ${
                    activeTab === key
                      ? "bg-black text-white"
                      : "bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                  onClick={() => handleTabChange(key)}
                >
                  {key === "calendar" ? "カレンダー" : key === "diary" ? "日記一覧" : "振り返り"}
                </button>
              ))}
            </div>
          </div>

          <div>
            {activeTab === "calendar" && (
              <HomeCalendarPanel
                user={user}
                selectedMonth={selectedMonth}
                onChangeMonth={handleMonthChange}
              />
            )}
            {activeTab === "diary" && <DiaryListPanel variant="embedded" user={user} />}
            {activeTab === "retrospective" && user && <RetrospectivePanel user={user} />}
          </div>
        </div>
      )}
    </div>
  );
}
