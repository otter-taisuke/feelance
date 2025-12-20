"use client";

import { useEffect, useRef, useState } from "react";
import type { MoodOption, TransactionForm as FormState } from "@/lib/types";
import { HappyChan } from "@/components/common/HappyChan";

type Props = {
  form: FormState;
  moodOptions: MoodOption[];
  onChange: (changes: Partial<FormState>) => void;
  onSave: () => void;
  onNew: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  saving: boolean;
  error: string | null;
  cancelLabel?: string;
};

export function TransactionForm({
  form,
  moodOptions,
  onChange,
  onSave,
  onNew,
  onDelete,
  onClose,
  saving,
  error,
  cancelLabel,
}: Props) {
  const fallbackMoodOptions: MoodOption[] = [
    { value: -2, label: "最悪" },
    { value: -1, label: "やや悪" },
    { value: 0, label: "普通" },
    { value: 1, label: "やや良" },
    { value: 2, label: "最高" },
  ];
  const moodButtonStyles: Record<
    number,
    { emoji: string; color: string; bgColor: string; borderColor: string }
  > = {
    [-2]: { emoji: "😢", color: "text-red-600", bgColor: "bg-red-100", borderColor: "border-red-300" },
    [-1]: { emoji: "😟", color: "text-red-500", bgColor: "bg-red-50/30", borderColor: "border-red-300" },
    [0]: { emoji: "😐", color: "text-gray-600", bgColor: "bg-gray-200", borderColor: "border-gray-300" },
    [1]: { emoji: "😊", color: "text-blue-500", bgColor: "bg-blue-50/30", borderColor: "border-blue-300" },
    [2]: { emoji: "😄", color: "text-blue-600", bgColor: "bg-blue-100", borderColor: "border-blue-300" },
  };
  const options = moodOptions.length > 0 ? moodOptions : fallbackMoodOptions;
  const prevFormIdRef = useRef<string | undefined>(form.id);
  const [showHappyChan, setShowHappyChan] = useState(false);

  // YYYY-MM-DD形式をyyyy/mm/dd形式に変換
  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${year}/${month}/${day}`;
  };

  // yyyy/mm/dd形式をYYYY-MM-DD形式に変換
  const parseDateFromInput = (inputStr: string): string => {
    if (!inputStr) return "";
    // スラッシュをハイフンに置換し、YYYY-MM-DD形式に変換
    const normalized = inputStr.replace(/\//g, "-");
    const parts = normalized.split("-");
    if (parts.length === 3) {
      const year = parts[0].padStart(4, "0");
      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return inputStr;
  };

  const [dateDisplayValue, setDateDisplayValue] = useState(formatDateForDisplay(form.date));

  // form.dateが変更されたときに表示値を更新
  useEffect(() => {
    setDateDisplayValue(formatDateForDisplay(form.date));
  }, [form.date]);

  // 感情スコアに応じたハッピーちゃんのバリエーションを取得
  const getHappyChanVariant = (moodScore: number): "sobad" | "sad" | "standard" | "happy" | "excited" => {
    if (moodScore <= -2) return "sobad";
    if (moodScore === -1) return "sad";
    if (moodScore === 0) return "standard";
    if (moodScore === 1) return "happy";
    return "excited";
  };

  // 感情スコアに応じたメッセージを取得
  const getMessage = (moodScore: number): string => {
    if (moodScore <= -2) return "辛かったね。でもいつかきっと、笑える日が来るよ。";
    if (moodScore === -1) return "残念。明日は良いことがあるよ。";
    if (moodScore === 0) return "普通であることの幸せを噛みしめて。";
    if (moodScore === 1) return "良かったね。君が幸せなら僕も幸せさ。";
    return "気分はどうだい？世界はもう、君のためにあるようなものさ！";
  };

  // 新規追加成功時にハッピーちゃんを表示
  useEffect(() => {
    // 前回はidが無く、今回idが設定された場合（新規追加成功）
    if (!prevFormIdRef.current && form.id) {
      setShowHappyChan(true);
      // 3秒後に自動で非表示
      const timer = setTimeout(() => {
        setShowHappyChan(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    prevFormIdRef.current = form.id;
  }, [form.id]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-800">
          {form.id ? "編集中" : "新規入力"}
        </span>
        {form.id && <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">ID: {form.id}</span>}
      </div>

      {form.id && (
        <label className="block text-sm font-medium text-zinc-700">
          日付
          <input
            type="text"
            className="mt-1 w-full rounded border border-zinc-300 p-2"
            value={dateDisplayValue}
            onChange={(e) => {
              const inputValue = e.target.value;
              setDateDisplayValue(inputValue);
              // 入力値をYYYY-MM-DD形式に変換して保存
              const parsedDate = parseDateFromInput(inputValue);
              if (parsedDate) {
                onChange({ date: parsedDate });
              }
            }}
            placeholder="yyyy/mm/dd"
            pattern="\d{4}/\d{2}/\d{2}"
          />
        </label>
      )}

      <label className="block text-sm font-medium text-zinc-700">
        商品名
        <input
          className="mt-1 w-full rounded border border-zinc-300 p-2"
          value={form.item}
          onChange={(e) => onChange({ item: e.target.value })}
          placeholder="例: コーヒー"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        金額 (円)
        <input
          type="number"
          inputMode="decimal"
          className="mt-1 w-full rounded border border-zinc-300 p-2"
          value={form.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          min="0"
        />
      </label>

      <div className="block text-sm font-medium text-zinc-700">
        <div>心の動き</div>
        <div className="mt-2 space-y-2" role="group" aria-label="心の動き">
          <div className="relative flex items-center gap-1">
            {options.map((option) => {
              const isSelected = form.mood_score === option.value;
              const config =
                moodButtonStyles[option.value] ?? {
                  emoji: "🙂",
                  color: "text-zinc-600",
                  bgColor: "bg-gray-100",
                  borderColor: "border-gray-300",
                };
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border-2 px-1 py-1.5 transition-all focus:outline-none hover:scale-105 hover:z-10 ${
                    isSelected
                      ? `${config.bgColor} ${config.borderColor} border-2 shadow-sm`
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                  onClick={() => onChange({ mood_score: option.value })}
                  aria-pressed={isSelected}
                  aria-label={`${option.label}（${option.value}）`}
                >
                  <span className={`text-2xl ${isSelected ? config.color : "text-zinc-400"}`}>
                    {config.emoji}
                  </span>
                  <span className={`text-[10px] font-medium ${isSelected ? config.color : "text-zinc-500"}`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 min-w-[100px]"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "保存中..." : form.id ? "更新する" : "追加する"}
        </button>
        {form.id ? (
          <button
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
            onClick={onNew}
            type="button"
          >
            {cancelLabel || "新規入力に切替"}
          </button>
        ) : (
          onClose && (
            <button
              className="rounded border border-zinc-300 px-3 py-2 text-sm"
              onClick={onClose}
              type="button"
            >
              イベント一覧
            </button>
          )
        )}
        {form.id && onDelete && (
          <button
            className="ml-auto rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50 min-w-[100px]"
            onClick={onDelete}
            type="button"
            disabled={saving}
          >
            削除
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      {/* ハッピーちゃんのアニメーション */}
      {showHappyChan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-fade-in">
            <div className="flex flex-col items-center gap-3 bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200 max-w-md">
              <HappyChan size="large" variant={getHappyChanVariant(form.mood_score)} />
              <p className="text-lg font-bold text-blue-600 text-center">{getMessage(form.mood_score)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

