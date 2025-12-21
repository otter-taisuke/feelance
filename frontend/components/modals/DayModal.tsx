"use client";

import { useEffect, useRef, useState } from "react";
import type { MoodOption, Transaction, TransactionForm as FormState } from "@/lib/types";

import { HappyChan } from "@/components/common/HappyChan";
import { TransactionForm } from "../forms/TransactionForm";

type Props = {
  open: boolean;
  selectedDate: string;
  dayTransactions: Transaction[];
  diaryMap?: Record<string, string | undefined>;
  form: FormState;
  moodOptions: MoodOption[];
  saving: boolean;
  error: string | null;
  onChangeForm: (changes: Partial<FormState>) => void;
  onSave: () => Promise<void> | void;
  onNew: () => void;
  onDelete?: () => void;
  onSelectTx: (tx: Transaction) => void;
  onDiaryExisting?: () => void;
  onOpenDiary?: (txId: string) => void;
  onClose: () => void;
  startInEventList: boolean;
  formatYen: (v: number) => string;
};

export function DayModal({
  open,
  selectedDate,
  dayTransactions,
  diaryMap,
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
  onOpenDiary,
  onClose,
  startInEventList,
  formatYen,
}: Props) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEventList, setShowEventList] = useState(startInEventList);
  const prevFormIdRef = useRef<string | undefined>(form.id);

  useEffect(() => {
    if (open) {
      setShowEventList(startInEventList);
    }
  }, [open, startInEventList]);

  useEffect(() => {
    if (!form.id) {
      setShowEditModal(false);
    }
  }, [form.id]);

  // 新規作成から編集モードに変わった時（保存成功時）にハッピーちゃん表示後にイベント一覧に遷移
  useEffect(() => {
    // 前回はidが無く、今回idが設定された場合（新規追加成功）
    if (!prevFormIdRef.current && form.id && !showEventList) {
      // ハッピーちゃんのアニメーション（3秒）が終わってから遷移
      const timer = setTimeout(() => {
        setShowEventList(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
    prevFormIdRef.current = form.id;
  }, [form.id, showEventList]);

  const handleShowEventList = () => setShowEventList(true);

  const handleAddNew = () => {
    onNew();
    setShowEventList(false);
    setShowEditModal(false);
  };

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

  const hasSelection = Boolean(form.id);
  const editDisabled = !hasSelection;
  const diaryDisabled = !hasSelection || !onDiaryExisting || saving;
  const hasDiaryForSelection = form.id ? Boolean(diaryMap?.[form.id]) : false;
  const diaryOpenDisabled = !hasSelection || !hasDiaryForSelection || !onOpenDiary;
  const pressableClass = "transition active:translate-y-[1px] active:scale-[0.99]";

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

        {showEventList ? (
          // イベント一覧を表示
          <div className="mt-4 space-y-4">
            <div className="space-y-3">
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-sm font-semibold text-zinc-700">この日のイベント</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{dayTransactions.length}件</span>
                    <button
                      className={`rounded bg-black px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 ${pressableClass}`}
                      onClick={handleAddNew}
                    >
                      追加する
                    </button>
                  </div>
                </div>
                <div className="max-h-80 space-y-2 overflow-y-auto rounded border border-zinc-200 p-2">
                  {dayTransactions.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-8">
                      <HappyChan size="medium" />
                      <p className="text-sm text-zinc-500">まだ登録がありません</p>
                    </div>
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
                    const hasDiary = Boolean(diaryMap?.[tx.id]);
                    return (
                      <button
                        key={tx.id}
                        className={`w-full cursor-pointer rounded p-2 text-left transition ${
                          isSelected ? "border-2" : "border"
                        } ${getHappyMoneyStyle()}`}
                        onClick={() => onSelectTx(tx)}
                      >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{tx.item}</span>
                          {hasDiary && (
                            <span aria-label="日記あり" title="日記あり" className="text-xs">
                              📖
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm text-zinc-600 whitespace-nowrap">
                            {tx.happy_amount >= 0 ? "+" : ""}{tx.happy_amount.toLocaleString("ja-JP")}♡
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

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-zinc-600">
                {hasSelection ? "選択中のイベントを操作できます" : "イベントを選択すると操作ボタンが有効になります"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`rounded px-4 py-2 text-sm font-semibold ${pressableClass} ${
                    editDisabled
                      ? "cursor-not-allowed bg-zinc-200 text-zinc-400"
                      : "bg-black text-white shadow-sm hover:bg-zinc-800"
                  }`}
                  onClick={() => setShowEditModal(true)}
                  disabled={editDisabled}
                >
                  編集する
                </button>
                <button
                  className={`rounded px-4 py-2 text-sm font-semibold ${pressableClass} ${
                    diaryDisabled
                      ? "cursor-not-allowed bg-zinc-200 text-zinc-400"
                      : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                  }`}
                  onClick={() => onDiaryExisting?.()}
                  disabled={diaryDisabled}
                >
                  日記作成
                </button>
                <button
                  className={`rounded px-4 py-2 text-sm font-semibold ${pressableClass} ${
                    diaryOpenDisabled
                      ? "cursor-not-allowed bg-zinc-200 text-zinc-400"
                      : "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                  }`}
                  onClick={() => form.id && onOpenDiary?.(form.id)}
                  disabled={diaryOpenDisabled}
                >
                  日記を開く
                </button>
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
              onNew={handleAddNew}
              onDelete={onDelete}
              onClose={handleShowEventList}
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
          onClick={() => {
            setShowEditModal(false);
            onClose();
          }}
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
                onClick={() => {
                  setShowEditModal(false);
                  onClose();
                }}
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
                onSave={async () => {
                  await onSave();
                  // ハッピーちゃん表示の3秒を待ってから閉じる
                  setTimeout(() => setShowEditModal(false), 3200);
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

