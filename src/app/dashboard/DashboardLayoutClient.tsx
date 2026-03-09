'use client';

import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Users, BarChart3, Settings as SettingsIcon, Calendar as CalendarIcon,
  Menu, DollarSign, LayoutDashboard, Building2, Link2, Activity, Brain,
  UserCheck, MessageSquare, Radio, PackageOpen, Wand2, Globe, Receipt,
  Search, ChevronLeft, LogOut,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useEffect, useRef, useState } from 'react';
import MobileDrawer from '@/components/dashboard/MobileDrawer';
import BottomNav from '@/components/dashboard/BottomNav';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { CommandPaletteProvider, useCommandPalette } from '@/contexts/CommandPaletteContext';
import CommandPalette from '@/components/dashboard/CommandPalette';
import { ClinicLogo } from '@/components/brand/ClinicLogo';

const NAV_ITEMS = [
  { id: 'leads',     label: 'לידים',     icon: Users,         href: '/dashboard' },
  { id: 'customers', label: 'לקוחות',    icon: UserCheck,     href: '/dashboard/customers' },
  { id: 'calendar',  label: 'תורים',    icon: CalendarIcon,  href: '/dashboard/calendar' },
  { id: 'analytics', label: 'אנליטיקה', icon: BarChart3,      href: '/dashboard/analytics' },
  { id: 'pricing',   label: 'תמחור',    icon: DollarSign,    href: '/dashboard/pricing' },
  { id: 'receipts',  label: 'קבלות',    icon: Receipt,       href: '/dashboard/receipts' },
  { id: 'team',      label: 'צוות',     icon: Users,         href: '/dashboard/team' },
  { id: 'settings',  label: 'הגדרות',   icon: SettingsIcon,  href: '/dashboard/settings' },
] as const;

const NAV_GROUPS = [
  { label: 'ניהול', ids: ['leads', 'customers', 'calendar'] },
  { label: 'עסק', ids: ['analytics', 'pricing', 'receipts'] },
  { label: 'צוות', ids: ['team', 'settings'] },
] as const;

const SUPER_ADMIN_HREF = '/dashboard/super-admin';

const SUPER_ADMIN_SECTIONS = [
  { id: 'overview',      label: 'סקירת מערכת',     icon: LayoutDashboard, hash: '#overview' },
  { id: 'clinics',       label: 'קליניקות',        icon: Building2,       hash: '#clinics' },
  { id: 'booking-site',  label: 'אתר טלפוני',      icon: Globe,           href: '/dashboard/super-admin/booking-site' },
  { id: 'integrations',  label: 'אינטגרציות',      icon: Link2,           hash: '#integrations' },
  { id: 'messaging',     label: 'מסרים',           icon: MessageSquare,   hash: '#messaging' },
  { id: 'live',          label: 'שיחות חיות',      icon: Radio,           hash: '#live' },
  { id: 'ai',            label: 'מודלי AI',        icon: Brain,           hash: '#ai' },
  { id: 'ai-persona',    label: 'AI Persona',      icon: Wand2,           hash: '#ai-persona' },
  { id: 'traffic',       label: 'תעבורה וביצועים', icon: Activity,        hash: '#traffic' },
  { id: 'pricing',       label: 'תמחור גלובלי',   icon: DollarSign,      hash: '#pricing' },
  { id: 'services',      label: 'שירותים',         icon: PackageOpen,     hash: '#services' },
  { id: 'users',         label: 'משתמשים',         icon: Users,           hash: '#users' },
  { id: 'settings',      label: 'הגדרות מערכת',    icon: SettingsIcon,    hash: '#settings' },
] as const;

type DashboardLayoutClientProps = {
  children: React.ReactNode;
  initialRole: string | null;
  initialUserEmail: string | null;
};

// SearchTrigger must be inside CommandPaletteProvider
function SearchTrigger() {
  const { open } = useCommandPalette();
  return (
    <button
      onClick={open}
      className="flex items-center gap-2.5 h-[38px] rounded-xl border border-slate-200/80 dark:border-slate-700/80
        bg-slate-50/80 dark:bg-slate-800/40 px-3.5 text-sm text-slate-400 dark:text-slate-500
        hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100/60 dark:hover:bg-slate-800/60
        hover:text-slate-500 dark:hover:text-slate-300
        shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)]
        transition-all duration-150 min-w-[200px] max-w-[300px] flex-1"
    >
      <Search className="h-[15px] w-[15px] shrink-0 opacity-60" />
      <span className="flex-1 text-right text-[13px] tracking-[-0.01em]">חיפוש מהיר...</span>
      <kbd className="shrink-0 rounded-md bg-slate-200/70 dark:bg-slate-700/70 border border-slate-300/40 dark:border-slate-600/40
        px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 leading-none">
        ⌘K
      </kbd>
    </button>
  );
}

