import Link from "next/link";
import { BarChart3, CalendarDays, Clock, ListOrdered, MapPin, Medal, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SpielplanLiveRefresh } from "@/components/SpielplanLiveRefresh";
import { areScoresPublicForDate, formatScheduleCategoryLabel } from "@/lib/tournament";

export const dynamic = "force-dynamic";

interface RawSpiel {
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
}

interface ErgebnisSpiel extends RawSpiel {
  displayKategorie: string;
  score1: number;
  score2: number;
  ergebnis: string;
}

interface TeamStanding {
  name: string;
  spiele: number;
  siege: number;
  unentschieden: number;
  niederlagen: number;
  torePlus: number;
  toreMinus: number;
  punkte: number;
}

interface KategorieStanding {
  kategorie: string;
  displayKategorie: string;
  teams: TeamStanding[];
}

interface KategorieGoalSummary {
  kategorie: string;
  spiele: number;
  tore: number;
}

interface GoalSummary {
  totalGoals: number;
  averageGoals: number;
  categories: KategorieGoalSummary[];
}

interface ErgebnisseData {
  letzteSpiele: ErgebnisSpiel[];
  tabellen: KategorieStanding[];
  goalSummary: GoalSummary;
  rankingsEnabled: boolean;
  updatedAt: string;
}

function parseScore(spiel: RawSpiel) {
  if (typeof spiel.tore_team1 === "number" && typeof spiel.tore_team2 === "number") {
    return [spiel.tore_team1, spiel.tore_team2] as const;
  }

  const match = spiel.ergebnis?.match(/^\s*(\d+)\s*:\s*(\d+)\s*$/);
  if (!match) {
    return null;
  }

  return [Number(match[1]), Number(match[2])] as const;
}

function normalizeResults(spiele: RawSpiel[], settings: Record<string, unknown>) {
  return spiele.reduce<ErgebnisSpiel[]>((result, spiel) => {
    if (spiel.status !== "beendet" || !areScoresPublicForDate(settings, spiel.datum)) {
      return result;
    }

    const score = parseScore(spiel);
    if (!score) {
      return result;
    }

    result.push({
      ...spiel,
      displayKategorie: formatScheduleCategoryLabel(spiel.kategorie),
      score1: score[0],
      score2: score[1],
      ergebnis: `${score[0]}:${score[1]}`,
    });

    return result;
  }, []);
}

function getStandingTeam(teams: Map<string, TeamStanding>, teamName: string) {
  const existingTeam = teams.get(teamName);

  if (existingTeam) {
    return existingTeam;
  }

  const newTeam: TeamStanding = {
    name: teamName,
    spiele: 0,
    siege: 0,
    unentschieden: 0,
    niederlagen: 0,
    torePlus: 0,
    toreMinus: 0,
    punkte: 0,
  };

  teams.set(teamName, newTeam);
  return newTeam;
}

function applyStandingResult(team: TeamStanding, goalsFor: number, goalsAgainst: number) {
  team.spiele += 1;
  team.torePlus += goalsFor;
  team.toreMinus += goalsAgainst;

  if (goalsFor > goalsAgainst) {
    team.siege += 1;
    team.punkte += 2;
    return;
  }

  if (goalsFor === goalsAgainst) {
    team.unentschieden += 1;
    team.punkte += 1;
    return;
  }

  team.niederlagen += 1;
}

function buildStandings(spiele: ErgebnisSpiel[]) {
  const categories = new Map<string, Map<string, TeamStanding>>();

  spiele.forEach((spiel) => {
    const teams = categories.get(spiel.kategorie) ?? new Map<string, TeamStanding>();
    categories.set(spiel.kategorie, teams);

    const team1 = getStandingTeam(teams, spiel.team1);
    const team2 = getStandingTeam(teams, spiel.team2);

    applyStandingResult(team1, spiel.score1, spiel.score2);
    applyStandingResult(team2, spiel.score2, spiel.score1);
  });

  return Array.from(categories.entries())
    .map(([kategorie, teams]) => ({
      kategorie,
      displayKategorie: formatScheduleCategoryLabel(kategorie),
      teams: Array.from(teams.values()).sort((a, b) => {
        const diffA = a.torePlus - a.toreMinus;
        const diffB = b.torePlus - b.toreMinus;

        return (
          b.punkte - a.punkte ||
          diffB - diffA ||
          b.torePlus - a.torePlus ||
          a.name.localeCompare(b.name, "de-DE")
        );
      }),
    }))
    .sort((a, b) => a.displayKategorie.localeCompare(b.displayKategorie, "de-DE"));
}

