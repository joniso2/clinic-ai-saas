'use client';

import { useMemo, useState } from 'react';
import moment from 'moment-timezone';
import 'moment/locale/he';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { WorkingHours } from '@/types/booking';

moment.locale('he');

const TZ = 'Asia/Jerusalem';

const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTHS_FULL = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

interface Props {
  workingHours: WorkingHours[];
  workerId: string | null;
  onSelect: (date: string) => void;
  selectedDate: string | null;
  loading: boolean;
}

export function DateSelector({
  workingHours,
  workerId,
  onSelect,
  selectedDate,
  loading,
}: Props) {
  const availableDatesSet = useMemo(() => {
    const activeDays = new Set<number>();
    workingHours.forEach((wh) => {
      const isWorkerSpecific = wh.worker_id !== null;
      const matchesWorker = wh.worker_id === workerId;
      const isClinicWide = wh.worker_id === null;
      if (workerId) {
        if (matchesWorker || isClinicWide) activeDays.add(wh.day_of_week);
      } else {
        if (!isWorkerSpecific) activeDays.add(wh.day_of_week);
      }
    });
    const set = new Set<string>();
    const today = moment().tz(TZ).startOf('day');
    for (let i = 0; i < 60; i++) {
      const day = today.clone().add(i, 'days');
      if (activeDays.has(day.day())) set.add(day.format('YYYY-MM-DD'));
    }
    return set;
  }, [workingHours, workerId]);

  const [viewMonth, setViewMonth] = useState(() => moment().tz(TZ).startOf('month'));

  const calendarGrid = useMemo(() => {
    const start = viewMonth.clone().startOf('month');
    const end = viewMonth.clone().endOf('month');
    const startDayOfWeek = start.day();
    const daysInMonth = end.date();
    const cells: { date: string; isCurrentMonth: boolean; dayNum: number }[] = [];
    const padStart = startDayOfWeek;
    const prevMonth = start.clone().subtract(1, 'month');
    const prevDays = prevMonth.daysInMonth();
    for (let i = 0; i < padStart; i++) {
      const d = prevDays - padStart + 1 + i;
      cells.push({
        date: prevMonth.date(d).format('YYYY-MM-DD'),
        isCurrentMonth: false,
        dayNum: d,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: viewMonth.date(d).format('YYYY-MM-DD'),
        isCurrentMonth: true,
        dayNum: d,
      });
    }
    const remaining = 42 - cells.length;
    const nextMonth = viewMonth.clone().add(1, 'month');
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        date: nextMonth.date(d).format('YYYY-MM-DD'),
        isCurrentMonth: false,
        dayNum: d,
      });
    }
    return cells;
  }, [viewMonth]);

  if (availableDatesSet.size === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium text-gray-800">אין תאריכים זמינים</p>
        <p className="text-sm text-gray-500 mt-2">לא הוגדרו שעות עבודה לימים הקרובים.</p>
      </div>
    );
  }

  return (
    <div className="pt-5 pb-4">
      <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100">
        {/* כותרת שחורה — חודש + חצים */}
        <div className="bg-black text-white flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setViewMonth((m) => m.clone().subtract(1, 'month'))}
            className="p-1 rounded-lg hover:bg-white/10"
            aria-label="חודש קודם"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="font-bold text-lg">
            {HEBREW_MONTHS_FULL[viewMonth.month()]} {viewMonth.year()}
          </span>
          <button
            type="button"
            onClick={() => setViewMonth((m) => m.clone().add(1, 'month'))}
            className="p-1 rounded-lg hover:bg-white/10"
            aria-label="חודש הבא"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* ימי השבוע */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {HEBREW_WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-bold text-gray-800 border-l border-gray-100 first:border-l-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* רשת תאריכים */}
        <div className="grid grid-cols-7">
          {calendarGrid.map((cell) => {
            const isAvailable = availableDatesSet.has(cell.date);
            const isSelected = selectedDate === cell.date;

            return (
              <button
                key={cell.date}
                type="button"
                disabled={loading || !isAvailable}
                onClick={() => isAvailable && !loading && onSelect(cell.date)}
                className={`min-h-11 flex items-center justify-center text-sm font-bold border-b border-l border-gray-100 first:border-l-0 transition-colors
                  ${!cell.isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                  ${!isAvailable && cell.isCurrentMonth ? 'text-red-500' : ''}
                  ${isSelected ? 'bg-black text-white' : isAvailable && cell.isCurrentMonth ? 'hover:bg-gray-50' : ''}
                  ${loading ? 'opacity-60' : ''}
                `}
              >
                {cell.dayNum}
              </button>
            );
          })}
        </div>
        {loading && (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <p className="text-xs mt-3 text-center flex justify-center gap-4" dir="rtl">
        <span className="text-gray-800">— יש תורים</span>
        <span className="text-red-500">— אין תורים</span>
      </p>
    </div>
  );
}