function LayoutInner({ children, initialRole, initialUserEmail }: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { open: openPalette } = useCommandPalette();
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail);
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(initialRole);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentHash, setCurrentHash] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  // ⌘K global shortcut
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openPalette(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [openPalette]);

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
              setClinicName(`כעסק: ${d.clinic_name}`);
            }
          })
          .catch((err) => console.error('Failed to load impersonation state:', err));
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
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        setScrolled(el.scrollTop > 8);
        rafId = 0;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const sidebarItems = isSuperAdmin
    ? SUPER_ADMIN_SECTIONS.map((s) => ({
        id: s.id, label: s.label, icon: s.icon,
        href: (s as { hash?: string; href?: string }).href ?? `${SUPER_ADMIN_HREF}${(s as { hash: string }).hash}`,
      }))
    : [...NAV_ITEMS];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href.startsWith(SUPER_ADMIN_HREF)) {
      if (href === SUPER_ADMIN_HREF) return pathname?.startsWith(SUPER_ADMIN_HREF) && !currentHash;
      if (href.includes('#')) return pathname?.startsWith(SUPER_ADMIN_HREF) && currentHash === '#' + href.split('#')[1];
      return pathname === href;
    }
    return pathname === href || (pathname?.startsWith(href) ?? false);
  };

  const handleNavClick = (href: string) => {
    setDrawerOpen(false);
    router.push(href);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9] dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-x-hidden transition-colors duration-300">

      <header
        className="border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md w-full sticky top-0 z-40 transition-all duration-200 ease-out h-14"
        style={{ paddingTop: 'env(safe-area-inset-top)', boxShadow: scrolled ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}
      >
        <div className="absolute inset-0 md:hidden dark:hidden"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}
        />
        <div className="absolute inset-0 md:hidden hidden dark:block"
          style={{ background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}
        />
        <div className="absolute inset-0 hidden md:block bg-white dark:bg-slate-950" />

        <div className="relative flex h-full w-full items-center">

          {/* Desktop logo zone — mirrors sidebar width */}
          <div className={`hidden md:flex h-full shrink-0 items-center border-e border-slate-200 dark:border-slate-800
            transition-all duration-200 ease-in-out
            ${collapsed ? 'w-16 justify-center' : 'w-[180px] gap-2.5 pl-3 pr-4'}`}>
            <ClinicLogo size={collapsed ? 'sm' : 'md'} />
            {!collapsed && (
              <div className="flex min-w-0 flex-col leading-tight text-right">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">ניהול עסק</span>
                <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {clinicName ?? 'לוח בקרה'}
                </span>
              </div>
            )}
          </div>

          {/* Desktop header right — search + theme toggle */}
          <div className="hidden md:flex flex-1 items-center justify-start px-6 gap-3">
            <SearchTrigger />
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <ThemeToggle />
          </div>

          {/* Mobile header */}
          <div className="flex md:hidden w-full items-center px-4 gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 dark:text-slate-400
                hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all duration-150"
              aria-label="פתח תפריט"
              style={{ touchAction: 'manipulation' }}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <ClinicLogo size="sm" />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">ניהול עסק</span>
                <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50 max-w-[160px]">
                  {clinicName ?? 'לוח בקרה'}
                </span>
                {clinicName?.startsWith('כעסק:') && (
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch('/api/admin/impersonate', { method: 'DELETE', credentials: 'include' });
                      router.replace('/dashboard/super-admin');
                    }}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    יצא ממצב עסק
                  </button>
                )}
              </div>
            </div>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="shrink-0 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50
                hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg px-2.5 py-1.5 transition-colors active:scale-95 h-9"
              style={{ touchAction: 'manipulation' }}
            >
              התנתק
            </button>
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
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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

      {/* RTL: first child appears on the right */}
      <div className="flex flex-1 min-h-0 overflow-x-hidden">

        {/* Collapsible sidebar */}
        <aside className={`hidden md:flex shrink-0 flex-col border-e border-slate-200 dark:border-slate-800
          bg-white dark:bg-slate-950 transition-all duration-200 ease-in-out overflow-hidden
          ${collapsed ? 'w-16' : 'w-[180px]'}`}>

          {/* Nav area */}
          <nav className={`flex flex-col flex-1 overflow-y-auto ${collapsed ? 'px-2 py-4' : 'px-2 py-5'}`}>
            {isSuperAdmin
              ? sidebarItems.map(({ id, label, icon: Icon, href }) => {
                  const active = isActive(href);
                  return (
                    <button
                      key={id}
                      type="button"
                      title={collapsed ? label : undefined}
                      onClick={() => {
                        if (href.includes('#')) {
                          if (!isOnSuperAdmin) router.push(SUPER_ADMIN_HREF);
                          window.location.hash = href.split('#')[1];
                        } else {
                          router.push(href);
                        }
                      }}
                      className={`group inline-flex w-full items-center rounded-lg py-2 text-[13px] transition-all duration-150
                        ${collapsed ? 'justify-center px-0' : 'flex-row-reverse justify-end gap-2.5 mx-1 px-2.5'}
                        ${active
                          ? `font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400
                             ${!collapsed ? 'border-s-2 border-s-indigo-500' : ''}`
                          : 'font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                      <div className={`flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150
                        ${active
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 dark:text-slate-500 group-hover:bg-slate-200/60 dark:group-hover:bg-slate-700/50 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                        }`}>
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                      </div>
                      {!collapsed && <span>{label}</span>}
                    </button>
                  );
                })
              : NAV_GROUPS.map((group) => {
                  const groupItems = NAV_ITEMS.filter((item) => (group.ids as readonly string[]).includes(item.id));
                  return (
                    <div key={group.label}>
                      {!collapsed && (
                        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] px-2.5 mt-5 mb-1 text-right">
                          {group.label}
                        </div>
                      )}
                      {collapsed && <div className="mt-4" />}
                      {groupItems.map(({ id, label, icon: Icon, href }) => {
                        const active = isActive(href);
                        return (
                          <button
                            key={id}
                            type="button"
                            title={collapsed ? label : undefined}
                            onClick={() => router.push(href)}
                            className={`group inline-flex w-full items-center rounded-lg py-2 text-[13px] transition-all duration-150
                              ${collapsed ? 'justify-center px-0' : 'flex-row-reverse justify-end gap-2.5 mx-1 px-2.5'}
                              ${active
                                ? `font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400
                                   ${!collapsed ? 'border-s-2 border-s-indigo-500' : ''}`
                                : 'font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                          >
                            <div className={`flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150
                              ${active
                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-400 dark:text-slate-500 group-hover:bg-slate-200/60 dark:group-hover:bg-slate-700/50 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                              }`}>
                              <Icon className="h-[18px] w-[18px] shrink-0" />
                            </div>
                            {!collapsed && <span>{label}</span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
            }
          </nav>

          {/* Sidebar footer */}
          <div className={`border-t border-slate-100 dark:border-slate-800 ${collapsed ? 'px-2 py-3' : 'px-2.5 py-3.5'}`}>
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center
                  text-indigo-700 dark:text-indigo-400 text-sm font-bold select-none">
                  {(userEmail?.[0] ?? '?').toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  title="התנתק"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate">
                    {isSuperAdmin ? 'מנהל מערכת' : (role === 'STAFF' ? 'צוות' : 'מנהל עסק')}
                  </p>
                  <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400 truncate">{userEmail ?? 'משתמש'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex w-full items-center justify-center gap-2 h-9 rounded-lg text-[13px] font-medium
                    text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700
                    hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400
                    hover:border-red-200 dark:hover:border-red-800 transition-all duration-150"
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" />
                  התנתק
                </button>
              </div>
            )}

            {/* Collapse toggle */}
            <button
              onClick={toggleCollapsed}
              className="mt-3 flex w-full items-center justify-center py-1.5 text-slate-300 hover:text-slate-500
                dark:text-slate-600 dark:hover:text-slate-400 transition-colors rounded-lg
                hover:bg-slate-50 dark:hover:bg-slate-800/50"
              title={collapsed ? 'הרחב סרגל' : 'כווץ סרגל'}
            >
              <ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </aside>

        <main
          ref={scrollRef}
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-[#FAFAF9] dark:bg-slate-950"
        >
          <div className="px-4 py-5 md:px-8 md:py-8 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-8">
            {children}
          </div>
        </main>
      </div>

      <BottomNav />
      <CommandPalette />
    </div>
  );
}

export function DashboardLayoutClient(props: DashboardLayoutClientProps) {
  return (
    <CommandPaletteProvider>
      <LayoutInner {...props} />
    </CommandPaletteProvider>
  );
}
