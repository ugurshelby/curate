import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { tr } from "@/lib/i18n/tr";
import { PerfHud } from "@/components/studio/PerfHud";
import { NoticeToast } from "@/components/studio/NoticeToast";
import { THEME_COLOR } from "@/lib/ui/colors";

/**
 * Yedek yazı tipi (CDS §2): SF olmayan cihazlarda (sahibin Android telefonu) Inter.
 * next/font build sırasında indirir ve aynı alan adından sunar: çalışma anında dış istek yok.
 */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: tr.app.name,
  description: tr.app.description,
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`dark bg-base text-ink-1 ${inter.variable}`}>
      <body className="min-h-[100dvh] bg-base antialiased selection:bg-accent/30 selection:text-ink-1">
        {children}
        <PerfHud />
        <NoticeToast />
      </body>
    </html>
  );
}
