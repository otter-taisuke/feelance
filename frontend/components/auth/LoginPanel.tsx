"use client";

import { HappyChan } from "@/components/common/HappyChan";

type Props = {
  userIdInput: string;
  onChange: (value: string) => void;
  onLogin: () => void;
  loading: boolean;
  error: string | null;
};

export function LoginPanel({ userIdInput, onChange, onLogin, loading, error }: Props) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="w-full rounded border border-zinc-300 p-2"
          placeholder="登録済みのユーザーIDを入力"
          value={userIdInput}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && userIdInput && !loading) {
              onLogin();
            }
          }}
        />
        <button
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          onClick={onLogin}
          disabled={!userIdInput || loading}
        >
          {loading ? "確認中..." : "開始"}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <HappyChan size="large" className="shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-blue-800">
            <span className="text-xs font-semibold uppercase tracking-wide">ハッピーちゃん</span>
          </div>
          <p className="text-sm leading-relaxed text-blue-900">
            やっぴー！ぼくはハッピーちゃん。このアプリでは「その日の出来事」と気持ち
            （ハッピーマネーや感情スコア）をカレンダーに記録して、日記や振り返りで見える化できるよ。
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-blue-900">
            <li>イベントとハッピーマネーをサクッと登録</li>
            <li>日記一覧で検索・読み返し</li>
            <li>振り返りタブで1年のハッピー度をチェック</li>
          </ul>
          <p className="text-xs text-blue-800">
            登録済みのユーザーIDを入力すると、いつでも続きから始められるっピィ。
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

