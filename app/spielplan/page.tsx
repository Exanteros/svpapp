"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  SlidersHorizontal,
  Trophy,
  UserRound,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useSpielplanLiveEvents } from "@/components/SpielplanLiveRefresh";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
type StatusFilter = "alle" | "live" | GameVisualStatus;
type RefereeFilter = "alle" | "zugeteilt" | "offen";

type TimelineItem =
  | { type: "block"; key: string; minute: number; block: SpielplanZeitblock; isFirstBlock: boolean }
  | { type: "pause"; key: string; minute: number; startzeit: string; endzeit: string; nextBlockLabel: string; duration: number }
  | { type: "games"; key: string; minute: number; zeitSlot: string; spiele: Spiel[] };

interface TeamFilterOption {
  value: string;
  label: string;
}

interface ActiveFilterChip {
  key: string;
  label: string;
  onClear: () => void;
}

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: "alle", label: "Alle Status" },
  { value: "nächstes", label: "Als nächstes" },
  { value: "live", label: "Live" },
  { value: "geplant", label: "Geplant" },
  { value: "halbzeit", label: "Halbzeit" },
  { value: "beendet", label: "Beendet" },
];

const refereeFilterOptions: { value: RefereeFilter; label: string }[] = [
  { value: "alle", label: "Alle Schiris" },
  { value: "zugeteilt", label: "Schiri zugeteilt" },
  { value: "offen", label: "Schiri offen" },
];

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

