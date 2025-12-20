"use client";

import { useEffect, useState } from "react";
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
  onDiaryExisting?: () => void;
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
  onDiaryExisting,
  onClose,
  formatYen,
}: Props) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEventList, setShowEventList] = useState(false);

  // フォームが変更されたら編集モーダルの表示状態をリセット
  useEffect(() => {
    if (!form.id) {
      setShowEditModal(false);
      setShowEventList(false);
    }
  }, [form.id]);

  // モーダルが開かれた時にイベント一覧表示をリセット
  useEffect(() => {
    if (open && !form.id) {
      setShowEventList(false);
    }
  }, [open, form.id]);

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

        {form.id ? (
          // 編集モード時：右側のイベントリストのみ表示
          <div className="mt-4" onClick={() => onNew()}>
            <div className="space-y-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-zinc-700">この日のイベント</h4>
                  <span className="text-xs text-zinc-500">{dayTransactions.length}件</span>
                </div>
                <div
                  className="max-h-80 space-y-2 overflow-y-auto rounded border border-zinc-200 p-2"
                  onClick={(e) => e.stopPropagation()}
                >
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
            <div className="mt-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
                onClick={() => setShowEditModal(true)}
              >
                編集する
              </button>
              {onDiaryExisting && (
                <button
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  onClick={onDiaryExisting}
                  disabled={saving}
                >
                  日記作成
                </button>
              )}
            </div>
          </div>
        ) : showEventList ? (
          // 新規作成時：イベント一覧を表示
          <div className="mt-4">
            <div className="space-y-3">
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
        ) : (
          // 新規作成時：記入画面のみ表示
          <div className="mt-4">
            <TransactionForm
              form={form}
              moodOptions={moodOptions}
              onChange={onChangeForm}
              onSave={onSave}
              onNew={onNew}
              onDelete={onDelete}
              onClose={() => setShowEventList(true)}
              saving={saving}
              error={error}
            />
          </div>
        )}
      </div>

      {/* 編集用ポップアップ */}
      {showEditModal && form.id && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4"
          onClick={() => setShowEditModal(false)}
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
              <button
                onClick={() => setShowEditModal(false)}
                className="text-sm text-zinc-500 hover:font-bold"
              >
                閉じる
              </button>
            </div>

            <div className="mt-4">
              <TransactionForm
                form={form}
                moodOptions={moodOptions}
                onChange={onChangeForm}
                onSave={() => {
                  onSave();
                  setShowEditModal(false);
                }}
                onNew={() => setShowEditModal(false)}
                onDelete={onDelete}
                onClose={() => setShowEditModal(false)}
                saving={saving}
                error={error}
                cancelLabel="キャンセル"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

