import { API_BASE } from "./constants";
import type { Transaction, TransactionForm, User } from "./types";

const jsonHeaders = { "Content-Type": "application/json" };

const handleError = async (res: Response) => {
  let message = "リクエストに失敗しました";
  try {
    const data = await res.json();
    if (data?.detail) {
      message = Array.isArray(data.detail)
        ? data.detail.map((d: any) => d.msg || d).join(", ")
        : String(data.detail);
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
  });
  if (!res.ok) {
    await handleError(res);
  }
  return res.json();
}

export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  const res = await fetch(
    `${API_BASE}/transactions?user_id=${encodeURIComponent(userId)}`,
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
  const payload: Record<string, any> = {
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
  });
  if (!res.ok) {
    await handleError(res);
  }
  return res.json();
}

export async function deleteTransaction(txId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/transactions/${txId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    await handleError(res);
  }
}

