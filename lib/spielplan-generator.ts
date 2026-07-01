import {
  DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS,
  TEAM_CATEGORIES,
  formatTeamDisplayName,
  getTeamDisplayKey,
  getSpielzeitRegelForKategorie,
  normalizeFeldEinstellungen,
  normalizeSpielplanZeitbloecke,
  resolveFeldEinstellungenForDate,
  resolveTournamentScheduleSettings,
  type FeldEinstellungen,
  type FeldTagesEinstellungen,
  type PartialTournamentScheduleSettings,
  type SpielplanZeitblock,
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
  schiri?: boolean | number | null;
  schiriName?: string | null;
  schiri_name?: string | null;
  spielstaerke?: string | null;
}

interface AnmeldungRow {
  verein: string;
  teams?: AnmeldungTeamRow[];
}

interface TeamEntry {
  name: string;
  club: string;
  kategorie: string;
  eJugendGender: EJugendGender | null;
}

interface GeneratorSettings extends PartialTournamentScheduleSettings {
  anzahlFelder?: number;
  spielzeitenAutomatisch?: boolean;
  spielplanZeitbloecke?: SpielplanZeitblock[];
}

interface GameRequest {
  datum: string;
  baseKategorie: string;
  kategorie: string;
  fieldGroup: string;
  timing?: FeldTagesEinstellungen;
  timeWindow?: RequestTimeWindow;
  team1: string;
  team2: string;
  roundIndex: number;
  sameClub: boolean;
}

interface RequestTimeWindow {
  startMinutes: number;
  endMinutes: number;
}

interface ScheduleSlot {
  datum: string;
  zeit: string;
  startMinutes: number;
  dayEndMinutes: number;
  feld: FeldEinstellungen;
  used: boolean;
}

interface TeamScheduleEntry {
  datum: string;
  startMinutes: number;
  endMinutes: number;
  feld: string;
}

interface RefereeProvider {
  label: string;
  key: string;
  crewCount: number;
  isSvp: boolean;
  matchKeys: string[];
}

interface PlannedGameWindow {
  datum: string;
  startMinutes: number;
  endMinutes: number;
}

type PlannedSpiel = Omit<GeneratedSpiel, 'id' | 'status'>;
type EJugendGender = 'gemischt' | 'maennlich' | 'weiblich';

export interface GeneratedSpiel {
  id: string;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  schiedsrichter?: string | null;
  status: string;
}

export interface SpielplanGenerationParams {
  settings?: GeneratorSettings;
  feldEinstellungen?: unknown;
  replaceExisting?: boolean;
}

export interface SpielzeitOptimierung {
  datum: string;
  spielzeit: number;
  pausenzeit: number;
  spiele: number;
  ausgelasseneSpiele: number;
  aktiveFelder: number;
  slots: number;
  regelText?: string;
}

export interface OptimizedSpielzeitenResult {
  feldEinstellungen: FeldEinstellungen[];
  optimierung: SpielzeitOptimierung[];
}

export class SpielplanGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpielplanGenerationError';
  }
}

