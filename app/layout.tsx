import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PerfHud } from "@/components/studio/PerfHud";
import { NoticeToast } from "@/components/studio/NoticeToast";
import { THEME_COLOR } from "@/lib/ui/colors";

export const metadata: Metadata = {
  title: "Curate Studio — Minimalist Photo Curation & Preset Engine",
  description: "High-contrast editorial curation and darkroom preset studio built with Apple HIG & Raycast precision.",
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
    <html lang="tr" className="dark bg-base text-ink-1">
      <body className="min-h-[100dvh] bg-base antialiased selection:bg-accent/30 selection:text-ink-1">
        {children}
        <PerfHud />
        <NoticeToast />
      </body>
    </html>
  );
}
