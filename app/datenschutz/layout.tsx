import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return createPageMetadata({
    path: "/datenschutz",
    title: "Datenschutz",
    description: "Datenschutzerklärung der Turnier-Website des SV Puschendorf.",
  });
}

export default function DatenschutzLayout({ children }: { children: React.ReactNode }) {
  return children;
}
