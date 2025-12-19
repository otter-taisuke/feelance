"use client";

import type { MoodOption, TransactionForm as FormState } from "@/lib/types";

type Props = {
  form: FormState;
  moodOptions: MoodOption[];
  onChange: (changes: Partial<FormState>) => void;
  onSave: () => void;
  onNew: () => void;
  onDelete?: () => void;
  saving: boolean;
  error: string | null;
};

export function TransactionForm({
  form,
  moodOptions,
  onChange,
  onSave,
  onNew,
  onDelete,
  saving,
  error,
}: Props) {
  const moodScale = [-2, -1, 0, 1, 2];
  const activeStarIndex = (() => {
    const idx = moodScale.indexOf(form.mood_score);
    return idx >= 0 ? idx : 2;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-800">
          {form.id ? "編集中" : "新規入力"}
        </span>
        {form.id && <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">ID: {form.id}</span>}
      </div>

      <label className="block text-sm font-medium text-zinc-700">
        日付
        <input
          type="date"
          className="mt-1 w-full rounded border border-zinc-300 p-2"
          value={form.date}
          onChange={(e) => onChange({ date: e.target.value })}
        />
      </label>

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

      <label className="block text-sm font-medium text-zinc-700">
        心の動き
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            {moodScale.map((value, idx) => {
              const isSelected = form.mood_score === value;
              const moodConfig = [
                { emoji: "😢", label: "最悪", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-300" },
                { emoji: "😟", label: "やや悪", color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-300" },
                { emoji: "😐", label: "普通", color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-300" },
                { emoji: "😊", label: "やや良", color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-300" },
                { emoji: "😄", label: "最高", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-300" },
              ];
              const config = moodConfig[idx];
              return (
                <button
                  key={value}
                  type="button"
                  className={`flex flex-1 flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all hover:scale-105 focus:outline-none ${
                    isSelected
                      ? `${config.bgColor} ${config.borderColor} border-2 shadow-sm`
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                  onClick={() => onChange({ mood_score: value })}
                  aria-pressed={isSelected}
                  aria-label={`${config.label}（${value}）`}
                >
                  <span className={`text-3xl ${isSelected ? config.color : "text-zinc-400"}`}>
                    {config.emoji}
                  </span>
                  <span className={`text-xs font-medium ${isSelected ? config.color : "text-zinc-500"}`}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
          
        </div>
      </label>

      <div className="flex items-center gap-2">
        <button
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "保存中..." : form.id ? "更新する" : "追加する"}
        </button>
        <button
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
          onClick={onNew}
          type="button"
        >
          新規入力に切替
        </button>
        {form.id && onDelete && (
          <button
            className="text-sm text-red-600"
            onClick={onDelete}
            type="button"
          >
            削除
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

