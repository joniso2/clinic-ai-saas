'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus within a container while `isOpen` is true.
 * Restores focus to the previously-focused element on close.
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isOpen: boolean) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save the currently focused element so we can restore it later.
    previousFocus.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    // Small delay so the DOM has rendered the modal content.
    const raf = requestAnimationFrame(() => {
      const first = container.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const el = containerRef.current;
      if (!el) return;

      const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus on close.
      previousFocus.current?.focus();
    };
  }, [isOpen, containerRef]);
}
