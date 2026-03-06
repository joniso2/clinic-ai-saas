"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "@/lulu/lib/tokens";
import { SP, SP_SOFT } from "@/lulu/lib/animations";
import MagneticButton from "./MagneticButton";

interface FullMenuProps {
  open:    boolean;
  onClose: () => void;
}

const NAV_LINKS = [
  { href: "/lulu",         label: "בית"      },
  { href: "/lulu/gallery", label: "גלריה"    },
  { href: "/lulu/booking", label: "הזמנה"    },
  { href: "/lulu/shop",    label: "חנות"     },
  { href: "/lulu/contact", label: "צור קשר" },
];

export default function FullMenu({ open, onClose }: FullMenuProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ clipPath: "circle(0% at 90% 5%)" }}
          animate={{ clipPath: "circle(150% at 90% 5%)" }}
          exit={{ clipPath: "circle(0% at 90% 5%)" }}
          transition={{ ...SP_SOFT, duration: 0.55 }}
          onClick={onClose}
          role="dialog"
          aria-label="ניווט ראשי"
          style={{
            position: "fixed", inset: 0, zIndex: 190, direction: "rtl",
            background: "rgba(250,245,238,0.97)", backdropFilter: "blur(24px)",
            display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center", gap: 28,
          }}
        >
          {NAV_LINKS.map((item, i) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 + 0.15, ...SP } }}
            >
              <Link
                href={item.href}
                onClick={onClose}
                className="font-display"
                style={{ color: C.ink, fontSize: 42, textDecoration: "none", fontWeight: 300 }}
              >
                {item.label}
              </Link>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.44, ...SP } }}
          >
            <Link href="/lulu/booking" onClick={(e) => { e.stopPropagation(); onClose(); }}>
              <MagneticButton
                style={{
                  marginTop: 8, height: 56, padding: "0 40px", fontSize: 16,
                  background: `linear-gradient(120deg,${C.rose} 0%,#e06888 50%,${C.rose} 100%)`,
                  backgroundSize: "200% auto", color: "#fff",
                  border: "none", cursor: "pointer", borderRadius: 14,
                  fontFamily: "'Heebo',sans-serif", fontWeight: 500,
                }}
              >הזמן תור</MagneticButton>
            </Link>
          </motion.div>

          <div style={{ position: "absolute", bottom: 80, left: 24, opacity: 0.1, fontSize: 80 }}>🌸</div>
          <div style={{ position: "absolute", top: 100, right: 20, opacity: 0.09, fontSize: 60 }}>💅</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
