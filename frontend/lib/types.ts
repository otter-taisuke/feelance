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

