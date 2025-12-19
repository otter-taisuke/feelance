"use client";

import type { MoodOption, Transaction, TransactionForm as FormState } from "@/lib/types";

import { TransactionForm } from "../forms/TransactionForm";

type Props = {
  open: boolean;
  selectedDate: string;
  dayTransactions: Transaction[];
  form: FormState;
  moodOptions: MoodOption[];
  saving: boolean;
  error: string | null;
  onChangeForm: (changes: Partial<FormState>) => void;
  onSave: () => void;
  onNew: () => void;
  onDelete?: () => void;
  onSelectTx: (tx: Transaction) => void;
  onClose: () => void;
  formatYen: (v: number) => string;
};

export function DayModal({
  open,
  selectedDate,
  dayTransactions,
  form,
  moodOptions,
  saving,
  error,
  onChangeForm,
  onSave,
  onNew,
  onDelete,
  onSelectTx,
  onClose,
  formatYen,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{selectedDate} のイベント</h3>
          {form.id && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              編集モード
            </span>
          )}
          <button onClick={onClose} className="text-sm text-zinc-500">
            閉じる
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TransactionForm
            form={form}
            moodOptions={moodOptions}
            onChange={onChangeForm}
            onSave={onSave}
            onNew={onNew}
            onDelete={onDelete}
            saving={saving}
            error={error}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-zinc-700">この日のイベント</h4>
              <span className="text-xs text-zinc-500">{dayTransactions.length}件</span>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto rounded border border-zinc-200 p-2">
              {dayTransactions.length === 0 && (
                <p className="text-sm text-zinc-500">まだ登録がありません</p>
              )}
              {dayTransactions.map((tx) => (
                <button
                  key={tx.id}
                  className={`w-full cursor-pointer rounded border p-2 text-left transition ${
                    form.id === tx.id
                      ? "border-blue-400 bg-blue-50"
                      : "border-zinc-200 hover:border-zinc-400"
                  }`}
                  onClick={() => onSelectTx(tx)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{tx.item}</span>
                    <span className="text-sm text-zinc-600">{formatYen(tx.amount)}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    mood: {tx.mood_score} / happy {formatYen(tx.happy_amount)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

