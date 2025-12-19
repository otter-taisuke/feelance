"use client";

import { useCallback, useState } from "react";

import { deleteTransaction, fetchTransactions, saveTransaction } from "@/lib/api";
import type { Transaction, TransactionForm } from "@/lib/types";

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTransactions(userId);
      setTransactions(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertTransaction = useCallback(
    async (userId: string, form: TransactionForm) => {
      setSaving(true);
      setError(null);
      try {
        const saved = await saveTransaction(userId, form);
        setTransactions((prev) => {
          const others = prev.filter((t) => t.id !== saved.id);
          return [...others, saved].sort((a, b) => a.date.localeCompare(b.date));
        });
        return saved;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const removeTransaction = useCallback(async (txId: string) => {
    setSaving(true);
    setError(null);
    try {
      await deleteTransaction(txId);
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  const resetTransactions = useCallback(() => {
    setTransactions([]);
    setError(null);
  }, []);

  return {
    transactions,
    loading,
    saving,
    error,
    setError,
    loadTransactions,
    upsertTransaction,
    removeTransaction,
    resetTransactions,
  };
}

