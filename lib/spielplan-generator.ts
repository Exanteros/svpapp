import {
  DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS,
  TEAM_CATEGORIES,
  normalizeFeldEinstellungen,
  resolveFeldEinstellungenForDate,
  resolveTournamentScheduleSettings,
  type FeldEinstellungen,
  type PartialTournamentScheduleSettings,
  type TournamentScheduleSettings,
} from './tournament';
import {
  createSpiel,
  deleteAllSpiele,
  getAdminSettings,
  getAllAnmeldungen,
  getStoredFeldEinstellungen,
} from './db';

interface AnmeldungTeamRow {
  kategorie: string;
  anzahl: number;
  spielstaerke?: string | null;
}

interface AnmeldungRow {
  verein: string;
  teams?: AnmeldungTeamRow[];
}

interface TeamEntry {
  name: string;
  club: string;
}

interface GeneratorSettings extends PartialTournamentScheduleSettings {
  anzahlFelder?: number;
}

interface GameRequest {
  datum: string;
  baseKategorie: string;
  kategorie: string;
  team1: string;
  team2: string;
  roundIndex: number;
  sameClub: boolean;
}

interface ScheduleSlot {
  datum: string;
  zeit: string;
  startMinutes: number;
  feld: FeldEinstellungen;
  used: boolean;
}

interface TeamScheduleEntry {
  datum: string;
  startMinutes: number;
  endMinutes: number;
}

export interface GeneratedSpiel {
  id: string;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  status: string;
}

export interface SpielplanGenerationParams {
  settings?: GeneratorSettings;
  feldEinstellungen?: unknown;
  replaceExisting?: boolean;
}

const PREFERRED_TEAM_REST_MINUTES = 2;

export function generateSpielplan(params: SpielplanGenerationParams = {}): GeneratedSpiel[] {
  const adminSettings = getAdminSettings();
  const settings = resolveTournamentScheduleSettings({
    ...adminSettings,
    ...params.settings,
  });
  const normalizedFields = normalizeFeldEinstellungen(params.feldEinstellungen ?? getStoredFeldEinstellungen());
  const fieldLimit = params.feldEinstellungen
    ? normalizedFields.length
    : getFieldLimit(params.settings?.anzahlFelder ?? adminSettings.anzahlFelder);
  const fieldSettings = normalizeFieldDates(
    normalizedFields.slice(0, fieldLimit),
    settings
  );
  const anmeldungen = getAllAnmeldungen() as AnmeldungRow[];
  const requests = interleaveRequests(createGameRequests(anmeldungen, settings));
  const slots = createScheduleSlots(fieldSettings, settings);
  const plannedGames = assignGamesToSlots(requests, slots);

  if (params.replaceExisting) {
    const createdGames = [];
    deleteAllSpiele();

    for (const game of plannedGames) {
      const id = createSpiel(game);
      createdGames.push({
        ...game,
        id: id.toString(),
        status: 'geplant',
      });
    }

    return createdGames;
  }

  return plannedGames.map((game) => {
    const id = createSpiel(game);

    return {
      ...game,
      id: id.toString(),
      status: 'geplant',
    };
  });
}

function createGameRequests(anmeldungen: AnmeldungRow[], settings: TournamentScheduleSettings) {
  const teamsByCategory = groupTeamsByCategory(anmeldungen);
  const requests: GameRequest[] = [];

  for (const [kategorie, niveauGroups] of Object.entries(teamsByCategory).sort(([a], [b]) => a.localeCompare(b, 'de'))) {
    for (const [niveau, teams] of Object.entries(niveauGroups).sort(([a], [b]) => a.localeCompare(b, 'de'))) {
      const sortedTeams = sortTeams(teams);

      if (sortedTeams.length < 2) {
        continue;
      }

      const datum = getDateForCategory(kategorie, settings);
      const kategorieLabel = `${kategorie} (${niveau})`;
      requests.push(...createRoundRobinRequests(sortedTeams, {
        datum,
        baseKategorie: kategorie,
        kategorie: kategorieLabel,
      }));
    }
  }

  return requests;
}

