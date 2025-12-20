"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { logout, me } from "@/lib/api";
import type { User } from "@/lib/types";

type AppHeaderProps = {
  user?: User | null;
  onLogout?: () => Promise<void> | void;
};

export function AppHeader({ user: controlledUser, onLogout }: AppHeaderProps) {
  const [selfUser, setSelfUser] = useState<User | null>(controlledUser ?? null);
  const [loading, setLoading] = useState(false);

  const user = useMemo(
    () => (controlledUser !== undefined ? controlledUser : selfUser),
    [controlledUser, selfUser],
  );

  useEffect(() => {
    if (controlledUser !== undefined) {
      setSelfUser(controlledUser);
      return;
    }

    const restore = async () => {
      setLoading(true);
      try {
        const res = await me();
        setSelfUser(res);
      } catch {
        setSelfUser(null);
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, [controlledUser]);

  const handleLogout = async () => {
    if (!user) return;
    if (onLogout) {
      await onLogout();
      return;
    }
    setLoading(true);
    try {
      await logout();
      setSelfUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="bg-[var(--background)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-2xl font-bold text-zinc-900">
            Feelance
          </Link>
          <p className="text-sm text-zinc-600">
            家計簿＋感情スコアでHappy Moneyを可視化
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-lg font-semibold text-zinc-900">
                {user.display_name || user.user_id}
              </span>
              <button
                className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:border-zinc-500 disabled:opacity-50"
                onClick={handleLogout}
                disabled={loading}
              >
                ログアウト
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="h-px bg-zinc-200" />
    </header>
  );
}