function getScoreForSelectedTeam(spiel: Spiel, selectedIsTeam1: boolean) {
  if (typeof spiel.tore_team1 === "number" && typeof spiel.tore_team2 === "number") {
    return selectedIsTeam1
      ? `${spiel.tore_team1}:${spiel.tore_team2}`
      : `${spiel.tore_team2}:${spiel.tore_team1}`;
  }

  const score = getScore(spiel);
  const scoreParts = score?.match(/^\s*(\d+)\s*:\s*(\d+)\s*$/);

  if (!scoreParts || selectedIsTeam1) {
    return score;
  }

  return `${scoreParts[2]}:${scoreParts[1]}`;
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

function compareGamesByDateTime(first: Spiel, second: Spiel) {
  return toGameDate(first).getTime() - toGameDate(second).getTime()
    || compareGamesByField(first, second);
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

function getGameDayLabel(spiel: Spiel, data: SpielplanData) {
  if (spiel.datum === data.samstag.datumKey) {
    return data.samstag.datum;
  }

  if (spiel.datum === data.sonntag.datumKey) {
    return data.sonntag.datum;
  }

  return spiel.datum;
}

function getTeamFilterOptions(spiele: Spiel[], displayNameMap: ReturnType<typeof createTeamDisplayNameMapFromGames>) {
  const optionsByValue = new Map<string, TeamFilterOption>();

  spiele.forEach((spiel) => {
    addTeamFilterOption(optionsByValue, spiel.team1, spiel.kategorie, displayNameMap);
    addTeamFilterOption(optionsByValue, spiel.team2, spiel.kategorie, displayNameMap);
  });

  return Array.from(optionsByValue.values()).sort((first, second) =>
    first.label.localeCompare(second.label, "de", { numeric: true, sensitivity: "base" })
  );
}

function getCategoryFilterOptions(spiele: Spiel[]) {
  const optionsByValue = new Map<string, TeamFilterOption>();

  spiele.forEach((spiel) => {
    const label = formatScheduleCategoryLabel(spiel.kategorie);
    optionsByValue.set(label, { value: label, label });
  });

  return Array.from(optionsByValue.values()).sort((first, second) =>
    first.label.localeCompare(second.label, "de", { numeric: true, sensitivity: "base" })
  );
}

function getKickoffFilterOptions(spiele: Spiel[]) {
  return Array.from(new Set(spiele.map((spiel) => spiel.zeit)))
    .sort((first, second) => timeToMinutes(first) - timeToMinutes(second))
    .map((zeit) => ({ value: zeit, label: `${zeit} Uhr` }));
}

function getOptionLabel(options: TeamFilterOption[], value: string, fallback: string) {
  return options.find((option) => option.value === value)?.label ?? fallback;
}

function getStatusFilterLabel(value: StatusFilter) {
  return statusFilterOptions.find((option) => option.value === value)?.label ?? value;
}

function getRefereeFilterLabel(value: RefereeFilter) {
  return refereeFilterOptions.find((option) => option.value === value)?.label ?? value;
}

function gameMatchesTeamFilter(
  spiel: Spiel,
  selectedTeam: string,
  displayNameMap: ReturnType<typeof createTeamDisplayNameMapFromGames>
) {
  if (selectedTeam === "alle") {
    return true;
  }

  return getTeamFilterValue(spiel.team1, spiel.kategorie, displayNameMap) === selectedTeam
    || getTeamFilterValue(spiel.team2, spiel.kategorie, displayNameMap) === selectedTeam;
}

function gameMatchesCategoryFilter(spiel: Spiel, selectedCategory: string) {
  return selectedCategory === "alle" || formatScheduleCategoryLabel(spiel.kategorie) === selectedCategory;
}

function gameMatchesStatusFilter(spiel: Spiel, selectedStatus: StatusFilter, nextGameIds: Set<string>) {
  if (selectedStatus === "alle") {
    return true;
  }

  const visualStatus = getVisualStatus(spiel, nextGameIds);

  if (selectedStatus === "live") {
    return visualStatus === "laufend" || visualStatus === "halbzeit";
  }

  return visualStatus === selectedStatus;
}

function gameMatchesRefereeFilter(spiel: Spiel, selectedReferee: RefereeFilter) {
  if (selectedReferee === "alle") {
    return true;
  }

  const hasReferee = Boolean(spiel.schiedsrichter?.trim());

  return selectedReferee === "zugeteilt" ? hasReferee : !hasReferee;
}

function addTeamFilterOption(
  optionsByValue: Map<string, TeamFilterOption>,
  teamName: string,
  category: string,
  displayNameMap: ReturnType<typeof createTeamDisplayNameMapFromGames>
) {
  const value = getTeamFilterValue(teamName, category, displayNameMap);

  if (!optionsByValue.has(value)) {
    optionsByValue.set(value, {
      value,
      label: getTeamFilterLabel(teamName, category, displayNameMap),
    });
  }
}

function getTeamFilterValue(
  teamName: string,
  category: string,
  displayNameMap: ReturnType<typeof createTeamDisplayNameMapFromGames>
) {
  return `${formatTeamDisplayName(teamName, displayNameMap)}::${formatScheduleCategoryLabel(category)}`;
}

function getTeamFilterLabel(
  teamName: string,
  category: string,
  displayNameMap: ReturnType<typeof createTeamDisplayNameMapFromGames>
) {
  return `${formatTeamDisplayName(teamName, displayNameMap)} · ${formatScheduleCategoryLabel(category)}`;
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
  const [selectedCategory, setSelectedCategory] = useState("alle");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("alle");
  const [selectedKickoff, setSelectedKickoff] = useState("alle");
  const [selectedReferee, setSelectedReferee] = useState<RefereeFilter>("alle");
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
  const activeDayGames = useMemo(
    () => (spielplanData ? spielplanData[activeDay].spiele : []),
    [activeDay, spielplanData]
  );
  const teamDisplayNames = useMemo(
    () => createTeamDisplayNameMapFromGames(allGames),
    [allGames]
  );
  const teamFilterOptions = useMemo(
    () => getTeamFilterOptions(allGames, teamDisplayNames),
    [allGames, teamDisplayNames]
  );
  const categoryFilterOptions = useMemo(
    () => getCategoryFilterOptions(allGames),
    [allGames]
  );
  const kickoffFilterOptions = useMemo(
    () => getKickoffFilterOptions(activeDayGames),
    [activeDayGames]
  );

  useEffect(() => {
    if (selectedTeam !== "alle" && !teamFilterOptions.some((team) => team.value === selectedTeam)) {
      setSelectedTeam("alle");
    }
  }, [selectedTeam, teamFilterOptions]);

  useEffect(() => {
    if (
      selectedField !== "alle"
      && spielplanData
      && !spielplanData.availableFields.includes(selectedField)
    ) {
      setSelectedField("alle");
    }
  }, [selectedField, spielplanData]);

  useEffect(() => {
    if (selectedCategory !== "alle" && !categoryFilterOptions.some((category) => category.value === selectedCategory)) {
      setSelectedCategory("alle");
    }
  }, [selectedCategory, categoryFilterOptions]);

  useEffect(() => {
    if (selectedKickoff !== "alle" && !kickoffFilterOptions.some((kickoff) => kickoff.value === selectedKickoff)) {
      setSelectedKickoff("alle");
    }
  }, [selectedKickoff, kickoffFilterOptions]);

  useEffect(() => {
    if (spielplanData?.schiedsrichterAnzeigeAktiv === false && selectedReferee !== "alle") {
      setSelectedReferee("alle");
    }
  }, [selectedReferee, spielplanData?.schiedsrichterAnzeigeAktiv]);

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

  const loadedSpielplanData = spielplanData;
  const currentDay = loadedSpielplanData[activeDay];
  const showRefereeFilter = loadedSpielplanData.schiedsrichterAnzeigeAktiv !== false;
  const gameMatchesVisibleFilters = (spiel: Spiel) => (
    (selectedField === "alle" || spiel.feld === selectedField)
    && gameMatchesTeamFilter(spiel, selectedTeam, teamDisplayNames)
    && gameMatchesCategoryFilter(spiel, selectedCategory)
    && gameMatchesStatusFilter(spiel, selectedStatus, nextGameIds)
    && (selectedKickoff === "alle" || spiel.zeit === selectedKickoff)
    && (!showRefereeFilter || gameMatchesRefereeFilter(spiel, selectedReferee))
  );
  const filteredSpiele = currentDay.spiele.filter(gameMatchesVisibleFilters);
  const teamFocusActive = selectedTeam !== "alle";
  const teamFocusSpiele = teamFocusActive
    ? allGames.filter(gameMatchesVisibleFilters).sort(compareGamesByDateTime)
    : [];
  const teamFocusLabel = teamFocusActive
    ? getOptionLabel(teamFilterOptions, selectedTeam, "Mannschaft")
    : "";
  const groupedSpiele = groupByTime(filteredSpiele);
  const timeSlots = Object.keys(groupedSpiele).sort();
  const dayBlocks = getBlocksForDay(spielplanData, currentDay);
  const timelineItems = buildTimelineItems(timeSlots, groupedSpiele, dayBlocks);
  const totalGames = allGames.length;
  const liveGames = allGames.filter((spiel) => ["laufend", "halbzeit"].includes(spiel.status)).length;
  const endedGames = allGames.filter((spiel) => spiel.status === "beendet").length;
  const currentDayFields = getFieldCount(currentDay.spiele);
  const currentDayCategories = getCategoryCount(currentDay.spiele);
  const summaryGames = teamFocusActive ? teamFocusSpiele.length : currentDay.spiele.length;
  const summaryFields = teamFocusActive ? getFieldCount(teamFocusSpiele) : currentDayFields;
  const summaryCategories = teamFocusActive ? getCategoryCount(teamFocusSpiele) : currentDayCategories;
  const noPublishedGames = !previewDraft && spielplanData.spielplanStatus && spielplanData.spielplanStatus !== "published";
  const activeFilterChips: ActiveFilterChip[] = [
    selectedField !== "alle"
      ? { key: "field", label: selectedField, onClear: () => setSelectedField("alle") }
      : null,
    selectedTeam !== "alle"
      ? {
          key: "team",
          label: getOptionLabel(teamFilterOptions, selectedTeam, "Mannschaft"),
          onClear: () => setSelectedTeam("alle"),
        }
      : null,
    selectedCategory !== "alle"
      ? {
          key: "category",
          label: getOptionLabel(categoryFilterOptions, selectedCategory, selectedCategory),
          onClear: () => setSelectedCategory("alle"),
        }
      : null,
    selectedStatus !== "alle"
      ? { key: "status", label: getStatusFilterLabel(selectedStatus), onClear: () => setSelectedStatus("alle") }
      : null,
    selectedKickoff !== "alle"
      ? { key: "kickoff", label: `${selectedKickoff} Uhr`, onClear: () => setSelectedKickoff("alle") }
      : null,
    showRefereeFilter && selectedReferee !== "alle"
      ? {
          key: "referee",
          label: getRefereeFilterLabel(selectedReferee),
          onClear: () => setSelectedReferee("alle"),
        }
      : null,
  ].filter((chip): chip is ActiveFilterChip => Boolean(chip));
  const activeFilterCount = activeFilterChips.length;
  const hasActiveFilters = activeFilterCount > 0;
  const filteredGameLabel = teamFocusActive
    ? `${teamFocusSpiele.length} Spiele der Mannschaft`
    : hasActiveFilters
      ? `${filteredSpiele.length} von ${currentDay.spiele.length} Spielen`
      : `${currentDay.spiele.length} Spiele`;
  const filterTriggerLabel = activeFilterCount > 0 ? `Filter (${activeFilterCount})` : "Filter";
  const filterSelectClass = "h-10 w-full rounded-md border-[#d9dec8] bg-white shadow-none transition hover:border-[#c9d1b7] focus:ring-[#8a9868]/20 [&>span]:truncate";
  const filterLabelClass = "mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground";

  function resetFilters() {
    setSelectedField("alle");
    setSelectedTeam("alle");
    setSelectedCategory("alle");
    setSelectedStatus("alle");
    setSelectedKickoff("alle");
    setSelectedReferee("alle");
  }

  function renderFilterControls(mode: "desktop" | "sheet") {
    return (
      <>
        <div className="min-w-0">
          <div className={filterLabelClass}>
            <MapPin className="size-3.5" />
            Feld
          </div>
          <Select value={selectedField} onValueChange={setSelectedField}>
            <SelectTrigger aria-label="Feld filtern" className={filterSelectClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Felder</SelectItem>
              {loadedSpielplanData.availableFields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn("min-w-0", mode === "desktop" && "sm:col-span-2 lg:col-span-1 xl:col-span-2")}>
          <div className={filterLabelClass}>
            <UserRound className="size-3.5" />
            Mannschaft
          </div>
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger aria-label="Mannschaft filtern" className={filterSelectClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-w-[min(92vw,32rem)]">
              <SelectItem value="alle">Alle Mannschaften</SelectItem>
              {teamFilterOptions.map((team) => (
                <SelectItem key={team.value} value={team.value} className="max-w-full truncate">
                  {team.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <div className={filterLabelClass}>
            <Trophy className="size-3.5" />
            Jugend
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger aria-label="Jugend filtern" className={filterSelectClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-w-[min(92vw,24rem)]">
              <SelectItem value="alle">Alle Jugenden</SelectItem>
              {categoryFilterOptions.map((category) => (
                <SelectItem key={category.value} value={category.value} className="max-w-full truncate">
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <div className={filterLabelClass}>
            <Filter className="size-3.5" />
            Status
          </div>
          <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as StatusFilter)}>
            <SelectTrigger aria-label="Status filtern" className={filterSelectClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusFilterOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <div className={filterLabelClass}>
            <Clock className="size-3.5" />
            Anpfiff
          </div>
          <Select value={selectedKickoff} onValueChange={setSelectedKickoff}>
            <SelectTrigger aria-label="Anpfiff filtern" className={filterSelectClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Zeiten</SelectItem>
              {kickoffFilterOptions.map((kickoff) => (
                <SelectItem key={kickoff.value} value={kickoff.value}>
                  {kickoff.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showRefereeFilter && (
          <div className="min-w-0">
            <div className={filterLabelClass}>
              <UserRound className="size-3.5" />
              Schiri
            </div>
            <Select value={selectedReferee} onValueChange={(value) => setSelectedReferee(value as RefereeFilter)}>
              <SelectTrigger aria-label="Schiedsrichter filtern" className={filterSelectClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {refereeFilterOptions.map((refereeOption) => (
                  <SelectItem key={refereeOption.value} value={refereeOption.value}>
                    {refereeOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbf8]">
      <section className="border-b border-[#e1e4d8] bg-[#f6f7f1]">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end lg:py-10">
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

            <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">
              Spielplan
            </h1>
            <div className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-4 sm:text-lg sm:leading-7">
              Begegnungen, Felder und Tagesstatus für das Handball-Turnier des SV Puschendorf.
            </div>

            <Link
              href="/kinderhandballkonzept.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex max-w-2xl items-center justify-between gap-4 rounded-lg border border-[#9ead75] bg-[#eef5dc] px-4 py-3 text-[#3f4a26] shadow-[0_0_0_1px_rgba(94,109,53,0.05),0_14px_34px_rgba(94,109,53,0.18)] transition hover:border-[#7f8e56] hover:bg-[#e8f1d2] sm:px-5"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#5e6d35] text-white shadow-[0_0_22px_rgba(94,109,53,0.35)]">
                  <FileText className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Leitlinien zum Kinderhandball</span>
                  <span className="mt-0.5 block truncate text-xs text-[#5e6d35]">
                    Kinderhandballkonzept als PDF öffnen
                  </span>
                </span>
              </span>
              <ArrowUpRight className="size-4 shrink-0" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-[8px] border border-[#d9dec8] bg-white p-2 shadow-sm">
            <div className="rounded-[6px] bg-[#f6f7f1] p-2 sm:p-3">
              <div className="text-xl font-semibold text-[#4f5d2f] sm:text-2xl">{totalGames}</div>
              <div className="mt-1 text-xs text-muted-foreground">Spiele</div>
            </div>
            <div className="rounded-[6px] bg-[#f6f7f1] p-2 sm:p-3">
              <div className="text-xl font-semibold text-[#4f5d2f] sm:text-2xl">{loadedSpielplanData.availableFields.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">Felder</div>
            </div>
            <div className="rounded-[6px] bg-[#f6f7f1] p-2 sm:p-3">
              <div className="text-xl font-semibold text-[#4f5d2f] sm:text-2xl">{liveGames || endedGames}</div>
              <div className="mt-1 text-xs text-muted-foreground">{liveGames ? "Live" : "Beendet"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
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

        <Card className="mb-5 gap-0 overflow-hidden rounded-lg border-[#d9dec8] bg-white py-0 shadow-sm">
          <CardHeader className="border-b border-[#edf0e4] px-3 py-3 sm:px-4 sm:py-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)] xl:items-center">
              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">
                    {teamFocusActive ? "Turniertage" : "Spieltag"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {teamFocusActive ? "alle Spiele der Mannschaft" : currentDay.zeit}
                  </div>
                </div>
                <Tabs
                  value={activeDay}
                  onValueChange={(value) => setActiveDay(value as DayKey)}
                  className="gap-0"
                >
                  <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg border border-[#e1e4d8] bg-[#f6f7f1] p-1">
                    {(["samstag", "sonntag"] as DayKey[]).map((dayKey) => {
                      const day = spielplanData[dayKey];

                      return (
                        <TabsTrigger
                          key={dayKey}
                          value={dayKey}
                          className="h-auto min-h-16 flex-col items-stretch justify-start rounded-md border-transparent px-3 py-2.5 text-left data-[state=active]:border-[#cdd5bd] data-[state=active]:bg-white data-[state=active]:text-[#4f5d2f] data-[state=active]:shadow-sm"
                        >
                          <span className="flex w-full items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
                              {dayLabels[dayKey]}
                            </span>
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {day.spiele.length} Spiele
                            </span>
                          </span>
                          <span className="mt-1 w-full truncate text-sm font-semibold text-foreground">
                            {day.datum}
                          </span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex min-w-0 flex-col gap-3 xl:items-end">
                <div className="flex w-full min-w-0 flex-wrap items-center gap-2 xl:justify-end">
                  <Badge variant="outline" className="h-9 gap-1.5 border-[#d9dec8] bg-[#fbfbf8] px-3 text-[#4f5d2f]">
                    <CalendarDays className="size-3.5" />
                    {filteredGameLabel}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetFilters}
                    disabled={!hasActiveFilters}
                    size="sm"
                    className="hidden border-[#cdd5bd] text-[#4f5d2f] md:inline-flex"
                  >
                    <X className="size-4" />
                    Filter zurücksetzen
                  </Button>
                </div>

                {activeFilterChips.length > 0 && (
                  <div className="flex w-full min-w-0 flex-wrap gap-2 xl:justify-end">
                    {activeFilterChips.map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={chip.onClear}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[#d9dec8] bg-[#f6f7f1] px-3 py-1.5 text-xs font-medium text-[#4f5d2f] transition hover:border-[#cdd5bd] hover:bg-white"
                        title={`${chip.label} entfernen`}
                      >
                        <span className="truncate">{chip.label}</span>
                        <X className="size-3.5 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="bg-[#fbfbf8]/70 px-3 py-3 sm:px-4 sm:py-4">
            <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
              {renderFilterControls("desktop")}
            </div>

            <div className="grid gap-2 md:hidden">
              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedField} onValueChange={setSelectedField}>
                  <SelectTrigger aria-label="Feld filtern" className={cn(filterSelectClass, "min-w-0")}>
                    <MapPin className="mr-1 size-3.5 text-[#6f7d48]" />
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

                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as StatusFilter)}>
                  <SelectTrigger aria-label="Status filtern" className={cn(filterSelectClass, "min-w-0")}>
                    <Filter className="mr-1 size-3.5 text-[#6f7d48]" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilterOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={cn("grid gap-2", hasActiveFilters ? "grid-cols-[minmax(0,1fr)_2.5rem]" : "grid-cols-1")}>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full min-w-0 border-[#cdd5bd] bg-white px-3 text-[#4f5d2f]"
                    >
                      <SlidersHorizontal className="size-4" />
                      {filterTriggerLabel}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-xl border-[#d9dec8] bg-[#fbfbf8] p-0">
                    <SheetHeader className="border-b border-[#e1e4d8] px-4 py-4 text-left">
                      <SheetTitle>Spielplan filtern</SheetTitle>
                      <SheetDescription>{filteredGameLabel}</SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-4 px-4 py-4">
                      {renderFilterControls("sheet")}
                    </div>
                    <SheetFooter className="border-t border-[#e1e4d8] bg-white px-4 py-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetFilters}
                        disabled={!hasActiveFilters}
                        className="border-[#cdd5bd] text-[#4f5d2f]"
                      >
                        <X className="size-4" />
                        Zurücksetzen
                      </Button>
                      <SheetClose asChild>
                        <Button type="button" className="bg-[#5e6d35] text-white hover:bg-[#4f5d2f]">
                          Spiele anzeigen
                        </Button>
                      </SheetClose>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>

                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={resetFilters}
                    aria-label="Filter zurücksetzen"
                    className="h-10 w-10 border-[#cdd5bd] bg-white text-[#4f5d2f]"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="min-w-0 rounded-[8px] border border-[#e1e4d8] bg-white p-3 sm:p-4">
            <div className="text-xs text-muted-foreground">{teamFocusActive ? "Mannschaft" : "Tag"}</div>
            <div className="mt-1 truncate text-sm font-semibold text-[#4f5d2f] sm:text-base">
              {teamFocusActive ? teamFocusLabel : `${summaryGames} Spiele`}
            </div>
          </div>
          <div className="min-w-0 rounded-[8px] border border-[#e1e4d8] bg-white p-3 sm:p-4">
            <div className="text-xs text-muted-foreground">{teamFocusActive ? "Spiele" : "Felder aktiv"}</div>
            <div className="mt-1 truncate text-sm font-semibold text-[#4f5d2f] sm:text-base">
              {teamFocusActive ? `${summaryGames} gesamt` : summaryFields}
            </div>
          </div>
          <div className="min-w-0 rounded-[8px] border border-[#e1e4d8] bg-white p-3 sm:p-4">
            <div className="text-xs text-muted-foreground">{teamFocusActive ? "Felder" : "Kategorien"}</div>
            <div className="mt-1 truncate text-sm font-semibold text-[#4f5d2f] sm:text-base">
              {teamFocusActive ? summaryFields : summaryCategories}
            </div>
          </div>
        </div>

        {teamFocusActive ? (
          teamFocusSpiele.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-[#cdd5bd] bg-white p-10 text-center">
              <CalendarDays className="mx-auto mb-4 size-8 text-[#8a9868]" />
              <div className="font-semibold">Keine Spiele gefunden</div>
              <div className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Für diese Mannschaft sind mit den aktuellen Filtern keine Spiele geplant.
              </div>
            </div>
          ) : (
            <Card className="gap-0 overflow-hidden rounded-lg border-[#d9dec8] bg-white py-0 shadow-sm">
              <CardHeader className="border-b border-[#edf0e4] px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">Mannschaftsübersicht</div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">{teamFocusLabel}</div>
                  </div>
                  <Badge variant="outline" className="w-fit gap-1.5 border-[#d9dec8] bg-[#fbfbf8] text-[#4f5d2f]">
                    <CalendarDays className="size-3.5" />
                    {teamFocusSpiele.length} Spiele
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="hidden border-b border-[#edf0e4] bg-[#fbfbf8] px-4 py-2 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground md:grid md:grid-cols-[132px_64px_minmax(0,1fr)_76px_80px_112px] md:gap-3">
                  <div>Tag</div>
                  <div>Zeit</div>
                  <div>Spiel</div>
                  <div>Feld</div>
                  <div>Ergebnis</div>
                  <div>Status</div>
                </div>

                {teamFocusSpiele.map((spiel) => {
                  const status = getVisualStatus(spiel, nextGameIds);
                  const statusMeta = getStatusMeta(status);
                  const StatusIcon = statusMeta.icon;
                  const selectedIsTeam1 = getTeamFilterValue(spiel.team1, spiel.kategorie, teamDisplayNames) === selectedTeam;
                  const selectedTeamName = formatTeamDisplayName(selectedIsTeam1 ? spiel.team1 : spiel.team2, teamDisplayNames);
                  const opponentName = formatTeamDisplayName(selectedIsTeam1 ? spiel.team2 : spiel.team1, teamDisplayNames);
                  const showScore = ["laufend", "halbzeit", "beendet"].includes(spiel.status);
                  const score = showScore ? getScoreForSelectedTeam(spiel, selectedIsTeam1) : null;
                  const dayLabel = getGameDayLabel(spiel, loadedSpielplanData);

                  return (
                    <article
                      key={spiel.id}
                      className="grid gap-2 border-b border-[#edf0e4] px-4 py-3 last:border-b-0 md:grid-cols-[132px_64px_minmax(0,1fr)_76px_80px_112px] md:items-center md:gap-3"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-2 md:block">
                        <div className="truncate text-xs text-muted-foreground md:text-sm">{dayLabel}</div>
                        <div className="shrink-0 text-sm font-semibold text-[#4f5d2f] md:hidden">{spiel.zeit} Uhr</div>
                      </div>

                      <div className="hidden text-sm font-semibold text-[#4f5d2f] md:block">{spiel.zeit}</div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground" title={selectedTeamName}>
                          {selectedTeamName}
                        </div>
                        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span className="min-w-0 truncate" title={opponentName}>gegen {opponentName}</span>
                          <span className="rounded-md bg-[#f6f7f1] px-1.5 py-0.5 text-[#4f5d2f]">
                            {formatScheduleCategoryLabel(spiel.kategorie)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-sm font-medium text-[#4f5d2f]">
                        <MapPin className="size-3.5" />
                        <span>{spiel.feld}</span>
                      </div>

                      <div className="font-mono text-base font-semibold text-[#4f5d2f] md:text-sm">
                        {score || "-"}
                      </div>

                      <Badge className={cn("w-fit gap-1.5", statusMeta.className)}>
                        <StatusIcon className="size-3" />
                        {statusMeta.label}
                      </Badge>
                    </article>
                  );
                })}
              </CardContent>
            </Card>
          )
        ) : timeSlots.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-[#cdd5bd] bg-white p-10 text-center">
            <CalendarDays className="mx-auto mb-4 size-8 text-[#8a9868]" />
            <div className="font-semibold">Keine Spiele gefunden</div>
            <div className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {!hasActiveFilters
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
                      <div className="inline-flex items-center gap-2 rounded-[8px] border border-[#d9dec8] bg-white px-3 py-2 shadow-sm md:sticky md:top-4 md:flex-col md:items-start">
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
                    <div className="inline-flex items-center gap-2 rounded-[8px] border border-[#d9dec8] bg-white px-3 py-2 shadow-sm md:sticky md:top-4 md:flex-col md:items-start">
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
                            "min-w-0 overflow-hidden rounded-[8px] border bg-white p-4 shadow-sm transition",
                            status === "laufend" ? "border-[#5e6d35] ring-2 ring-[#d9dec8]" : "border-[#e1e4d8]"
                          )}
                        >
                          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                            <Badge className={cn("min-w-0 max-w-full gap-1.5", statusMeta.className)}>
                              <StatusIcon className="size-3" />
                              <span className="truncate">{statusMeta.label}</span>
                            </Badge>
                            <Badge variant="outline" className="min-w-0 max-w-full gap-1 border-[#d9dec8] text-[#4f5d2f]">
                              <MapPin className="size-3" />
                              <span className="truncate">{spiel.feld}</span>
                            </Badge>
                          </div>

                          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(54px,62px)] sm:items-center">
                            <div className="min-w-0 max-w-full overflow-hidden">
                              <div
                                className="block max-w-full truncate whitespace-nowrap text-[11px] font-semibold leading-4 sm:text-xs"
                                title={team1}
                              >
                                {team1}
                              </div>
                              <div className="my-1 text-xs uppercase tracking-normal text-muted-foreground">gegen</div>
                              <div
                                className="block max-w-full truncate whitespace-nowrap text-[11px] font-semibold leading-4 sm:text-xs"
                                title={team2}
                              >
                                {team2}
                              </div>
                            </div>

                            <div className="min-w-0 rounded-[8px] border border-[#e1e4d8] bg-[#fbfbf8] px-1.5 py-2 text-center">
                              <div className="text-[11px] text-muted-foreground">Ergebnis</div>
                              <div className="mt-1 font-mono text-lg font-semibold text-[#4f5d2f]">
                                {score || "-"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 border-t border-[#eef0e8] pt-3 text-xs text-muted-foreground">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="min-w-0 max-w-full bg-[#f6f7f1] text-[#4f5d2f]">
                                <span className="truncate">{formatScheduleCategoryLabel(spiel.kategorie)}</span>
                              </Badge>
                              <span className="min-w-0 truncate">{currentDay.datum}</span>
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
