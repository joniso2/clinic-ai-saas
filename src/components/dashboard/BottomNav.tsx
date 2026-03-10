'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Users, Receipt, Tag, Calendar as CalendarIcon, UserCheck } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'leads',     label: 'לידים',     icon: Users,         href: '/dashboard' },
  { id: 'customers', label: 'לקוחות',    icon: UserCheck,     href: '/dashboard/customers' },
  { id: 'calendar',  label: 'תורים',    icon: CalendarIcon,  href: '/dashboard/calendar' },
  { id: 'receipts',  label: 'קבלות',    icon: Receipt,       href: '/dashboard/receipts' },
  { id: 'pricing',   label: 'תמחור',    icon: Tag,           href: '/dashboard/pricing' },
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
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-slate-950/95 border-t border-slate-200/80 dark:border-slate-800/80"
      style={{
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.07)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
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
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500'
                }`}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="relative flex flex-col items-center gap-0.5">
                {active && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-indigo-500" />
                )}
                <Icon className={`h-5 w-5 transition-all duration-200 ${active ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
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
