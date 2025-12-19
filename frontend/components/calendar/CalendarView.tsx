"use client";

import type { EventClickArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import dynamic from "next/dynamic";

// FullCalendar v6.1.19 のパッケージに CSS が同梱されていないため、
// ビルド時の解決エラーを避ける目的でCSS importを外しています。
// 必要に応じて独自スタイルを `globals.css` 等で補ってください。

type CalendarEvent = { id: string; title: string; start: string };

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

type Props = {
  events: CalendarEvent[];
  onDateClick: (dateStr: string) => void;
  onEventClick: (eventId: string) => void;
};

export function CalendarView({ events, onDateClick, onEventClick }: Props) {
  const handleEventClick = (info: EventClickArg) => {
    onEventClick(info.event.id);
  };

  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      height="auto"
      events={events}
      dateClick={(info) => onDateClick(info.dateStr)}
      eventClick={handleEventClick}
      locale="ja"
    />
  );
}

