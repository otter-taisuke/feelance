"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  generateDiary,
  getTransaction,
  saveDiary,
  streamDiaryChat,
} from "@/lib/api";
import { moodOptions, getMoodLabel } from "@/lib/mood";
import type { ChatMessage, Transaction } from "@/lib/types";

type ChatState = {
  messages: ChatMessage[];
  streamingAssistant: string | null;
  streaming: boolean;
  error: string | null;
};

const initialChatState: ChatState = {
  messages: [],
  streamingAssistant: null,
  streaming: false,
  error: null,
};

export default function CreateDiaryPage() {
  const searchParams = useSearchParams();
  const txId = searchParams.get("tx_id");
  const router = useRouter();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loadingTx, setLoadingTx] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const [chat, setChat] = useState<ChatState>(initialChatState);
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const [diaryTitle, setDiaryTitle] = useState("");
  const [diaryBody, setDiaryBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [initialAsked, setInitialAsked] = useState(false);

  useEffect(() => {
    if (!txId) return;
    const fetchTx = async () => {
      setLoadingTx(true);
      setTxError(null);
      try {
        const res = await getTransaction(txId);
        setTransaction(res);
      } catch (e) {
        setTxError((e as Error).message);
        setTransaction(null);
      } finally {
        setLoadingTx(false);
      }
    };
    fetchTx();
  }, [txId]);

  const eventSummary = useMemo(() => {
    if (!transaction) return "";
    const moodLabel = getMoodLabel(transaction.mood_score);
    return `${transaction.date} / ${transaction.item} / ${transaction.amount.toLocaleString("ja-JP")}円 / 感情 ${moodLabel}`;
  }, [transaction]);

  const handleSend = async () => {
    if (!txId || !transaction) {
      setChat((prev) => ({ ...prev, error: "イベントが見つかりませんでした" }));
      return;
    }
    if (!input.trim() || chat.streaming) return;
    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const nextMessages = [...chat.messages, userMessage];
    setChat({
      messages: nextMessages,
      streamingAssistant: "",
      streaming: true,
      error: null,
    });
    setInput("");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamDiaryChat(
        txId,
        nextMessages,
        (token) => {
          setChat((prev) => ({
            ...prev,
            streamingAssistant: (prev.streamingAssistant ?? "") + token,
          }));
        },
        controller.signal,
      );
      setChat((prev) => {
        const assistantContent = prev.streamingAssistant ?? "";
        return {
          messages: [...prev.messages, { role: "assistant", content: assistantContent }],
          streamingAssistant: null,
          streaming: false,
          error: null,
        };
      });
    } catch (e) {
      const message = (e as Error).message || "チャットに失敗しました";
      setChat((prev) => ({ ...prev, streaming: false, error: message }));
    } finally {
      abortRef.current = null;
    }
  };

  const askInitialQuestion = async () => {
    if (!txId || !transaction) return;
    setInitialAsked(true);
    setChat({
      messages: [],
      streamingAssistant: "",
      streaming: true,
      error: null,
    });
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamDiaryChat(
        txId,
        [],
        (token) => {
          setChat((prev) => ({
            ...prev,
            streamingAssistant: (prev.streamingAssistant ?? "") + token,
          }));
        },
        controller.signal,
      );
      setChat((prev) => {
        const assistantContent = prev.streamingAssistant ?? "";
        return {
          messages: [...prev.messages, { role: "assistant", content: assistantContent }],
          streamingAssistant: null,
          streaming: false,
          error: null,
        };
      });
    } catch (e) {
      const message = (e as Error).message || "チャットに失敗しました";
      setChat((prev) => ({ ...prev, streaming: false, error: message }));
    } finally {
      abortRef.current = null;
    }
  };

  const handleAbort = () => {
    abortRef.current?.abort();
    setChat((prev) => ({ ...prev, streaming: false, streamingAssistant: null }));
  };

  const handleGenerate = async () => {
    if (generating) return;
    if (!txId || !transaction) return;
    setGenerating(true);
    setNotice(null);
    try {
      const res = await generateDiary(txId, chat.messages);
      const title = (res.diary_title ?? "").trim();
      const body = (res.diary_body ?? "").trim();
      setDiaryTitle(title);
      setDiaryBody(body);
      const hasContent = Boolean(title || body);
      setNotice(
        hasContent
          ? "AIが日記を生成しました。必要に応じて再生成できます。"
          : "生成結果が空でした。もう一度生成してください。",
      );
    } catch (e) {
      setNotice((e as Error).message || "生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!txId || !transaction) return;
    if (!diaryTitle.trim() || !diaryBody.trim()) {
      setNotice("まず日記を生成してください");
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await saveDiary(txId, diaryTitle.trim(), diaryBody.trim());
      setNotice("日記を保存しました");
    } catch (e) {
      setNotice((e as Error).message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (transaction && txId && !initialAsked && chat.messages.length === 0 && !chat.streaming) {
      void askInitialQuestion();
    }
  }, [transaction, txId, initialAsked, chat.messages.length, chat.streaming]);

  const storageKey = txId ? `diary-chat:${txId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        messages?: ChatMessage[];
        diary_title?: string;
        diary_body?: string;
      };
      setChat((prev) => ({
        ...prev,
        messages: parsed.messages ?? [],
      }));
      if (parsed.diary_title) setDiaryTitle(parsed.diary_title);
      if (parsed.diary_body) setDiaryBody(parsed.diary_body);
      if (
        (parsed.messages && parsed.messages.length > 0) ||
        parsed.diary_title ||
        parsed.diary_body
      ) {
        setInitialAsked(true);
      }
    } catch {
      // ignore corrupted data
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    const data = {
      messages: chat.messages,
      diary_title: diaryTitle,
      diary_body: diaryBody,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [storageKey, chat.messages, diaryTitle, diaryBody]);

  if (!txId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-red-600">tx_id が指定されていません。</p>
        <button
          className="mt-4 rounded border px-4 py-2"
          onClick={() => router.push("/")}
        >
          ホームへ戻る
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-zinc-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">日記作成</h1>
          <p className="text-sm text-zinc-600">
            選択されたイベントをもとにAIと対話し、日記を作成します。
          </p>
        </header>

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">選択されたイベント</h2>
          {loadingTx && <p className="text-sm text-zinc-500">読み込み中...</p>}
          {txError && <p className="text-sm text-red-600">{txError}</p>}
          {transaction && (
            <div className="mt-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <div>日付: {transaction.date}</div>
              <div>イベント名: {transaction.item}</div>
              <div>金額: {transaction.amount.toLocaleString("ja-JP")} 円</div>
              <div>感情: {getMoodLabel(transaction.mood_score)}</div>
              <div>Happy Money: {transaction.happy_amount.toLocaleString("ja-JP")} 円</div>
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">チャット</h2>
              {eventSummary && <span className="text-xs text-zinc-500">{eventSummary}</span>}
            </div>
            <div className="flex h-96 flex-col gap-2 rounded border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex-1 space-y-3 overflow-y-auto">
                {chat.messages.length === 0 && !chat.streamingAssistant && (
                  <p className="text-sm text-zinc-500">質問を入力してAIに聞いてみましょう。</p>
                )}
                {chat.messages.map((m, idx) => (
                  <div key={idx} className="rounded bg-white p-2 shadow-sm">
                    <div className="mb-1 text-xs font-semibold text-zinc-500">
                      {m.role === "user" ? "あなた" : "AI"}
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                  </div>
                ))}
                {chat.streamingAssistant !== null && (
                  <div className="rounded border border-blue-200 bg-blue-50 p-2">
                    <div className="mb-1 text-xs font-semibold text-blue-600">AI (生成中)</div>
                    <div className="whitespace-pre-wrap text-sm text-blue-800">
                      {chat.streamingAssistant || "…"}
                    </div>
                  </div>
                )}
              </div>
              {chat.error && <p className="text-sm text-red-600">{chat.error}</p>}
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded border border-zinc-300 p-2 text-sm"
                  placeholder="AIに聞きたいことを入力..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={chat.streaming}
                />
                <button
                  className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                  onClick={handleSend}
                  disabled={chat.streaming}
                >
                  送信
                </button>
                {chat.streaming && (
                  <button
                    className="text-sm text-red-600"
                    onClick={handleAbort}
                    type="button"
                  >
                    中断
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3">
              <button
                className="w-full rounded bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                onClick={handleGenerate}
                disabled={generating || chat.streaming}
              >
                {generating ? "日記生成中..." : "日記を生成する"}
              </button>
              {generating && (
                <p className="mt-1 text-xs text-zinc-500">数秒お待ちください…</p>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">日記</h2>
              <span className="text-xs text-zinc-500">AI生成のみ（編集不可）</span>
            </div>
            <div className="space-y-2 rounded border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold text-zinc-500">タイトル（AI生成）</p>
              <p className="whitespace-pre-wrap text-sm">
                {diaryTitle || "まだ生成されていません。チャットが進んだら「生成する」を押してください。"}
              </p>
            </div>
            <div className="space-y-2 rounded border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold text-zinc-500">本文（AI生成）</p>
              <p className="whitespace-pre-wrap text-sm">
                {diaryBody || "まだ生成されていません。チャットが進んだら「生成する」を押してください。"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={handleSave}
                disabled={saving || generating || !diaryBody}
              >
                {saving ? "保存中..." : "保存する"}
              </button>
              <button
                className="rounded border border-zinc-300 px-3 py-2 text-sm"
                onClick={() => router.push("/")}
              >
                ホームへ戻る
              </button>
            </div>
            {notice && <p className="text-sm text-blue-700">{notice}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