function groupTeamsByCategory(anmeldungen: AnmeldungRow[]) {
  const teamsByCategory: Record<string, Record<string, TeamEntry[]>> = {};

  for (const anmeldung of anmeldungen) {
    const club = anmeldung.verein?.trim();

    if (!club) {
      continue;
    }

    for (const team of anmeldung.teams ?? []) {
      const teamCount = Number(team.anzahl);

      if (!team.kategorie || !Number.isFinite(teamCount) || teamCount < 1) {
        continue;
      }

      const niveau = team.spielstaerke || 'Standard';
      teamsByCategory[team.kategorie] ??= {};
      teamsByCategory[team.kategorie][niveau] ??= [];

      for (let index = 0; index < Math.floor(teamCount); index++) {
        teamsByCategory[team.kategorie][niveau].push({
          name: `${club} ${team.kategorie} ${index + 1}`,
          club,
        });
      }
    }
  }

  return teamsByCategory;
}

function createRoundRobinRequests(
  teams: TeamEntry[],
  requestBase: Pick<GameRequest, 'datum' | 'baseKategorie' | 'kategorie'>
) {
  const externalRequests: GameRequest[] = [];
  const sameClubRequests: GameRequest[] = [];

  createRoundRobinRounds(teams).forEach((round, roundIndex) => {
    const roundRequests = round
      .map(([team1, team2]) => ({
        ...requestBase,
        team1: team1.name,
        team2: team2.name,
        roundIndex,
        sameClub: normalizeClubName(team1.club) === normalizeClubName(team2.club),
      }))
      .sort((a, b) => {
        if (a.sameClub !== b.sameClub) {
          return a.sameClub ? 1 : -1;
        }

        return `${a.team1}:${a.team2}`.localeCompare(`${b.team1}:${b.team2}`, 'de');
      });

    for (const request of roundRequests) {
      if (request.sameClub) {
        sameClubRequests.push(request);
      } else {
        externalRequests.push(request);
      }
    }
  });

  return [...externalRequests, ...sameClubRequests];
}

function createRoundRobinRounds(teams: TeamEntry[]) {
  const rotation: Array<TeamEntry | null> = [...teams];

  if (rotation.length % 2 === 1) {
    rotation.push(null);
  }

  const rounds: Array<Array<[TeamEntry, TeamEntry]>> = [];
  const roundCount = rotation.length - 1;
  const halfSize = rotation.length / 2;
  let current = rotation;

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex++) {
    const pairings: Array<[TeamEntry, TeamEntry]> = [];

    for (let index = 0; index < halfSize; index++) {
      const first = current[index];
      const second = current[current.length - 1 - index];

      if (!first || !second) {
        continue;
      }

      pairings.push(roundIndex % 2 === 0 ? [first, second] : [second, first]);
    }

    rounds.push(pairings);
    current = [current[0], current[current.length - 1], ...current.slice(1, -1)];
  }

  return rounds;
}

