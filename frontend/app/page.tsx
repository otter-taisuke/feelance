"use client";

import { useEffect, useState } from "react";

import { LoginPanel } from "@/components/auth/LoginPanel";
import { DiaryListPanel } from "@/components/diary/DiaryListPanel";
import { HomeCalendarPanel } from "@/components/home/HomeCalendarPanel";
import { AppHeader } from "@/components/layout/AppHeader";
import { login, logout, me } from "@/lib/api";
import type { User } from "@/lib/types";

type TabKey = "calendar" | "diary";

export default function Home() {
  const [userIdInput, setUserIdInput] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("calendar");

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
              {(["calendar", "diary"] as TabKey[]).map((key) => (
                <button
                  key={key}
                  className={`flex-1 rounded px-4 py-2 text-sm font-semibold ${
                    activeTab === key
                      ? "bg-black text-white"
                      : "bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                  onClick={() => setActiveTab(key)}
                >
                  {key === "calendar" ? "カレンダー" : "日記一覧"}
                </button>
              ))}
            </div>
          </div>

          <div>
            {activeTab === "calendar" ? (
              <HomeCalendarPanel user={user} />
            ) : (
              <DiaryListPanel variant="embedded" user={user} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
