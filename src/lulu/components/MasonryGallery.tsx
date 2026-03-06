"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GALLERY } from "@/lulu/data/gallery";
import { stagger, scaleIn } from "@/lulu/lib/animations";

export default function MasonryGallery() {
  const [tapped, setTapped] = useState<number | null>(null);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      className="masonry"
      style={{ position: "relative" }}
      role="list"
      aria-label="גלריה עיצובי ציפורניים"
    >
      {/* Dim overlay when an item is tapped */}
      <AnimatePresence>
        {tapped !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setTapped(null)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(44,31,26,0.3)",
              zIndex: 10, pointerEvents: "auto",
            }}
          />
        )}
      </AnimatePresence>

      {GALLERY.map((item) => {
        const isSelected = tapped === item.id;
        const isDimmed   = tapped !== null && !isSelected;

        return (
          <motion.div
            key={item.id}
            variants={scaleIn}
            className={`m-r${item.rows}`}
            role="listitem"
            aria-label={item.label}
            onClick={() => setTapped((p) => (p === item.id ? null : item.id))}
            animate={{
              scale: isSelected ? 1.04 : 1,
              filter: isDimmed ? "blur(3px) brightness(0.82)" : "blur(0px) brightness(1)",
              zIndex: isSelected ? 20 : 1,
            }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
              background: item.bg,
              position: "relative", overflow: "hidden", cursor: "pointer",
              borderRadius: 6,
              boxShadow: isSelected ? "0 12px 36px rgba(44,31,26,0.25)" : "none",
            }}
          >
            {/* Texture overlay */}
            <div style={{
              position: "absolute", inset: 0, opacity: 0.06,
              backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,.5) 0,rgba(255,255,255,.5) 1px,transparent 1px,transparent 6px)",
            }}/>

            {/* Label reveal on tap */}
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    padding: "12px 12px",
                    background: "linear-gradient(transparent,rgba(44,20,28,0.7))",
                  }}
                >
                  <span style={{
                    fontSize: 12, letterSpacing: "0.07em",
                    color: "rgba(255,240,244,0.95)",
                    fontFamily: "Heebo",
                  }}>
                    {item.label}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
