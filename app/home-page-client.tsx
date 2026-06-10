"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  Clock,
  MapPin,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";

import CookieBanner from "@/components/CookieBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface TurnierEinstellungen {
  turnierStartDatum: string;
  turnierEndDatum: string;
  samstagStartzeit: string;
  samstagEndzeit: string;
  sonntagStartzeit: string;
  sonntagEndzeit: string;
  anmeldungAktiv: boolean;
}

const defaultTurnierEinstellungen: TurnierEinstellungen = {
  turnierStartDatum: "2025-07-05",
  turnierEndDatum: "2025-07-06",
  samstagStartzeit: "13:00",
  samstagEndzeit: "17:00",
  sonntagStartzeit: "10:00",
  sonntagEndzeit: "17:00",
  anmeldungAktiv: false,
};

const routeCards = [
  {
    href: "/anmeldung",
    title: "Anmeldung",
    description: "Teamdaten, Altersklasse und Kontakt sauber erfassen.",
    icon: UserPlus,
    requiresRegistration: true,
  },
  {
    href: "/spielplan",
    title: "Spielplan",
    description: "Zeiten, Felder und laufende Begegnungen im Blick behalten.",
    icon: ClipboardList,
  },
  {
    href: "/ergebnisse",
    title: "Ergebnisse",
    description: "Resultate und abgeschlossene Spiele schnell nachsehen.",
    icon: Trophy,
  },
];

const infoTiles = [
  {
    title: "Für Teams",
    description: "Anmeldung, Altersklasse und Rückmeldung sind direkt dort, wo sie gebraucht werden.",
    icon: Users,
  },
  {
    title: "Vor Ort",
    description: "Spielplan, Uhrzeiten und Felder bleiben auch auf dem Handy klar lesbar.",
    icon: MapPin,
  },
  {
    title: "Nach Abpfiff",
    description: "Ergebnisse werden gesammelt und nachvollziehbar abgelegt.",
    icon: CheckCircle,
  },
];

function createDate(dateString: string) {
  return new Date(`${dateString}T12:00:00`);
}

function formatDateLong(dateString: string) {
  return createDate(dateString).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(dateString: string) {
  return createDate(dateString).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  });
}

function formatTime(startzeit: string, endzeit: string) {
  return `${startzeit} - ${endzeit} Uhr`;
}

function getTournamentYear(dateString: string) {
  return createDate(dateString).getFullYear();
}

function getTournamentDays(settings: TurnierEinstellungen) {
  return [
    {
      label: "Samstag",
      date: formatDateLong(settings.turnierStartDatum),
      time: formatTime(settings.samstagStartzeit, settings.samstagEndzeit),
      groups: ["Mini-Kategorien 3, 2 und 1", "E-Jugend weiblich, gemischt und männlich"],
    },
    {
      label: "Sonntag",
      date: formatDateLong(settings.turnierEndDatum),
      time: formatTime(settings.sonntagStartzeit, settings.sonntagEndzeit),
      groups: ["D- und C-Jugend weiblich und männlich", "B- und A-Jugend weiblich und männlich"],
    },
  ];
}

function normalizeTurnierEinstellungen(value: Partial<TurnierEinstellungen>): TurnierEinstellungen {
  return {
    ...defaultTurnierEinstellungen,
    ...value,
    anmeldungAktiv: value.anmeldungAktiv === true,
  };
}

