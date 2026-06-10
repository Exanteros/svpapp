import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return createPageMetadata({
    path: "/cookie-richtlinie",
    title: "Cookie-Richtlinie",
    description: "Cookie-Richtlinie der Turnier-Website des SV Puschendorf.",
  });
}

export default function CookieRichtlinieLayout({ children }: { children: React.ReactNode }) {
  return children;
}
