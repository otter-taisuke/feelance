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
  onReportExisting?: () => void;
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
  onReportExisting,
  onClose,
  formatYen,
}: Props) {
  if (!open) return null;

  // 日付をyyyy/mm/dd（曜日）形式にフォーマット
  const formatDateWithWeekday = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[date.getDay()];
    return `${year}/${month}/${day}（${weekday}）`;
  };

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
          <h3 className="text-lg font-semibold">{formatDateWithWeekday(selectedDate)}</h3>
          {form.id && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              編集モード
            </span>
          )}
          <button onClick={onClose} className="text-sm text-zinc-500 hover:font-bold">
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
            onClose={onClose}
            saving={saving}
            error={error}
          />

          <div className="space-y-3">
            <div className="rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
              <p className="font-semibold">日記を作成</p>
              <p className="mt-1 text-xs text-blue-700">
                このイベントをもとに日記レポートを作成します。
              </p>
            </div>
            {form.id && onReportExisting && (
              <button
                className="w-full rounded border border-blue-500 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                onClick={onReportExisting}
                disabled={saving}
              >
                このイベントの日記を作成
              </button>
            )}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-700">この日のイベント</h4>
                <span className="text-xs text-zinc-500">{dayTransactions.length}件</span>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto rounded border border-zinc-200 p-2">
                {dayTransactions.length === 0 && (
                  <p className="text-sm text-zinc-500">まだ登録がありません</p>
                )}
                {dayTransactions.map((tx) => {
                  const isSelected = form.id === tx.id;
                  // ハッピーマネーの値に応じてスタイルを決定
                  const getHappyMoneyStyle = () => {
                    if (tx.happy_amount > 0) {
                      // プラス：選択時はより濃い青
                      return isSelected ? "border-blue-600 bg-blue-100" : "border-blue-500 bg-blue-50";
                    } else if (tx.happy_amount < 0) {
                      // マイナス：選択時はより濃い赤
                      return isSelected ? "border-red-600 bg-red-100" : "border-red-500 bg-red-50";
                    } else {
                      // 0：選択時はより濃い灰色
                      return isSelected ? "border-gray-700 bg-gray-200" : "border-black bg-gray-100";
                    }
                  };
                  return (
                    <button
                      key={tx.id}
                      className={`w-full cursor-pointer rounded p-2 text-left transition ${
                        isSelected ? "border-2" : "border"
                      } ${getHappyMoneyStyle()}`}
                      onClick={() => onSelectTx(tx)}
                    >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{tx.item}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-zinc-600 whitespace-nowrap">
                          {tx.happy_amount >= 0 ? "+" : ""}{tx.happy_amount.toLocaleString("ja-JP")}
                        </span>
                        <span className="text-xs text-zinc-500">{formatYen(tx.amount)}</span>
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

