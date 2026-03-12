"use client";

import { motion } from "framer-motion";
import { C } from "@/sites/lulu/lib/tokens";

const SPARKLES = [
  { x: 48,  y: 42,  s: 10, d: 0    },
  { x: 140, y: 90,  s: 8,  d: 0.8  },
  { x: 22,  y: 130, s: 7,  d: 1.6  },
  { x: 100, y: 50,  s: 9,  d: 2.4  },
  { x: 165, y: 145, s: 6,  d: 0.4  },
  { x: 60,  y: 195, s: 8,  d: 1.2  },
];

const NAILS = [
  { top: 42, right: 4, color: "linear-gradient(135deg,#f0d080,#c8922a)", delay: 0   },
  { top: 90, right: 0, color: "linear-gradient(135deg,#b0c8e8,#7090c0)", delay: 1.5 },
];

export default function NailPolishHero() {
  return (
    <div style={{ position: "relative", width: 240, height: 280, margin: "0 auto" }}>
      {/* Soft glow base */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: "20%", left: "50%",
          width: 160, height: 160, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,68,106,0.22) 0%, transparent 70%)",
          filter: "blur(16px)", transform: "translateX(-50%)",
        }}
      />

      {/* Nail polish bottle */}
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [0, 2, -2, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)" }}
      >
        <svg width="90" height="160" viewBox="0 0 90 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="33" y="2" width="24" height="32" rx="5" fill="url(#capGrad)"/>
          <rect x="37" y="2" width="6" height="32" rx="2" fill="rgba(255,255,255,0.25)"/>
          <rect x="39" y="32" width="12" height="14" rx="2" fill="#d0607a"/>
          <rect x="20" y="44" width="50" height="106" rx="12" fill="url(#bottleGrad)"/>
          <rect x="22" y="72" width="46" height="76" rx="10" fill="url(#liquidGrad)" opacity="0.9"/>
          <rect x="27" y="48" width="8" height="88" rx="4" fill="rgba(255,255,255,0.28)"/>
          <circle cx="58" cy="100" r="5" fill="rgba(255,255,255,0.18)"/>
          <circle cx="54" cy="86" r="3" fill="rgba(255,255,255,0.14)"/>
          <rect x="28" y="60" width="34" height="28" rx="4" fill="rgba(255,255,255,0.15)"/>
          <text x="45" y="70" textAnchor="middle" fontFamily="Cormorant Garamond,serif" fontSize="7" fill="rgba(255,255,255,0.7)" fontStyle="italic">LUXE</text>
          <text x="45" y="81" textAnchor="middle" fontFamily="Cormorant Garamond,serif" fontSize="5.5" fill="rgba(255,255,255,0.55)">NAILS</text>
          <defs>
            <linearGradient id="capGrad" x1="33" y1="2" x2="57" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e06080"/>
              <stop offset="100%" stopColor="#a02848"/>
            </linearGradient>
            <linearGradient id="bottleGrad" x1="20" y1="44" x2="70" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="rgba(240,200,215,0.55)"/>
              <stop offset="40%"  stopColor="rgba(210,120,150,0.75)"/>
              <stop offset="100%" stopColor="#c04060"/>
            </linearGradient>
            <linearGradient id="liquidGrad" x1="22" y1="72" x2="68" y2="148" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#d84070"/>
              <stop offset="100%" stopColor="#a01838"/>
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Brush */}
      <motion.div
        animate={{ x: [-40, 10, -40], y: [120, 115, 120], rotate: [-18, -22, -18] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <svg width="90" height="26" viewBox="0 0 90 26" fill="none">
          <rect x="46" y="8" width="44" height="6" rx="3" fill="url(#handleGrad)"/>
          <rect x="36" y="6" width="12" height="10" rx="2" fill="#c0a060"/>
          <ellipse cx="22" cy="13" rx="18" ry="8" fill="url(#bristleGrad)"/>
          <ellipse cx="16" cy="10" rx="6" ry="3" fill="rgba(255,255,255,0.25)"/>
          <defs>
            <linearGradient id="handleGrad" x1="46" y1="11" x2="90" y2="11" gradientUnits="userSpaceOnUse">
              <stop stopColor="#d4a060"/><stop offset="1" stopColor="#e8c080"/>
            </linearGradient>
            <linearGradient id="bristleGrad" x1="4" y1="13" x2="40" y2="13" gradientUnits="userSpaceOnUse">
              <stop stopColor="#c04068"/><stop offset="1" stopColor="#e87098"/>
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Painted stroke */}
      <svg
        style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)" }}
        width="160" height="34" viewBox="0 0 160 34" fill="none"
      >
        <motion.path
          d="M 8 24 C 30 10 60 28 90 18 C 120 8 145 22 155 16"
          stroke="url(#strokeGrad)" strokeWidth="14" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", times: [0, 0.3, 0.7, 1] }}
        />
        <motion.path
          d="M 8 24 C 30 10 60 28 90 18 C 120 8 145 22 155 16"
          stroke="rgba(255,255,255,0.35)" strokeWidth="4" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.6, 0.6, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", times: [0, 0.32, 0.68, 1] }}
        />
        <defs>
          <linearGradient id="strokeGrad" x1="8" y1="20" x2="155" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C8446A"/>
            <stop offset="0.5" stopColor="#e87098"/>
            <stop offset="1" stopColor="#B8924A"/>
          </linearGradient>
        </defs>
      </svg>

      {/* Sparkle particles */}
      {SPARKLES.map((p, i) => (
        <motion.div
          key={i}
          style={{ position: "absolute", left: p.x, top: p.y, width: p.s, height: p.s }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.2, 0.4], rotate: [0, 45, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: p.d, ease: "easeInOut" }}
        >
          <svg width={p.s} height={p.s} viewBox="0 0 10 10" fill="none">
            <path d="M5 0 L5.6 4.4 L10 5 L5.6 5.6 L5 10 L4.4 5.6 L0 5 L4.4 4.4 Z" fill={C.rose} opacity="0.7"/>
          </svg>
        </motion.div>
      ))}

      {/* Chrome nail thumbnails */}
      {NAILS.map((n, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -6, 0], rotate: [0, 3, -3, 0] }}
          transition={{ duration: 5 + i * 2, repeat: Infinity, ease: "easeInOut", delay: n.delay }}
          style={{
            position: "absolute", top: n.top, right: n.right,
            width: 28, height: 36,
            borderRadius: "50% 50% 40% 40% / 60% 60% 40% 40%",
            background: n.color,
            boxShadow: "0 4px 12px rgba(0,0,0,0.14)",
          }}
        >
          <div style={{
            position: "absolute", top: "15%", left: "20%",
            width: "25%", height: "35%",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.45)",
            filter: "blur(1px)",
          }}/>
        </motion.div>
      ))}
    </div>
  );
}