export function generateSpielplan(params: SpielplanGenerationParams = {}): GeneratedSpiel[] {
  const adminSettings = getAdminSettings();
  const mergedSettings = {
    ...adminSettings,
    ...params.settings,
  };
  const settings = resolveTournamentScheduleSettings(mergedSettings);
  const zeitbloecke = normalizeSpielplanZeitbloecke(mergedSettings.spielplanZeitbloecke, settings);
  const normalizedFields = normalizeFeldEinstellungen(params.feldEinstellungen ?? getStoredFeldEinstellungen());
  const fieldLimit = params.feldEinstellungen
    ? normalizedFields.length
    : getFieldLimit(params.settings?.anzahlFelder ?? adminSettings.anzahlFelder);
  const fieldSettings = normalizeFieldDates(
    normalizedFields.slice(0, fieldLimit),
    settings
  );
  const anmeldungen = getAllAnmeldungen() as AnmeldungRow[];
  const autoSpielzeiten = mergedSettings.spielzeitenAutomatisch !== false;
  const requests = interleaveRequests(createGameRequests(anmeldungen, settings, {
    useCategoryTimings: autoSpielzeiten,
    zeitbloecke,
  }));
  const slots = createScheduleSlots(fieldSettings, settings);
  const plannedGames = assignRefereesToGames(assignGamesToSlots(requests, slots, {
    allowUnplanned: autoSpielzeiten,
  }), anmeldungen);

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

export function optimizeSpielzeitenForSchedule(params: SpielplanGenerationParams = {}): OptimizedSpielzeitenResult {
  const adminSettings = getAdminSettings();
  const mergedSettings = {
    ...adminSettings,
    ...params.settings,
  };
  const settings = resolveTournamentScheduleSettings(mergedSettings);
  const zeitbloecke = normalizeSpielplanZeitbloecke(mergedSettings.spielplanZeitbloecke, settings);
  const normalizedFields = normalizeFeldEinstellungen(params.feldEinstellungen ?? getStoredFeldEinstellungen());
  const fieldLimit = params.feldEinstellungen
    ? normalizedFields.length
    : getFieldLimit(params.settings?.anzahlFelder ?? adminSettings.anzahlFelder);
  const optimizedFields: FeldEinstellungen[] = cloneFeldEinstellungen(normalizeFieldDates(
    normalizedFields.slice(0, fieldLimit),
    settings
  ));
  const anmeldungen = getAllAnmeldungen() as AnmeldungRow[];
  const requests = interleaveRequests(createGameRequests(anmeldungen, settings, {
    useCategoryTimings: true,
    zeitbloecke,
  }));
  const days = [settings.turnierStartDatum, settings.turnierEndDatum];
  const optimierung: SpielzeitOptimierung[] = [];

  for (const datum of days) {
    const dayRequests = requests.filter((request) => request.datum === datum);
    const activeFields = optimizedFields.filter((feld) => fieldActiveOnDate(feld, datum));

    if (dayRequests.length === 0) {
      continue;
    }

    if (activeFields.length === 0) {
      throw new SpielplanGenerationError(createAutoSpielzeitMessage(datum, dayRequests.length, activeFields.length));
    }

    const slots = createScheduleSlots(optimizedFields, settings).filter((slot) => slot.datum === datum);
    const result = assignGamesToSlotsResult(dayRequests, slots);
    const summaryTiming = getDaySummaryTiming(datum, settings);

    optimierung.push({
      datum,
      spielzeit: summaryTiming.spielzeit,
      pausenzeit: summaryTiming.pausenzeit,
      spiele: result.plannedGames.length,
      ausgelasseneSpiele: result.unplannedRequests.length,
      aktiveFelder: activeFields.length,
      slots: result.plannedGames.length,
      regelText: getDayTimingRuleText(datum, zeitbloecke),
    });
  }

  return {
    feldEinstellungen: optimizedFields,
    optimierung,
  };
}

function createAutoSpielzeitMessage(datum: string, spiele: number, aktiveFelder: number) {
  return `Für ${datum} konnte kein automatischer Spielplan erstellt werden. ${spiele} Spiel(e), ${aktiveFelder} aktive Feld(er). Bitte Turnierzeit verlängern oder mehr Felder aktivieren.`;
}

function cloneFeldEinstellungen(fields: FeldEinstellungen[]) {
  return fields.map((feld) => ({
    ...feld,
    erlaubteJahrgaenge: [...(feld.erlaubteJahrgaenge || [])],
    erlaubteJahrgaengeProTag: cloneStringArrayRecord(feld.erlaubteJahrgaengeProTag),
    aktiveTage: { ...(feld.aktiveTage || {}) },
    einstellungenProTag: Object.entries(feld.einstellungenProTag || {}).reduce<NonNullable<FeldEinstellungen['einstellungenProTag']>>(
      (result, [datum, settings]) => {
        result[datum] = { ...settings };
        return result;
      },
      {}
    ),
  }));
}

function cloneStringArrayRecord(record: Record<string, string[]> | undefined) {
  return Object.entries(record || {}).reduce<Record<string, string[]>>((result, [key, values]) => {
    result[key] = [...values];
    return result;
  }, {});
}

function createGameRequests(
  anmeldungen: AnmeldungRow[],
  settings: TournamentScheduleSettings,
  options: { useCategoryTimings?: boolean; zeitbloecke?: SpielplanZeitblock[] } = {}
) {
  const teamsByCategory = groupTeamsByCategory(anmeldungen);
  const requests: GameRequest[] = [];

  for (const [kategorie, niveauGroups] of Object.entries(teamsByCategory).sort(([a], [b]) => a.localeCompare(b, 'de'))) {
    for (const [niveau, teams] of Object.entries(niveauGroups).sort(([a], [b]) => a.localeCompare(b, 'de'))) {
      const sortedTeams = sortTeams(teams);

      if (sortedTeams.length < 2) {
        continue;
      }

      const datum = getDateForCategory(kategorie, settings);
      const requestBase = {
        datum,
        baseKategorie: kategorie,
        kategorie: createScheduleCategoryLabel(kategorie, niveau),
        fieldGroup: `${datum}:${kategorie}:${niveau}`,
        timing: options.useCategoryTimings ? getSpielzeitRegelForKategorie(kategorie) : undefined,
        timeWindow: getTimeWindowForCategory(kategorie, datum, options.zeitbloecke || []),
      };
      const categoryRequests = createRoundRobinRequests(sortedTeams, requestBase);
      requests.push(...expandRequestsForCategoryFill(categoryRequests, sortedTeams, kategorie, requestBase));
    }
  }

  return requests;
}

function expandRequestsForCategoryFill(
  requests: GameRequest[],
  teams: TeamEntry[],
  kategorie: string,
  requestBase: Pick<GameRequest, 'timing' | 'timeWindow'>
) {
  if (!isMiniCategory(kategorie) || requests.length === 0 || teams.length < 2) {
    return requests;
  }

  const cycles = getMiniRepeatCycleCount(requests, kategorie, requestBase);
  const expandedRequests: GameRequest[] = [];

  for (let cycle = 0; cycle < cycles; cycle += 1) {
    expandedRequests.push(...requests.map((request) => ({
      ...request,
      roundIndex: request.roundIndex + cycle * 1000,
    })));
  }

  return expandedRequests;
}

function getMiniRepeatCycleCount(
  requests: GameRequest[],
  kategorie: string,
  requestBase: Pick<GameRequest, 'timing' | 'timeWindow'>
) {
  const timing = requestBase.timing ?? getSpielzeitRegelForKategorie(kategorie);
  const slotDuration = getTimingGameDuration(timing) + Math.max(0, timing.pausenzeit);
  const windowDuration = requestBase.timeWindow
    ? requestBase.timeWindow.endMinutes - requestBase.timeWindow.startMinutes
    : 180;
  const targetRequestsPerField = Math.max(
    requests.length,
    Math.ceil(windowDuration / Math.max(1, slotDuration))
  );

  return Math.min(16, Math.max(2, Math.ceil(targetRequestsPerField / requests.length) + 1));
}

function createScheduleCategoryLabel(kategorie: string, niveau: string) {
  if (isMiniCategory(kategorie) && niveau === 'Standard') {
    return kategorie;
  }

  return `${kategorie} (${niveau})`;
}

function groupTeamsByCategory(anmeldungen: AnmeldungRow[]) {
  const teamsByCategory: Record<string, Record<string, TeamEntry[]>> = {};
  const teamNumberCounters = new Map<string, number>();

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

      const kategorie = getSchedulingCategory(team.kategorie);
      const niveau = normalizeSchedulingSkill(team.spielstaerke);
      teamsByCategory[kategorie] ??= {};
      teamsByCategory[kategorie][niveau] ??= [];

      for (let index = 0; index < Math.floor(teamCount); index++) {
        const teamNumber = getNextTeamNumber(teamNumberCounters, club, team.kategorie);

        teamsByCategory[kategorie][niveau].push({
          name: `${club} ${getTeamNameCategory(team.kategorie)} ${teamNumber}`,
          club,
          kategorie: team.kategorie,
          eJugendGender: getEJugendGender(team.kategorie),
        });
      }
    }
  }

  return teamsByCategory;
}

