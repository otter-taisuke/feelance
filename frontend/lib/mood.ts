import type { MoodOption } from "./types";

import moodConfig from "../config/mood.json";

type MoodConfigItem = { value: number; label: string; short_label?: string };

const parsed = (moodConfig as { moods?: MoodConfigItem[] }).moods ?? [];

export const moodOptions: MoodOption[] =
  parsed.length > 0
    ? parsed.map((m) => ({
        value: m.value,
        label: m.label,
      }))
    : [
        { value: -2, label: "とてもネガティブ (-2)" },
        { value: -1, label: "ややネガティブ (-1)" },
        { value: 0, label: "ニュートラル (0)" },
        { value: 1, label: "ややポジティブ (+1)" },
        { value: 2, label: "とてもポジティブ (+2)" },
      ];

const labelMap = new Map<number, { label: string; shortLabel: string }>();
const DEFAULT_LABEL = (moodConfig as { default_label?: string }).default_label ?? "不明";
const DEFAULT_SHORT_LABEL = (moodConfig as { default_short_label?: string }).default_short_label ?? "不明";

parsed.forEach((m) => {
  labelMap.set(m.value, {
    label: m.label,
    shortLabel: m.short_label ?? m.label,
  });
});

const toNumber = (score: number | null | undefined) => {
  const n = Number(score);
  return Number.isFinite(n) ? n : null;
};

export const getMoodLabel = (score: number | null | undefined): string => {
  const key = toNumber(score);
  if (key !== null && labelMap.has(key)) {
    return labelMap.get(key)!.label;
  }
  return DEFAULT_LABEL;
};

export const getMoodShortLabel = (score: number | null | undefined): string => {
  const key = toNumber(score);
  if (key !== null && labelMap.has(key)) {
    return labelMap.get(key)!.shortLabel;
  }
  return DEFAULT_SHORT_LABEL;
};

