"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { C } from "@/lulu/lib/tokens";
import { sectionReveal, revealChild, SP } from "@/lulu/lib/animations";

const CONTACTS = [
  { icon: "📞", label: "התקשרי",   sub: "+972 50 000 0000",         href: "tel:+972500000000",             bg: "rgba(200,68,106,0.07)"   },
  { icon: "💬", label: "וואטסאפ",  sub: "שלחי לנו הודעה",           href: "https://wa.me/972500000000",    bg: "rgba(37,211,102,0.07)"  },
  { icon: "📸", label: "אינסטגרם", sub: "@luluclinic",                href: "https://instagram.com/luluclinic", bg: "rgba(193,53,132,0.07)" },
  { icon: "📍", label: "מיקום",    sub: "תל אביב",                   href: "https://maps.google.com",       bg: "rgba(66,133,244,0.07)"  },
] as const;

const DEFAULT_HOURS: [string, string][] = [
  ["א׳ – ה׳", "09:00 – 20:00"],
  ["שישי", "09:00 – 14:00"],
  ["שבת", "סגור"],
];

type WorkingHoursDay = { day: number; enabled: boolean; open: string; close: string };

function formatBusinessHours(wh: WorkingHoursDay[] | null): [string, string][] {
  if (!wh || wh.length !== 7) return DEFAULT_HOURS;
  const row = (dayIndex: number) => {
    const d = wh[dayIndex];
    if (!d?.enabled) return "סגור";
    return `${d.open} – ${d.close}`;
  };
  const sunThu = wh.slice(0, 5);
  const firstEnabled = sunThu.find((d) => d.enabled);
  const sunThuStr = firstEnabled ? `${firstEnabled.open} – ${firstEnabled.close}` : "סגור";
  return [
    ["א׳ – ה׳", sunThuStr],
    ["שישי", row(5)],
    ["שבת", row(6)],
  ];
}

export default function Footer() {
  const [hours, setHours] = useState<[string, string][]>(DEFAULT_HOURS);

  useEffect(() => {
    fetch("/api/clinics/lulu")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { businessWorkingHours?: WorkingHoursDay[] } | null) => {
        if (data?.businessWorkingHours) setHours(formatBusinessHours(data.businessWorkingHours));
      })
      .catch(() => {});
  }, []);
  return (
    <footer
      id="contact"
      style={{
        padding: "60px 16px 32px",
        background: "linear-gradient(180deg,#FAF7F2 0%,#F5EEE4 100%)",
        borderTop: "1px solid rgba(0,0,0,0.07)",
        direction: "rtl",
      }}
    >
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.div
          variants={revealChild}
          className="font-display"
          style={{ fontSize: 36, textAlign: "center", marginBottom: 6 }}
        >
          <span style={{ color: C.rose }}>LULU</span>
          <span style={{ fontWeight: 300, color: C.ink }}> מרפאה</span>
        </motion.div>
        <motion.p
          variants={revealChild}
          style={{ color: C.dim, fontSize: 13, textAlign: "center", marginBottom: 36, lineHeight: 1.8 }}
        >
          קליניקת יופי פרימיום<br/>דיוק · יופי · שלמות
        </motion.p>
      </motion.div>

      {/* Contact grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32 }}>
        {CONTACTS.map((c, i) => (
          <motion.a
            key={c.label}
            href={c.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`${c.label}: ${c.sub}`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.07, ...SP } }}
            whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
            viewport={{ once: true }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "16px 10px", borderRadius: 18, textDecoration: "none",
              background: c.bg, border: "1.5px solid rgba(0,0,0,0.06)",
              minHeight: 84, boxShadow: "0 2px 14px rgba(180,140,110,0.08)",
            }}
          >
            <span style={{ fontSize: 22 }} aria-hidden="true">{c.icon}</span>
            <span style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>{c.label}</span>
            <span style={{ fontSize: 10, color: C.dim, textAlign: "center" }}>{c.sub}</span>
          </motion.a>
        ))}
      </div>

      {/* Business hours */}
      <div style={{
        background: C.card, borderRadius: 18, padding: "18px 20px", marginBottom: 28,
        border: "1.5px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 14px rgba(180,140,110,0.07)",
      }}>
        <p style={{
          fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
          color: C.dim, marginBottom: 14,
        }}>
          שעות פעילות
        </p>
        {hours.map(([day, hrs]) => (
          <div
            key={day}
            style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}
          >
            <span style={{ fontSize: 13, color: C.dim }}>{day}</span>
            <span style={{ fontSize: 13, color: hrs === "סגור" ? C.muted : C.ink, fontWeight: 500 }}>
              {hrs}
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>
        © 2025 מרפאת LULU · עוצב עם אהבה ✦
      </p>
    </footer>
  );
}
