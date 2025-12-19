import { API_BASE } from "./constants";
import type { Transaction, TransactionForm, User } from "./types";

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

