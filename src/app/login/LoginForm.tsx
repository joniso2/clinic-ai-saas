'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-3xl border border-white/30 bg-white/90 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-10">

          {/* Brand mark */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 shadow-lg shadow-slate-900/40">
              <span className="text-2xl font-bold text-white">λ</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Clinic AI
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Practice Management Portal
            </p>
          </div>

          {/* Error state */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`block w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  error
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                    : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
                }`}
                placeholder="you@clinic.com"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`block w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  error
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                    : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
                }`}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-slate-800 to-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:from-slate-700 hover:to-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in to Dashboard'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            By signing in, you agree to your clinic&apos;s data handling policies.
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400/70">
          Clinic AI · Practice Management · Secure Access
        </p>
      </div>
    </div>
  );
}
