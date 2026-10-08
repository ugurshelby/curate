import type { Metadata } from "next";
import { ProbeScreen } from "./ProbeScreen";
import { trProbe } from "@/lib/i18n/tr";

// Temporary measurement page (docs/probe/README.md). Not linked from the hub; behind the PIN gate (middleware).
export const metadata: Metadata = {
  title: trProbe.pageTitle,
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function ProbePage() {
  return <ProbeScreen />;
}
