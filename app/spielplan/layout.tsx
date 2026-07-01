import type { Metadata } from "next";

import { createPageMetadata, getSeoData } from "@/lib/seo";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const seo = getSeoData();

  return createPageMetadata({
    path: "/spielplan",
    title: `Spielplan ${seo.tournamentYear}`,
    description: `Aktueller Spielplan des Handball-Turniers des SV Puschendorf ${seo.tournamentYear}: Zeiten, Felder und Begegnungen am ${seo.dateRange}.`,
    noIndex: !seo.spielplanPublished,
    keywords: ["Spielplan", "Handballturnier Spielplan", "SV Puschendorf", "Rasenturnier"],
  });
}

export default function SpielplanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
