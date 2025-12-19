import { API_BASE } from "./constants";
import type {
  ChatMessage,
  ReportGenerateResponse,
  SaveReportResponse,
  Transaction,
  TransactionForm,
  User,
} from "./types";

const jsonHeaders = { "Content-Type": "application/json" };

type ErrorDetail = string | { msg?: string } | Array<string | { msg?: string }>;

const normalizeErrorDetail = (detail: ErrorDetail): string => {
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === "string" ? d : d.msg ?? ""))
      .filter(Boolean)
      .join(", ");
  }
  return typeof detail === "string" ? detail : detail.msg ?? "";
};

const handleError = async (res: Response) => {
  let message = "リクエストに失敗しました";
  try {
    const data = await res.json();
    if (data?.detail) {
      const detailText = normalizeErrorDetail(data.detail as ErrorDetail);
      if (detailText) {
        message = detailText;
      }
    }
  } catch {
    // ignore
  }
  throw new Error(message);
};

export async function login(userId: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ user_id: userId }),
    credentials: "include",
  });
  if (!res.ok) {
    await handleError(res);
  }
  return res.json();
}

export async function logout(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    await handleError(res);
  }
}

export async function me(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    credentials: "include",
  });
  if (!res.ok) {
    await handleError(res);
  }
  return res.json();
}

export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  const res = await fetch(
    `${API_BASE}/transactions?user_id=${encodeURIComponent(userId)}`,
    { credentials: "include" },
  );
  if (!res.ok) {
    await handleError(res);
  }
  return res.json();
}

export async function saveTransaction(
  userId: string,
  form: TransactionForm,
): Promise<Transaction> {
  const isUpdate = Boolean(form.id);
  const payload: {
    date: string;
    item: string;
    amount: number;
    mood_score: number;
    user_id?: string;
  } = {
    date: form.date,
    item: form.item,
    amount: Number(form.amount),
    mood_score: form.mood_score,
  };
  if (!isUpdate) {
    payload.user_id = userId;
  }

  const url = isUpdate
    ? `${API_BASE}/transactions/${form.id}`
    : `${API_BASE}/transactions`;
  const method = isUpdate ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: jsonHeaders,
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    await handleError(res);
  }
  return res.json();
}

export async function deleteTransaction(txId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/transactions/${txId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    await handleError(res);
  }
}

export async function getTransaction(txId: string): Promise<Transaction> {
  const res = await fetch(`${API_BASE}/transactions/${txId}`, {
    credentials: "include",
  });
  if (!res.ok) {
    await handleError(res);
  }
  return res.json();
}

export async function streamReportChat(
  txId: string,
  messages: ChatMessage[],
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/chat/stream`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ tx_id: txId, messages }),
    credentials: "include",
    signal,
  });
  const body = res.body;
  if (!res.ok || !body) {
    await handleError(res);
  }

  const reader = (body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const lines = part.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          onToken(data);
        }
      }
    }
  }
}

export async function generateReport(
  txId: string,
  messages: ChatMessage[],
): Promise<ReportGenerateResponse> {
  const res = await fetch(`${API_BASE}/reports/generate`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ tx_id: txId, messages }),
    credentials: "include",
  });
  if (!res.ok) {
    await handleError(res);
  }
  return res.json();
}

export async function saveReport(
  txId: string,
  reportTitle: string,
  reportBody: string,
): Promise<SaveReportResponse> {
  const res = await fetch(`${API_BASE}/reports/save`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      tx_id: txId,
      report_title: reportTitle,
      report_body: reportBody,
    }),
    credentials: "include",
  });
  if (!res.ok) {
    await handleError(res);
  }
  return res.json();
}

