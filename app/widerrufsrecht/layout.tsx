import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return createPageMetadata({
    path: "/widerrufsrecht",
    title: "Widerrufsrecht",
    description: "Hinweise zum Widerrufsrecht und zu Stornierungen beim Handball-Turnier des SV Puschendorf.",
  });
}

export default function WiderrufsrechtLayout({ children }: { children: React.ReactNode }) {
  return children;
}
