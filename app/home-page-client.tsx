"use client";

import { useEffect, useMemo, useState } from "react";
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
import { getTournamentYear, TOURNAMENT_DEFAULTS } from "@/lib/tournament";

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
  turnierStartDatum: TOURNAMENT_DEFAULTS.startDate,
  turnierEndDatum: TOURNAMENT_DEFAULTS.endDate,
  samstagStartzeit: TOURNAMENT_DEFAULTS.saturdayStartTime,
  samstagEndzeit: TOURNAMENT_DEFAULTS.saturdayEndTime,
  sonntagStartzeit: TOURNAMENT_DEFAULTS.sundayStartTime,
  sonntagEndzeit: TOURNAMENT_DEFAULTS.sundayEndTime,
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

function getTournamentDays(settings: TurnierEinstellungen) {
  return [
    {
      label: "Samstag",
      date: formatDateLong(settings.turnierStartDatum),
      time: formatTime(settings.samstagStartzeit, settings.samstagEndzeit),
      groups: ["Minis", "E-Jugend"],
    },
    {
      label: "Sonntag",
      date: formatDateLong(settings.turnierEndDatum),
      time: formatTime(settings.sonntagStartzeit, settings.sonntagEndzeit),
      groups: ["D-Jugend", "C-Jugend", "B-Jugend", "A-Jugend"],
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
      <section className="relative isolate overflow-hidden border-b border-border/70">
        <picture className="absolute inset-0 -z-20">
          <source
            type="image/avif"
            sizes="100vw"
            srcSet="/hero/jens-960.avif 960w, /hero/jens-1440.avif 1440w, /hero/jens-1920.avif 1920w, /hero/jens-2560.avif 2560w"
          />
          <source
            type="image/webp"
            sizes="100vw"
            srcSet="/hero/jens-960.webp 960w, /hero/jens-1440.webp 1440w, /hero/jens-1920.webp 1920w, /hero/jens-2560.webp 2560w"
          />
          <img
            src="/hero/jens-1920.webp"
            alt="Handball-Turnier des SV Puschendorf"
            className="h-full w-full scale-[1.015] object-cover blur-[1.5px]"
            decoding="async"
          />
        </picture>
        <div className="absolute inset-0 -z-10 bg-black/50" />
        <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col justify-end px-4 pb-8 pt-24 text-white sm:px-6 lg:min-h-[680px] lg:pb-10">
          <div className="max-w-3xl">
            <div className="mb-6 flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1.5 border-white/25 bg-white/12 text-white backdrop-blur">
                <CalendarDays className="size-3.5" />
                Rasenturnier {tournamentYear}
              </Badge>
              <Badge variant="outline" className="gap-1.5 border-white/25 bg-white/12 text-white backdrop-blur">
                <Clock className="size-3.5" />
                {dateRange}
              </Badge>
            </div>

            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal text-white sm:text-6xl lg:text-[4.5rem]">
              Handball-Turnier des SV Puschendorf
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-xl sm:leading-8">
              Eine ruhige Turnierübersicht für Anmeldung, Spielplan und Ergebnisse. Alles an einem Ort, ohne
              unnötigen Lärm.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {turnierEinstellungen.anmeldungAktiv && (
                <Button asChild size="lg" className="w-full bg-white text-zinc-950 hover:bg-white/90 sm:w-auto">
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
                className="w-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto"
              >
                <Link href="/spielplan">
                  <ClipboardList className="size-4" />
                  Spielplan ansehen
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-12 grid gap-3 border-t border-white/18 pt-5 text-sm text-white/78 sm:grid-cols-3">
            <div>
              <div className="font-medium text-white">2 Turniertage</div>
              <div className="mt-1">{dateRange}</div>
            </div>
            {tournamentDays.map((day) => (
              <div key={day.label}>
                <div className="font-medium text-white">{day.label}</div>
                <div className="mt-1">{day.time}</div>
              </div>
            ))}
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
