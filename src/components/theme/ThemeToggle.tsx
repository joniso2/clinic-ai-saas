'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    // Enlarged tap target for mobile — invisible padding around the visual toggle
    <button
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      className="relative flex shrink-0 cursor-pointer items-center justify-center p-1.5 rounded-full
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2
        focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900
        active:scale-95 transition-transform duration-150"
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Track */}
      <span
        className={`
          relative inline-flex h-[30px] w-[54px] items-center rounded-full
          transition-colors duration-300 ease-in-out
          shadow-inner
          ${isDark
            ? 'bg-emerald-500'
            : 'bg-zinc-300 dark:bg-slate-600'
          }
        `}
      >
        {/* Knob */}
        <span
          className={`
            absolute top-[3px] left-[3px]
            h-6 w-6 rounded-full bg-white
            flex items-center justify-center
            transition-transform duration-300 ease-in-out
            shadow-[0_1px_4px_rgba(0,0,0,0.20),0_2px_8px_rgba(0,0,0,0.12)]
            ${isDark ? 'translate-x-[24px]' : 'translate-x-0'}
          `}
        >
          {/* Sun — light mode */}
          <Sun
            className={`
              absolute h-[13px] w-[13px] text-amber-400
              transition-all duration-200 ease-in-out
              ${isDark
                ? 'opacity-0 scale-[0.4] rotate-90'
                : 'opacity-100 scale-100 rotate-0'
              }
            `}
            strokeWidth={2.5}
          />
          {/* Moon — dark mode */}
          <Moon
            className={`
              absolute h-[13px] w-[13px] text-slate-600
              transition-all duration-200 ease-in-out
              ${isDark
                ? 'opacity-100 scale-100 rotate-0'
                : 'opacity-0 scale-[0.4] -rotate-90'
              }
            `}
            strokeWidth={2.5}
          />
        </span>
      </span>
    </button>
  );
}