function getNextTeamNumber(counters: Map<string, number>, club: string, categoryName: string) {
  const key = `${normalizeClubName(club)}:${normalizeHeader(getTeamNumberingCategory(categoryName))}`;
  const nextNumber = (counters.get(key) || 0) + 1;

  counters.set(key, nextNumber);
  return nextNumber;
}

function getTeamNumberingCategory(categoryName: string) {
  const normalizedCategory = normalizeCategoryName(categoryName);

  return isMiniCategory(normalizedCategory) ? 'Mini' : getSchedulingCategory(categoryName);
}

function getTeamNameCategory(categoryName: string) {
  const normalizedCategory = normalizeCategoryName(categoryName);

  return isMiniCategory(normalizedCategory) ? 'Mini' : normalizedCategory;
}

function createRoundRobinRequests(
  teams: TeamEntry[],
  requestBase: Pick<GameRequest, 'datum' | 'baseKategorie' | 'kategorie' | 'fieldGroup' | 'timing' | 'timeWindow'>
) {
  const externalRequests: GameRequest[] = [];
  const sameClubRequests: GameRequest[] = [];

  for (const request of createPairingCandidates(teams, requestBase)) {
    if (request.sameClub) {
      sameClubRequests.push(request);
    } else {
      externalRequests.push(request);
    }
  }

  return [...externalRequests, ...sameClubRequests];
}

