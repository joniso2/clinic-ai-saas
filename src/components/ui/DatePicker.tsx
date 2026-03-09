'use client';

import { useState, useMemo } from 'react';
import {
  addMonths,
  subMonths,
  startOfMonth,
  getDay,
  getDate,
  getMonth,
  getYear,
  getDaysInMonth,
  format,
  isBefore,
  startOfDay,
} from 'date-fns';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const HEBREW_WEEKDAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

interface DatePickerProps {
  /** Selected date in YYYY-MM-DD format */
  value: string | null;
  /** Called with YYYY-MM-DD when user picks a date */
  onChange: (date: string) => void;
  /** Dates before this are disabled (YYYY-MM-DD). Defaults to today. */
  minDate?: string;
}

export function DatePicker({ value, onChange, minDate }: DatePickerProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const min = useMemo(
    () => (minDate ? startOfDay(new Date(minDate)) : today),
    [minDate, today],
  );

  const initialMonth = value ? new Date(value) : new Date();
  const [viewMonth, setViewMonth] = useState(startOfMonth(initialMonth));

  const year = getYear(viewMonth);
  const month = getMonth(viewMonth);
  const daysInMonth = getDaysInMonth(viewMonth);
  const firstDayOfWeek = getDay(startOfMonth(viewMonth)); // 0=Sun

  const cells = useMemo(() => {
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [firstDayOfWeek, daysInMonth]);

  function handleSelect(day: number) {
    const dateStr = format(new Date(year, month, day), 'yyyy-MM-dd');
    onChange(dateStr);
  }

  function isDisabled(day: number) {
    return isBefore(new Date(year, month, day), min);
  }

  function isSelected(day: number) {
    if (!value) return false;
    return value === format(new Date(year, month, day), 'yyyy-MM-dd');
  }

  function isToday(day: number) {
    return (
      getDate(today) === day &&
      getMonth(today) === month &&
      getYear(today) === year
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="חודש הבא"
        >
          <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {HEBREW_MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="חודש קודם"
        >
          <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {HEBREW_WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-slate-400 dark:text-slate-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) =>
          day === null ? (
            <div key={`empty-${i}`} />
          ) : (
            <button
              key={day}
              type="button"
              disabled={isDisabled(day)}
              onClick={() => handleSelect(day)}
              className={`h-9 w-full rounded-lg text-sm font-medium transition-colors
                ${isSelected(day)
                  ? 'bg-indigo-600 text-white'
                  : isToday(day)
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }
                ${isDisabled(day) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {day}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
