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
  return (
    <div className="space-y-3">
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
          className="mt-1 w-full rounded border border-zinc-300 p-2"
          value={form.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          min="0"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        心の動き
        <select
          className="mt-1 w-full rounded border border-zinc-300 p-2"
          value={form.mood_score}
          onChange={(e) => onChange({ mood_score: Number(e.target.value) })}
        >
          {moodOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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