function createPairingCandidates(
  teams: TeamEntry[],
  requestBase: Pick<GameRequest, 'datum' | 'baseKategorie' | 'kategorie' | 'fieldGroup' | 'timing' | 'timeWindow'>
) {
  const externalRequests: GameRequest[] = [];
  const sameClubRequests: GameRequest[] = [];

  createRoundRobinRounds(teams).forEach((round, roundIndex) => {
    const roundRequests = round
      .flatMap(([team1, team2]) => {
        if (!teamsCanMeet(team1, team2)) {
          return [];
        }

        return [{
          ...requestBase,
          team1: team1.name,
          team2: team2.name,
          roundIndex,
          sameClub: normalizeClubName(team1.club) === normalizeClubName(team2.club),
        }];
      })
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

function teamsCanMeet(team1: TeamEntry, team2: TeamEntry) {
  if (!team1.eJugendGender || !team2.eJugendGender) {
    return true;
  }

  if (team1.eJugendGender !== 'gemischt') {
    return team2.eJugendGender === 'gemischt';
  }

  if (team2.eJugendGender !== 'gemischt') {
    return team1.eJugendGender === 'gemischt';
  }

  return true;
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

      for (let startMinutes = day.start; startMinutes < day.end; startMinutes += 1) {
        slots.push({
          datum: day.datum,
          zeit: formatMinutes(startMinutes),
          startMinutes,
          dayEndMinutes: day.end,
          feld: fieldForDay,
          used: false,
        });
      }
    }
  }

  return slots.sort((a, b) => {
    return compareSlots(a, b);
  });
}

function compareSlots(a: ScheduleSlot, b: ScheduleSlot) {
  if (a.datum !== b.datum) {
    return a.datum.localeCompare(b.datum);
  }

  if (a.startMinutes !== b.startMinutes) {
    return a.startMinutes - b.startMinutes;
  }

  return a.feld.name.localeCompare(b.feld.name, 'de');
}

function comparePlannedGames(a: PlannedSpiel, b: PlannedSpiel) {
  if (a.datum !== b.datum) {
    return a.datum.localeCompare(b.datum);
  }

  if (a.zeit !== b.zeit) {
    return a.zeit.localeCompare(b.zeit);
  }

  return a.feld.localeCompare(b.feld, 'de');
}

function assignGamesToSlots(
  requests: GameRequest[],
  slots: ScheduleSlot[],
  options: { allowUnplanned?: boolean } = {}
) {
  const result = assignGamesToSlotsResult(requests, slots);

  if (!options.allowUnplanned && result.unplannedRequests.length > 0) {
    throw new SpielplanGenerationError(createUnplannedGamesMessage(result.unplannedRequests));
  }

  return result.plannedGames;
}

function assignGamesToSlotsResult(requests: GameRequest[], slots: ScheduleSlot[]) {
  const plannedGames: PlannedSpiel[] = [];
  const remainingRequests = [...requests];
  const teamSchedule = new Map<string, TeamScheduleEntry[]>();
  const publicNameSchedule = new Map<string, TeamScheduleEntry[]>();
  const fieldSchedule = new Map<string, TeamScheduleEntry[]>();
  const fieldGroupAssignments = new Map<string, string>();
  const requestTeamGroups = createRequestTeamGroups(requests);
  const orderedSlots = [...slots].sort(compareSlots);

  for (const slot of orderedSlots) {
    if (slot.used || remainingRequests.length === 0) {
      continue;
    }

    const requestIndex = findBestRequestIndexForSlot(
      slot,
      remainingRequests,
      teamSchedule,
      publicNameSchedule,
      fieldSchedule,
      fieldGroupAssignments,
      requestTeamGroups
    );

    if (requestIndex < 0) {
      continue;
    }

    const [request] = remainingRequests.splice(requestIndex, 1);

    slot.used = true;
    if (!fieldGroupAssignments.has(request.fieldGroup)) {
      fieldGroupAssignments.set(request.fieldGroup, slot.feld.name);
    }
    rememberTeamGame(teamSchedule, request.team1, slot, request);
    rememberTeamGame(teamSchedule, request.team2, slot, request);
    rememberPublicNameGame(publicNameSchedule, request, slot);
    rememberFieldGame(fieldSchedule, slot, request);
    plannedGames.push({
      datum: slot.datum,
      zeit: slot.zeit,
      feld: slot.feld.name,
      kategorie: request.kategorie,
      team1: request.team1,
      team2: request.team2,
    });
  }

  return {
    plannedGames: plannedGames.sort(comparePlannedGames),
    unplannedRequests: remainingRequests,
  };
}

function assignRefereesToGames(plannedGames: PlannedSpiel[], anmeldungen: AnmeldungRow[]) {
  const providers = createRefereeProviders(anmeldungen);

  if (providers.length === 0) {
    return plannedGames.map((game) => ({ ...game, schiedsrichter: null }));
  }

  const providerBusy = new Map<string, PlannedGameWindow[]>();
  const providerLoads = new Map<string, number>();

  return [...plannedGames].sort(comparePlannedGames).map((game) => {
    const window = getPlannedGameWindow(game);
    const candidates = providers
      .filter((provider) =>
        !providerIsPlayingDuring(provider, window, plannedGames)
        && providerCanWhistleDuring(provider, window, providerBusy)
      )
      .sort((a, b) => getProviderSchedulingScore(a, providerLoads) - getProviderSchedulingScore(b, providerLoads)
        || a.label.localeCompare(b.label, 'de'));
    const provider = candidates[0] || null;

    if (!provider) {
      return { ...game, schiedsrichter: null };
    }

    const busyEntries = providerBusy.get(provider.key) || [];
    busyEntries.push(window);
    providerBusy.set(provider.key, busyEntries);
    providerLoads.set(provider.key, (providerLoads.get(provider.key) || 0) + 1);

    return {
      ...game,
      schiedsrichter: provider.label,
    };
  }).sort(comparePlannedGames);
}

function createRefereeProviders(anmeldungen: AnmeldungRow[]) {
  const providers = new Map<string, RefereeProvider>();

  for (const anmeldung of anmeldungen) {
    const club = normalizeOptionalRefereeLabel(anmeldung.verein);

    for (const team of anmeldung.teams ?? []) {
      const explicitProvider = normalizeOptionalRefereeLabel(team.schiriName || team.schiri_name);
      const hasReferee = Boolean(explicitProvider || team.schiri);

      if (!hasReferee) {
        continue;
      }

      const label = explicitProvider || club;

      if (!label) {
        continue;
      }

      const key = normalizeRefereeKey(label);
      const existing = providers.get(key);
      const teamCount = Math.max(1, Math.floor(Number(team.anzahl || 1)));
      const isSvp = isSvpRefereeProvider(label);
      const matchKeys = new Set(existing?.matchKeys || []);

      if (!isSvp) {
        matchKeys.add(normalizeRefereeKey(label));
        if (club) {
          matchKeys.add(normalizeRefereeKey(club));
        }
      }

      providers.set(key, {
        label: existing?.label || label,
        key,
        crewCount: isSvp ? Number.POSITIVE_INFINITY : (existing?.crewCount || 0) + teamCount,
        isSvp,
        matchKeys: Array.from(matchKeys).filter(Boolean),
      });
    }
  }

  return Array.from(providers.values());
}

function getProviderSchedulingScore(provider: RefereeProvider, providerLoads: Map<string, number>) {
  const load = providerLoads.get(provider.key) || 0;
  const normalizedLoad = Number.isFinite(provider.crewCount) ? load / provider.crewCount : load / 1000;

  return normalizedLoad + (provider.isSvp ? 2 : 0);
}

function providerCanWhistleDuring(
  provider: RefereeProvider,
  window: PlannedGameWindow,
  providerBusy: Map<string, PlannedGameWindow[]>
) {
  const concurrentAssignments = (providerBusy.get(provider.key) || [])
    .filter((busyWindow) => windowsOverlap(window, busyWindow))
    .length;

  return concurrentAssignments < provider.crewCount;
}

function providerIsPlayingDuring(provider: RefereeProvider, window: PlannedGameWindow, plannedGames: PlannedSpiel[]) {
  if (provider.isSvp || provider.matchKeys.length === 0) {
    return false;
  }

  return plannedGames.some((game) => {
    if (!windowsOverlap(window, getPlannedGameWindow(game))) {
      return false;
    }

    return providerMatchesTeam(provider, game.team1) || providerMatchesTeam(provider, game.team2);
  });
}

function providerMatchesTeam(provider: RefereeProvider, teamName: string) {
  const teamKeys = [
    normalizeRefereeKey(teamName),
    normalizeRefereeKey(formatTeamDisplayName(teamName)),
  ].filter(Boolean);

  return provider.matchKeys.some((providerKey) =>
    teamKeys.some((teamKey) =>
      teamKey === providerKey
      || teamKey.startsWith(`${providerKey} `)
      || providerKey.startsWith(`${teamKey} `)
    )
  );
}

function getPlannedGameWindow(game: PlannedSpiel): PlannedGameWindow {
  const startMinutes = parseTime(game.zeit);
  const timing = getSpielzeitRegelForKategorie(game.kategorie);
  const endMinutes = startMinutes + getTimingGameDuration(timing) + Math.max(0, timing.pausenzeit);

  return {
    datum: game.datum,
    startMinutes,
    endMinutes,
  };
}

function windowsOverlap(first: PlannedGameWindow, second: PlannedGameWindow) {
  return first.datum === second.datum
    && first.startMinutes < second.endMinutes
    && first.endMinutes > second.startMinutes;
}

function normalizeOptionalRefereeLabel(value: string | undefined | null) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();

  if (!normalized || ['0', 'false', 'nein', 'no', 'ohne', 'kein', 'keine'].includes(normalized.toLowerCase())) {
    return null;
  }

  return normalized;
}

