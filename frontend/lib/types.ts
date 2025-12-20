export type User = {
  user_id: string;
  display_name?: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  date: string;
  item: string;
  amount: number;
  mood_score: number;
  happy_amount: number;
  created_at?: string;
  updated_at?: string;
};

export type TransactionForm = {
  id?: string;
  date: string;
  item: string;
  amount: string;
  mood_score: number;
};

export type MoodOption = {
  value: number;
  label: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DiaryGenerateResponse = {
  diary_title: string;
  diary_body: string;
};

export type SaveDiaryResponse = {
  id: string;
  tx_id: string;
  event_name: string;
  diary_title: string;
  diary_body: string;
  transaction_date?: string;
  created_at: string;
  user_id: string;
};

export type DiaryEntry = {
  id: string;
  tx_id: string;
  event_name: string;
  diary_title: string;
  diary_body: string;
  transaction_date?: string | null;
  created_at?: string | null;
  user_id: string;
};

