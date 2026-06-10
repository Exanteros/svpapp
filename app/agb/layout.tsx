import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return createPageMetadata({
    path: "/agb",
    title: "AGB",
    description: "Allgemeine Geschäftsbedingungen für Anmeldung und Teilnahme am Handball-Turnier des SV Puschendorf.",
  });
}

export default function AGBLayout({ children }: { children: React.ReactNode }) {
  return children;
}
