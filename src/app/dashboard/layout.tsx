'use client';

import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, BarChart3, Settings as SettingsIcon, Calendar as CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { id: 'leads',     label: 'Leads',     icon: Users,         href: '/dashboard' },
  { id: 'calendar',  label: 'Calendar',  icon: CalendarIcon,  href: '/dashboard/calendar' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3,      href: '/dashboard/analytics' },
  { id: 'settings',  label: 'Settings',  icon: SettingsIcon,  href: '/dashboard/settings' },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUserEmail(session.user.email ?? null);
      const cid = (session.user.app_metadata as { clinic_id?: string } | null)?.clinic_id ?? null;
      setClinicId(cid);
      if (cid) {
        const { data } = await supabase.from('clinics').select('name').eq('id', cid).maybeSingle();
        if (data?.name) setClinicName(data.name as string);
      }
    });
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Header mirrors the sidebar + content column split exactly */}
      <header className="h-16 border-b border-slate-200 bg-white w-full sticky top-0 z-40">
        <div className="flex h-full w-full items-center">

          {/* Logo zone — same width as sidebar (w-64), same left padding (px-4 → pl-5) */}
          <div className="flex h-full w-64 shrink-0 items-center gap-3 border-r border-slate-200 pl-5 pr-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-sm">
              <span className="text-sm font-bold leading-none">λ</span>
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Clinic AI</span>
              <span className="truncate text-sm font-semibold text-slate-900">
                {clinicName ?? 'Practice Management'}
              </span>
            </div>
          </div>

          {/* Content zone — fills remaining width, same px-8 as main content */}
          <div className="flex flex-1 items-center justify-end px-8">
            <div className="flex items-center gap-5">
              {/* User info */}
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {clinicId ? 'Clinic admin' : 'No clinic linked'}
                </span>
                <span className="text-sm font-medium text-slate-600">{userEmail ?? 'Unknown user'}</span>
              </div>

              {/* Divider */}
              <div className="hidden sm:block h-5 w-px bg-slate-200" />

              {/* Sign out */}
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.replace('/login');
                }}
                className="text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg px-3 py-1.5 transition focus:outline-none"
              >
                Sign out
              </button>
            </div>
          </div>

        </div>
      </header>

      <main className="flex flex-1">
        <aside className="w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-8">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon, href }) => {
              const active = isActive(href);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => router.push(href)}
                  className={`inline-flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ease-out ${
                    active
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:scale-[1.03]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="px-8 py-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
