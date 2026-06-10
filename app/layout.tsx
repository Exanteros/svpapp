import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { buildRootMetadata, buildStructuredData } from "@/lib/seo";
import "./globals.css";

export function generateMetadata(): Metadata {
  return buildRootMetadata();
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#5e6d35",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = buildStructuredData();

  return (
    <html lang="de">
      <head>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad-portrait.svg"
          media="screen and (device-width: 768px) and (device-height: 1024px) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad-landscape.svg"
          media="screen and (device-width: 1024px) and (device-height: 768px) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad-portrait.svg"
          media="screen and (min-device-width: 810px) and (max-device-width: 834px) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad-landscape.svg"
          media="screen and (min-device-width: 1080px) and (max-device-width: 1194px) and (orientation: landscape)"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AppShell>{children}</AppShell>
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
