import type { MoodOption } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export const moodOptions: MoodOption[] = [
  { value: -2, label: "とてもネガティブ (-2)" },
  { value: -1, label: "ややネガティブ (-1)" },
  { value: 0, label: "ニュートラル (0)" },
  { value: 1, label: "ややポジティブ (+1)" },
  { value: 2, label: "とてもポジティブ (+2)" },
];

