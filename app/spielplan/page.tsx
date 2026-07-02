"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  Trophy,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useSpielplanLiveEvents } from "@/components/SpielplanLiveRefresh";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTeamDisplayNameMapFromGames, formatScheduleCategoryLabel, formatTeamDisplayName } from "@/lib/tournament";
import { cn } from "@/lib/utils";

interface Spiel {
  id: string;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  status: string;
  ergebnis?: string | null;
  tore_team1?: number | null;
  tore_team2?: number | null;
  schiedsrichter?: string | null;
}

interface SpielplanDay {
  datumKey: string;
  datum: string;
  zeit: string;
  spiele: Spiel[];
}

interface SpielplanZeitblock {
  id: string;
  label: string;
  datum: string;
  startzeit: string;
  endzeit: string;
  kategorien: string[];
}

interface SpielplanData {
  samstag: SpielplanDay;
  sonntag: SpielplanDay;
  availableFields: string[];
  spielplanZeitbloecke?: SpielplanZeitblock[];
  spielplanStatus?: string;
  spielplanPublishedAt?: string;
  schiedsrichterAnzeigeAktiv?: boolean;
}

type DayKey = "samstag" | "sonntag";
type GameVisualStatus = "geplant" | "nächstes" | "laufend" | "halbzeit" | "beendet";

type TimelineItem =
  | { type: "block"; key: string; minute: number; block: SpielplanZeitblock; isFirstBlock: boolean }
  | { type: "pause"; key: string; minute: number; startzeit: string; endzeit: string; nextBlockLabel: string; duration: number }
  | { type: "games"; key: string; minute: number; zeitSlot: string; spiele: Spiel[] };

const dayLabels: Record<DayKey, string> = {
  samstag: "Tag 1",
  sonntag: "Tag 2",
};

