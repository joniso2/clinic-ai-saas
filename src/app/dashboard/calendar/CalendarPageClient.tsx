'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, BarChart3, Settings as SettingsIcon, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarView } from '@/components/dashboard/CalendarView';

export function CalendarPageClient() {
  const router = useRouter();
  const [userEmail,  setUserEmail]  = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return; }
      setUserEmail(session.user.email ?? null);
      const clinicId = (session.user.app_metadata as { clinic_id?: string })?.clinic_id;
      if (clinicId) {
        supabase.from('clinics').select('name').eq('id', clinicId).maybeSingle().then(
          ({ data }) => { if (data?.name) setClinicName(data.name as string); },
        );
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <span className="text-xl font-semibold">λ</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Clinic AI</p>
              <p className="text-sm text-slate-700">Clinic CRM Dashboard</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <p className="text-[11px] text-slate-500">
              {userEmail ? `Logged in as ${userEmail}` : 'Logged in'}
              {clinicName ? ` · Managing: ${clinicName}` : ''}
            </p>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.replace('/login'); }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page title */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">View and manage appointments for your clinic.</p>
        </div>

        {/* Nav tabs */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="-mb-px flex space-x-6 text-sm">
            {[
              { label: 'Leads',     icon: Users,        href: '/dashboard' },
              { label: 'Calendar',  icon: CalendarIcon, href: '/dashboard/calendar' },
              { label: 'Analytics', icon: BarChart3,     href: '/dashboard' },
              { label: 'Settings',  icon: SettingsIcon,  href: '/dashboard' },
            ].map(({ label, icon: Icon, href }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (href === '/dashboard/calendar') return;
                  router.push(href);
                }}
                className={`inline-flex items-center gap-2 border-b-2 px-0.5 pb-3 text-xs font-medium transition ${
                  label === 'Calendar'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Calendar */}
        <CalendarView />
      </main>
    </div>
  );
}