function sortTeams(teams: TeamEntry[]) {
  return [...teams].sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

function interleaveRequests(requests: GameRequest[]) {
  const groups = requests.reduce<Record<string, GameRequest[]>>((result, request) => {
    const key = `${request.datum}:${request.kategorie}`;
    result[key] ??= [];
    result[key].push(request);
    return result;
  }, {});
  const groupKeys = Object.keys(groups).sort();
  const interleaved: GameRequest[] = [];
  let hasRemaining = true;

  while (hasRemaining) {
    hasRemaining = false;

    for (const key of groupKeys) {
      const request = groups[key].shift();

      if (request) {
        interleaved.push(request);
        hasRemaining = true;
      }
    }
  }

  return interleaved;
}

function createScheduleSlots(fields: FeldEinstellungen[], settings: TournamentScheduleSettings) {
  const saturdayStart = parseTime(settings.samstagStartzeit, parseTime(DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.samstagStartzeit));
  const saturdayEnd = parseTime(settings.samstagEndzeit, parseTime(DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.samstagEndzeit));
  const sundayStart = parseTime(settings.sonntagStartzeit, parseTime(DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.sonntagStartzeit));
  const sundayEnd = parseTime(settings.sonntagEndzeit, parseTime(DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.sonntagEndzeit));
  const days = [
    { datum: settings.turnierStartDatum, start: saturdayStart, end: saturdayEnd },
    { datum: settings.turnierEndDatum, start: sundayStart, end: sundayEnd },
  ];
  const slots: ScheduleSlot[] = [];

  for (const feld of fields) {
    for (const day of days) {
      if (day.end <= day.start) {
        continue;
      }

      if (!fieldActiveOnDate(feld, day.datum)) {
        continue;
      }

      const fieldForDay = resolveFeldEinstellungenForDate(feld, day.datum);
      const duration = getSlotDuration(fieldForDay);

      for (let startMinutes = day.start; startMinutes + duration <= day.end; startMinutes += duration) {
        slots.push({
          datum: day.datum,
          zeit: formatMinutes(startMinutes),
          startMinutes,
          feld: fieldForDay,
          used: false,
        });
      }
    }
  }

  return slots.sort((a, b) => {
    if (a.datum !== b.datum) {
      return a.datum.localeCompare(b.datum);
    }

    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }

    return a.feld.name.localeCompare(b.feld.name, 'de');
  });
}

function assignGamesToSlots(requests: GameRequest[], slots: ScheduleSlot[]) {
  const plannedGames = [];
  const teamSchedule = new Map<string, TeamScheduleEntry[]>();

  for (const request of requests) {
    const slot = findBestSlot(request, slots, teamSchedule);

    if (!slot) {
      continue;
    }

    slot.used = true;
    rememberTeamGame(teamSchedule, request.team1, slot);
    rememberTeamGame(teamSchedule, request.team2, slot);
    plannedGames.push({
      datum: slot.datum,
      zeit: slot.zeit,
      feld: slot.feld.name,
      kategorie: request.kategorie,
      team1: request.team1,
      team2: request.team2,
    });
  }

  return plannedGames;
}

function findBestSlot(
  request: GameRequest,
  slots: ScheduleSlot[],
  teamSchedule: Map<string, TeamScheduleEntry[]>
) {
  const candidates = slots.filter((candidate) => (
    !candidate.used
    && candidate.datum === request.datum
    && categoryAllowedOnField(candidate.feld, request.baseKategorie, request.datum)
    && teamsCanPlayAt(candidate, request, teamSchedule, 0)
  ));

  return candidates.find((candidate) => teamsCanPlayAt(candidate, request, teamSchedule, PREFERRED_TEAM_REST_MINUTES))
    ?? candidates[0];
}

function teamsCanPlayAt(
  slot: ScheduleSlot,
  request: GameRequest,
  teamSchedule: Map<string, TeamScheduleEntry[]>,
  restMinutes: number
) {
  return [request.team1, request.team2].every((teamName) =>
    canTeamPlayAt(teamSchedule.get(teamName) || [], slot, restMinutes)
  );
}

function canTeamPlayAt(previousGames: TeamScheduleEntry[], slot: ScheduleSlot, restMinutes: number) {
  const startMinutes = slot.startMinutes;

  return previousGames
    .filter((game) => game.datum === slot.datum)
    .every((game) => startMinutes >= game.endMinutes + restMinutes);
}

function rememberTeamGame(
  teamSchedule: Map<string, TeamScheduleEntry[]>,
  teamName: string,
  slot: ScheduleSlot
) {
  const current = teamSchedule.get(teamName) || [];
  current.push({
    datum: slot.datum,
    startMinutes: slot.startMinutes,
    endMinutes: slot.startMinutes + getGameDuration(slot.feld),
  });
  teamSchedule.set(teamName, current);
}

function getDateForCategory(categoryName: string, settings: TournamentScheduleSettings) {
  const category = TEAM_CATEGORIES.find((candidate) => candidate.name === categoryName);

  if (category?.day === 'Samstag') {
    return settings.turnierStartDatum;
  }

  if (category?.day === 'Sonntag') {
    return settings.turnierEndDatum;
  }

  return categoryName.includes('Mini') || categoryName.includes('E-Jugend')
    ? settings.turnierStartDatum
    : settings.turnierEndDatum;
}

