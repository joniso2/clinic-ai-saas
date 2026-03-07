"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "@/lulu/lib/tokens";
import { SP, SP_FAST, stagger, slideStep } from "@/lulu/lib/animations";
import { useBookingState } from "@/lulu/lib/hooks";
import { SERVICES } from "@/lulu/data/services";
import { TIMES } from "@/lulu/data/booking";
import MagneticButton from "@/lulu/components/MagneticButton";
import ServiceCard from "@/lulu/components/ServiceCard";

const LABELS = ["שירות", "תאריך ושעה", "פרטים"];

function fmtDay(d: Date) {
  return d.toLocaleDateString("he-IL", { weekday: "short", day: "2-digit", month: "short" });
}

/** Slug from URL path (e.g. /lulu/booking -> lulu) */
function getSlugFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] ?? "lulu";
}

export default function BookingWizard() {
  const pathname = usePathname();
  const slug = getSlugFromPath(pathname);
  const { s, set, next, prev, reset } = useBookingState();
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const goNext = () => { setDir(1); next(); };
  const goPrev = () => { setDir(-1); prev(); };

  const submit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          full_name: s.name,
          phone: s.phone,
          service_name: s.service?.name ?? undefined,
          service_price: s.service?.price ?? undefined,
          date: s.date || undefined,
          time: s.time || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "שגיאה בשמירת ההזמנה");
      }
      set({ done: true });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "שגיאה בשמירת ההזמנה");
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const btnStyle = (active: boolean) => ({
    flex: active ? 2 : 1,
    height: 52,
    border: "none",
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 500,
    fontFamily: "'Heebo',sans-serif",
    cursor: "pointer",
    opacity: active ? 1 : 0.36,
    transition: "opacity .2s",
  });

  if (s.done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, transition: { ...SP_FAST } }}
        style={{ textAlign: "center", padding: "48px 12px", direction: "rtl" }}
      >
        <motion.div
          animate={{ scale: [0, 1.3, 1], rotate: [0, 12, 0] }}
          transition={{ duration: 0.6, times: [0, 0.6, 1], ...SP_FAST }}
          style={{ fontSize: 56, marginBottom: 18 }}
          aria-hidden="true"
        >
          🌸
        </motion.div>
        <motion.h3
          className="font-display"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.2, ...SP } }}
          style={{ fontSize: 32, fontWeight: 300, marginBottom: 8, color: C.ink }}
        >
          ההזמנה אושרה!
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.3 } }}
          style={{ color: C.dim, fontSize: 14, marginBottom: 6 }}
        >
          נאשר אצלך בוואטסאפ בקרוב.
        </motion.p>
        <motion.p
          className="font-display"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.38, ...SP } }}
          style={{ color: C.rose, fontSize: 19, marginBottom: 32, lineHeight: 1.5 }}
        >
          {s.service?.name}<br />{s.date} · {s.time}
        </motion.p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={reset}
          style={{
            width: "100%", maxWidth: 260, height: 52,
            background: "transparent", color: C.dim,
            border: `1.5px solid ${C.border}`, borderRadius: 14,
            fontSize: 14, fontFamily: "'Heebo',sans-serif", cursor: "pointer",
          }}
          aria-label="הזמן תור נוסף"
        >
          הזמן תור נוסף
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div style={{ direction: "rtl" }}>
      {/* Progress bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {LABELS.map((lbl, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ height: 3, borderRadius: 3, marginBottom: 6, overflow: "hidden", background: "rgba(0,0,0,0.07)" }}>
              <motion.div
                animate={{ scaleX: i <= s.step ? 1 : 0 }}
                initial={{ scaleX: 0 }}
                transition={{ ...SP, delay: i * 0.08 }}
                style={{ height: "100%", background: `linear-gradient(90deg,${C.rose},${C.gold})`, transformOrigin: "right", borderRadius: 3 }}
              />
            </div>
            <motion.span
              animate={{ color: i === s.step ? C.ink : C.muted, fontWeight: i === s.step ? 600 : 400 }}
              style={{ fontSize: 10, letterSpacing: "0.06em" }}
            >
              {lbl}
            </motion.span>
          </div>
        ))}
      </div>

      <motion.div key={s.step} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1, transition: { ...SP } }}>
        <AnimatePresence mode="wait" custom={dir}>
          {/* Step 0: Service */}
          {s.step === 0 && (
            <motion.div key="s0" {...slideStep(dir)}>
              <h3 className="font-display" style={{ fontSize: 26, fontWeight: 300, marginBottom: 18, color: C.ink }}>
                בחרי שירות
              </h3>
              <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SERVICES.map((sv) => (
                  <ServiceCard key={sv.id} svc={sv} selected={s.service?.id === sv.id} onSelect={(svc) => set({ service: svc })} />
                ))}
              </motion.div>
              <div style={{ marginTop: 22 }}>
                <MagneticButton
                  onClick={goNext}
                  disabled={!s.service}
                  style={{
                    ...btnStyle(!!s.service),
                    width: "100%",
                    background: `linear-gradient(120deg,${C.rose} 0%,#e06888 50%,${C.rose} 100%)`,
                    backgroundSize: "200% auto",
                    color: "#fff",
                  }}
                  aria-label="המשך לבחירת תאריך"
                >
                  המשך ←
                </MagneticButton>
              </div>
            </motion.div>
          )}

          {/* Step 1: Date + Time */}
          {s.step === 1 && (
            <motion.div key="s1" {...slideStep(dir)}>
              <h3 className="font-display" style={{ fontSize: 26, fontWeight: 300, marginBottom: 18, color: C.ink }}>
                בחרי תאריך ושעה
              </h3>
              <p style={{ fontSize: 11, letterSpacing: "0.08em", color: C.dim, marginBottom: 10, textTransform: "uppercase" }}>
                תאריך
              </p>
              <div className="scroll-x" style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
                {days.map((d, i) => {
                  const iso = d.toISOString().split("T")[0];
                  const sel = s.date === iso;
                  return (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => set({ date: iso })}
                      className="snap-s"
                      style={{
                        flexShrink: 0,
                        padding: "10px 14px",
                        borderRadius: 12,
                        cursor: "pointer",
                        minHeight: 44,
                        background: sel ? C.rose : C.card,
                        border: `1.5px solid ${sel ? C.rose : C.border}`,
                        color: sel ? "#fff" : C.dim,
                        fontSize: 12,
                        fontFamily: "'Heebo',sans-serif",
                        whiteSpace: "nowrap",
                        boxShadow: sel ? "0 4px 16px rgba(200,68,106,0.28)" : "0 1px 6px rgba(180,140,110,0.06)",
                        transition: "all .15s",
                      }}
                    >
                      {fmtDay(d)}
                    </motion.button>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, letterSpacing: "0.08em", color: C.dim, margin: "20px 0 10px", textTransform: "uppercase" }}>
                שעה
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {TIMES.map((t) => {
                  const sel = s.time === t;
                  return (
                    <motion.button
                      key={t}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => set({ time: t })}
                      style={{
                        padding: "11px 0",
                        borderRadius: 12,
                        cursor: "pointer",
                        textAlign: "center",
                        minHeight: 44,
                        background: sel ? C.rose : C.card,
                        border: `1.5px solid ${sel ? C.rose : C.border}`,
                        color: sel ? "#fff" : C.dim,
                        fontSize: 13,
                        fontFamily: "'Heebo',sans-serif",
                        boxShadow: sel ? "0 4px 14px rgba(200,68,106,0.25)" : "none",
                        transition: "all .15s",
                      }}
                    >
                      {t}
                    </motion.button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={goPrev}
                  style={{ ...btnStyle(true), flex: 1, background: "transparent", color: C.dim, border: `1.5px solid ${C.border}` }}
                >
                  → חזרה
                </motion.button>
                <MagneticButton
                  onClick={goNext}
                  disabled={!s.date || !s.time}
                  style={{
                    ...btnStyle(!!(s.date && s.time)),
                    flex: 2,
                    background: `linear-gradient(120deg,${C.rose} 0%,#e06888 50%,${C.rose} 100%)`,
                    backgroundSize: "200% auto",
                    color: "#fff",
                  }}
                  aria-label="המשך לפרטים"
                >
                  המשך ←
                </MagneticButton>
              </div>
            </motion.div>
          )}

          {/* Step 2: Contact */}
          {s.step === 2 && (
            <motion.div key="s2" {...slideStep(dir)}>
              <h3 className="font-display" style={{ fontSize: 26, fontWeight: 300, marginBottom: 6, color: C.ink }}>
                הפרטים שלך
              </h3>
              <p style={{ color: C.dim, fontSize: 13, marginBottom: 22, lineHeight: 1.7 }}>
                <strong style={{ color: C.rose }}>{s.service?.name}</strong> · {s.date} · {s.time}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="fl">
                  <input
                    className="inp"
                    value={s.name}
                    onChange={(e) => set({ name: e.target.value })}
                    placeholder=" "
                    autoComplete="name"
                  />
                  <label>שם מלא</label>
                </div>
                <div className="fl">
                  <input
                    className="inp"
                    value={s.phone}
                    onChange={(e) => set({ phone: e.target.value })}
                    placeholder=" "
                    type="tel"
                    autoComplete="tel"
                  />
                  <label>טלפון / וואטסאפ</label>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.15, ...SP } }}
                style={{ background: C.surface, borderRadius: 16, padding: "16px 18px", marginTop: 18, border: `1px solid ${C.border}` }}
              >
                <p style={{ fontSize: 11, letterSpacing: "0.08em", color: C.dim, marginBottom: 12, textTransform: "uppercase" }}>
                  סיכום הזמנה
                </p>
                {[
                  ["שירות", s.service?.name],
                  ["תאריך", s.date],
                  ["שעה", s.time],
                  ["מחיר", s.service ? `₪${s.service.price}` : ""],
                  ["משך", s.service?.dur],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <span style={{ fontSize: 13, color: C.dim }}>{k}</span>
                      <span style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
              </motion.div>
              {submitError && (
                <p style={{ color: C.rose, fontSize: 13, marginTop: 12 }} role="alert">
                  {submitError}
                </p>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={goPrev}
                  disabled={submitting}
                  style={{ ...btnStyle(true), flex: 1, background: "transparent", color: C.dim, border: `1.5px solid ${C.border}` }}
                >
                  → חזרה
                </motion.button>
                <MagneticButton
                  onClick={submit}
                  disabled={!s.name || !s.phone || submitting}
                  style={{
                    ...btnStyle(!!(s.name && s.phone) && !submitting),
                    flex: 2,
                    background: `linear-gradient(120deg,${C.rose} 0%,#e06888 50%,${C.rose} 100%)`,
                    backgroundSize: "200% auto",
                    color: "#fff",
                  }}
                  aria-label="אשרי הזמנה"
                >
                  {submitting ? "שולח..." : "אשרי הזמנה 🌸"}
                </MagneticButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
