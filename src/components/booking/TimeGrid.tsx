import { parse, getDate, getMonth } from 'date-fns';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

interface Props {
  slots: string[];
  onSelect: (time: string) => void;
  selectedTime: string | null;
  date: string;
}

function formatDateHebrew(date: string): string {
  const d = parse(date, 'yyyy-MM-dd', new Date());
  return `${getDate(d)} ב${HEBREW_MONTHS[getMonth(d)]}`;
}

export function TimeGrid({ slots, onSelect, selectedTime, date }: Props) {
  if (slots.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-slate-500 text-lg font-medium">אין שעות פנויות</p>
        <p className="text-slate-400 text-sm mt-1">בחר תאריך אחר</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800">בחר שעה</h2>
        <p className="text-sm text-slate-500 mt-0.5">{formatDateHebrew(date)}</p>
      </div>

      <div className="flex flex-col gap-3">
        {slots.map((time) => {
          const isSelected = selectedTime === time;
          return (
            <button
              key={time}
              onClick={() => onSelect(time)}
              className={`w-full py-3.5 rounded-full text-base font-semibold transition-all duration-150 active:scale-[0.98] touch-manipulation shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                ${isSelected ? 'bg-black text-white shadow-md' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}
              `}
            >
              {time}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        {slots.length} שעות פנויות
      </p>
    </div>
  );
}
