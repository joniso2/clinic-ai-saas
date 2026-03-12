import type { Metadata } from "next";
import BookingSection from "@/sites/lulu/sections/BookingSection";

export const metadata: Metadata = {
  title: "הזמנת תור – ????? LULU",
  description: "הזמיני תור בסטודיו ????? LULU. מניקור, פדיקור, עיצוב ציפורניים ועוד.",
  openGraph: {
    title: "הזמנת תור – ????? LULU",
    description: "הזמיני תור בסטודיו ????? LULU.",
    type: "website",
    locale: "he_IL",
  },
  viewport: "width=device-width, initial-scale=1",
};

export default function BookingPage() {
  return <BookingSection />;
}
