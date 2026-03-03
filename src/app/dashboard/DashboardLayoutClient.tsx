'use client';

import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, BarChart3, Settings as SettingsIcon, Calendar as CalendarIcon, Menu, DollarSign, LayoutDashboard, Building2, Link2, Activity, Brain } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useEffect, useRef, useState } from 'react';
import MobileDrawer from '@/components/dashboard/MobileDrawer';
import BottomNav from '@/components/dashboard/BottomNav';

const NAV_ITEMS = [
  { id: 'leads',     label: 'לידים',     icon: Users,         href: '/dashboard' },
  { id: 'calendar',  label: 'תורים',    icon: CalendarIcon,  href: '/dashboard/calendar' },
  { id: 'analytics', label: 'אנליטיקה', icon: BarChart3,      href: '/dashboard/analytics' },
  { id: 'pricing',   label: 'תמחור',    icon: DollarSign,    href: '/dashboard/pricing' },
  { id: 'team',      label: 'צוות',     icon: Users,         href: '/dashboard/team' },
  { id: 'settings',  label: 'הגדרות',   icon: SettingsIcon,  href: '/dashboard/settings' },
] as const;

const SUPER_ADMIN_HREF = '/dashboard/super-admin';

const SUPER_ADMIN_SECTIONS = [
  { id: 'overview',     label: 'סקירה',           icon: LayoutDashboard, hash: '#overview' },
  { id: 'clinics',      label: 'קליניקות',        icon: Building2,       hash: '#clinics' },
  { id: 'pricing',      label: 'תמחור גלובלי',    icon: DollarSign,      hash: '#pricing' },
  { id: 'integrations', label: 'אינטגרציות',      icon: Link2,           hash: '#integrations' },
  { id: 'traffic',      label: 'תעבורה וביצועים', icon: Activity,        hash: '#traffic' },
  { id: 'ai',           label: 'מודלים & AI',     icon: Brain,           hash: '#ai' },
  { id: 'users',        label: 'משתמשים והרשאות', icon: Users,            hash: '#users' },
  { id: 'settings',     label: 'הגדרות מערכת',   icon: SettingsIcon,    hash: '#settings' },
] as const;

type DashboardLayoutClientProps = {
  children: React.ReactNode;
  initialRole: string | null;
  initialUserEmail: string | null;
};

