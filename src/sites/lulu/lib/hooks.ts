"use client";

import { useState, useEffect, useCallback } from "react";
import type { Service } from "@/sites/lulu/data/services";

export interface BookingState {
  service: Service | null;
  date:    string;
  time:    string;
  name:    string;
  phone:   string;
  step:    number;
  done:    boolean;
}

const INIT_BOOKING: BookingState = {
  service: null,
  date:    "",
  time:    "",
  name:    "",
  phone:   "",
  step:    0,
  done:    false,
};

export function useBookingState() {
  const [s, setS] = useState<BookingState>(INIT_BOOKING);
  const set   = useCallback((p: Partial<BookingState>) => setS((prev) => ({ ...prev, ...p })), []);
  const next  = useCallback(() => setS((p) => ({ ...p, step: p.step + 1 })), []);
  const prev  = useCallback(() => setS((p) => ({ ...p, step: Math.max(0, p.step - 1) })), []);
  const reset = useCallback(() => setS(INIT_BOOKING), []);
  return { s, set, next, prev, reset };
}

/** Tracks which section id is currently visible in the viewport. */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
      { threshold: 0.35 },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [active, setActive] as const;
}
