import type { Metadata } from "next";
import ExploreSection from "@/sites/lulu/sections/ExploreSection";

export const metadata: Metadata = {
  title: "גלריה – ????? LULU",
  description: "גלריית עיצובי ציפורניים של ????? LULU. כרום, ג'ל, ציורי יד ועוד — כל ציפורן יצירת אמנות.",
  openGraph: {
    title: "גלריה – ????? LULU",
    description: "גלריית עיצובי ציפורניים של ????? LULU.",
    type: "website",
    locale: "he_IL",
  },
  viewport: "width=device-width, initial-scale=1",
};

export default function GalleryPage() {
  return <ExploreSection />;
}
