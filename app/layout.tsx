import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PerfHud } from "@/components/studio/PerfHud";

export const metadata: Metadata = {
  title: "Curate Studio — Minimalist Photo Curation & Preset Engine",
  description: "High-contrast editorial curation and darkroom preset studio built with Apple HIG & Raycast precision.",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
    <html lang="tr" className="dark bg-black text-[#f5f5f7]">
      <body className="min-h-[100dvh] bg-black antialiased selection:bg-[#f5a623]/30 selection:text-[#f5f5f7]">
        {children}
        <PerfHud />
      </body>
    </html>
  );
}
