import type { Metadata } from "next";

import { getAdminSettings } from "@/lib/db";
import { resolveTournamentScheduleSettings } from "@/lib/tournament";

const DEFAULT_SITE_URL = "http://localhost:3003";
const SITE_NAME = "SV Puschendorf Turnier";
const ORGANIZATION_NAME = "Sportverein Puschendorf 1949 e.V.";
const DEFAULT_IMAGE = "/logo.png";

export interface SeoData {
  siteUrl: string;
  turnierName: string;
  tournamentYear: number;
  startDate: string;
  endDate: string;
  dateRange: string;
  anmeldenAktiv: boolean;
  spielplanPublished: boolean;
  spielplanPublishedAt: string | null;
}

type PageMetadataOptions = {
  path: string;
  title: string;
  description: string;
  noIndex?: boolean;
  keywords?: string[];
};

export function getSiteUrl() {
  const value =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_SITE_URL);

  return value.replace(/\/+$/, "");
}

export function getSeoData(): SeoData {
  try {
    const settings = getAdminSettings();
    const schedule = resolveTournamentScheduleSettings(settings);

    return {
      siteUrl: getSiteUrl(),
      turnierName: settings.turnierName || "Handball-Turnier des SV Puschendorf",
      tournamentYear: getYear(schedule.turnierStartDatum),
      startDate: schedule.turnierStartDatum,
      endDate: schedule.turnierEndDatum,
      dateRange: formatDateRange(schedule.turnierStartDatum, schedule.turnierEndDatum),
      anmeldenAktiv: settings.anmeldungAktiv !== false,
      spielplanPublished: settings.spielplanStatus === "published",
      spielplanPublishedAt: settings.spielplanPublishedAt || null,
    };
  } catch (error) {
    console.error("SEO-Daten konnten nicht geladen werden:", error);
    const fallbackYear = new Date().getFullYear();
    const fallbackStartDate = `${fallbackYear}-07-05`;
    const fallbackEndDate = `${fallbackYear}-07-06`;

    return {
      siteUrl: getSiteUrl(),
      turnierName: "Handball-Turnier des SV Puschendorf",
      tournamentYear: fallbackYear,
      startDate: fallbackStartDate,
      endDate: fallbackEndDate,
      dateRange: formatDateRange(fallbackStartDate, fallbackEndDate),
      anmeldenAktiv: true,
      spielplanPublished: false,
      spielplanPublishedAt: null,
    };
  }
}

export function buildRootMetadata(): Metadata {
  const seo = getSeoData();
  const title = getTournamentTitle(seo);
  const description = `Offizielle Turnierseite des SV Puschendorf: Anmeldung, Spielplan und Ergebnisse für das Handball-Turnier ${seo.tournamentYear}.`;

  return {
    metadataBase: new URL(seo.siteUrl),
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    applicationName: "SVP Turnier",
    manifest: "/manifest.webmanifest",
    keywords: [
      "SV Puschendorf",
      "Handball",
      "Handballturnier",
      "Rasenturnier",
      "Puschendorf",
      "Spielplan",
      "Ergebnisse",
      "Team anmelden",
    ],
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "de_DE",
      siteName: SITE_NAME,
      title,
      description,
      url: "/",
      images: [{ url: DEFAULT_IMAGE, width: 941, height: 941, alt: ORGANIZATION_NAME }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [DEFAULT_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    appleWebApp: {
      capable: true,
      title: "SVP Turnier",
      statusBarStyle: "default",
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
        { url: "/favicon.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      ],
      shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export function createPageMetadata(options: PageMetadataOptions): Metadata {
  const seo = getSeoData();
  const canonicalPath = normalizePath(options.path);

  return {
    title: options.title,
    description: options.description,
    keywords: options.keywords,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      locale: "de_DE",
      siteName: SITE_NAME,
      title: `${options.title} | ${SITE_NAME}`,
      description: options.description,
      url: canonicalPath,
      images: [{ url: DEFAULT_IMAGE, width: 941, height: 941, alt: ORGANIZATION_NAME }],
    },
    twitter: {
      card: "summary",
      title: `${options.title} | ${SITE_NAME}`,
      description: options.description,
      images: [DEFAULT_IMAGE],
    },
    robots: options.noIndex ? noIndexRobots() : indexRobots(),
    metadataBase: new URL(seo.siteUrl),
  };
}

export function createNoIndexMetadata(
  title: string,
  description = "Interner Bereich des SV Puschendorf Turniers."
): Metadata {
  return {
    title,
    description,
    robots: noIndexRobots(),
  };
}

export function buildStructuredData() {
  const seo = getSeoData();
  const siteUrl = seo.siteUrl;
  const title = getTournamentTitle(seo);

  return [
    {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: title,
      description: `Handball-Turnier des SV Puschendorf mit Anmeldung, Spielplan und Ergebnissen.`,
      startDate: seo.startDate,
      endDate: seo.endDate,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      image: [`${siteUrl}${DEFAULT_IMAGE}`],
      url: siteUrl,
      sport: "Handball",
      location: {
        "@type": "Place",
        name: "SV Puschendorf",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Puschendorf",
          addressCountry: "DE",
        },
      },
      organizer: {
        "@type": "SportsOrganization",
        name: ORGANIZATION_NAME,
        url: siteUrl,
        logo: `${siteUrl}${DEFAULT_IMAGE}`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: siteUrl,
      inLanguage: "de-DE",
      publisher: {
        "@type": "SportsOrganization",
        name: ORGANIZATION_NAME,
        logo: `${siteUrl}${DEFAULT_IMAGE}`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "SVP Turnier",
      url: siteUrl,
      applicationCategory: "SportsApplication",
      operatingSystem: "Web, iOS, Android",
      inLanguage: "de-DE",
    },
  ];
}

export function getPublicRoutesForSeo() {
  const seo = getSeoData();
  const routes = [
    { path: "/", priority: 1, changeFrequency: "daily" as const },
    { path: "/ergebnisse", priority: 0.8, changeFrequency: "always" as const },
    { path: "/impressum", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/datenschutz", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/agb", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/widerrufsrecht", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/cookie-richtlinie", priority: 0.2, changeFrequency: "yearly" as const },
  ];

  if (seo.anmeldenAktiv) {
    routes.splice(1, 0, { path: "/anmeldung", priority: 0.9, changeFrequency: "daily" as const });
  }

  if (seo.spielplanPublished) {
    routes.splice(seo.anmeldenAktiv ? 2 : 1, 0, {
      path: "/spielplan",
      priority: 0.9,
      changeFrequency: "always" as const,
    });
  }

  return { seo, routes };
}

export function formatDateRange(startDate: string, endDate: string) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) {
    return `${startDate} - ${endDate}`;
  }

  const startText = start.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
  const endText = end.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  return `${startText} - ${endText}`;
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function parseDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getYear(value: string) {
  return parseDate(value)?.getFullYear() || new Date().getFullYear();
}

function getTournamentTitle(seo: SeoData) {
  return new RegExp(`\\b${seo.tournamentYear}\\b`).test(seo.turnierName)
    ? seo.turnierName
    : `${seo.turnierName} ${seo.tournamentYear}`;
}

function indexRobots(): Metadata["robots"] {
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

function noIndexRobots(): Metadata["robots"] {
  return {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  };
}
