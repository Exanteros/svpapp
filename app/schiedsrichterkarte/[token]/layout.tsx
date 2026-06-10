import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = createNoIndexMetadata("Schiedsrichterkarte");

export default function SchiedsrichterkarteTokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
