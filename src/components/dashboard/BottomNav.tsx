'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Users, BarChart3, Settings as SettingsIcon, Calendar as CalendarIcon } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'leads',     label: 'לידים',     icon: Users,         href: '/dashboard' },
  { id: 'calendar',  label: 'תורים',    icon: CalendarIcon,  href: '/dashboard/calendar' },
  { id: 'analytics', label: 'אנליטיקה', icon: BarChart3,      href: '/dashboard/analytics' },
  { id: 'settings',  label: 'הגדרות',   icon: SettingsIcon,  href: '/dashboard/settings' },
] as const;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden
        bottom-nav-light dark:bottom-nav-dark"
      style={{
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-[60px] px-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon, href }) => {
          const active = isActive(href);
          return (
            <button
              key={id}
              type="button"
              onClick={() => router.push(href)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-xl
                transition-all duration-200 ease-out active:scale-[0.92]
                ${active
                  ? 'text-slate-900 dark:text-zinc-100'
                  : 'text-slate-400 dark:text-zinc-500'
                }`}
              style={{ touchAction: 'manipulation' }}
            >
              <div className={`relative flex items-center justify-center transition-all duration-200
                ${active ? 'scale-110' : 'scale-100'}`}>
                {active && (
                  <span className="absolute inset-0 rounded-lg bg-slate-100 dark:bg-zinc-700 scale-150 opacity-60" />
                )}
                <Icon className={`h-5 w-5 relative z-10 transition-all duration-200 ${active ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
              </div>
              <span className={`text-[10px] font-semibold tracking-tight transition-all duration-200
                ${active ? 'opacity-100' : 'opacity-60'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
