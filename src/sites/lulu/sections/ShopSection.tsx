"use client";

import { motion } from "framer-motion";
import { C } from "@/sites/lulu/lib/tokens";
import { sectionReveal, revealChild } from "@/sites/lulu/lib/animations";
import ProductCarousel from "@/sites/lulu/components/ProductCarousel";

export default function ShopSection() {
  return (
    <section
      id="shop"
      aria-label="חנות מוצרי ציפורניים"
      style={{ padding: "68px 0 72px", direction: "rtl" }}
    >
      <div style={{
        padding: "0 16px 24px",
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      }}>
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.span
            variants={revealChild}
            style={{
              display: "block", fontSize: 10, letterSpacing: "0.18em",
              textTransform: "uppercase", color: C.rose, marginBottom: 12, fontWeight: 500,
            }}
          >
            ✦ טיפוח ציפורניים
          </motion.span>
          <motion.h2
            variants={revealChild}
            className="font-display"
            style={{ fontSize: "clamp(32px,9vw,50px)", fontWeight: 300, color: C.ink }}
          >
            חנות
          </motion.h2>
        </motion.div>

        <motion.a
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          href="#"
          aria-label="צפייה בכל המוצרים"
          style={{
            color: C.dim, fontSize: 12, textDecoration: "none",
            letterSpacing: "0.06em", textTransform: "uppercase",
            borderBottom: `1px solid ${C.border}`,
            paddingBottom: 2, flexShrink: 0, marginBottom: 8,
          }}
        >
          ← הכל
        </motion.a>
      </div>

      <ProductCarousel />
    </section>
  );
}
