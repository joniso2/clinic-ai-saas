'use client';

import { useState } from 'react';
import { Phone, ArrowLeft } from 'lucide-react';

interface Props {
  onSubmit: (phone: string) => void;
  loading: boolean;
}

function normalizeIsraeliPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('972')) return `+${digits}`;
  if (digits.startsWith('0')) return `+972${digits.slice(1)}`;
  return `+972${digits}`;
}

function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 12;
}

export function PhoneInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

  const valid = isValidPhone(value);
  const showError = touched && value.length > 0 && !valid;

  const handleSubmit = () => {
    setTouched(true);
    if (!valid) return;
    onSubmit(normalizeIsraeliPhone(value));
  };

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
          <Phone className="w-8 h-8 text-indigo-500" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
        מספר טלפון
      </h2>
      <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
        נשלח אליך קוד אימות ב-SMS
        <br />
        לאישור ההזמנה
      </p>

      <div className="space-y-3">
        <div
          className={`flex items-center gap-2 bg-white border-2 rounded-2xl px-4 py-3.5 transition-colors
          ${showError ? 'border-red-400' : 'border-gray-200 focus-within:border-indigo-500'}
        `}
        >
          <span className="text-gray-500 font-medium text-sm select-none">+972</span>
          <div className="w-px h-5 bg-gray-200" />
          <input
            type="tel"
            inputMode="numeric"
            dir="ltr"
            placeholder="050-000-0000"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="flex-1 bg-transparent outline-none text-gray-800 text-base placeholder-gray-300 tracking-wide"
            autoFocus
            autoComplete="tel"
          />
        </div>

        {showError && (
          <p className="text-red-500 text-xs px-1">יש להזין מספר טלפון תקין</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !valid}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-150 flex items-center justify-center gap-2
            ${
              valid && !loading
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              שליחת קוד
              <ArrowLeft className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        המספר ישמש רק לאישור ההזמנה
      </p>
    </div>
  );
}