function categoryAllowedOnField(feld: FeldEinstellungen, categoryName: string, datum: string) {
  if (!fieldActiveOnDate(feld, datum)) {
    return false;
  }

  const allowedForDay = feld.erlaubteJahrgaengeProTag?.[datum];

  if (allowedForDay && allowedForDay.length > 0) {
    return categoryMatchesAllowedList(categoryName, allowedForDay);
  }

  if (!feld.erlaubteJahrgaenge || feld.erlaubteJahrgaenge.length === 0) {
    return true;
  }

  return categoryMatchesAllowedList(categoryName, feld.erlaubteJahrgaenge);
}

function categoryMatchesAllowedList(categoryName: string, allowedCategories: string[]) {
  if (categoryName.includes('Mini')) {
    return allowedCategories.some((allowedCategory) => allowedCategory.includes('Mini'));
  }

  if (categoryName === 'E-Jugend') {
    return allowedCategories.some((allowedCategory) => allowedCategory.includes('E-Jugend'));
  }

  return allowedCategories.includes(categoryName);
}

function normalizeFieldDates(fields: FeldEinstellungen[], settings: TournamentScheduleSettings) {
  return fields.map((feld) => {
    const erlaubteJahrgaengeProTag = Object.entries(feld.erlaubteJahrgaengeProTag ?? {}).reduce<Record<string, string[]>>(
      (result, [datum, jahrgaenge]) => {
        const normalizedDatum = normalizeTournamentDateKey(datum, settings);
        result[normalizedDatum] ??= [];
        result[normalizedDatum].push(...jahrgaenge);
        result[normalizedDatum] = Array.from(new Set(result[normalizedDatum]));
        return result;
      },
      {}
    );
    const aktiveTage = Object.entries(feld.aktiveTage ?? {}).reduce<Record<string, boolean>>(
      (result, [datum, active]) => {
        const normalizedDatum = normalizeTournamentDateKey(datum, settings);
        result[normalizedDatum] = active !== false;
        return result;
      },
      {}
    );
    const einstellungenProTag = Object.entries(feld.einstellungenProTag ?? {}).reduce<NonNullable<FeldEinstellungen['einstellungenProTag']>>(
      (result, [datum, daySettings]) => {
        const normalizedDatum = normalizeTournamentDateKey(datum, settings);
        result[normalizedDatum] = daySettings;
        return result;
      },
      {}
    );

    return {
      ...feld,
      erlaubteJahrgaengeProTag,
      aktiveTage,
      einstellungenProTag,
    };
  });
}

function fieldActiveOnDate(feld: FeldEinstellungen, datum: string) {
  return feld.aktiveTage?.[datum] !== false;
}

function normalizeTournamentDateKey(datum: string, settings: TournamentScheduleSettings) {
  if (datum === DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.turnierStartDatum) {
    return settings.turnierStartDatum;
  }

  if (datum === DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.turnierEndDatum) {
    return settings.turnierEndDatum;
  }

  return datum;
}

function parseTime(time: string, fallback = 0) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);

  if (!match) {
    return fallback;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return fallback;
  }

  return hours * 60 + minutes;
}

function formatMinutes(minutesFromMidnight: number) {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function getSlotDuration(feld: FeldEinstellungen) {
  return getGameDuration(feld) + Math.max(0, feld.pausenzeit);
}

function getGameDuration(feld: FeldEinstellungen) {
  return Math.max(1, feld.spielzeit + (feld.zweiHalbzeiten ? feld.halbzeitpause : 0));
}

function normalizeClubName(club: string) {
  return club.trim().toLowerCase();
}

function getFieldLimit(value: unknown) {
  const fieldLimit = Number(value);

  if (!Number.isFinite(fieldLimit) || fieldLimit < 1) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor(fieldLimit);
}
