"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { C } from "@/sites/lulu/lib/tokens";
import { sectionReveal, revealChild, scaleIn } from "@/sites/lulu/lib/animations";
import MagneticButton from "@/sites/lulu/components/MagneticButton";
import NailPolishHero from "@/sites/lulu/components/NailPolishHero";


export default function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // Parallax: blobs move at a fraction of scroll speed
  const blob1Y = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const blob2Y = useTransform(scrollYProgress, [0, 1], [0, -18]);
  const blob3Y = useTransform(scrollYProgress, [0, 1], [0, -22]);

  return (
    <section
      id="hero"
      ref={ref}
      aria-label="ברוכות הבאות ל-????? LULU"
      style={{
        minHeight: "calc(100svh - 52px)",
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: "36px 20px 32px",
        position: "relative", overflow: "hidden",
        textAlign: "center", direction: "rtl",
      }}
    >
      {/* Parallax blobs */}
      <motion.div style={{
        y: blob1Y, position: "absolute", top: "-8%", right: "-15%",
        width: 280, height: 280, zIndex: 0, pointerEvents: "none",
        borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",
        background: "radial-gradient(circle, rgba(240,184,200,0.45) 0%, rgba(240,184,200,0) 70%)",
      }}/>
      <motion.div style={{
        y: blob2Y, position: "absolute", bottom: "-5%", left: "-10%",
        width: 240, height: 240, zIndex: 0, pointerEvents: "none",
        borderRadius: "45% 55% 40% 60% / 55% 45% 60% 40%",
        background: "radial-gradient(circle, rgba(184,146,74,0.18) 0%, rgba(184,146,74,0) 70%)",
      }}/>
      <motion.div style={{
        y: blob3Y, position: "absolute", top: "35%", left: "-5%",
        width: 160, height: 160, zIndex: 0, pointerEvents: "none",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(200,68,106,0.09) 0%, transparent 70%)",
      }}/>

      {/* Animated gradient background */}
      <motion.div
        animate={{
          background: [
            "linear-gradient(160deg,#FAF7F2 0%,#F8EEE8 40%,#F5E4EC 100%)",
            "linear-gradient(160deg,#FAF7F2 0%,#F5E8F0 40%,#F8EAE0 100%)",
            "linear-gradient(160deg,#FAF7F2 0%,#F8EEE8 40%,#F5E4EC 100%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      />

      {/* Content */}
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="visible"
        style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380 }}
      >
        <motion.span
          variants={revealChild}
          style={{
            display: "inline-block", fontSize: 11, letterSpacing: "0.18em",
            textTransform: "uppercase", color: C.rose, marginBottom: 20, fontWeight: 500,
          }}
        >
          ✦ קליניקת יופי פרימיום
        </motion.span>

        <motion.div variants={scaleIn} style={{ marginBottom: 28 }}>
          <NailPolishHero />
        </motion.div>

        <motion.h1
          variants={revealChild}
          className="font-display"
          style={{ fontSize: "clamp(42px,11vw,68px)", fontWeight: 300, lineHeight: 1.05, marginBottom: 10, color: C.ink }}
        >
          יופי<br/><span className="gradient-text">LULU</span>
        </motion.h1>

        <motion.p
          variants={revealChild}
          style={{
            fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase",
            color: C.dim, marginBottom: 14, fontWeight: 400,
          }}
        >
          דיוק · יופי · שלמות
        </motion.p>

        <motion.p
          variants={revealChild}
          style={{ color: C.dim, fontSize: 15, lineHeight: 1.8, marginBottom: 32, fontWeight: 300 }}
        >
          חוויית טיפוח ויופי פרימיום<br/>עבור מי שדורשת את הטוב ביותר.
        </motion.p>

        <motion.div
          variants={revealChild}
          style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 300, margin: "0 auto" }}
        >
          <Link href="/lulu/booking" style={{ display: "block" }}>
            <MagneticButton
              style={{
                width: "100%", height: 56, fontSize: 16,
                background: `linear-gradient(120deg,${C.rose} 0%,#e06888 50%,${C.rose} 100%)`,
                backgroundSize: "200% auto", color: "#fff",
                border: "none", cursor: "pointer", borderRadius: 14,
                fontFamily: "'Heebo',sans-serif", fontWeight: 500,
              }}
              aria-label="עברי לדף הזמנת תורים"
            >
              הזמיני תור עכשיו
            </MagneticButton>
          </Link>
          <Link href="/lulu/gallery"
            style={{ color: C.dim, fontSize: 13, textDecoration: "none", letterSpacing: "0.04em", padding: "8px 0" }}
          >
            לצפייה בגלריה ↓
          </Link>
        </motion.div>

      </motion.div>
    </section>
  );
}
