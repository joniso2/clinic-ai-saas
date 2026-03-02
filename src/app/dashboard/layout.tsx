'use client';

import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, BarChart3, Settings as SettingsIcon, Calendar as CalendarIcon, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useEffect, useRef, useState } from 'react';
import MobileDrawer from '@/components/dashboard/MobileDrawer';
import BottomNav from '@/components/dashboard/BottomNav';

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUserEmail(session.user.email ?? null);

      const { data: clinicLink, error } = await supabase
        .from('clinic_users')
        .select(`clinic:clinics!clinic_users1_clinic_id_fkey (id, name)`)
        .eq('user_id', session.user.id)
        .single();

      if (!clinicLink || error) return;

      const clinic = (Array.isArray(clinicLink.clinic) ? clinicLink.clinic[0] : clinicLink.clinic) as { id: string; name: string } | null;
      if (clinic?.id) setClinicId(clinic.id);
      if (clinic?.name) setClinicName(clinic.name);
    });
  }, []);

  // Compress header on scroll (mobile only)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleNavClick = (href: string) => {
    setDrawerOpen(false);
    router.push(href);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 overflow-x-hidden transition-colors duration-300">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      {/* Desktop: unchanged. Mobile: sticky, blur, safe-area, compresses on scroll */}
      <header
        className={`border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 w-full sticky top-0 z-40
          transition-all duration-200 ease-out
          md:h-16
          ${scrolled ? 'h-[52px]' : 'h-[60px]'}`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Mobile backdrop blur layer */}
        <div
          className="absolute inset-0 md:hidden dark:hidden"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        />
        <div
          className="absolute inset-0 md:hidden hidden dark:block"
          style={{
            background: 'rgba(24,24,27,0.92)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        />
        {/* Desktop: solid (overrides the blur layer) */}
        <div className="absolute inset-0 hidden md:block bg-white dark:bg-zinc-900" />

        <div className="relative flex h-full w-full items-center">

          {/* ── Logo zone (desktop only — same w-64 as sidebar) ── */}
          <div className="hidden md:flex h-full w-64 shrink-0 items-center gap-3 border-r border-slate-200 dark:border-zinc-800 pl-5 pr-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-sm">
              <span className="text-sm font-bold leading-none">λ</span>
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Clinic AI</span>
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">
                {clinicName ?? 'Practice Management'}
              </span>
            </div>
          </div>

          {/* ── Mobile header content ── */}
          <div className="flex md:hidden w-full items-center px-4 gap-3">
            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 dark:text-zinc-400
                hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all duration-150"
              aria-label="Open menu"
              style={{ touchAction: 'manipulation' }}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo + clinic name */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-sm">
                <span className="text-xs font-bold leading-none">λ</span>
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Clinic AI</span>
                <span className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100 max-w-[160px]">
                  {clinicName ?? 'Practice Management'}
                </span>
              </div>
            </div>

            {/* Theme toggle (mobile) */}
            <ThemeToggle />

            {/* Sign out (mobile) */}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace('/login');
              }}
              className="shrink-0 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800
                rounded-lg px-2.5 py-1.5 transition-colors active:scale-95 h-9"
              style={{ touchAction: 'manipulation' }}
            >
              Sign out
            </button>
          </div>

          {/* ── Desktop right zone ── */}
          <div className="hidden md:flex flex-1 items-center justify-end px-8">
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                  {clinicId ? 'Clinic admin' : 'No clinic linked'}
                </span>
                <span className="text-sm font-medium text-slate-600 dark:text-zinc-400">{userEmail ?? 'Unknown user'}</span>
              </div>
              <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-zinc-700" />
              <ThemeToggle />
              <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-zinc-700" />
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.replace('/login');
                }}
                className="text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg px-3 py-1.5 transition focus:outline-none"
              >
                Sign out
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* ── MOBILE DRAWER ─────────────────────────────────────────────────── */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon, href }) => {
            const active = isActive(href);
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleNavClick(href)}
                className={`inline-flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold
                  transition-all duration-200 ease-out active:scale-[0.98]
                  ${active
                    ? 'bg-slate-100 text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-black/20'
                    : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-zinc-200'
                  }`}
                style={{ touchAction: 'manipulation' }}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </MobileDrawer>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main className="flex flex-1 min-h-0">

        {/* Desktop sidebar */}
        <aside className="hidden md:block w-64 shrink-0 border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-8 transition-colors duration-300">
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
                      ? 'bg-slate-100 text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-black/20'
                      : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-zinc-200 hover:scale-[1.03]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content area */}
        <div
          ref={scrollRef}
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-zinc-900"
        >
          {/* Desktop padding: unchanged. Mobile: smaller padding + bottom space for BottomNav */}
          <div className="px-4 py-5 md:px-8 md:py-8 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-8">
            {children}
          </div>
        </div>

      </main>

      {/* ── BOTTOM NAV (mobile only) ───────────────────────────────────────── */}
      <BottomNav />

    </div>
  );
}
