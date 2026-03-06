import type { Metadata } from "next";
import ShopSection from "@/lulu/sections/ShopSection";

export const metadata: Metadata = {
  title: "חנות – ????? LULU",
  description: "מוצרי טיפוח ציפורניים פרימיום: שמן ציפורניים, סרום קוטיקולה, טופ קוט ג'ל ועוד.",
  openGraph: {
    title: "חנות – ????? LULU",
    description: "מוצרי טיפוח ציפורניים פרימיום.",
    type: "website",
    locale: "he_IL",
  },
  viewport: "width=device-width, initial-scale=1",
};

export default function ShopPage() {
  return <ShopSection />;
}
