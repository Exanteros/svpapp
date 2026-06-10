import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = createNoIndexMetadata("Helfer-Link");

export default function HelferTokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
