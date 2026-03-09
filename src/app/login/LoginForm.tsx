'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div dir="rtl" className="flex items-center justify-center px-4 py-10 font-sans">
      <div className="w-full max-w-md">
        {/* Glassmorphism card — backdrop blur, semi-transparent border, soft shadow */}
        <div className="rounded-3xl border border-white/40 bg-white/75 px-8 py-10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:px-10 sm:py-12">
          {/* Brand: Lambda logo + Clinic AI */}
          <div className="mb-11 flex flex-col items-center text-center">
            <div className="mb-7 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 shadow-lg shadow-slate-900/40">
              <span className="text-[1.75rem] font-bold text-white">λ</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Clinic AI
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              מערכת ניהול חכמה
            </p>
          </div>

          {error && (
            <div
              id="login-error"
              role="alert"
              aria-live="polite"
              className="login-error-in mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-right"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-7" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                אימייל
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
                className={`block w-full rounded-xl border bg-white/90 px-4 py-3.5 text-right text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)] focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${
                  error
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-slate-300 focus:border-indigo-400'
                }`}
                placeholder="your@gmail.com"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                סיסמה
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                className={`block w-full rounded-xl border bg-white/90 ps-11 pe-4 py-3.5 text-right text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)] focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${
                    error
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-slate-300 focus:border-indigo-400'
                  }`}
                placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute start-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus-visible:ring-2 focus-visible:ring-indigo-400/50"
                  aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex min-h-[44px] flex-row flex-wrap items-center justify-between gap-4">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 min-h-[16px] min-w-[16px] rounded border-slate-300 text-indigo-600 transition focus:ring-2 focus:ring-indigo-400/50 focus-visible:ring-2 focus-visible:ring-indigo-400/50"
                />
                <span>זכור אותי</span>
              </label>
              <Link
                href="/forgot-password"
                className="inline-flex min-h-[44px] items-center py-2 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-indigo-400/50 rounded"
              >
                שכחת סיסמה?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              aria-describedby={error ? 'login-error' : undefined}
              className="relative mt-2 w-full inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:pointer-events-none disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  נכנס למערכת…
                </>
              ) : (
                'המשך למערכת'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-600">
            בהמשך הכניסה אתה מאשר את תנאי השימוש ומדיניות הפרטיות.
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-slate-600">
          Clinic AI · מערכת ניהול חכמה · גישה מאובטחת
        </p>
      </div>
    </div>
  );
}
