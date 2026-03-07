"use client";

import { motion } from "framer-motion";
import { C } from "@/lulu/lib/tokens";
import { sectionReveal, revealChild, SP } from "@/lulu/lib/animations";
import BookingWizard from "@/lulu/components/BookingWizard";

export default function BookingSection() {
  return (
    <section
      id="booking"
      aria-label="הזמנת תורים"
      style={{ padding: "68px 0 72px", direction: "rtl", position: "relative" }}
    >
      <div style={{
        position: "absolute", top: "30%", right: "-20%",
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(200,68,106,0.06) 0%,transparent 70%)",
        pointerEvents: "none",
      }}/>

      <div style={{ padding: "0 16px" }}>
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          style={{ marginBottom: 28 }}
        >
          <motion.span
            variants={revealChild}
            style={{
              display: "block", fontSize: 10, letterSpacing: "0.18em",
              textTransform: "uppercase", color: C.rose, marginBottom: 12, fontWeight: 500,
            }}
          >
            ✦ קביעת תורים
          </motion.span>
          <motion.h2
            variants={revealChild}
            className="font-display"
            style={{ fontSize: "clamp(32px,9vw,50px)", fontWeight: 300, marginBottom: 10, color: C.ink }}
          >
            הזמני תור
          </motion.h2>
          <motion.p variants={revealChild} style={{ color: C.dim, fontSize: 14 }}>
            שלושה שלבים פשוטים. פחות מ-60 שניות.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1, transition: { ...SP } }}
          viewport={{ once: true }}
          style={{
            borderRadius: 24,
            padding: "26px 18px",
            background: C.card,
            border: "1.5px solid rgba(0,0,0,0.07)",
            boxShadow: "0 8px 40px rgba(180,140,110,0.12)",
          }}
        >
          <BookingWizard />
        </motion.div>
      </div>
    </section>
  );
}
