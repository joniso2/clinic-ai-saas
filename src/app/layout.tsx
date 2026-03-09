import type { Metadata } from "next";
import { Heebo } from 'next/font/google';
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Railway 1GB: avoid static generation at build time
export const dynamic = "force-dynamic";

const heebo = Heebo({
  weight: ['400', '500', '600', '700'],
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
});

export const metadata: Metadata = {
  title: "Clinic AI",
  description: "מערכת ניהול חכמה למרפאות",
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
        {/* Blocking script: apply theme before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${heebo.variable} antialiased transition-colors duration-300`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
