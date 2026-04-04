import type { Metadata } from "next";
import { Heebo } from 'next/font/google';
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

// Railway 1GB: avoid static generation at build time
export const dynamic = "force-dynamic";

const heebo = Heebo({
  weight: ['400', '500', '600', '700'],
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
});

export const metadata: Metadata = {
  title: "ClinicFlow",
  description: "מערכת ניהול חכמה למרפאות",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ClinicFlow",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#4f46e5" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        {/* Blocking script: apply theme before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#0F172A')}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${heebo.variable} antialiased transition-colors duration-300`}
      >
        <ThemeProvider>
          <ToastProvider>
            {children}
            <SpeedInsights />
            <Analytics />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
