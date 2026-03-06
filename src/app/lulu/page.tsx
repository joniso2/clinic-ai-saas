import type { Metadata } from "next";
import HeroSection    from "@/lulu/sections/HeroSection";
import ExploreSection from "@/lulu/sections/ExploreSection";
import ShopSection    from "@/lulu/sections/ShopSection";
import Footer         from "@/lulu/components/Footer";

export const metadata: Metadata = {
  title: "מרפאת LULU – קליניקת יופי פרימיום",
  description: "קליניקת יופי ובריאות פרימיום. טיפולים מקצועיים, דיוק, יופי ושלמות.",
  openGraph: {
    title: "מרפאת LULU – קליניקת יופי פרימיום",
    description: "חוויית טיפוח ויופי פרימיום עבור מי שדורשת את הטוב ביותר.",
    type: "website",
    locale: "he_IL",
  },
  viewport: "width=device-width, initial-scale=1",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ExploreSection />
      <ShopSection />
      <Footer />
    </>
  );
}