function buildGoalSummary(spiele: ErgebnisSpiel[]): GoalSummary {
  const categories = new Map<string, KategorieGoalSummary>();
  let totalGoals = 0;

  spiele.forEach((spiel) => {
    const goals = spiel.score1 + spiel.score2;
    totalGoals += goals;

    const entry = categories.get(spiel.displayKategorie) ?? {
      kategorie: spiel.displayKategorie,
      spiele: 0,
      tore: 0,
    };

    entry.spiele += 1;
    entry.tore += goals;
    categories.set(spiel.displayKategorie, entry);
  });

  return {
    totalGoals,
    averageGoals: spiele.length > 0 ? totalGoals / spiele.length : 0,
    categories: Array.from(categories.values()).sort((a, b) => a.kategorie.localeCompare(b.kategorie, "de-DE")),
  };
}

function formatDate(dateString: string) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/\u00e4/g, "ae")
    .replace(/\u00f6/g, "oe")
    .replace(/\u00fc/g, "ue")
    .replace(/\u00df/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function getErgebnisse(): Promise<ErgebnisseData> {
  try {
    const { getAdminSettings, getDatabase } = await import("@/lib/db");
    const db = getDatabase();
    const settings = getAdminSettings();
    const spiele = db.prepare(`
      SELECT
        *,
        CASE
          WHEN tore_team1 IS NOT NULL AND tore_team2 IS NOT NULL
          THEN tore_team1 || ':' || tore_team2
          ELSE ergebnis
        END as ergebnis
      FROM spiele
      ORDER BY datum DESC, zeit DESC, feld
    `).all() as RawSpiel[];
    const letzteSpiele = normalizeResults(spiele, settings);
    const rankingsEnabled = settings.ergebnisTabellenAktiv === true;

    return {
      letzteSpiele,
      tabellen: rankingsEnabled ? buildStandings(letzteSpiele) : [],
      goalSummary: buildGoalSummary(letzteSpiele),
      rankingsEnabled,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching ergebnisse:", error);
    return {
      letzteSpiele: [],
      tabellen: [],
      goalSummary: {
        totalGoals: 0,
        averageGoals: 0,
        categories: [],
      },
      rankingsEnabled: false,
      updatedAt: new Date().toISOString(),
    };
  }
}

export default async function ErgebnissePage() {
  const ergebnisseData = await getErgebnisse();
  const visibleGames = ergebnisseData.letzteSpiele;
  const goalSummary = ergebnisseData.goalSummary;
  const categoryCount = goalSummary.categories.length;
  const averageGoals = goalSummary.averageGoals.toLocaleString("de-DE", {
    maximumFractionDigits: 1,
  });

  return (
    <div className="min-h-screen bg-[#fbfbf8]">
      <SpielplanLiveRefresh />
      <section className="border-b border-[#e1e4d8] bg-[#f6f7f1]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end lg:py-10">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1.5 border-[#d9dec8] bg-white/80 text-[#4f5d2f]">
                <Trophy className="size-3.5" />
                Ergebnisse
              </Badge>
              <Badge variant="outline" className="gap-1.5 border-[#d9dec8] bg-white/80 text-[#4f5d2f]">
                <Clock className="size-3.5" />
                {new Date(ergebnisseData.updatedAt).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                Uhr
              </Badge>
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">
              Ergebnisse
            </h1>
            <div className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Abgeschlossene Spiele, Resultate und Torübersicht nach Kategorie.
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-[8px] border border-[#d9dec8] bg-white p-2 shadow-sm">
            <div className="rounded-[6px] bg-[#f6f7f1] p-3">
              <div className="text-2xl font-semibold text-[#4f5d2f]">{visibleGames.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">Spiele</div>
            </div>
            <div className="rounded-[6px] bg-[#f6f7f1] p-3">
              <div className="text-2xl font-semibold text-[#4f5d2f]">{goalSummary.totalGoals}</div>
              <div className="mt-1 text-xs text-muted-foreground">Tore</div>
            </div>
            <div className="rounded-[6px] bg-[#f6f7f1] p-3">
              <div className="text-2xl font-semibold text-[#4f5d2f]">{categoryCount}</div>
              <div className="mt-1 text-xs text-muted-foreground">Kategorien</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="border-0 p-0 text-2xl font-semibold tracking-normal">Aktuelle Resultate</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              Letzte Aktualisierung: {new Date(ergebnisseData.updatedAt).toLocaleString("de-DE")}
            </div>
          </div>
          <Button asChild variant="outline" className="border-[#cdd5bd] text-[#4f5d2f]">
            <Link href="/spielplan">
              <CalendarDays className="size-4" />
              Spielplan ansehen
            </Link>
          </Button>
        </div>

        {visibleGames.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-[#cdd5bd] bg-white p-10 text-center">
            <Trophy className="mx-auto mb-4 size-8 text-[#8a9868]" />
            <div className="font-semibold">Noch keine Ergebnisse</div>
            <div className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Ergebnisse erscheinen hier, sobald Resultate vorliegen.
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleGames.slice(0, 12).map((spiel) => (
              <article key={spiel.id} className="rounded-[8px] border border-[#e1e4d8] bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="secondary" className="bg-[#f6f7f1] text-[#4f5d2f]">
                    {spiel.displayKategorie}
                  </Badge>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {formatDate(spiel.datum)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {spiel.zeit}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {spiel.feld}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_86px] sm:items-center">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">{spiel.team1}</div>
                    <div className="my-1 text-xs uppercase tracking-normal text-muted-foreground">gegen</div>
                    <div className="truncate text-base font-semibold">{spiel.team2}</div>
                  </div>

                  <div className="rounded-[8px] border border-[#d9dec8] bg-[#f6f7f1] px-3 py-3 text-center">
                    <div className="text-[11px] text-muted-foreground">Endstand</div>
                    <div className="mt-1 font-mono text-2xl font-semibold text-[#4f5d2f]">{spiel.ergebnis}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!ergebnisseData.rankingsEnabled && visibleGames.length > 0 && (
          <section className="mt-10">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="border-0 p-0 text-2xl font-semibold tracking-normal">Torübersicht</h2>
                <div className="mt-1 text-sm text-muted-foreground">
                  Ohne Platzierungen, nur geworfene Tore und gespielte Partien.
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[8px] border border-[#e1e4d8] bg-white p-4 shadow-sm">
                <div className="text-sm text-muted-foreground">Geworfene Tore</div>
                <div className="mt-2 text-3xl font-semibold text-[#4f5d2f]">{goalSummary.totalGoals}</div>
              </div>
              <div className="rounded-[8px] border border-[#e1e4d8] bg-white p-4 shadow-sm">
                <div className="text-sm text-muted-foreground">Tore pro Spiel</div>
                <div className="mt-2 text-3xl font-semibold text-[#4f5d2f]">{averageGoals}</div>
              </div>
              <div className="rounded-[8px] border border-[#e1e4d8] bg-white p-4 shadow-sm">
                <div className="text-sm text-muted-foreground">Kategorien mit Resultaten</div>
                <div className="mt-2 text-3xl font-semibold text-[#4f5d2f]">{categoryCount}</div>
              </div>
            </div>

            {goalSummary.categories.length > 0 && (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {goalSummary.categories.map((category) => (
                  <article key={category.kategorie} className="rounded-[8px] border border-[#e1e4d8] bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 font-semibold">{category.kategorie}</div>
                      <Badge variant="outline" className="border-[#d9dec8] bg-[#f6f7f1] text-[#4f5d2f]">
                        {category.spiele} {category.spiele === 1 ? "Spiel" : "Spiele"}
                      </Badge>
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-[#4f5d2f]">{category.tore} Tore</div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {ergebnisseData.rankingsEnabled && ergebnisseData.tabellen.length > 0 && (
          <section className="mt-10">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="border-0 p-0 text-2xl font-semibold tracking-normal">Tabellen</h2>
                <div className="mt-1 text-sm text-muted-foreground">Sortiert nach Punkten, Tordifferenz und Toren.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {ergebnisseData.tabellen.map((gruppe) => (
                  <a
                    key={gruppe.kategorie}
                    href={`#${slugify(gruppe.kategorie)}`}
                    className="inline-flex min-h-8 items-center rounded-md border border-[#d9dec8] bg-white px-3 text-xs font-medium text-[#4f5d2f] transition hover:bg-[#f6f7f1]"
                  >
                    {gruppe.displayKategorie}
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              {ergebnisseData.tabellen.map((gruppe) => (
                <section
                  key={gruppe.kategorie}
                  id={slugify(gruppe.kategorie)}
                  className="scroll-mt-6 overflow-hidden rounded-[8px] border border-[#e1e4d8] bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-2 border-b border-[#eef0e8] bg-[#f6f7f1] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <ListOrdered className="size-4 text-[#4f5d2f]" />
                      <h3 className="text-base font-semibold tracking-normal">{gruppe.displayKategorie}</h3>
                    </div>
                    <Badge variant="outline" className="border-[#d9dec8] bg-white text-[#4f5d2f]">
                      {gruppe.teams.length} Teams
                    </Badge>
                  </div>

                  <div className="divide-y divide-[#eef0e8]">
                    {gruppe.teams.map((team, index) => {
                      const difference = team.torePlus - team.toreMinus;

                      return (
                        <div
                          key={team.name}
                          className="grid gap-3 px-4 py-4 sm:grid-cols-[42px_minmax(0,1fr)_88px] sm:items-center"
                        >
                          <div className="flex items-center gap-2 sm:block">
                            <div className="flex size-9 items-center justify-center rounded-[8px] border border-[#d9dec8] bg-[#fbfbf8] font-semibold text-[#4f5d2f]">
                              {index + 1}
                            </div>
                            {index === 0 && <Medal className="size-4 text-[#4f5d2f] sm:mt-2" />}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate font-semibold">{team.name}</div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>{team.spiele} Sp</span>
                              <span>{team.siege} S</span>
                              <span>{team.unentschieden} U</span>
                              <span>{team.niederlagen} N</span>
                              <span>
                                {team.torePlus}:{team.toreMinus} Tore
                              </span>
                              <span>{difference >= 0 ? `+${difference}` : difference}</span>
                            </div>
                          </div>

                          <div className="rounded-[8px] border border-[#d9dec8] bg-[#f6f7f1] px-3 py-2 text-left sm:text-center">
                            <div className="text-[11px] text-muted-foreground">Punkte</div>
                            <div className="mt-1 text-xl font-semibold text-[#4f5d2f]">{team.punkte}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </section>
        )}

        {visibleGames.length > 12 && (
          <div className="mt-8 rounded-[8px] border border-[#d9dec8] bg-white p-4 text-sm text-muted-foreground">
            <BarChart3 className="mr-2 inline size-4 text-[#4f5d2f]" />
            {ergebnisseData.rankingsEnabled
              ? "Es werden die 12 neuesten Ergebnisse gezeigt. Alle gezeigten Spiele fließen in die Tabellen ein."
              : "Es werden die 12 neuesten Ergebnisse gezeigt. Alle gezeigten Spiele fließen in die Torübersicht ein."}
          </div>
        )}
      </section>
    </div>
  );
}
