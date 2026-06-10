import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return createPageMetadata({
    path: "/impressum",
    title: "Impressum",
    description: "Impressum und Anbieterkennzeichnung der Turnier-Website des SV Puschendorf.",
  });
}

export default function ImpressumLayout({ children }: { children: React.ReactNode }) {
  return children;
}
