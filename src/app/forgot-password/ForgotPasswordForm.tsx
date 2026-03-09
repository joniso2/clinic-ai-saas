'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="w-full max-w-md">
      <div className="rounded-3xl border border-white/40 bg-white/75 px-8 py-10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:px-10 sm:py-12">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 shadow-lg">
            <span className="text-2xl font-bold text-white">λ</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">איפוס סיסמה</h1>
          <p className="mt-2 text-sm text-slate-600">הזן את כתובת המייל שלך ונשלח אליך קישור לאיפוס.</p>
        </div>

        {sent ? (
          <p className="text-center text-sm text-slate-700 dark:text-slate-300">
            נשלח אליך קישור לאיפוס סיסמה אם החשבון קיים במערכת
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 px-4 py-3 text-sm text-red-700 dark:text-red-300" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span id="forgot-error">{error}</span>
              </div>
            )}
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                אימייל
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400"
                placeholder="you@example.com"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'שולח…' : 'שלח קישור לאיפוס'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center">
          <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            חזרה להתחברות
          </Link>
        </p>
      </div>
    </div>
  );
}
