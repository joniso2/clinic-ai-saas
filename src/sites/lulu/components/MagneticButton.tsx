"use client";

import { useRef, useState } from "react";
import {
  motion, AnimatePresence,
  useMotionValue,
  useSpring as useMotionSpring,
  useReducedMotion,
} from "framer-motion";
import { C } from "@/sites/lulu/lib/tokens";

interface MagneticButtonProps {
  children:    React.ReactNode;
  className?:  string;
  style?:      React.CSSProperties;
  onClick?:    () => void;
  disabled?:   boolean;
  "aria-label"?: string;
}

export default function MagneticButton({
  children, className, style, onClick, disabled, "aria-label": ariaLabel,
}: MagneticButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const ref    = useRef<HTMLButtonElement>(null);
  const mx     = useMotionValue(0);
  const my     = useMotionValue(0);
  const x      = useMotionSpring(mx, { stiffness: 200, damping: 20 });
  const y      = useMotionSpring(my, { stiffness: 200, damping: 20 });
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (shouldReduceMotion || disabled || !ref.current) return;
    const r  = ref.current.getBoundingClientRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    mx.set(Math.max(-4, Math.min(4, (e.clientX - cx) * 0.25)));
    my.set(Math.max(-4, Math.min(4, (e.clientY - cy) * 0.25)));
  };

  const handlePointerLeave = () => { mx.set(0); my.set(0); };

  const handlePress = (e: React.PointerEvent) => {
    if (disabled || !ref.current) return;
    const r  = ref.current.getBoundingClientRect();
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setRipples((prev) => prev.filter((rp) => rp.id !== id)), 600);
    onClick?.();
  };

  return (
    <motion.button
      ref={ref}
      style={{ x, y, position: "relative", overflow: "hidden", ...style }}
      className={className}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePress}
      whileTap={disabled ? {} : { scale: 0.95, transition: { duration: 0.12 } }}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {/* Liquid ripple */}
      <AnimatePresence>
        {ripples.map((rp) => (
          <motion.span
            key={rp.id}
            initial={{ width: 0, height: 0, opacity: 0.45, x: rp.x, y: rp.y, translateX: "-50%", translateY: "-50%" }}
            animate={{ width: 220, height: 220, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            style={{ position: "absolute", borderRadius: "50%", background: "rgba(255,255,255,0.45)", pointerEvents: "none", zIndex: 0 }}
          />
        ))}
      </AnimatePresence>

      {/* Glow pulse on press */}
      <motion.span
        initial={{ opacity: 0 }}
        whileTap={{ opacity: [0, 0.5, 0], transition: { duration: 0.22 } }}
        style={{ position: "absolute", inset: -2, borderRadius: "inherit", boxShadow: `0 0 18px ${C.roseGlow}`, pointerEvents: "none" }}
      />

      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </motion.button>
  );
}
