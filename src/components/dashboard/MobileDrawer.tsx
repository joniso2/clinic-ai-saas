'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ClinicLogo } from '@/components/brand/ClinicLogo';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function MobileDrawer({ open, onClose, children }: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Swipe-to-close gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const delta = touchCurrentX.current - touchStartX.current;
    if (delta > 0 && drawerRef.current) {
      drawerRef.current.style.transform = `translateX(${delta}px)`;
    }
  };

  const handleTouchEnd = () => {
    const delta = touchCurrentX.current - touchStartX.current;
    if (drawerRef.current) {
      drawerRef.current.style.transform = '';
    }
    if (delta > 80) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ease-in-out bg-slate-900/50 backdrop-blur-sm ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-0 left-0 z-50 h-full md:hidden flex flex-col bg-white dark:bg-slate-950 shadow-2xl
          transition-transform duration-300 ease-in-out will-change-transform drawer-enter
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          width: 'min(85vw, 320px)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <ClinicLogo size="sm" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Clinic AI</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors active:scale-95"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav content */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {children}
        </div>
      </div>
    </>
  );
}
