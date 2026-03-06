"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { C } from "@/lulu/lib/tokens";
import { SP, SP_FAST } from "@/lulu/lib/animations";

const NAV_ITEMS = [
  {
    href:  "/lulu/gallery",
    label: "גלריה",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? C.rose : "#9A8A80"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href:  "/lulu/booking",
    label: "הזמנה",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? C.rose : "#9A8A80"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href:  "/lulu/shop",
    label: "חנות",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? C.rose : "#9A8A80"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
  },
  {
    href:  "/lulu/contact",
    label: "צור קשר",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? C.rose : "#9A8A80"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 010 1.18 2 2 0 012.04 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
      </svg>
    ),
  },
] as const;

export default function BottomBar() {
  const pathname = usePathname();

  return (
    <motion.nav
      className="bottom-bar"
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.35, ...SP }}
      aria-label="ניווט תחתון"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
        height: C.barH,
        background: C.barBg, backdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(0,0,0,0.07)",
        display: "flex", alignItems: "flex-start", paddingTop: 6,
        direction: "rtl",
        boxShadow: "0 -4px 20px rgba(180,140,110,0.09)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              textDecoration: "none", cursor: "pointer", padding: "6px 0", minHeight: 44,
              color: isActive ? C.rose : C.dim, transition: "color .2s",
            }}
          >
            <motion.span
              animate={isActive ? { scale: [1, 1.18, 1], transition: { duration: 0.3, ...SP_FAST } } : { scale: 1 }}
            >
              {item.icon(isActive)}
            </motion.span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="bar-dot"
                style={{ width: 4, height: 4, borderRadius: "50%", background: C.rose }}
              />
            )}
          </Link>
        );
      })}
    </motion.nav>
  );
}
