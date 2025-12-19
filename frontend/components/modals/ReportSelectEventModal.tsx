"use client";

import { useState } from "react";

import { CalendarView } from "@/components/calendar/CalendarView";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  color?: string;
  textColor?: string;
};

type Props = {
  open: boolean;
  selectedDate: string;
  events: CalendarEvent[];
  onClose: () => void;
  onSelectEvent: (eventId: string) => void;
};

export function ReportSelectEventModal({
  open,
  selectedDate,
  events,
  onClose,
  onSelectEvent,
}: Props) {
  const [date, setDate] = useState(selectedDate);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">日記を作成するイベントを選択</h3>
          <button onClick={onClose} className="text-sm text-zinc-500">
            閉じる
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-600">
          カレンダーからイベントを選択すると、日記作成ページに移動します。
        </p>
        <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-3">
          <CalendarView
            events={events}
            selectedDate={date}
            onDateClick={(d) => setDate(d)}
            onEventClick={onSelectEvent}
          />
        </div>
      </div>
    </div>
  );
}

