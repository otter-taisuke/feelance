"use client";

import { useEffect, useMemo, useState } from "react";

import type { Transaction } from "@/lib/types";

type Props = {
  open: boolean;
  selectedDate: string;
  transactions: Transaction[];
  onClose: () => void;
  onSelectEvent: (eventId: string) => void;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const formatMonthLabel = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
};

const formatDayAndWeek = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const weekday = WEEKDAYS[date.getDay()];
  return `${month}/${day}（${weekday}）`;
};

const isSameMonth = (baseDate: string, targetDate: string) => {
  const base = new Date(`${baseDate}T00:00:00`);
  const target = new Date(`${targetDate}T00:00:00`);
  return base.getFullYear() === target.getFullYear() && base.getMonth() === target.getMonth();
};

export function DiarySelectEventModal({
  open,
  selectedDate,
  transactions,
  onClose,
  onSelectEvent,
}: Props) {
  const [date, setDate] = useState(selectedDate);

  useEffect(() => {
    if (open) {
      setDate(selectedDate);
    }
  }, [open, selectedDate]);

  const monthEvents = useMemo(
    () =>
      transactions
        .filter((tx) => isSameMonth(date, tx.date))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [date, transactions],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">日記を作成するイベントを選択</h3>
            <span className="text-sm font-semibold text-zinc-700">{formatMonthLabel(date)}</span>
          </div>
          <button onClick={onClose} className="text-sm text-zinc-500 hover:font-bold">
            閉じる
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-600">この月のイベントから選択して日記を作成できます。</p>

        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-sm font-semibold text-zinc-700">この月のイベント</h4>
            <span className="text-xs text-zinc-500">{monthEvents.length}件</span>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto rounded border border-zinc-200 p-2">
            {monthEvents.length === 0 && (
              <p className="text-sm text-zinc-500">この月にはイベントがありません</p>
            )}
            {monthEvents.map((tx) => {
              const happyColor =
                tx.happy_amount > 0
                  ? "bg-blue-50 border-blue-500 text-blue-900"
                  : tx.happy_amount < 0
                    ? "bg-red-50 border-red-500 text-red-900"
                    : "bg-gray-100 border-gray-400 text-zinc-800";

              return (
                <button
                  key={tx.id}
                  className={`w-full cursor-pointer rounded border px-3 py-2 text-left transition hover:-translate-y-[1px] hover:shadow-sm ${happyColor}`}
                  onClick={() => onSelectEvent(tx.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-24 shrink-0 text-sm font-semibold text-zinc-700">
                      <div>{formatDayAndWeek(tx.date)}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-zinc-900">{tx.item}</span>
                        <span className="text-sm text-zinc-700">
                          {tx.happy_amount >= 0 ? "+" : ""}
                          {tx.happy_amount.toLocaleString("ja-JP")}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        ￥{Math.abs(tx.amount).toLocaleString("ja-JP")}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

