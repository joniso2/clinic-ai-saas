"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PRODUCTS } from "@/lulu/data/products";
import { C } from "@/lulu/lib/tokens";
import { SP, SP_FAST } from "@/lulu/lib/animations";

export default function ProductCarousel() {
  const [added,  setAdded]  = useState<Record<number, boolean>>({});
  const [lifted, setLifted] = useState<Record<number, boolean>>({});

  const quickAdd = (id: number) => {
    setAdded((s) => ({ ...s, [id]: true }));
    setTimeout(() => setAdded((s) => { const n = { ...s }; delete n[id]; return n; }), 1800);
  };

  return (
    <div
      className="scroll-x"
      style={{ display: "flex", gap: 12, paddingLeft: 16, paddingRight: 16, paddingBottom: 8, direction: "rtl" }}
      role="list"
      aria-label="מוצרי טיפוח ציפורניים"
    >
      {PRODUCTS.map((p, i) => (
        <motion.div
          key={p.id}
          className="snap-s"
          role="listitem"
          initial={{ opacity: 0, x: -28 }}
          whileInView={{ opacity: 1, x: 0, transition: { delay: i * 0.06, ...SP } }}
          viewport={{ once: true }}
          onPointerDown={() => setLifted((s) => ({ ...s, [p.id]: true }))}
          onPointerUp={() => setLifted((s) => ({ ...s, [p.id]: false }))}
          onPointerLeave={() => setLifted((s) => ({ ...s, [p.id]: false }))}
          animate={{
            y: lifted[p.id] ? 3 : 0,
            boxShadow: lifted[p.id]
              ? "0 4px 12px rgba(180,140,110,0.14)"
              : "0 8px 32px rgba(180,140,110,0.16), 0 2px 8px rgba(180,140,110,0.08)",
          }}
          transition={{ duration: 0.14 }}
          style={{
            flexShrink: 0, width: 162, borderRadius: 20, overflow: "hidden",
            background: p.accent, border: "1.5px solid rgba(0,0,0,0.06)", cursor: "pointer",
          }}
        >
          {/* Product image zone */}
          <div style={{
            height: 150, display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(145deg,${p.accent} 0%,rgba(200,68,106,0.06) 100%)`,
            position: "relative", overflow: "hidden",
          }}>
            <motion.div
              animate={{ y: lifted[p.id] ? -8 : 0 }}
              transition={{ duration: 0.2, ...SP_FAST }}
              style={{ fontSize: 46, filter: "drop-shadow(0 4px 10px rgba(200,68,106,0.25))" }}
              aria-hidden="true"
            >
              {p.emoji}
            </motion.div>
            <div style={{
              position: "absolute", top: 10, right: 10,
              background: C.rose, borderRadius: 20,
              padding: "2px 9px", fontSize: 9, color: "#fff",
              fontWeight: 600, letterSpacing: "0.04em",
            }}>
              {p.tag}
            </div>
          </div>

          <div style={{ padding: "12px 14px 14px", direction: "rtl" }}>
            <p style={{ fontSize: 13, color: C.ink, fontWeight: 500, marginBottom: 4, lineHeight: 1.3 }}>
              {p.name}
            </p>
            <p className="font-display" style={{ fontSize: 20, color: C.rose, marginBottom: 10 }}>
              ₪{p.price}
            </p>

            {/* Quick-add button with checkmark morph */}
            <motion.button
              whileTap={{ scale: 0.94, transition: { duration: 0.1 } }}
              onClick={() => quickAdd(p.id)}
              aria-label={`הוסף ${p.name} לסל`}
              style={{
                width: "100%", height: 38, borderRadius: 10, cursor: "pointer",
                border: "none",
                background: added[p.id] ? "#4CAF82" : C.rose,
                color: "#fff", fontSize: 12, fontWeight: 500,
                fontFamily: "'Heebo',sans-serif",
                overflow: "hidden", position: "relative",
                transition: "background .3s",
              }}
            >
              <AnimatePresence mode="wait">
                {added[p.id] ? (
                  <motion.span
                    key="added"
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -16, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                  >
                    <motion.svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                      <motion.path
                        d="M1 5L4.5 8.5L11 1" stroke="#fff" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </motion.svg>
                    נוסף
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -16, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    + הוסף לסל
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
