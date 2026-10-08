import type { Metadata } from "next";
import { ProbeScreen } from "./ProbeScreen";

// Geçici ölçüm sayfası (docs/probe/README.md). Ana sayfadan linklenmez; adres elle yazılır.
export const metadata: Metadata = {
  title: "Curate — Donanım yoklaması",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function ProbePage() {
  return <ProbeScreen />;
}
