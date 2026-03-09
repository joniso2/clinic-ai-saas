'use client';

import { useState, useRef, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

const OTP_LENGTH = 6;

interface Props {
  phone: string;
  onVerify: (code: string) => void;
  onResend: () => void;
}

export function OtpVerification({ phone, onVerify, onResend }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleChange = async (idx: number, raw: string) => {
    const val = raw.replace(/\D/g, '');
    if (!val) return;

    if (val.length === OTP_LENGTH) {
      const filled = val.split('').slice(0, OTP_LENGTH);
      setDigits(filled);
      await submitCode(filled.join(''));
      return;
    }

    const char = val.slice(-1);
    const newDigits = [...digits];
    newDigits[idx] = char;
    setDigits(newDigits);

    if (idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }

    if (newDigits.every((d) => d !== '')) {
      await submitCode(newDigits.join(''));
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const newDigits = [...digits];
      if (digits[idx]) {
        newDigits[idx] = '';
        setDigits(newDigits);
      } else if (idx > 0) {
        newDigits[idx - 1] = '';
        setDigits(newDigits);
        inputRefs.current[idx - 1]?.focus();
      }
    }
  };

  const submitCode = async (code: string) => {
    setVerifying(true);
    try {
      await onVerify(code);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = () => {
    setDigits(Array(OTP_LENGTH).fill(''));
    setResendCooldown(30);
    inputRefs.current[0]?.focus();
    onResend();
  };

  const maskedPhone = phone.replace(/(\+972|0)(\d{2})(\d+)(\d{2})$/, '$10$2-***-$4');

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-800 text-center mb-2">
        קוד אימות
      </h2>
      <p className="text-slate-500 text-sm text-center mb-8 leading-relaxed">
        שלחנו קוד בן {OTP_LENGTH} ספרות
        <br />
        <span className="font-medium text-slate-700 dir-ltr" dir="ltr">{phone}</span>
      </p>

      <div className="flex gap-2 justify-center mb-6" dir="ltr">
        {Array.from({ length: OTP_LENGTH }).map((_, idx) => (
          <input
            key={idx}
            ref={(el) => { inputRefs.current[idx] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            value={digits[idx]}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onFocus={(e) => e.target.select()}
            disabled={verifying}
            className={`w-12 h-14 text-center text-xl font-bold rounded-2xl border-2 outline-none transition-all
              ${
                digits[idx]
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-800 focus:border-indigo-400'
              }
              ${verifying ? 'opacity-60' : ''}
            `}
          />
        ))}
      </div>

      {verifying && (
        <div className="flex justify-center mb-4">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="text-center">
        {resendCooldown > 0 ? (
          <p className="text-sm text-slate-400">
            שלח שוב בעוד{' '}
            <span className="font-semibold text-slate-600">{resendCooldown}</span>{' '}
            שניות
          </p>
        ) : (
          <button
            onClick={handleResend}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
          >
            שלח קוד חדש
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center mt-3">
        {maskedPhone}
      </p>
    </div>
  );
}
