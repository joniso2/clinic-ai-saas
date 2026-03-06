"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "@/lulu/lib/tokens";
import { scaleIn, SP_FAST } from "@/lulu/lib/animations";
import type { Service } from "@/lulu/data/services";

interface ServiceCardProps {
  svc:      Service;
  selected: boolean;
  onSelect: (svc: Service) => void;
}

export default function ServiceCard({ svc, selected, onSelect }: ServiceCardProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <motion.button
      variants={scaleIn}
      whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={() => onSelect(svc)}
      aria-pressed={selected}
      style={{
        width: "100%", textAlign: "right", cursor: "pointer", border: "none",
        borderRadius: 18, padding: "16px 16px",
        background: selected ? C.roseSoft : C.card,
        borderWidth: 1.5, borderStyle: "solid",
        borderColor: selected ? C.rose : C.border,
        fontFamily: "'Heebo',sans-serif",
        transition: "border-color .18s, background .18s",
        boxShadow: pressed
          ? "0 2px 8px rgba(200,68,106,0.12)"
          : selected
            ? "0 6px 24px rgba(200,68,106,0.16), 0 2px 8px rgba(200,68,106,0.08)"
            : "0 2px 12px rgba(180,140,110,0.08)",
        direction: "rtl", position: "relative", overflow: "hidden",
      }}
    >
      {/* Selection checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { ...SP_FAST } }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
            style={{
              position: "absolute", top: 14, left: 14,
              width: 22, height: 22, borderRadius: "50%",
              background: C.rose,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <motion.svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <motion.path
                d="M1 3.5L4 6.5L9 1" stroke="#fff" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.25, delay: 0.05, ease: "easeOut" }}
              />
            </motion.svg>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <motion.div
          animate={selected ? { scale: [1, 1.2, 1], rotate: [0, 8, -4, 0] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.4, ...SP_FAST }}
          style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}
          aria-hidden="true"
        >
          {svc.emoji}
        </motion.div>

        <div style={{ flex: 1, textAlign: "right" }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: C.ink, marginBottom: 3, lineHeight: 1.3 }}>
            {svc.name}
          </p>
          <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, marginBottom: 10 }}>
            {svc.desc}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: C.dim, background: C.surface, padding: "3px 10px", borderRadius: 20 }}>
              {svc.dur}
            </span>
            <motion.span
              className="font-display"
              animate={selected ? { color: C.rose } : { color: C.ink }}
              style={{ fontSize: 22, fontWeight: 400 }}
            >
              ₪{svc.price}
            </motion.span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
