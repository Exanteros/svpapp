import type { Metadata } from "next";

import { createPageMetadata, getSeoData } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const seo = getSeoData();

  return createPageMetadata({
    path: "/ergebnisse",
    title: `Ergebnisse ${seo.tournamentYear}`,
    description: `Aktuelle Ergebnisse und abgeschlossene Spiele des Handball-Turniers des SV Puschendorf ${seo.tournamentYear}.`,
    keywords: ["Ergebnisse", "Handballturnier Ergebnisse", "SV Puschendorf", "Turnierergebnisse"],
  });
}

export default function ErgebnisseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
