import type { Metadata } from "next";

import { createPageMetadata, getSeoData } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const seo = getSeoData();

  return createPageMetadata({
    path: "/anmeldung",
    title: `Team anmelden ${seo.tournamentYear}`,
    description: `Online-Anmeldung für das Handball-Turnier des SV Puschendorf ${seo.tournamentYear}. Mannschaften, Kontaktdaten und Kategorien digital erfassen.`,
    noIndex: !seo.anmeldenAktiv,
    keywords: ["Team anmelden", "Handballturnier Anmeldung", "SV Puschendorf", "Rasenturnier Anmeldung"],
  });
}

export default function AnmeldungLayout({ children }: { children: React.ReactNode }) {
  return children;
}
