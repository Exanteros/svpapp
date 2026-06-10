"use client";

import { AlertCircle, CalendarDays, CheckCircle, Euro, Trophy, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatDate, formatEuro } from "./format";
import type { Anmeldung, HelferAnmeldung, Spiel, Statistiken, TurnierEinstellungen } from "./types";

interface OverviewPanelProps {
  statistiken: Statistiken;
  anmeldungen: Anmeldung[];
  spiele: Spiel[];
  helferAnmeldungen: HelferAnmeldung[];
  settings: TurnierEinstellungen;
  onNavigate: (target: "registrations" | "schedule" | "helpers" | "day") => void;
}

export function OverviewPanel({
  statistiken,
  anmeldungen,
  spiele,
  helferAnmeldungen,
  settings,
  onNavigate,
}: OverviewPanelProps) {
  const unpaid = anmeldungen.filter((anmeldung) => anmeldung.status !== "bezahlt").length;
  const openGames = spiele.filter((spiel) => spiel.status !== "beendet").length;
  const confirmedHelpers = helferAnmeldungen.filter((anmeldung) => anmeldung.status === "bestätigt").length;
  const nextAction =
    anmeldungen.length === 0
      ? "Anmeldungen prüfen oder Demo-Daten im Gefahrbereich anlegen."
      : spiele.length === 0
        ? "Spielplan konfigurieren und generieren."
        : unpaid > 0
          ? "Offene Zahlungen nachfassen."
          : "Turniertag-Tools bereithalten.";

  const stats = [
    { label: "Anmeldungen", value: statistiken.anmeldungen, icon: Users },
    { label: "Teams", value: statistiken.teams, icon: Trophy },
    { label: "Offen", value: unpaid, icon: AlertCircle },
    { label: "Einnahmen", value: formatEuro(statistiken.gesamtKosten), icon: Euro },
  ];

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label} className="rounded-[8px]">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="!mt-0 text-sm text-muted-foreground">{item.label}</p>
                <p className="!mt-2 text-2xl font-semibold tracking-normal">{item.value}</p>
              </div>
              <item.icon className="size-5 text-[#5e6d35]" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[8px]">
          <CardHeader>
            <CardTitle className="text-lg">Nächster sinnvoller Schritt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[8px] border border-[#d9dec8] bg-[#f6f7f1] p-4">
              <p className="!mt-0 text-sm leading-6 text-muted-foreground">{nextAction}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Button onClick={() => onNavigate("registrations")} variant="outline">Anmeldungen</Button>
              <Button onClick={() => onNavigate("schedule")} variant="outline">Spielplan</Button>
              <Button onClick={() => onNavigate("helpers")} variant="outline">Helfer</Button>
              <Button onClick={() => onNavigate("day")} className="bg-[#5e6d35] text-white hover:bg-[#4f5d2f]">
                Turniertag
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[8px]">
          <CardHeader>
            <CardTitle className="text-lg">Turnierstatus</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <span className="text-muted-foreground">Zeitraum</span>
              <span className="font-medium">{formatDate(settings.turnierStartDatum)} - {formatDate(settings.turnierEndDatum)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <span className="text-muted-foreground">Spiele im Plan</span>
              <Badge variant="outline">{spiele.length}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <span className="text-muted-foreground">Offene Spiele</span>
              <Badge variant="outline">{openGames}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <span className="text-muted-foreground">Bestätigte Helfer</span>
              <Badge variant="outline" className="border-[#d9dec8] text-[#5e6d35]">
                <CheckCircle className="size-3" />
                {confirmedHelpers}
              </Badge>
            </div>
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              Plan und öffentliche Ansichten teilen dieselben Daten.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