function isSvpRefereeProvider(value: string) {
  const normalized = normalizeRefereeKey(value);
  const compact = normalized.replace(/\s+/g, '');

  return compact.includes('svpschiriteam')
    || compact.includes('svpuschendorf')
    || normalized === 'svp';
}

function normalizeRefereeKey(value: string) {
  return value
    .replace(/\([^)]*\)/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findBestRequestIndexForSlot(
  slot: ScheduleSlot,
  requests: GameRequest[],
  teamSchedule: Map<string, TeamScheduleEntry[]>,
  publicNameSchedule: Map<string, TeamScheduleEntry[]>,
  fieldSchedule: Map<string, TeamScheduleEntry[]>,
  fieldGroupAssignments: Map<string, string>,
  requestTeamGroups: Map<string, string[]>
) {
  let bestIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 0; index < requests.length; index += 1) {
    const request = requests[index];

    if (!requestCanUseSlot(slot, request, teamSchedule, publicNameSchedule, fieldSchedule)) {
      continue;
    }

    const score = getRequestSchedulingScore(
      slot,
      request,
      teamSchedule,
      publicNameSchedule,
      fieldSchedule,
      fieldGroupAssignments,
      requestTeamGroups
    );

    if (score < bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  }

  return bestIndex;
}

function requestCanUseSlot(
  slot: ScheduleSlot,
  request: GameRequest,
  teamSchedule: Map<string, TeamScheduleEntry[]>,
  publicNameSchedule: Map<string, TeamScheduleEntry[]>,
  fieldSchedule: Map<string, TeamScheduleEntry[]>
) {
  return (
    slot.datum === request.datum
    && requestFitsInSlot(slot, request)
    && requestFitsTimeWindow(slot, request)
    && categoryAllowedOnField(slot.feld, request.baseKategorie, request.datum)
    && fieldCanHostAt(fieldSchedule.get(getFieldScheduleKey(slot)) || [], slot, request)
    && teamsAvoidImmediateFollowUp(slot, request, teamSchedule)
    && publicNamesAvoidImmediateFollowUp(slot, request, publicNameSchedule)
    && teamsCanPlayAt(slot, request, teamSchedule)
  );
}

function getRequestSchedulingScore(
  slot: ScheduleSlot,
  request: GameRequest,
  teamSchedule: Map<string, TeamScheduleEntry[]>,
  publicNameSchedule: Map<string, TeamScheduleEntry[]>,
  fieldSchedule: Map<string, TeamScheduleEntry[]>,
  fieldGroupAssignments: Map<string, string>,
  requestTeamGroups: Map<string, string[]>
) {
  return (
    getFieldContinuityScore(slot, request, teamSchedule, fieldGroupAssignments)
    + getFieldRhythmScore(slot, request, fieldSchedule)
    + getTeamLoadScore(request, teamSchedule, requestTeamGroups)
    + getTeamRestScore(slot, request, teamSchedule)
    + getPublicNameRestScore(slot, request, publicNameSchedule)
    + (request.sameClub ? 50 : 0)
    + request.roundIndex / 100
  );
}

function createRequestTeamGroups(requests: GameRequest[]) {
  const groups = new Map<string, Set<string>>();

  requests.forEach((request) => {
    const group = groups.get(request.fieldGroup) || new Set<string>();

    group.add(request.team1);
    group.add(request.team2);
    groups.set(request.fieldGroup, group);
  });

  return Array.from(groups.entries()).reduce<Map<string, string[]>>((result, [key, teams]) => {
    result.set(key, Array.from(teams));
    return result;
  }, new Map());
}

function getFieldRhythmScore(
  slot: ScheduleSlot,
  request: GameRequest,
  fieldSchedule: Map<string, TeamScheduleEntry[]>
) {
  const previousGames = (fieldSchedule.get(getFieldScheduleKey(slot)) || [])
    .filter((game) => game.datum === slot.datum && game.endMinutes <= slot.startMinutes)
    .sort((a, b) => b.endMinutes - a.endMinutes);
  const previousGame = previousGames[0];

  if (!previousGame) {
    return 0;
  }

  const gap = Math.max(0, slot.startMinutes - previousGame.endMinutes);

  return gap * 10;
}

function getTeamLoadScore(
  request: GameRequest,
  teamSchedule: Map<string, TeamScheduleEntry[]>,
  requestTeamGroups: Map<string, string[]>
) {
  const team1Games = teamSchedule.get(request.team1)?.length || 0;
  const team2Games = teamSchedule.get(request.team2)?.length || 0;
  const highestLoad = Math.max(team1Games, team2Games);
  const loadDifference = Math.abs(team1Games - team2Games);
  const groupLoads = (requestTeamGroups.get(request.fieldGroup) || [request.team1, request.team2])
    .map((teamName) => teamSchedule.get(teamName)?.length || 0);
  const lowestGroupLoad = groupLoads.length > 0 ? Math.min(...groupLoads) : 0;
  const team1Excess = Math.max(0, team1Games - lowestGroupLoad);
  const team2Excess = Math.max(0, team2Games - lowestGroupLoad);
  const highestExcess = Math.max(team1Excess, team2Excess);

  return (team1Games + team2Games) * 1000
    + highestLoad * 250
    + loadDifference * 120
    + (team1Excess + team2Excess) * 12000
    + highestExcess * 7000;
}

function getTeamRestScore(
  slot: ScheduleSlot,
  request: GameRequest,
  teamSchedule: Map<string, TeamScheduleEntry[]>
) {
  const minimumRest = Math.max(6, getRequestSlotDuration(request, slot));

  return [request.team1, request.team2].reduce((score, teamName) => {
    const previousGame = (teamSchedule.get(teamName) || [])
      .filter((game) => game.datum === slot.datum && game.endMinutes <= slot.startMinutes)
      .sort((a, b) => b.endMinutes - a.endMinutes)[0];

    if (!previousGame) {
      return score;
    }

    const restMinutes = slot.startMinutes - previousGame.endMinutes;

    if (restMinutes >= minimumRest) {
      return score;
    }

    const directFollowUpPenalty = restMinutes <= Math.max(2, request.timing?.pausenzeit ?? slot.feld.pausenzeit)
      ? 100000
      : 0;

    return score + directFollowUpPenalty + (minimumRest - restMinutes) * 350;
  }, 0);
}

function getPublicNameRestScore(
  slot: ScheduleSlot,
  request: GameRequest,
  publicNameSchedule: Map<string, TeamScheduleEntry[]>
) {
  const desiredGap = Math.max(18, getRequestSlotDuration(request, slot) * 2);

  return getRequestPublicNameKeys(request).reduce((score, publicNameKey) => {
    const previousGame = (publicNameSchedule.get(publicNameKey) || [])
      .filter((game) => game.datum === slot.datum && game.endMinutes <= slot.startMinutes)
      .sort((a, b) => b.endMinutes - a.endMinutes)[0];

    if (!previousGame) {
      return score;
    }

    const gapMinutes = slot.startMinutes - previousGame.endMinutes;

    return gapMinutes >= desiredGap
      ? score
      : score + (desiredGap - gapMinutes) * 160;
  }, 0);
}

function publicNamesAvoidImmediateFollowUp(
  slot: ScheduleSlot,
  request: GameRequest,
  publicNameSchedule: Map<string, TeamScheduleEntry[]>
) {
  const startMinutes = slot.startMinutes;

  return getRequestPublicNameKeys(request).every((publicNameKey) =>
    (publicNameSchedule.get(publicNameKey) || [])
      .filter((game) => game.datum === slot.datum)
      .every((game) => {
        return game.endMinutes !== startMinutes;
      })
  );
}

function getRequestPublicNameKeys(request: GameRequest) {
  return Array.from(new Set([request.team1, request.team2].map(getTeamDisplayKey).filter(Boolean)));
}

function getFieldContinuityScore(
  slot: ScheduleSlot,
  request: GameRequest,
  teamSchedule: Map<string, TeamScheduleEntry[]>,
  fieldGroupAssignments: Map<string, string>
) {
  const assignedField = fieldGroupAssignments.get(request.fieldGroup);
  const fieldGroupScore = assignedField && assignedField !== slot.feld.name ? 20 : 0;

  return [request.team1, request.team2].reduce((score, teamName) => {
    const previousGames = (teamSchedule.get(teamName) || []).filter((game) => game.datum === slot.datum);

    if (previousGames.length === 0) {
      return score;
    }

    return previousGames.some((game) => game.feld === slot.feld.name)
      ? score - 2
      : score + 5;
  }, fieldGroupScore);
}

function teamsCanPlayAt(
  slot: ScheduleSlot,
  request: GameRequest,
  teamSchedule: Map<string, TeamScheduleEntry[]>
) {
  return [request.team1, request.team2].every((teamName) =>
    canTeamPlayAt(teamSchedule.get(teamName) || [], slot, request)
  );
}

function teamsAvoidImmediateFollowUp(
  slot: ScheduleSlot,
  request: GameRequest,
  teamSchedule: Map<string, TeamScheduleEntry[]>
) {
  return [request.team1, request.team2].every((teamName) => {
    const previousGame = (teamSchedule.get(teamName) || [])
      .filter((game) => game.datum === slot.datum && game.endMinutes <= slot.startMinutes)
      .sort((a, b) => b.endMinutes - a.endMinutes)[0];

    if (!previousGame) {
      return true;
    }

    const restMinutes = slot.startMinutes - previousGame.endMinutes;
    const pauseMinutes = Math.max(0, request.timing?.pausenzeit ?? slot.feld.pausenzeit);

    return restMinutes > pauseMinutes;
  });
}

function canTeamPlayAt(previousGames: TeamScheduleEntry[], slot: ScheduleSlot, request: GameRequest) {
  const startMinutes = slot.startMinutes;
  const endMinutes = startMinutes + getRequestGameDuration(request, slot);

  return previousGames
    .filter((game) => game.datum === slot.datum)
    .every((game) => endMinutes <= game.startMinutes || startMinutes >= game.endMinutes);
}

function requestFitsInSlot(slot: ScheduleSlot, request: GameRequest) {
  return slot.startMinutes + getRequestSlotDuration(request, slot) <= slot.dayEndMinutes;
}

function requestFitsTimeWindow(slot: ScheduleSlot, request: GameRequest) {
  if (!request.timeWindow) {
    return true;
  }

  const requestEndMinutes = slot.startMinutes + getRequestSlotDuration(request, slot);

  return slot.startMinutes >= request.timeWindow.startMinutes
    && requestEndMinutes <= request.timeWindow.endMinutes;
}

function fieldCanHostAt(previousGames: TeamScheduleEntry[], slot: ScheduleSlot, request: GameRequest) {
  const startMinutes = slot.startMinutes;
  const endMinutes = startMinutes + getRequestSlotDuration(request, slot);

  return previousGames
    .filter((game) => game.datum === slot.datum)
    .every((game) => endMinutes <= game.startMinutes || startMinutes >= game.endMinutes);
}

function rememberTeamGame(
  teamSchedule: Map<string, TeamScheduleEntry[]>,
  teamName: string,
  slot: ScheduleSlot,
  request?: GameRequest
) {
  const current = teamSchedule.get(teamName) || [];
  current.push({
    datum: slot.datum,
    startMinutes: slot.startMinutes,
    endMinutes: slot.startMinutes + (request ? getRequestGameDuration(request, slot) : getGameDuration(slot.feld)),
    feld: slot.feld.name,
  });
  teamSchedule.set(teamName, current);
}

function rememberPublicNameGame(
  publicNameSchedule: Map<string, TeamScheduleEntry[]>,
  request: GameRequest,
  slot: ScheduleSlot
) {
  for (const publicNameKey of getRequestPublicNameKeys(request)) {
    const current = publicNameSchedule.get(publicNameKey) || [];

    current.push({
      datum: slot.datum,
      startMinutes: slot.startMinutes,
      endMinutes: slot.startMinutes + getRequestSlotDuration(request, slot),
      feld: slot.feld.name,
    });
    publicNameSchedule.set(publicNameKey, current);
  }
}

function rememberFieldGame(
  fieldSchedule: Map<string, TeamScheduleEntry[]>,
  slot: ScheduleSlot,
  request: GameRequest
) {
  const key = getFieldScheduleKey(slot);
  const current = fieldSchedule.get(key) || [];
  current.push({
    datum: slot.datum,
    startMinutes: slot.startMinutes,
    endMinutes: slot.startMinutes + getRequestSlotDuration(request, slot),
    feld: slot.feld.name,
  });
  fieldSchedule.set(key, current);
}

function createUnplannedGamesMessage(unplannedRequests: GameRequest[]) {
  const examples = unplannedRequests
    .slice(0, 5)
    .map((request) => `${request.kategorie}: ${request.team1} - ${request.team2}`);
  const suffix = unplannedRequests.length > examples.length
    ? `, weitere ${unplannedRequests.length - examples.length}`
    : '';

  return `Spielplan konnte nicht vollständig erstellt werden. ${unplannedRequests.length} Spiel(e) passen auch ohne Team-Pause nicht in die verfügbaren Slots: ${examples.join('; ')}${suffix}.`;
}

function getDateForCategory(categoryName: string, settings: TournamentScheduleSettings) {
  const normalizedCategory = normalizeCategoryName(categoryName);
  const category = TEAM_CATEGORIES.find((candidate) => candidate.name === normalizedCategory);

  if (category?.day === 'Samstag') {
    return settings.turnierStartDatum;
  }

  if (category?.day === 'Sonntag') {
    return settings.turnierEndDatum;
  }

  return isMiniCategory(normalizedCategory) || isEJugendCategory(normalizedCategory)
    ? settings.turnierStartDatum
    : settings.turnierEndDatum;
}

function getTimeWindowForCategory(
  categoryName: string,
  datum: string,
  zeitbloecke: SpielplanZeitblock[]
): RequestTimeWindow | undefined {
  const matchingBlock = zeitbloecke.find((block) =>
    block.datum === datum && categoryMatchesAllowedList(categoryName, block.kategorien)
  );

  if (matchingBlock) {
    return {
      startMinutes: parseTime(matchingBlock.startzeit),
      endMinutes: parseTime(matchingBlock.endzeit),
    };
  }

  return undefined;
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
  const normalizedCategory = normalizeCategoryName(categoryName);

  if (isMiniCategory(normalizedCategory)) {
    return allowedCategories.some((allowedCategory) => isMiniCategory(normalizeCategoryName(allowedCategory)));
  }

  if (isEJugendCategory(normalizedCategory)) {
    return allowedCategories.some((allowedCategory) => isEJugendCategory(normalizeCategoryName(allowedCategory)));
  }

  if (allowedCategories.some((allowedCategory) => normalizeCategoryName(allowedCategory) === normalizedCategory)) {
    return true;
  }

  if (isMixedImportedCategory(normalizedCategory)) {
    const baseCategory = stripImportedCategoryGender(normalizedCategory);
    return allowedCategories.some((allowedCategory) => stripImportedCategoryGender(normalizeCategoryName(allowedCategory)) === baseCategory);
  }

  return false;
}

function getSchedulingCategory(categoryName: string) {
  const normalizedCategory = normalizeCategoryName(categoryName);

  return isEJugendCategory(normalizedCategory) ? 'E-Jugend' : normalizedCategory;
}

function normalizeCategoryName(categoryName: string) {
  const trimmed = categoryName.trim();
  const shortCategory = normalizeShortHandballCategory(trimmed);

  return shortCategory || trimmed;
}

function normalizeShortHandballCategory(categoryName: string) {
  const match = normalizeHeader(categoryName).match(/^(w|m|g|gm)?([abcde])$/);

  if (!match) {
    return null;
  }

  const baseCategory = `${match[2].toUpperCase()}-Jugend`;
  const genderCode = match[1] || '';

  if (!genderCode) {
    return baseCategory;
  }

  const genderLabel = genderCode === 'w'
    ? 'weiblich'
    : genderCode === 'm'
      ? 'männlich'
      : 'gemischt';

  return `${baseCategory} ${genderLabel}`;
}

function getEJugendGender(categoryName: string): EJugendGender | null {
  const normalizedCategory = normalizeCategoryName(categoryName);

  if (!isEJugendCategory(normalizedCategory)) {
    return null;
  }

  const normalized = normalizeHeader(normalizedCategory);

  if (normalized.includes('mannlich') || normalized.includes('maennlich')) {
    return 'maennlich';
  }

  if (normalized.includes('weiblich')) {
    return 'weiblich';
  }

  return 'gemischt';
}

function normalizeSchedulingSkill(value: string | null | undefined) {
  const raw = String(value ?? '').trim();
  const normalized = normalizeHeader(raw);

  if (!normalized) {
    return 'Standard';
  }

  if (/^[1-3]$/.test(raw)) {
    return raw;
  }

  if (['anf', 'anfaenger', 'anfanger', 'beginner', 'einsteiger'].includes(normalized) || normalized.includes('anfaeng')) {
    return 'Anfänger';
  }

  if (
    ['leistung', 'leistungsstark', 'stark', 'competitive', 'sehrerfahren', 'sehrstark'].includes(normalized) ||
    normalized.includes('leistung') ||
    normalized.includes('sehrerfahren')
  ) {
    return 'Leistung';
  }

  if (
    ['standard', 'standart', 'fortgeschritten', 'fortgeschrittene', 'erfahren', 'mittel', 'medium', 'advanced'].includes(normalized) ||
    normalized.includes('fortgeschritten') ||
    normalized.includes('erfahren')
  ) {
    return 'Standard';
  }

  return /[a-z]/.test(normalized) ? 'Standard' : raw;
}

function isMiniCategory(categoryName: string) {
  return normalizeHeader(categoryName).startsWith('mini');
}

function isEJugendCategory(categoryName: string) {
  return normalizeHeader(categoryName).startsWith('ejugend');
}

function isMixedImportedCategory(categoryName: string) {
  return /\bgemischt\b/i.test(categoryName);
}

function stripImportedCategoryGender(categoryName: string) {
  return categoryName
    .replace(/\b(gemischt|weiblich|männlich|maennlich|mannlich)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
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

function getDaySummaryTiming(datum: string, settings: TournamentScheduleSettings) {
  if (datum === settings.turnierStartDatum) {
    return getSpielzeitRegelForKategorie('E-Jugend');
  }

  return getSpielzeitRegelForKategorie('D-Jugend');
}

function getDayTimingRuleText(datum: string, zeitbloecke: SpielplanZeitblock[]) {
  const blocksForDay = zeitbloecke.filter((block) => block.datum === datum);

  if (blocksForDay.length === 0) {
    return undefined;
  }

  return blocksForDay
    .map((block) => `${block.label}: ${block.startzeit}-${block.endzeit} Uhr`)
    .join('; ');
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

function getRequestSlotDuration(request: GameRequest, slot: ScheduleSlot) {
  if (!request.timing) {
    return getSlotDuration(slot.feld);
  }

  return getTimingGameDuration(request.timing) + Math.max(0, request.timing.pausenzeit);
}

function getRequestGameDuration(request: GameRequest, slot: ScheduleSlot) {
  return request.timing ? getTimingGameDuration(request.timing) : getGameDuration(slot.feld);
}

function getTimingGameDuration(timing: FeldTagesEinstellungen) {
  return Math.max(1, timing.spielzeit + (timing.zweiHalbzeiten ? timing.halbzeitpause : 0));
}

function getFieldScheduleKey(slot: ScheduleSlot) {
  return `${slot.datum}:${slot.feld.name}`;
}

function normalizeClubName(club: string) {
  return club.trim().toLowerCase();
}

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getFieldLimit(value: unknown) {
  const fieldLimit = Number(value);

  if (!Number.isFinite(fieldLimit) || fieldLimit < 1) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor(fieldLimit);
}
