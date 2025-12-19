"use client";

type Props = {
  userIdInput: string;
  onChange: (value: string) => void;
  onLogin: () => void;
  loading: boolean;
  error: string | null;
};

export function LoginPanel({ userIdInput, onChange, onLogin, loading, error }: Props) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">ID入力で開始</h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          className="w-full rounded border border-zinc-300 p-2"
          placeholder="登録済みのユーザーIDを入力"
          value={userIdInput}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          onClick={onLogin}
          disabled={!userIdInput || loading}
        >
          {loading ? "確認中..." : "開始"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}

