"use client";

import { motion } from "framer-motion";
import { C } from "@/sites/lulu/lib/tokens";
import { sectionReveal, revealChild } from "@/sites/lulu/lib/animations";
import MasonryGallery from "@/sites/lulu/components/MasonryGallery";

export default function ExploreSection() {
  return (
    <section
      id="gallery"
      aria-label="גלריה"
      style={{ padding: "68px 0 72px", direction: "rtl" }}
    >
      <div style={{ padding: "0 16px 26px" }}>
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
            ✦ העבודות שלנו
          </motion.span>
          <motion.h2
            variants={revealChild}
            className="font-display"
            style={{ fontSize: "clamp(32px,9vw,50px)", fontWeight: 300, marginBottom: 10, color: C.ink }}
          >
            גלריה
          </motion.h2>
          <motion.p variants={revealChild} style={{ color: C.dim, fontSize: 14, lineHeight: 1.7 }}>
            לחצי על עיצוב לצפייה. כל ציפורן — יצירת אמנות.
          </motion.p>
        </motion.div>
      </div>

      <div style={{ padding: "0 3px" }}>
        <MasonryGallery />
      </div>
    </section>
  );
}
