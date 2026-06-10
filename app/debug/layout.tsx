import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = createNoIndexMetadata("Debug");

export default function DebugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