export function DashboardLayoutClient({ children, initialRole, initialUserEmail }: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail);
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(initialRole);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentHash, setCurrentHash] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentHash(window.location.hash || '#overview');
    const onHash = () => setCurrentHash(window.location.hash || '#overview');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [pathname]);

  const isOnSuperAdmin = pathname?.startsWith(SUPER_ADMIN_HREF) ?? false;

  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUserEmail(session.user.email ?? null);

      const { data: rows } = await supabase
        .from('clinic_users')
        .select('clinic_id, role, clinic:clinics!clinic_users1_clinic_id_fkey (id, name)')
        .eq('user_id', session.user.id);

      const list = rows ?? [];
      type Row = (typeof list)[number];
      const clinicLink: Row | null = list.find((r: Row) => r.role === 'SUPER_ADMIN') ?? list[0] ?? null;

      if (!clinicLink) return;
      setRole(clinicLink.role ?? null);

      if (clinicLink.role === 'SUPER_ADMIN') {
        setClinicName('מנהל מערכת');
        setClinicId(null);
        fetch('/api/admin/impersonation', { credentials: 'include' })
          .then((r) => r.json())
          .then((d: { clinic_id: string | null; clinic_name: string | null }) => {
            if (d.clinic_id && d.clinic_name) {
              setClinicId(d.clinic_id);
              setClinicName(`כקליניקה: ${d.clinic_name}`);
            }
          })
          .catch(() => {});
        return;
      }

      const clinic = (Array.isArray(clinicLink.clinic) ? clinicLink.clinic[0] : clinicLink.clinic) as { id: string; name: string } | null;
      if (clinic?.id) setClinicId(clinic.id);
      if (clinic?.name) setClinicName(clinic.name);
    });
  }, []);

  const [impersonationChecked, setImpersonationChecked] = useState(false);
  const [impersonationClinicId, setImpersonationClinicId] = useState<string | null>(null);
  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch('/api/admin/impersonation', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { clinic_id: string | null }) => {
        setImpersonationClinicId(d.clinic_id ?? null);
        setImpersonationChecked(true);
      })
      .catch(() => setImpersonationChecked(true));
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin || !pathname || !impersonationChecked) return;
    if (pathname.startsWith(SUPER_ADMIN_HREF)) return;
    if (impersonationClinicId) return;
    router.replace(SUPER_ADMIN_HREF);
  }, [isSuperAdmin, pathname, router, impersonationChecked, impersonationClinicId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const sidebarItems = isSuperAdmin
    ? SUPER_ADMIN_SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon, href: `${SUPER_ADMIN_HREF}${s.hash}` }))
    : [...NAV_ITEMS];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href.startsWith(SUPER_ADMIN_HREF)) {
      if (href === SUPER_ADMIN_HREF) return pathname?.startsWith(SUPER_ADMIN_HREF) && !currentHash;
      if (href.includes('#')) return pathname?.startsWith(SUPER_ADMIN_HREF) && currentHash === '#' + href.split('#')[1];
      return pathname === href;
    }
    return pathname?.startsWith(href) ?? false;
  };

  const handleNavClick = (href: string) => {
    setDrawerOpen(false);
    router.push(href);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 overflow-x-hidden transition-colors duration-300">

      <header
        className={`border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 w-full sticky top-0 z-40
          transition-all duration-200 ease-out
          md:h-16
          ${scrolled ? 'h-[52px]' : 'h-[60px]'}`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
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
        <div className="absolute inset-0 hidden md:block bg-white dark:bg-zinc-900" />

        <div className="relative flex h-full w-full items-center">
          <div className="hidden md:flex h-full w-64 shrink-0 items-center gap-3 border-e border-slate-200 dark:border-zinc-800 pl-4 pr-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-sm">
              <span className="text-sm font-bold leading-none">λ</span>
            </div>
            <div className="flex min-w-0 flex-col leading-tight text-right">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">קליניקת AI</span>
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">
                {clinicName ?? 'ניהול מרפאה'}
              </span>
            </div>
          </div>

          <div className="flex md:hidden w-full items-center px-4 gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 dark:text-zinc-400
                hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all duration-150"
              aria-label="פתח תפריט"
              style={{ touchAction: 'manipulation' }}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-sm">
                <span className="text-xs font-bold leading-none">λ</span>
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">קליניקת AI</span>
                <span className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100 max-w-[160px]">
                  {clinicName ?? 'ניהול מרפאה'}
                </span>
                {clinicName?.startsWith('כקליניקה:') && (
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch('/api/admin/impersonate', { method: 'DELETE', credentials: 'include' });
                      router.replace('/dashboard/super-admin');
                    }}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    יצא ממצב קליניקה
                  </button>
                )}
              </div>
            </div>
            <ThemeToggle />
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace('/login');
              }}
              className="shrink-0 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800
                rounded-lg px-2.5 py-1.5 transition-colors active:scale-95 h-9"
              style={{ touchAction: 'manipulation' }}
            >
              התנתק
            </button>
          </div>

          <div className="hidden md:flex flex-1 items-center justify-end px-8">
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex flex-col items-end leading-tight text-right">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                  {isSuperAdmin ? 'מנהל מערכת' : clinicId ? (role === 'STAFF' ? 'צוות' : 'מנהל קליניקה') : 'לא מקושר לקליניקה'}
                </span>
                <span className="text-sm font-medium text-slate-600 dark:text-zinc-400">{userEmail ?? 'משתמש'}</span>
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
                התנתק
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <nav className="flex flex-col gap-1 text-right">
          {sidebarItems.map(({ id, label, icon: Icon, href }) => {
            const active = isActive(href);
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (href.includes('#')) {
                    router.push(href);
                    window.location.hash = href.split('#')[1];
                  } else {
                    handleNavClick(href);
                  }
                }}
                className={`inline-flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold
                  transition-all duration-200 ease-out active:scale-[0.98] flex-row-reverse justify-end
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

        {/* RTL: flex-row (no reverse) places first child (aside) on the right. */}
      <div className="flex flex-1 min-h-0">
        <aside className="hidden md:flex w-[268px] shrink-0 flex-col border-e border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-8 transition-colors duration-300 text-right">
          <nav className="flex flex-col gap-1">
            {sidebarItems.map(({ id, label, icon: Icon, href }) => {
              const active = isActive(href);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    if (href.includes('#')) {
                      if (!isOnSuperAdmin) router.push(SUPER_ADMIN_HREF);
                      window.location.hash = href.split('#')[1];
                    } else {
                      router.push(href);
                    }
                  }}
                  className={`inline-flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 flex-row-reverse justify-end ${
                    active
                      ? 'bg-slate-100 text-slate-900 dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>
        <main
          ref={scrollRef}
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-zinc-900"
        >
          <div className="px-4 py-5 md:px-8 md:py-8 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-8">
            {children}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
