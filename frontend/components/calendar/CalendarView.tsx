"use client";

import { useEffect, useState } from "react";
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
  borderColor?: string;
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

const getThisMonthStart = () => {
  const now = new Date();
  return formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 1));
};

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(currentDate.getFullYear());
  const [draftMonth, setDraftMonth] = useState(currentDate.getMonth() + 1); // 1-12

  useEffect(() => {
    if (!calendarApi) return;
    calendarApi.gotoDate(selectedDate);
    const parsed = new Date(`${selectedDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    setCurrentDate(parsed);
    setDraftYear(parsed.getFullYear());
    setDraftMonth(parsed.getMonth() + 1);
  }, [selectedDate, calendarApi]);

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
      const firstDay = getThisMonthStart();
      calendarApi.gotoDate(firstDay);
    }
  };

  const openPicker = () => {
    setDraftYear(currentDate.getFullYear());
    setDraftMonth(currentDate.getMonth() + 1);
    setPickerOpen(true);
  };

  const applyPicker = () => {
    if (calendarApi) {
      const target = new Date(draftYear, draftMonth - 1, 1);
      calendarApi.gotoDate(target);
    }
    setPickerOpen(false);
  };

  const cancelPicker = () => {
    setPickerOpen(false);
  };

  const yearOptions = Array.from({ length: 21 }, (_, i) => currentDate.getFullYear() - 10 + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

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
        <div className="relative">
          <button
            type="button"
            onClick={openPicker}
            className="text-2xl font-bold"
          >
            {monthLabel}
          </button>
          {pickerOpen && (
            <div className="absolute left-1/2 z-10 mt-2 w-64 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
              <div className="mb-2 text-sm font-semibold text-zinc-800">年と月を選択</div>
              <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-zinc-700">
                <label className="flex items-center gap-1">
                  年
                  <select
                    value={draftYear}
                    onChange={(e) => setDraftYear(Number(e.target.value))}
                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  月
                  <select
                    value={draftMonth}
                    onChange={(e) => setDraftMonth(Number(e.target.value))}
                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1"
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2 text-sm">
                <button
                  onClick={cancelPicker}
                  className="rounded border border-zinc-300 px-3 py-1 text-zinc-700 hover:border-zinc-500"
                >
                  キャンセル
                </button>
                <button
                  onClick={applyPicker}
                  className="rounded bg-black px-3 py-1 text-white hover:bg-zinc-800"
                >
                  決定
                </button>
              </div>
            </div>
          )}
        </div>
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
          今月
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

