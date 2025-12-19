"use client";

import { useRef, useState } from "react";
import type { EventClickArg, CalendarApi } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import dynamic from "next/dynamic";

// FullCalendar v6.1.19 のパッケージに CSS が同梱されていないため、
// ビルド時の解決エラーを避ける目的でCSS importを外しています。
// 必要に応じて独自スタイルを `globals.css` 等で補ってください。

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  color?: string;
  textColor?: string;
};

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

type Props = {
  events: CalendarEvent[];
  selectedDate: string;
  onDateClick: (dateStr: string) => void;
  onEventClick: (eventId: string) => void;
  onMonthChange?: (year: number, month: number) => void;
};

const formatDateLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getToday = () => formatDateLocal(new Date());

export function CalendarView({
  events,
  selectedDate,
  onDateClick,
  onEventClick,
  onMonthChange,
}: Props) {
  const [calendarApi, setCalendarApi] = useState<CalendarApi | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const date = new Date(`${selectedDate}T00:00:00`);
    return date;
  });

  const handleEventClick = (info: EventClickArg) => {
    onEventClick(info.event.id);
  };

  const handlePrevMonth = () => {
    if (calendarApi) {
      calendarApi.prev();
    }
  };

  const handleNextMonth = () => {
    if (calendarApi) {
      calendarApi.next();
    }
  };

  const handleToday = () => {
    if (calendarApi) {
      const today = getToday();
      calendarApi.gotoDate(today);
    }
  };

  const monthLabel = currentDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-center gap-4">
        <button
          onClick={handlePrevMonth}
          className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50"
        >
          ←
        </button>
        <span className="text-2xl font-bold">{monthLabel}</span>
        <button
          onClick={handleNextMonth}
          className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50"
        >
          →
        </button>
        <button
          onClick={handleToday}
          className="ml-2 rounded border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50"
        >
          今日
        </button>
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        height="auto"
        events={events}
        initialDate={selectedDate}
        dateClick={(info) => onDateClick(info.dateStr)}
        eventClick={handleEventClick}
        locale="ja"
        headerToolbar={false}
        dayCellClassNames={(arg) => (arg.dateStr === selectedDate ? "fc-day-selected" : "")}
        datesSet={(arg) => {
          // カレンダーAPIを取得
          if (arg.view.calendar) {
            setCalendarApi(arg.view.calendar);
          }
          // 月ビューの場合、表示範囲の中央付近の日付を取得して月を判定
          // これにより、1日が日曜日で前月の週が表示されていても正しい月を取得できる
          const startDate = new Date(arg.start);
          const endDate = new Date(arg.end);
          // 表示範囲の中央の日付を取得
          const midDate = new Date((startDate.getTime() + endDate.getTime()) / 2);
          // その月の1日を作成（表示されている月を正確に取得）
          const monthStart = new Date(midDate.getFullYear(), midDate.getMonth(), 1);
          setCurrentDate(monthStart);
          onMonthChange?.(monthStart.getFullYear(), monthStart.getMonth());
        }}
      />
    </div>
  );
}

