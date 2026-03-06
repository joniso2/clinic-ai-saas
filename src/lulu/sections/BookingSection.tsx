"use client";

import { motion } from "framer-motion";
import { C } from "@/lulu/lib/tokens";
import { sectionReveal, revealChild, SP } from "@/lulu/lib/animations";

/**
 * Booking section — placeholder until the new booking system is built.
 * The old BookingWizard logic has been completely removed.
 */
export default function BookingSection() {
  return (
    <section
      id="booking"
      aria-label="הזמנת תורים"
      style={{ padding: "68px 16px 72px", direction: "rtl", position: "relative" }}
    >
      {/* Decorative blob */}
      <div style={{
        position: "absolute", top: "30%", right: "-20%",
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(200,68,106,0.06) 0%,transparent 70%)",
        pointerEvents: "none",
      }}/>

      <motion.div
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        style={{ marginBottom: 40 }}
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
      </motion.div>

      {/* Coming-soon card */}
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1, transition: { ...SP } }}
        viewport={{ once: true }}
        style={{
          borderRadius: 24, padding: "48px 24px",
          background: C.card,
          border: "1.5px solid rgba(0,0,0,0.07)",
          boxShadow: "0 8px 40px rgba(180,140,110,0.12)",
          textAlign: "center",
        }}
      >
        <motion.div
          animate={{ rotate: [0, 8, -6, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: 52, marginBottom: 20 }}
          aria-hidden="true"
        >
          🌸
        </motion.div>

        <h3
          className="font-display"
          style={{ fontSize: 28, fontWeight: 300, color: C.ink, marginBottom: 12 }}
        >
          מערכת ההזמנות בדרך
        </h3>
        <p style={{ color: C.dim, fontSize: 15, lineHeight: 1.8, maxWidth: 280, margin: "0 auto" }}>
          אנחנו בונות עבורך חוויית הזמנה מושלמת.<br/>
          בינתיים, צרי קשר ישירות דרך וואטסאפ.
        </p>

        <motion.a
          href="https://wa.me/972500000000"
          target="_blank"
          rel="noreferrer"
          whileTap={{ scale: 0.95 }}
          style={{
            display: "inline-block", marginTop: 28,
            height: 52, lineHeight: "52px",
            padding: "0 32px", borderRadius: 14,
            background: `linear-gradient(120deg,${C.rose} 0%,#e06888 50%,${C.rose} 100%)`,
            backgroundSize: "200% auto",
            color: "#fff", textDecoration: "none",
            fontSize: 15, fontWeight: 500,
            fontFamily: "'Heebo',sans-serif",
          }}
          aria-label="שלחי הודעה בוואטסאפ"
        >
          💬 שלחי הודעה בוואטסאפ
        </motion.a>
      </motion.div>
    </section>
  );
}
