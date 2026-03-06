import type { Metadata } from "next";
import Footer from "@/lulu/components/Footer";

export const metadata: Metadata = {
  title: "צור קשר – ????? LULU",
  description: "צרי קשר עם סטודיו ????? LULU. טלפון, וואטסאפ, אינסטגרם ומיקום.",
  openGraph: {
    title: "צור קשר – ????? LULU",
    description: "צרי קשר עם סטודיו ????? LULU.",
    type: "website",
    locale: "he_IL",
  },
  viewport: "width=device-width, initial-scale=1",
};

export default function ContactPage() {
  return (
    <section aria-label="פרטי יצירת קשר" style={{ paddingTop: 8 }}>
      <Footer />
    </section>
  );
}
