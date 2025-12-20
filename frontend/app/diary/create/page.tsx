"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppHeader } from "@/components/layout/AppHeader";
import { HappyChan } from "@/components/common/HappyChan";
import {
  generateDiary,
  getTransaction,
  saveDiary,
  fetchDiaries,
  fetchDiaryChat,
  streamDiaryChat,
} from "@/lib/api";
import { moodOptions, getMoodLabel } from "@/lib/mood";
import type { ChatMessage, DiaryEntry, Transaction } from "@/lib/types";

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
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const [diaryTitle, setDiaryTitle] = useState("");
  const [diaryBody, setDiaryBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [initialAsked, setInitialAsked] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [existingDiary, setExistingDiary] = useState<DiaryEntry | null>(null);
  const [existingDiaryLoading, setExistingDiaryLoading] = useState(false);
  const [existingDiaryError, setExistingDiaryError] = useState<string | null>(null);
  const hasExistingDiary = Boolean(existingDiary);

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

  useEffect(() => {
    if (!txId) return;
    const run = async () => {
      setExistingDiaryLoading(true);
      setExistingDiaryError(null);
      try {
        const res = await fetchDiaries({ tx_id: txId });
        setExistingDiary(res[0] ?? null);
      } catch (e) {
        setExistingDiary(null);
        setExistingDiaryError((e as Error).message);
      } finally {
        setExistingDiaryLoading(false);
      }
    };
    run();
  }, [txId]);

  useEffect(() => {
    if (!txId) {
      setHistoryLoading(false);
      return;
    }
    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const res = await fetchDiaryChat(txId);
        const msgs = res?.messages ?? [];
        if (msgs.length > 0) {
          setChat({
            messages: msgs,
            streamingAssistant: null,
            streaming: false,
            error: null,
          });
          setInitialAsked(true);
        }
      } catch (e) {
        setHistoryError((e as Error).message);
      } finally {
        setHistoryLoading(false);
      }
    };
    void loadHistory();
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
    if (hasExistingDiary) {
      const confirmed = window.confirm("このイベントには既存の日記があります。上書きしますか？");
      if (!confirmed) return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await saveDiary(txId, diaryTitle.trim(), diaryBody.trim());
      router.push("/?tab=diary");
    } catch (e) {
      setNotice((e as Error).message || "保存に失敗しました");
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!existingDiary) return;
    if (!diaryTitle && !diaryBody) {
      setDiaryTitle(existingDiary.diary_title || "");
      setDiaryBody(existingDiary.diary_body || "");
    }
  }, [existingDiary, diaryTitle, diaryBody]);

  useEffect(() => {
    if (transaction && txId && !historyLoading && !initialAsked && chat.messages.length === 0 && !chat.streaming) {
      void askInitialQuestion();
    }
  }, [transaction, txId, historyLoading, initialAsked, chat.messages.length, chat.streaming]);

  // チャットの自動スクロール
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat.messages, chat.streamingAssistant, historyLoading]);

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
      <AppHeader />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <div className="rounded-lg bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">日記作成</h1>
            <p className="text-sm text-zinc-600">
              選択されたイベントをもとにAIと対話し、日記を作成します。
            </p>
            <h2 className="text-lg font-semibold">選択されたイベント</h2>
            {hasExistingDiary && (
              <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                このイベントには既存の日記があります（保存すると上書き）
              </div>
            )}
          </div>
          {loadingTx && <p className="text-sm text-zinc-500">読み込み中...</p>}
          {txError && <p className="text-sm text-red-600">{txError}</p>}
          {transaction && (() => {
            // 感情の指数（mood_score）に応じてスタイルを決定
            const getMoodStyle = () => {
              if (transaction.mood_score === 0) {
                // 0：灰色
                return "border-black bg-gray-100";
              } else if (transaction.happy_amount > 0) {
                // プラス：青
                return "border-blue-500 bg-blue-50";
              } else if (transaction.happy_amount < 0) {
                // マイナス：赤
                return "border-red-500 bg-red-50";
              } else {
                // その他：灰色
                return "border-black bg-gray-100";
              }
            };
            // 日付をyyyy/mm/dd（曜日）形式にフォーマット
            const formatDateWithWeekday = (dateStr: string) => {
              const date = new Date(`${dateStr}T00:00:00`);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const day = String(date.getDate()).padStart(2, "0");
              const weekday = date.toLocaleDateString("ja-JP", { weekday: "short" });
              return `${year}/${month}/${day}（${weekday}）`;
            };
            return (
              <div className="mt-2">
                <div className="mb-1 text-sm text-zinc-500">
                  {formatDateWithWeekday(transaction.date)}
                </div>
                <div className={`rounded border p-2 ${getMoodStyle()}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{transaction.item}</span>
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-zinc-600 whitespace-nowrap">
                        {transaction.happy_amount >= 0 ? "+" : ""}
                        {transaction.happy_amount.toLocaleString("ja-JP")}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {transaction.amount.toLocaleString("ja-JP")} 円
                      </span>
                    </div>
                  </div>
                </div>
                {existingDiaryLoading && (
                  <p className="mt-2 text-xs text-zinc-500">既存の日記を確認しています...</p>
                )}
                {existingDiaryError && (
                  <p className="mt-2 text-xs text-red-600">{existingDiaryError}</p>
                )}
                {existingDiary && (
                  <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <p className="text-sm font-semibold">このイベントには既に日記が保存されています。</p>
                    <p className="text-xs text-amber-700">「保存する」を押すと既存の日記が上書きされます。</p>
                    <div className="mt-2 space-y-2 rounded border border-amber-200 bg-white/70 p-2 text-sm text-amber-900">
                      <div>
                        <div className="text-xs font-semibold text-amber-700">既存タイトル</div>
                        <div className="whitespace-pre-wrap">{existingDiary.diary_title || "タイトルなし"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-amber-700">既存本文</div>
                        <div className="whitespace-pre-wrap">{existingDiary.diary_body || "本文なし"}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-2">
              <h2 className="text-lg font-semibold">チャット</h2>
            </div>
            <div className="flex h-96 flex-col gap-2 rounded border border-zinc-200 bg-zinc-50 p-3 overflow-x-hidden">
              <div ref={chatContainerRef} className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden">
                {chat.messages.length === 0 && !chat.streamingAssistant && (
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <HappyChan size="medium" variant="happy" />
                    <p className="text-sm text-zinc-500">
                      {historyLoading ? "前回のチャットを読み込み中..." : "質問を入力してハッピーちゃんに聞いてみましょう。"}
                    </p>
                  </div>
                )}
                {chat.messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}
                  >
                    {m.role === "assistant" && (
                      <div className="flex-shrink-0">
                        <HappyChan size="small" variant="happy" />
                      </div>
                    )}
                    <div
                      className={`relative max-w-[80%] rounded-lg p-3 shadow-sm ${
                        m.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-zinc-900"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>
                      {/* 吹き出しの三角形 */}
                      <div
                        className={`absolute bottom-0 ${
                          m.role === "user" ? "right-0" : "left-0"
                        } ${
                          m.role === "user" ? "-mr-2" : "-ml-2"
                        }`}
                        style={{
                          width: 0,
                          height: 0,
                          borderStyle: "solid",
                          borderWidth: m.role === "user" ? "0 0 12px 12px" : "0 12px 12px 0",
                          borderColor: m.role === "user"
                            ? "transparent transparent transparent rgb(59 130 246)"
                            : "transparent rgb(243 244 246) transparent transparent",
                        }}
                      />
                    </div>
                  </div>
                ))}
                {chat.streamingAssistant !== null && (
                  <div className="flex justify-start gap-2">
                    <div className="flex-shrink-0">
                      <HappyChan size="small" variant="happy" />
                    </div>
                    <div className="relative max-w-[80%] rounded-lg bg-gray-100 p-3 shadow-sm text-zinc-900">
                      <div className="mb-1 text-xs font-semibold text-zinc-500">ハッピーちゃん (入力中...)</div>
                      <div className="whitespace-pre-wrap break-words text-sm">
                        {chat.streamingAssistant || "…"}
                      </div>
                      {/* 吹き出しの三角形 */}
                      <div
                        className="absolute bottom-0 left-0 -ml-2"
                        style={{
                          width: 0,
                          height: 0,
                          borderStyle: "solid",
                          borderWidth: "0 12px 12px 0",
                          borderColor: "transparent rgb(243 244 246) transparent transparent",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {chat.error && <p className="text-sm text-red-600">{chat.error}</p>}
              {historyError && <p className="text-xs text-red-600">履歴の読み込みに失敗しました: {historyError}</p>}
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded border border-zinc-300 p-2 text-sm"
                  placeholder="質問に回答..."
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
                  className="flex items-center gap-2 rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                  onClick={handleSend}
                  disabled={chat.streaming}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
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
              <h2 className="text-xl font-semibold">日記</h2>
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
      </main>
    </div>
  );
}

