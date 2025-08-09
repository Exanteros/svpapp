import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SV Puschendorf Rasenturnier",
  description: "Turnierverwaltung für das Rasenturnier des SV Puschendorf 2025",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* DEV-Hack: API-Schlüssel automatisch setzen im Entwicklungsmodus */}
        {process.env.NODE_ENV === 'development' && (
          <script src="/dev-api-hack.js" async></script>
        )}
      </body>
    </html>
  );
}