async function getSpielplan(includeDraft = false): Promise<SpielplanData> {
  const response = await fetch(`/api/spielplan/get${includeDraft ? "?includeDraft=1" : ""}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });

  if (!response.ok) {
    if (includeDraft && [401, 403].includes(response.status)) {
      throw new Error("Entwurfsvorschau ist nur für angemeldete Admins verfügbar.");
    }

    throw new Error(`Spielplan konnte nicht geladen werden (${response.status}).`);
  }

  const data = await response.json();

  if (!data?.samstag || !data?.sonntag) {
    throw new Error("Ungültige Spielplan-Daten.");
  }

  return data;
}

function toGameDate(spiel: Spiel) {
  return new Date(`${spiel.datum}T${spiel.zeit}:00`);
}

function getScore(spiel: Spiel) {
  if (spiel.ergebnis) {
    return spiel.ergebnis;
  }

  if (typeof spiel.tore_team1 === "number" && typeof spiel.tore_team2 === "number") {
    return `${spiel.tore_team1}:${spiel.tore_team2}`;
  }

  return null;
}

function getVisualStatus(spiel: Spiel, nextGameIds: Set<string>): GameVisualStatus {
  if (spiel.status === "laufend") return "laufend";
  if (spiel.status === "halbzeit") return "halbzeit";
  if (spiel.status === "beendet") return "beendet";
  if (nextGameIds.has(spiel.id)) return "nächstes";

  return "geplant";
}

function getStatusMeta(status: GameVisualStatus) {
  if (status === "laufend") {
    return {
      label: "Läuft",
      icon: Play,
      className: "border-[#5e6d35] bg-[#5e6d35] text-white",
    };
  }

  if (status === "halbzeit") {
    return {
      label: "Halbzeit",
      icon: Pause,
      className: "border-[#d9dec8] bg-[#eef1e5] text-[#4f5d2f]",
    };
  }

  if (status === "beendet") {
    return {
      label: "Beendet",
      icon: CheckCircle2,
      className: "border-[#d9dec8] bg-white text-[#4f5d2f]",
    };
  }

  if (status === "nächstes") {
    return {
      label: "Als nächstes",
      icon: Clock,
      className: "border-[#8a9868] bg-[#f6f7f1] text-[#4f5d2f]",
    };
  }

  return {
    label: "Geplant",
    icon: CalendarDays,
    className: "border-[#e6e8de] bg-white text-muted-foreground",
  };
}

function groupByTime(spiele: Spiel[]) {
  return spiele.reduce<Record<string, Spiel[]>>((result, spiel) => {
    result[spiel.zeit] ??= [];
    result[spiel.zeit].push(spiel);
    result[spiel.zeit].sort(compareGamesByField);
    return result;
  }, {});
}

function compareGamesByField(first: Spiel, second: Spiel) {
  return compareFieldNames(first.feld, second.feld)
    || first.kategorie.localeCompare(second.kategorie, "de")
    || first.team1.localeCompare(second.team1, "de");
}

function compareFieldNames(first: string, second: string) {
  const firstNumber = Number(first.match(/\d+/)?.[0]);
  const secondNumber = Number(second.match(/\d+/)?.[0]);

  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber) && firstNumber !== secondNumber) {
    return firstNumber - secondNumber;
  }

  return first.localeCompare(second, "de");
}

function getCategoryCount(spiele: Spiel[]) {
  return new Set(spiele.map((spiel) => formatScheduleCategoryLabel(spiel.kategorie))).size;
}

function getFieldCount(spiele: Spiel[]) {
  return new Set(spiele.map((spiel) => spiel.feld)).size;
}

function getAllGames(data: SpielplanData | null) {
  if (!data) return [];
  return [...data.samstag.spiele, ...data.sonntag.spiele];
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return 0;
  }

  return hour * 60 + minute;
}

function formatTimeRange(startzeit: string, endzeit: string) {
  return `${startzeit} - ${endzeit} Uhr`;
}

function getBlockTitle(block: SpielplanZeitblock) {
  return block.label || block.kategorien.map(formatScheduleCategoryLabel).join(" / ") || "Zeitblock";
}

function getBlocksForDay(data: SpielplanData, day: SpielplanDay) {
  return (data.spielplanZeitbloecke ?? [])
    .filter((block) => block.datum === day.datumKey)
    .sort((first, second) => timeToMinutes(first.startzeit) - timeToMinutes(second.startzeit));
}

function getTeamFilterOptions(spiele: Spiel[], displayNameMap: ReturnType<typeof createTeamDisplayNameMapFromGames>) {
  return Array.from(new Set(spiele.flatMap((spiel) => [
    formatTeamDisplayName(spiel.team1, displayNameMap),
    formatTeamDisplayName(spiel.team2, displayNameMap),
  ]))).sort((first, second) => first.localeCompare(second, "de", { numeric: true, sensitivity: "base" }));
}

function gameMatchesTeamFilter(
  spiel: Spiel,
  selectedTeam: string,
  displayNameMap: ReturnType<typeof createTeamDisplayNameMapFromGames>
) {
  if (selectedTeam === "alle") {
    return true;
  }

  return formatTeamDisplayName(spiel.team1, displayNameMap) === selectedTeam
    || formatTeamDisplayName(spiel.team2, displayNameMap) === selectedTeam;
}

function buildTimelineItems(
  timeSlots: string[],
  groupedSpiele: Record<string, Spiel[]>,
  dayBlocks: SpielplanZeitblock[]
): TimelineItem[] {
  const items: TimelineItem[] = timeSlots.map((zeitSlot) => ({
    type: "games",
    key: `games-${zeitSlot}`,
    minute: timeToMinutes(zeitSlot),
    zeitSlot,
    spiele: groupedSpiele[zeitSlot],
  }));

  dayBlocks.forEach((block, index) => {
    const blockStart = timeToMinutes(block.startzeit);
    const previousBlock = dayBlocks[index - 1];

    if (previousBlock) {
      const previousEnd = timeToMinutes(previousBlock.endzeit);
      const duration = blockStart - previousEnd;

      if (duration > 0) {
        items.push({
          type: "pause",
          key: `pause-${previousBlock.id}-${block.id}`,
          minute: previousEnd,
          startzeit: previousBlock.endzeit,
          endzeit: block.startzeit,
          nextBlockLabel: getBlockTitle(block),
          duration,
        });
      }
    }

    items.push({
      type: "block",
      key: `block-${block.id}`,
      minute: blockStart,
      block,
      isFirstBlock: index === 0,
    });
  });

  const typeOrder: Record<TimelineItem["type"], number> = {
    pause: 0,
    block: 1,
    games: 2,
  };

  return items.sort((first, second) => (
    first.minute - second.minute
    || typeOrder[first.type] - typeOrder[second.type]
    || first.key.localeCompare(second.key, "de")
  ));
}

export default function SpielplanPage() {
  const [spielplanData, setSpielplanData] = useState<SpielplanData | null>(null);
  const [selectedField, setSelectedField] = useState("alle");
  const [selectedTeam, setSelectedTeam] = useState("alle");
  const [activeDay, setActiveDay] = useState<DayKey>("samstag");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [previewDraft] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1"
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadSpielplan = useCallback(async () => {
    try {
      setError(null);
      const data = await getSpielplan(previewDraft);
      setSpielplanData(data);
    } catch (loadError) {
      console.error("Fehler beim Laden des Spielplans:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Fehler beim Laden des Spielplans.");
    } finally {
      setLoading(false);
    }
  }, [previewDraft]);

  useEffect(() => {
    loadSpielplan();
    const interval = setInterval(loadSpielplan, 30000);
    return () => clearInterval(interval);
  }, [loadSpielplan]);

  useSpielplanLiveEvents(loadSpielplan);

  const allGames = useMemo(() => getAllGames(spielplanData), [spielplanData]);
  const teamDisplayNames = useMemo(
    () => createTeamDisplayNameMapFromGames(allGames),
    [allGames]
  );
  const teamFilterOptions = useMemo(
    () => getTeamFilterOptions(allGames, teamDisplayNames),
    [allGames, teamDisplayNames]
  );

  useEffect(() => {
    if (selectedTeam !== "alle" && !teamFilterOptions.includes(selectedTeam)) {
      setSelectedTeam("alle");
    }
  }, [selectedTeam, teamFilterOptions]);

  const nextGameIds = useMemo(() => {
    const upcomingGames = allGames
      .filter((spiel) => spiel.status === "geplant" && toGameDate(spiel).getTime() >= currentTime.getTime())
      .sort((a, b) => toGameDate(a).getTime() - toGameDate(b).getTime());

    const nextGame = upcomingGames[0];
    if (!nextGame) return new Set<string>();

    const nextTime = `${nextGame.datum}-${nextGame.zeit}`;
    return new Set(
      upcomingGames
        .filter((spiel) => `${spiel.datum}-${spiel.zeit}` === nextTime)
        .map((spiel) => spiel.id)
    );
  }, [allGames, currentTime]);

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-[#fbfbf8]">
        <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center px-4 sm:px-6">
          <div className="w-full max-w-md rounded-[8px] border border-[#d9dec8] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-[#4f5d2f]">
              <RefreshCw className="size-5 animate-spin" />
              <div>
                <div className="font-semibold">Spielplan wird geladen</div>
                <div className="mt-1 text-sm text-muted-foreground">Die aktuelle Turnieransicht wird vorbereitet.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!spielplanData || error) {
    return (
      <div className="min-h-[70vh] bg-[#fbfbf8]">
        <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center px-4 sm:px-6">
          <div className="w-full max-w-md rounded-[8px] border border-[#d9dec8] bg-white p-6 shadow-sm">
            <AlertTriangle className="mb-4 size-6 text-destructive" />
            <h1 className="text-2xl font-semibold tracking-normal">Spielplan nicht verfügbar</h1>
            <div className="mt-2 text-sm text-muted-foreground">{error || "Die Daten konnten nicht geladen werden."}</div>
            <Button onClick={loadSpielplan} variant="outline" className="mt-6 border-[#cdd5bd] text-[#4f5d2f]">
              <RefreshCw className="size-4" />
              Erneut versuchen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentDay = spielplanData[activeDay];
  const filteredSpiele =
    currentDay.spiele.filter((spiel) => (
      (selectedField === "alle" || spiel.feld === selectedField)
      && gameMatchesTeamFilter(spiel, selectedTeam, teamDisplayNames)
    ));
  const groupedSpiele = groupByTime(filteredSpiele);
  const timeSlots = Object.keys(groupedSpiele).sort();
  const dayBlocks = getBlocksForDay(spielplanData, currentDay);
  const timelineItems = buildTimelineItems(timeSlots, groupedSpiele, dayBlocks);
  const totalGames = allGames.length;
  const liveGames = allGames.filter((spiel) => ["laufend", "halbzeit"].includes(spiel.status)).length;
  const endedGames = allGames.filter((spiel) => spiel.status === "beendet").length;
  const currentDayFields = getFieldCount(currentDay.spiele);
  const currentDayCategories = getCategoryCount(currentDay.spiele);
  const noPublishedGames = !previewDraft && spielplanData.spielplanStatus && spielplanData.spielplanStatus !== "published";

  return (
    <div className="min-h-screen bg-[#fbfbf8]">
      <section className="border-b border-[#e1e4d8] bg-[#f6f7f1]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end lg:py-10">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1.5 border-[#d9dec8] bg-white/80 text-[#4f5d2f]">
                <CalendarDays className="size-3.5" />
                {previewDraft ? "Entwurfsvorschau" : "Spielplan"}
              </Badge>
              <Badge variant="outline" className="gap-1.5 border-[#d9dec8] bg-white/80 text-[#4f5d2f]">
                <Clock className="size-3.5" />
                Aktualisiert {currentTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
              </Badge>
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">
              Spielplan
            </h1>
            <div className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Begegnungen, Felder und Tagesstatus für das Handball-Turnier des SV Puschendorf.
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-[8px] border border-[#d9dec8] bg-white p-2 shadow-sm">
            <div className="rounded-[6px] bg-[#f6f7f1] p-3">
              <div className="text-2xl font-semibold text-[#4f5d2f]">{totalGames}</div>
              <div className="mt-1 text-xs text-muted-foreground">Spiele</div>
            </div>
            <div className="rounded-[6px] bg-[#f6f7f1] p-3">
              <div className="text-2xl font-semibold text-[#4f5d2f]">{spielplanData.availableFields.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">Felder</div>
            </div>
            <div className="rounded-[6px] bg-[#f6f7f1] p-3">
              <div className="text-2xl font-semibold text-[#4f5d2f]">{liveGames || endedGames}</div>
              <div className="mt-1 text-xs text-muted-foreground">{liveGames ? "Live" : "Beendet"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {previewDraft && (
          <div className="mb-5 rounded-[8px] border border-[#d9dec8] bg-white p-4 text-sm text-[#4f5d2f]">
            Admin-Entwurfsvorschau. Öffentlich erscheint der Plan erst nach Veröffentlichung.
          </div>
        )}

        {noPublishedGames && (
          <div className="mb-5 rounded-[8px] border border-[#d9dec8] bg-white p-4 text-sm text-[#4f5d2f]">
            Der Spielplan wird aktuell vorbereitet.
          </div>
        )}

        <div className="mb-6 grid gap-3 rounded-[8px] border border-[#d9dec8] bg-white p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_240px_280px] lg:items-center">
          <div className="grid grid-cols-2 gap-2">
            {(["samstag", "sonntag"] as DayKey[]).map((dayKey) => {
              const day = spielplanData[dayKey];
              const isActive = activeDay === dayKey;

              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setActiveDay(dayKey)}
                  className={cn(
                    "min-h-20 rounded-[8px] border px-3 py-3 text-left transition md:min-h-16",
                    isActive
                      ? "border-[#5e6d35] bg-[#5e6d35] text-white shadow-sm"
                      : "border-[#e1e4d8] bg-[#fbfbf8] text-foreground hover:border-[#cdd5bd]"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium uppercase tracking-normal opacity-80">{dayLabels[dayKey]}</span>
                    <span className="text-xs opacity-80">{day.spiele.length} Spiele</span>
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold">{day.datum}</div>
                  <div className={cn("mt-1 text-xs", isActive ? "text-white/80" : "text-muted-foreground")}>{day.zeit}</div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="size-4 shrink-0 text-[#4f5d2f]" />
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger aria-label="Feld filtern" className="border-[#d9dec8] bg-[#fbfbf8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Felder</SelectItem>
                {spielplanData.availableFields.map((field) => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <UserRound className="size-4 shrink-0 text-[#4f5d2f]" />
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger aria-label="Mannschaft filtern" className="border-[#d9dec8] bg-[#fbfbf8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Mannschaften</SelectItem>
                {teamFilterOptions.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[8px] border border-[#e1e4d8] bg-white p-4">
            <div className="text-xs text-muted-foreground">Tag</div>
            <div className="mt-1 font-semibold text-[#4f5d2f]">{currentDay.spiele.length} Spiele</div>
          </div>
          <div className="rounded-[8px] border border-[#e1e4d8] bg-white p-4">
            <div className="text-xs text-muted-foreground">Felder aktiv</div>
            <div className="mt-1 font-semibold text-[#4f5d2f]">{currentDayFields}</div>
          </div>
          <div className="rounded-[8px] border border-[#e1e4d8] bg-white p-4">
            <div className="text-xs text-muted-foreground">Kategorien</div>
            <div className="mt-1 font-semibold text-[#4f5d2f]">{currentDayCategories}</div>
          </div>
        </div>

        {timeSlots.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-[#cdd5bd] bg-white p-10 text-center">
            <CalendarDays className="mx-auto mb-4 size-8 text-[#8a9868]" />
            <div className="font-semibold">Keine Spiele gefunden</div>
            <div className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {selectedField === "alle" && selectedTeam === "alle"
                ? "Für diesen Tag sind noch keine Spiele geplant."
                : "Für die aktuellen Filter sind keine Spiele geplant."}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {timelineItems.map((item) => {
              if (item.type === "block") {
                const title = getBlockTitle(item.block);
                const label = item.isFirstBlock ? "Abschnitt" : "Jugendwechsel";

                return (
                  <section
                    key={item.key}
                    className="rounded-[8px] border border-[#d9dec8] bg-[#f6f7f1] px-4 py-3 shadow-sm sm:px-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-[#6f7d48]">
                          <CalendarDays className="size-3.5" />
                          {label}
                        </div>
                        <div className="mt-1 text-lg font-semibold leading-tight text-[#3f4a26]">{title}</div>
                      </div>
                      <div className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-[#d9dec8] bg-white px-3 py-2 text-sm font-medium text-[#4f5d2f]">
                        <Clock className="size-4" />
                        {formatTimeRange(item.block.startzeit, item.block.endzeit)}
                      </div>
                    </div>
                  </section>
                );
              }

              if (item.type === "pause") {
                return (
                  <section key={item.key} className="grid gap-3 md:grid-cols-[96px_minmax(0,1fr)]">
                    <div className="md:pt-1">
                      <div className="sticky top-4 inline-flex items-center gap-2 rounded-[8px] border border-[#d9dec8] bg-white px-3 py-2 shadow-sm md:flex-col md:items-start">
                        <Pause className="size-4 text-[#4f5d2f]" />
                        <div>
                          <div className="font-semibold text-[#4f5d2f]">{item.startzeit}</div>
                          <div className="text-xs text-muted-foreground">Pause</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[8px] border border-dashed border-[#cdd5bd] bg-white px-4 py-3 shadow-sm sm:px-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-normal text-[#6f7d48]">PAUSE</div>
                          <div className="mt-1 text-base font-semibold text-[#3f4a26]">Wechsel zu {item.nextBlockLabel}</div>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-[#e1e4d8] bg-[#fbfbf8] px-3 py-2 text-sm font-medium text-[#4f5d2f]">
                          <Clock className="size-4" />
                          {formatTimeRange(item.startzeit, item.endzeit)}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              }

              const spieleInSlot = item.spiele;

              return (
                <section key={item.key} className="grid gap-3 md:grid-cols-[96px_minmax(0,1fr)]">
                  <div className="md:pt-1">
                    <div className="sticky top-4 inline-flex items-center gap-2 rounded-[8px] border border-[#d9dec8] bg-white px-3 py-2 shadow-sm md:flex-col md:items-start">
                      <Clock className="size-4 text-[#4f5d2f]" />
                      <div>
                        <div className="font-semibold text-[#4f5d2f]">{item.zeitSlot}</div>
                        <div className="text-xs text-muted-foreground">Uhr</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {spieleInSlot.map((spiel) => {
                      const status = getVisualStatus(spiel, nextGameIds);
                      const statusMeta = getStatusMeta(status);
                      const StatusIcon = statusMeta.icon;
                      const showScore = ["laufend", "halbzeit", "beendet"].includes(spiel.status);
                      const score = showScore ? getScore(spiel) : null;
                      const team1 = formatTeamDisplayName(spiel.team1, teamDisplayNames);
                      const team2 = formatTeamDisplayName(spiel.team2, teamDisplayNames);
                      const showReferee = spielplanData.schiedsrichterAnzeigeAktiv !== false;
                      const referee = showReferee && spiel.schiedsrichter?.trim()
                        ? formatTeamDisplayName(spiel.schiedsrichter, teamDisplayNames)
                        : "Schiri offen";

                      return (
                        <article
                          key={spiel.id}
                          className={cn(
                            "rounded-[8px] border bg-white p-4 shadow-sm transition",
                            status === "laufend" ? "border-[#5e6d35] ring-2 ring-[#d9dec8]" : "border-[#e1e4d8]"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge className={cn("gap-1.5", statusMeta.className)}>
                              <StatusIcon className="size-3" />
                              {statusMeta.label}
                            </Badge>
                            <Badge variant="outline" className="gap-1 border-[#d9dec8] text-[#4f5d2f]">
                              <MapPin className="size-3" />
                              {spiel.feld}
                            </Badge>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_62px] sm:items-center">
                            <div className="min-w-0">
                              <div
                                className="truncate whitespace-nowrap text-[11px] font-semibold leading-4 sm:text-xs"
                                title={team1}
                              >
                                {team1}
                              </div>
                              <div className="my-1 text-xs uppercase tracking-normal text-muted-foreground">gegen</div>
                              <div
                                className="truncate whitespace-nowrap text-[11px] font-semibold leading-4 sm:text-xs"
                                title={team2}
                              >
                                {team2}
                              </div>
                            </div>

                            <div className="rounded-[8px] border border-[#e1e4d8] bg-[#fbfbf8] px-1.5 py-2 text-center">
                              <div className="text-[11px] text-muted-foreground">Ergebnis</div>
                              <div className="mt-1 font-mono text-lg font-semibold text-[#4f5d2f]">
                                {score || "-"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 border-t border-[#eef0e8] pt-3 text-xs text-muted-foreground">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="bg-[#f6f7f1] text-[#4f5d2f]">
                                {formatScheduleCategoryLabel(spiel.kategorie)}
                              </Badge>
                              <span>{currentDay.datum}</span>
                            </div>
                            {showReferee && (
                              <div
                                className="inline-flex min-w-0 items-center gap-1.5 text-[#4f5d2f]"
                                title={`Schiedsrichter: ${referee}`}
                              >
                                <UserRound className="size-3.5 shrink-0" />
                                <span className="truncate">Schiri: {referee}</span>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 rounded-[8px] border border-[#d9dec8] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-[#4f5d2f]">Ergebnisse</div>
            <div className="mt-1 text-sm text-muted-foreground">Abgeschlossene Spiele und sichtbare Resultate.</div>
          </div>
          <Button asChild variant="outline" className="border-[#cdd5bd] text-[#4f5d2f]">
            <Link href="/ergebnisse">
              <Trophy className="size-4" />
              Ergebnisse ansehen
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
