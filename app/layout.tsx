import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Curate — Minimalist Post & Dump Studio",
  description:
    "Kayıpsız istemci-taraflı fotoğraf kürasyon, analog renk transferi, gren, halation ve akıllı Lanczos-3 upscale stüdyosu.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Curate",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark bg-black">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-black text-zinc-100 antialiased selection:bg-white/20 selection:text-white">
        {children}
      </body>
    </html>
  );
}
