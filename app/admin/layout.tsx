import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = createNoIndexMetadata("Admin");

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
