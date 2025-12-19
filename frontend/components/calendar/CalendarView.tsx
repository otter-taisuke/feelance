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
};

const getToday = () => new Date().toISOString().slice(0, 10);

export function CalendarView({ events, selectedDate, onDateClick, onEventClick }: Props) {
  const calendarRef = useRef<{ getApi: () => CalendarApi } | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const date = new Date(`${selectedDate}T00:00:00`);
    return date;
  });

  const handleEventClick = (info: EventClickArg) => {
    onEventClick(info.event.id);
  };

  const handlePrevMonth = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.prev();
      const view = api.view;
      setCurrentDate(view.activeStart);
    }
  };

  const handleNextMonth = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.next();
      const view = api.view;
      setCurrentDate(view.activeStart);
    }
  };

  const handleToday = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      const today = getToday();
      api.gotoDate(today);
      setCurrentDate(new Date(`${today}T00:00:00`));
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
        ref={calendarRef}
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
          setCurrentDate(arg.start);
        }}
      />
    </div>
  );
}

