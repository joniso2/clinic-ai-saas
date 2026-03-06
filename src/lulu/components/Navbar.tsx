"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { C } from "@/lulu/lib/tokens";
import { SP } from "@/lulu/lib/animations";
import MagneticButton from "./MagneticButton";

interface NavbarProps {
  menuOpen:    boolean;
  setMenuOpen: (open: boolean) => void;
}

export default function Navbar({ menuOpen, setMenuOpen }: NavbarProps) {
  const [elevated, setElevated] = useState(false);

  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1, ...SP }}
      role="banner"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        height: C.navH, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", direction: "rtl",
        background: C.navBg, backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        transition: "box-shadow .3s",
        boxShadow: elevated ? "0 4px 24px rgba(180,140,110,0.13)" : "none",
      }}
    >
      <Link href="/lulu" aria-label="עמוד הבית של מרפאת LULU"
        style={{ textDecoration: "none" }}
      >
        <span className="font-display" style={{ fontSize: 22, lineHeight: 1 }}>
          <span style={{ color: C.rose }}>LULU</span>
          <span style={{ fontWeight: 300, color: C.ink }}> מרפאה</span>
        </span>
      </Link>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Link href="/lulu/booking">
          <MagneticButton
            aria-label="הזמן תור"
            style={{
              height: 38, padding: "0 16px", fontSize: 13, borderRadius: 10,
              background: `linear-gradient(120deg,${C.rose} 0%,#e06888 50%,${C.rose} 100%)`,
              backgroundSize: "200% auto", color: "#fff",
              border: "none", cursor: "pointer",
              transition: "background-position .5s",
              fontFamily: "'Heebo',sans-serif", fontWeight: 500,
            }}
          >הזמן עכשיו</MagneticButton>
        </Link>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="תפריט"
          aria-expanded={menuOpen}
          style={{
            width: 44, height: 44, display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center", gap: 5,
            background: "transparent", border: "none", cursor: "pointer",
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={
                menuOpen
                  ? i === 1 ? { opacity: 0, scaleX: 0 }
                  : i === 0 ? { rotate: 45, y: 11 }
                  : { rotate: -45, y: -11 }
                  : { opacity: 1, rotate: 0, y: 0, scaleX: 1 }
              }
              style={{ display: "block", width: 20, height: 1.5, background: C.ink, borderRadius: 2 }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </motion.button>
      </div>
    </motion.header>
  );
}