export default function HomePageClient({
  initialTurnierEinstellungen,
}: {
  initialTurnierEinstellungen: TurnierEinstellungen;
}) {
  const [turnierEinstellungen, setTurnierEinstellungen] = useState(() =>
    normalizeTurnierEinstellungen(initialTurnierEinstellungen)
  );

  const tournamentYear = getTournamentYear(turnierEinstellungen.turnierStartDatum);
  const tournamentDays = useMemo(() => getTournamentDays(turnierEinstellungen), [turnierEinstellungen]);
  const visibleRouteCards = useMemo(
    () => routeCards.filter((item) => !item.requiresRegistration || turnierEinstellungen.anmeldungAktiv),
    [turnierEinstellungen.anmeldungAktiv]
  );
  const dateRange = `${formatDateShort(turnierEinstellungen.turnierStartDatum)} - ${formatDateShort(
    turnierEinstellungen.turnierEndDatum
  )} ${tournamentYear}`;

  useEffect(() => {
    async function loadTurnierEinstellungen() {
      try {
        const response = await fetch("/api/public/turnier-einstellungen", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setTurnierEinstellungen(normalizeTurnierEinstellungen(data));
      } catch (error) {
        console.error("Fehler beim Laden der Turnier-Einstellungen:", error);
      }
    }

    loadTurnierEinstellungen();
  }, []);

  return (
    <>
      <section className="overflow-hidden border-b bg-[#f6f7f1]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_470px] lg:items-center lg:py-16">
          <div className="max-w-3xl">
            <div className="mb-6 flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1.5 border-[#d9dec8] bg-white/75 text-[#4f5d2f]">
                <CalendarDays className="size-3.5" />
                Rasenturnier {tournamentYear}
              </Badge>
              <Badge variant="outline" className="gap-1.5 border-[#d9dec8] bg-white/75 text-[#4f5d2f]">
                <Clock className="size-3.5" />
                {dateRange}
              </Badge>
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl lg:text-[3.35rem]">
              Handball-Turnier des SV Puschendorf
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Eine ruhige Turnierübersicht für Anmeldung, Spielplan und Ergebnisse. Alles an einem Ort, ohne
              unnötigen Lärm.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {turnierEinstellungen.anmeldungAktiv && (
                <Button asChild size="lg" className="w-full bg-[#5e6d35] text-white hover:bg-[#4f5d2f] sm:w-auto">
                  <Link href="/anmeldung">
                    <UserPlus className="size-4" />
                    Team anmelden
                  </Link>
                </Button>
              )}
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full border-[#cdd5bd] bg-white/70 text-[#4f5d2f] hover:bg-[#eef1e5] sm:w-auto"
              >
                <Link href="/spielplan">
                  <ClipboardList className="size-4" />
                  Spielplan ansehen
                </Link>
              </Button>
            </div>

            <div className="mt-10 flex max-w-2xl flex-wrap items-center gap-x-5 gap-y-2 border-l-2 border-[#8a9868] pl-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">2 Turniertage</span>
              <span>3 zentrale Ansichten</span>
              <span>Live-Plan und Ergebnisse</span>
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-[8px] border bg-card shadow-sm sm:min-h-[430px]">
            <Image
              src="/turnier-field-v2.png"
              alt="Rasenfeld mit Handballtoren beim SV Puschendorf Turnier"
              fill
              priority
              sizes="(min-width: 1024px) 470px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/15" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <div className="rounded-[8px] border border-white/25 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="!mt-0 text-xs font-medium uppercase text-muted-foreground">Turnierzeitraum</p>
                    <p className="!mt-1 text-lg font-semibold leading-snug tracking-normal text-foreground">
                      {dateRange}
                    </p>
                  </div>
                  <CalendarDays className="mt-1 size-5 text-[#5e6d35]" />
                </div>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  {tournamentDays.map((day) => (
                    <div key={day.label} className="rounded-md border border-[#e3e7d7] bg-white/80 p-3">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="size-2 rounded-full bg-[#5e6d35]" />
                        {day.label}
                      </div>
                      <p className="!mt-1 text-muted-foreground">{day.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-background">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:py-14">
          <div>
            <p className="!mt-0 text-sm font-medium text-[#5e6d35]">Turniertage</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
              Ablauf nach Altersklassen
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {tournamentDays.map((day) => (
              <article key={day.label} className="rounded-[8px] border bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="!mt-0 text-sm font-medium text-muted-foreground">{day.label}</p>
                    <h3 className="mt-1 text-xl font-semibold tracking-normal">{day.date}</h3>
                  </div>
                  <span className="size-3 rounded-full bg-[#5e6d35]" />
                </div>
                <div className="mt-5 flex items-center gap-2 text-sm font-medium">
                  <Clock className="size-4 text-muted-foreground" />
                  {day.time}
                </div>
                <div className="mt-5 grid gap-2">
                  {day.groups.map((group) => (
                    <div key={group} className="flex items-start gap-3 rounded-md bg-[#f6f7f1] px-3 py-2 text-sm">
                      <CheckCircle className="mt-0.5 size-4 shrink-0 text-[#5e6d35]" />
                      <span>{group}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b bg-[#f6f7f1]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:py-14">
          <div>
            <p className="!mt-0 text-sm font-medium text-[#5e6d35]">Direktzugriff</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
              Alles Wesentliche auf kurzem Weg
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              {turnierEinstellungen.anmeldungAktiv
                ? "Anmeldung, Spielplan und Ergebnisse bleiben getrennt genug für Übersicht, aber nah genug für den schnellen Wechsel am Turniertag."
                : "Spielplan und Ergebnisse bleiben getrennt genug für Übersicht, aber nah genug für den schnellen Wechsel am Turniertag."}
            </p>
          </div>

          <div className={`grid gap-3 ${turnierEinstellungen.anmeldungAktiv ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            {visibleRouteCards.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[8px] border border-[#e0e5d4] bg-white/75 p-4 shadow-xs transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-9 items-center justify-center rounded-md border border-[#d9dec8] bg-[#eef1e5] text-[#5e6d35]">
                    <item.icon className="size-5" />
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <h3 className="mt-5 text-base font-semibold tracking-normal">{item.title}</h3>
                <p className="!mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-14">
          <div className="grid gap-4 md:grid-cols-3">
            {infoTiles.map((item) => (
              <div key={item.title} className="border-t border-[#d9dec8] pt-5">
                <item.icon className="size-5 text-[#5e6d35]" />
                <h3 className="mt-4 text-base font-semibold tracking-normal">{item.title}</h3>
                <p className="!mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CookieBanner
        onRejectOptional={() => localStorage.removeItem("svp_turnier_cache")}
        onSettings={(consent) => {
          if (!consent.functional) {
            localStorage.removeItem("svp_turnier_cache");
          }
        }}
      />
    </>
  );
}
