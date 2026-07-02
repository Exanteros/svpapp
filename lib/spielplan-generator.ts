import {
  DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS,
  TEAM_CATEGORIES,
  applySpielplanTimingOverrides,
  formatTeamDisplayName,
  getDynamicSpielplanTimingProfiles,
  getSpielplanTimingProfile,
  getTeamDisplayKey,
  getSpielzeitRegelForKategorie,
  normalizeFeldEinstellungen,
  normalizeSpielplanLeistungsgruppen,
  normalizeSpielplanZeitbloecke,
  normalizeSpielplanTimingProfil,
  resolveFeldEinstellungenForDate,
  resolveTournamentScheduleSettings,
  type FeldEinstellungen,
  type FeldTagesEinstellungen,
  type PartialTournamentScheduleSettings,
  type SpielplanTimingProfile,
  type SpielplanTimingOverrides,
  type SpielplanTimingProfil,
  type SpielplanLeistungsgruppe,
  type SpielplanZeitblock,
  type TournamentScheduleSettings,
} from './tournament';
import {
  createSpiel,
  deleteAllSpiele,
  getAdminSettings,
  getAllAnmeldungen,
  getSpielplan,
  getStoredFeldEinstellungen,
  updateSpiel,
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

interface TeamSlot {
  club: string;
  kategorie: string;
  schedulingCategory: string;
  niveau: string;
  eJugendGender: EJugendGender | null;
  numberingCategory: string;
  numberingRank: number;
  strengthSortRank: number;
  sourceIndex: number;
}

interface GeneratorSettings extends PartialTournamentScheduleSettings {
  anzahlFelder?: number;
  spielzeitenAutomatisch?: boolean;
  spielplanTimingProfil?: SpielplanTimingProfil;
  spielplanTimingOverrides?: SpielplanTimingOverrides;
  spielplanLeistungsgruppen?: SpielplanLeistungsgruppe[];
  spielplanZeitbloecke?: SpielplanZeitblock[];
}

interface GameRequest {
  datum: string;
  baseKategorie: string;
  kategorie: string;
  fieldGroup: string;
  loadGroup: string;
  timing?: FeldTagesEinstellungen;
  timeWindow?: RequestTimeWindow;
  preferredFieldId?: string;
  maxGamesPerTeam?: number;
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
  dayStartMinutes: number;
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
  categoryKeys: string[];
  matchKeys: string[];
}

interface GameRequestContext {
  kategorie: string;
  teams: TeamEntry[];
  requests: GameRequest[];
  requestBase: Pick<GameRequest, 'datum' | 'baseKategorie' | 'timing' | 'timeWindow' | 'preferredFieldId'>;
  capacity: number;
  loadGroup: string;
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

export interface SchiedsrichterAssignmentResult {
  spiele: GeneratedSpiel[];
  assigned: number;
  open: number;
  updated: number;
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
  const timingProfilId = normalizeSpielplanTimingProfil(mergedSettings.spielplanTimingProfil);
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
  const timingProfil = getGeneratorTimingProfile(anmeldungen, settings, timingProfilId, zeitbloecke, fieldSettings);
  const autoSpielzeiten = mergedSettings.spielzeitenAutomatisch !== false;
  const requests = interleaveRequests(createGameRequests(anmeldungen, settings, {
    useCategoryTimings: autoSpielzeiten,
    timingProfil,
    zeitbloecke,
    leistungsgruppen: mergedSettings.spielplanLeistungsgruppen,
    availableFieldIds: fieldSettings.map((field) => field.id),
    feldEinstellungen: fieldSettings,
    settings,
  }));
  const slots = createScheduleSlots(fieldSettings, settings);
  const plannedGames = assignRefereesToGames(assignGamesToSlots(requests, slots, {
    allowUnplanned: autoSpielzeiten,
  }), anmeldungen, timingProfil);

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

export function assignSchiedsrichterToExistingSpielplan(
  params: SpielplanGenerationParams = {}
): SchiedsrichterAssignmentResult {
  const adminSettings = getAdminSettings();
  const mergedSettings = {
    ...adminSettings,
    ...params.settings,
  };
  const settings = resolveTournamentScheduleSettings(mergedSettings);
  const timingProfilId = normalizeSpielplanTimingProfil(mergedSettings.spielplanTimingProfil);
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
  const timingProfil = getGeneratorTimingProfile(anmeldungen, settings, timingProfilId, zeitbloecke, fieldSettings);
  const existingSpiele = getSpielplan() as GeneratedSpiel[];
  const assignedSpiele = assignRefereesToGames(existingSpiele, anmeldungen, timingProfil);
  let updated = 0;

  for (const spiel of assignedSpiele) {
    const result = updateSpiel(spiel.id, { schiedsrichter: spiel.schiedsrichter ?? null });
    updated += Number(result.changes || 0);
  }

  return {
    spiele: assignedSpiele,
    assigned: assignedSpiele.filter((spiel) => Boolean(spiel.schiedsrichter)).length,
    open: assignedSpiele.filter((spiel) => !spiel.schiedsrichter).length,
    updated,
  };
}

export function optimizeSpielzeitenForSchedule(params: SpielplanGenerationParams = {}): OptimizedSpielzeitenResult {
  const adminSettings = getAdminSettings();
  const mergedSettings = {
    ...adminSettings,
    ...params.settings,
  };
  const settings = resolveTournamentScheduleSettings(mergedSettings);
  const timingProfilId = normalizeSpielplanTimingProfil(mergedSettings.spielplanTimingProfil);
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
  const timingProfil = getGeneratorTimingProfile(anmeldungen, settings, timingProfilId, zeitbloecke, optimizedFields);
  const requests = interleaveRequests(createGameRequests(anmeldungen, settings, {
    useCategoryTimings: true,
    timingProfil,
    zeitbloecke,
    leistungsgruppen: mergedSettings.spielplanLeistungsgruppen,
    availableFieldIds: optimizedFields.map((field) => field.id),
    feldEinstellungen: optimizedFields,
    settings,
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
    const summaryTiming = getDaySummaryTiming(datum, settings, timingProfil);

    optimierung.push({
      datum,
      spielzeit: summaryTiming.spielzeit,
      pausenzeit: summaryTiming.pausenzeit,
      spiele: result.plannedGames.length,
      ausgelasseneSpiele: result.unplannedRequests.length,
      aktiveFelder: activeFields.length,
      slots: result.plannedGames.length,
      regelText: getDayTimingRuleText(datum, zeitbloecke, timingProfil),
    });
  }

  return {
    feldEinstellungen: optimizedFields,
    optimierung,
  };
}

function getGeneratorTimingProfile(
  anmeldungen: AnmeldungRow[],
  settings: TournamentScheduleSettings,
  timingProfilId: SpielplanTimingProfil,
  zeitbloecke: SpielplanZeitblock[],
  feldEinstellungen: FeldEinstellungen[]
) {
  const dynamicProfiles = getDynamicSpielplanTimingProfiles({
    settings,
    feldEinstellungen,
    spielplanZeitbloecke: zeitbloecke,
    anmeldungen,
  });

  return applySpielplanTimingOverrides(
    getSpielplanTimingProfile(timingProfilId, dynamicProfiles),
    settings.spielplanTimingOverrides
  );
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
  options: {
    useCategoryTimings?: boolean;
    timingProfil?: SpielplanTimingProfile;
    zeitbloecke?: SpielplanZeitblock[];
    leistungsgruppen?: SpielplanLeistungsgruppe[];
    availableFieldIds?: string[];
    feldEinstellungen?: FeldEinstellungen[];
    settings?: TournamentScheduleSettings;
  } = {}
) {
  const teamsByCategory = groupTeamsByCategory(anmeldungen);
  const leistungsgruppen = normalizeSpielplanLeistungsgruppen(options.leistungsgruppen);
  const availableFieldIds = new Set(options.availableFieldIds || []);
  const contexts: GameRequestContext[] = [];
  const requests: GameRequest[] = [];

  for (const [kategorie, niveauGroups] of Object.entries(teamsByCategory).sort(([a], [b]) => a.localeCompare(b, 'de'))) {
    for (const [niveau, teams] of Object.entries(niveauGroups).sort(([a], [b]) => a.localeCompare(b, 'de'))) {
      const sortedTeams = sortTeams(teams);

      if (sortedTeams.length < 2) {
        continue;
      }

      const datum = getDateForCategory(kategorie, settings);
      const loadGroup = getRequestLoadGroupKey(datum, kategorie);
      const requestBase = {
        datum,
        baseKategorie: kategorie,
        kategorie: createScheduleCategoryLabel(kategorie, niveau),
        fieldGroup: `${datum}:${kategorie}:${niveau}`,
        loadGroup,
        timing: options.useCategoryTimings ? getSpielzeitRegelForKategorie(kategorie, options.timingProfil) : undefined,
        timeWindow: getTimeWindowForCategory(kategorie, datum, options.zeitbloecke || []),
        preferredFieldId: getPreferredFieldIdForLeistungsgruppe(kategorie, niveau, leistungsgruppen, availableFieldIds),
      };
      const categoryRequests = createRoundRobinRequests(sortedTeams, requestBase);

      contexts.push({
        kategorie,
        teams: sortedTeams,
        requests: categoryRequests,
        requestBase,
        capacity: getRequestGroupCapacity(requestBase, options.feldEinstellungen || [], options.settings ?? settings),
        loadGroup,
      });
    }
  }

  const fairnessTargets = createFairnessTargets(contexts);

  for (const context of contexts) {
    const fairnessTarget = fairnessTargets.get(context.loadGroup);
    const limitedRequests = context.requests.map((request) => ({
      ...request,
      maxGamesPerTeam: fairnessTarget?.maxGamesPerTeam,
    }));

    if (isBalancedLoadCategory(context.kategorie)) {
      requests.push(...createBalancedFillRequests(
        limitedRequests,
        context.teams,
        context.capacity,
        true,
        fairnessTarget?.maxGamesPerTeam
      ));
      continue;
    }

    requests.push(...expandRequestsForCategoryFill(limitedRequests, context.teams, context.kategorie, context.requestBase));
  }

  return requests;
}

function createFairnessTargets(contexts: GameRequestContext[]) {
  const targets = new Map<string, { maxGamesPerTeam: number }>();
  const groups = new Map<string, { teams: Set<string>; capacity: number }>();

  for (const context of contexts) {
    if (!isBalancedLoadCategory(context.kategorie)) {
      continue;
    }

    const group = groups.get(context.loadGroup) || { teams: new Set<string>(), capacity: 0 };

    for (const team of context.teams) {
      group.teams.add(team.name);
    }

    group.capacity += Math.max(0, context.capacity);
    groups.set(context.loadGroup, group);
  }

  groups.forEach((group, loadGroup) => {
    const teamCount = group.teams.size;

    if (teamCount === 0 || group.capacity === 0) {
      return;
    }

    targets.set(loadGroup, {
      maxGamesPerTeam: Math.ceil((group.capacity * 2) / teamCount),
    });
  });

  return targets;
}

function createBalancedFillRequests(
  requests: GameRequest[],
  teams: TeamEntry[],
  targetGameCount: number,
  allowRepeats: boolean,
  maxGamesPerTeam?: number
) {
  if (requests.length === 0 || teams.length < 2 || targetGameCount <= 0) {
    return [];
  }

  const teamLoads = new Map(teams.map((team) => [team.name, 0]));
  const pairLoads = new Map<string, number>();
  const usedRequestIndexes = new Set<number>();
  const balancedRequests: GameRequest[] = [];
  const cappedTargetGameCount = allowRepeats
    ? targetGameCount
    : Math.min(targetGameCount, requests.length);

  for (let roundIndex = 0; roundIndex < cappedTargetGameCount; roundIndex += 1) {
    const candidates = requests
      .map((request, index) => ({ request, index }))
      .filter(({ request, index }) => {
        if (!allowRepeats && usedRequestIndexes.has(index)) {
          return false;
        }

        if (!maxGamesPerTeam) {
          return true;
        }

        return [request.team1, request.team2].every((teamName) =>
          (teamLoads.get(teamName) || 0) < maxGamesPerTeam
        );
      })
      .sort((first, second) =>
        getBalancedRequestScore(first.request, teamLoads, pairLoads)
          - getBalancedRequestScore(second.request, teamLoads, pairLoads)
        || first.request.roundIndex - second.request.roundIndex
        || first.index - second.index
      );

    const selected = candidates[0];

    if (!selected) {
      break;
    }

    const request = selected.request;
    const pairKey = getPairLoadKey(request);

    if (!allowRepeats) {
      usedRequestIndexes.add(selected.index);
    }

    teamLoads.set(request.team1, (teamLoads.get(request.team1) || 0) + 1);
    teamLoads.set(request.team2, (teamLoads.get(request.team2) || 0) + 1);
    pairLoads.set(pairKey, (pairLoads.get(pairKey) || 0) + 1);
    balancedRequests.push({
      ...request,
      roundIndex,
    });
  }

  return balancedRequests;
}

function getBalancedRequestScore(
  request: GameRequest,
  teamLoads: Map<string, number>,
  pairLoads: Map<string, number>
) {
  const team1Load = teamLoads.get(request.team1) || 0;
  const team2Load = teamLoads.get(request.team2) || 0;

  return Math.max(team1Load, team2Load) * 10000
    + (team1Load + team2Load) * 1000
    + Math.abs(team1Load - team2Load) * 250
    + (pairLoads.get(getPairLoadKey(request)) || 0) * 500;
}

function getPairLoadKey(request: Pick<GameRequest, 'team1' | 'team2'>) {
  return [request.team1, request.team2]
    .sort((a, b) => a.localeCompare(b, 'de', { numeric: true, sensitivity: 'base' }))
    .join('::');
}

function getRequestGroupCapacity(
  requestBase: Pick<GameRequest, 'datum' | 'baseKategorie' | 'timing' | 'timeWindow' | 'preferredFieldId'>,
  feldEinstellungen: FeldEinstellungen[],
  settings: TournamentScheduleSettings
) {
  if (feldEinstellungen.length === 0) {
    return 0;
  }

  const window = getRequestDayWindow(requestBase, settings);

  if (!window || window.endMinutes <= window.startMinutes) {
    return 0;
  }

  return feldEinstellungen.reduce((capacity, feld) => {
    const fieldAllowed = requestBase.preferredFieldId
      ? feld.id === requestBase.preferredFieldId && fieldActiveOnDate(feld, requestBase.datum)
      : categoryAllowedOnField(feld, requestBase.baseKategorie, requestBase.datum);

    if (!fieldAllowed) {
      return capacity;
    }

    const fieldForDay = resolveFeldEinstellungenForDate(feld, requestBase.datum);
    const slotDuration = requestBase.timing
      ? getTimingGameDuration(requestBase.timing) + Math.max(0, requestBase.timing.pausenzeit)
      : getSlotDuration(fieldForDay);

    return capacity + Math.floor((window.endMinutes - window.startMinutes) / Math.max(1, slotDuration));
  }, 0);
}

function getRequestDayWindow(
  requestBase: Pick<GameRequest, 'datum' | 'timeWindow'>,
  settings: TournamentScheduleSettings
) {
  const dayStartMinutes = requestBase.datum === settings.turnierStartDatum
    ? parseTime(settings.samstagStartzeit, parseTime(DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.samstagStartzeit))
    : parseTime(settings.sonntagStartzeit, parseTime(DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.sonntagStartzeit));
  const dayEndMinutes = requestBase.datum === settings.turnierStartDatum
    ? parseTime(settings.samstagEndzeit, parseTime(DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.samstagEndzeit))
    : parseTime(settings.sonntagEndzeit, parseTime(DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.sonntagEndzeit));

  return {
    startMinutes: Math.max(dayStartMinutes, requestBase.timeWindow?.startMinutes ?? dayStartMinutes),
    endMinutes: Math.min(dayEndMinutes, requestBase.timeWindow?.endMinutes ?? dayEndMinutes),
  };
}

function getRequestLoadGroupKey(datum: string, kategorie: string) {
  return isBalancedLoadCategory(kategorie)
    ? `${datum}:${normalizeCategoryName(kategorie)}`
    : `${datum}:${kategorie}`;
}

function isBalancedLoadCategory(kategorie: string) {
  return isMiniCategory(kategorie) || isEJugendCategory(kategorie);
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

function getPreferredFieldIdForLeistungsgruppe(
  kategorie: string,
  niveau: string,
  leistungsgruppen: SpielplanLeistungsgruppe[],
  availableFieldIds: Set<string>
) {
  const groupId = getLeistungsgruppeId(kategorie, niveau);
  const group = groupId ? leistungsgruppen.find((item) => item.id === groupId) : null;

  if (!group?.feldId || !availableFieldIds.has(group.feldId)) {
    return undefined;
  }

  return group.feldId;
}

function getLeistungsgruppeId(kategorie: string, niveau: string) {
  const normalizedCategory = normalizeCategoryName(kategorie);
  const normalizedNiveau = normalizeHeader(niveau);
  const staerke = normalizedNiveau.includes('stark') ? 'stark' : normalizedNiveau.includes('schwach') ? 'schwach' : null;

  if (!staerke) {
    return null;
  }

  if (isMiniCategory(normalizedCategory)) {
    return `mini-${staerke}` as const;
  }

  if (isEJugendCategory(normalizedCategory)) {
    return `e-${staerke}` as const;
  }

  return null;
}

function groupTeamsByCategory(anmeldungen: AnmeldungRow[]) {
  const teamsByCategory: Record<string, Record<string, TeamEntry[]>> = {};
  const teamSlots: TeamSlot[] = [];
  let sourceIndex = 0;

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

      const leistungsgruppe = getMiniELeistungsgruppe(team.kategorie, team.spielstaerke);
      const kategorie = leistungsgruppe?.kategorie ?? getSchedulingCategory(team.kategorie);
      const niveau = leistungsgruppe?.niveau ?? normalizeSchedulingSkill(team.spielstaerke);

      for (let index = 0; index < Math.floor(teamCount); index++) {
        teamSlots.push({
          club,
          kategorie: team.kategorie,
          schedulingCategory: kategorie,
          niveau,
          eJugendGender: getEJugendGender(team.kategorie),
          numberingCategory: getTeamNumberingCategory(team.kategorie),
          numberingRank: getTeamNumberingRank(team.kategorie, team.spielstaerke),
          strengthSortRank: getTeamStrengthSortRank(team.kategorie, team.spielstaerke),
          sourceIndex: sourceIndex++,
        });
      }
    }
  }

  assignBalancedMiniELeistungsgruppen(teamSlots);

  const teamNumbers = createTeamNumbersByStrength(teamSlots);

  for (const slot of teamSlots) {
    teamsByCategory[slot.schedulingCategory] ??= {};
    teamsByCategory[slot.schedulingCategory][slot.niveau] ??= [];

    teamsByCategory[slot.schedulingCategory][slot.niveau].push({
      name: `${slot.club} ${getTeamNameCategory(slot.kategorie)} ${teamNumbers.get(slot) ?? 1}`,
      club: slot.club,
      kategorie: slot.kategorie,
      eJugendGender: slot.eJugendGender,
    });
  }

  return teamsByCategory;
}

function createTeamNumbersByStrength(teamSlots: TeamSlot[]) {
  const slotsByNumberingGroup = new Map<string, TeamSlot[]>();
  const teamNumbers = new Map<TeamSlot, number>();

  for (const slot of teamSlots) {
    const key = getTeamNumberingKey(slot.club, slot.numberingCategory);
    const slots = slotsByNumberingGroup.get(key) || [];

    slots.push(slot);
    slotsByNumberingGroup.set(key, slots);
  }

  slotsByNumberingGroup.forEach((slots) => {
    [...slots]
      .sort(compareTeamNumberingSlots)
      .forEach((slot, index) => {
        teamNumbers.set(slot, index + 1);
      });
  });

  return teamNumbers;
}

function compareTeamNumberingSlots(first: TeamSlot, second: TeamSlot) {
  return first.numberingRank - second.numberingRank
    || getNumberingNiveauRank(first.niveau) - getNumberingNiveauRank(second.niveau)
    || first.schedulingCategory.localeCompare(second.schedulingCategory, 'de', { numeric: true, sensitivity: 'base' })
    || first.sourceIndex - second.sourceIndex;
}

function assignBalancedMiniELeistungsgruppen(teamSlots: TeamSlot[]) {
  const slotsByCategory = new Map<string, TeamSlot[]>();

  for (const slot of teamSlots) {
    if (!isMiniCategory(slot.schedulingCategory) && !isEJugendCategory(slot.schedulingCategory)) {
      continue;
    }

    const slots = slotsByCategory.get(slot.schedulingCategory) || [];

    slots.push(slot);
    slotsByCategory.set(slot.schedulingCategory, slots);
  }

  slotsByCategory.forEach((slots) => {
    if (slots.length < 4) {
      slots.forEach((slot) => {
        slot.niveau = 'Stark';
      });
      return;
    }

    const sortedSlots = [...slots].sort(compareTeamSlotsByStrength);
    const strongCount = Math.ceil(sortedSlots.length / 2);

    sortedSlots.forEach((slot, index) => {
      slot.niveau = index < strongCount ? 'Stark' : 'Schwach';
    });
  });
}

function compareTeamSlotsByStrength(first: TeamSlot, second: TeamSlot) {
  return first.strengthSortRank - second.strengthSortRank
    || first.numberingRank - second.numberingRank
    || first.sourceIndex - second.sourceIndex;
}

function getNumberingNiveauRank(niveau: string) {
  const normalized = normalizeHeader(niveau);

  if (normalized.includes('stark') || normalized.includes('leistung') || normalized.includes('standard')) {
    return 1;
  }

  if (normalized.includes('schwach') || normalized.includes('anfaeng') || normalized.includes('anfang')) {
    return 2;
  }

  return 3;
}

function getTeamNumberingKey(club: string, categoryName: string) {
  return `${normalizeClubName(club)}:${normalizeHeader(categoryName)}`;
}

function getTeamNumberingRank(categoryName: string, skillLevel: string | null | undefined) {
  return getSkillNumberingRank(skillLevel)
    ?? getMiniCategoryNumberingRank(categoryName)
    ?? 2;
}

function getTeamStrengthSortRank(categoryName: string, skillLevel: string | null | undefined) {
  return getSkillStrengthSortRank(skillLevel)
    ?? getMiniCategoryNumberingRank(categoryName)
    ?? 2;
}

function getMiniELeistungsgruppe(categoryName: string, skillLevel: string | null | undefined) {
  const normalizedCategory = normalizeCategoryName(categoryName);
  const isMini = isMiniCategory(normalizedCategory);
  const isEJugend = isEJugendCategory(normalizedCategory);

  if (!isMini && !isEJugend) {
    return null;
  }

  const labelGroup = getSkillLeistungsgruppe(skillLevel);
  const strengthRank = getNumericSkillNumberingRank(skillLevel)
    ?? getMiniCategoryNumberingRank(categoryName)
    ?? 3;
  const isStrong = labelGroup ? labelGroup === 'stark' : strengthRank <= 2;

  return {
    kategorie: isMini ? 'Mini' : 'E-Jugend',
    niveau: isStrong ? 'Stark' : 'Schwach',
  };
}

function getSkillLeistungsgruppe(value: string | null | undefined): 'schwach' | 'stark' | null {
  const normalized = normalizeHeader(String(value ?? ''));

  if (!normalized || /[1-3]/.test(normalized)) {
    return null;
  }

  if (
    normalized.includes('anfaeng') ||
    normalized.includes('anfang') ||
    normalized.includes('einsteiger')
  ) {
    return 'schwach';
  }

  if (
    normalized.includes('leistung')
    || normalized.includes('stark')
    || normalized.includes('standard')
    || normalized.includes('standart')
    || normalized.includes('fortgeschritten')
    || normalized.includes('erfahren')
  ) {
    return 'stark';
  }

  return null;
}

function getNumericSkillNumberingRank(value: string | null | undefined) {
  const raw = String(value ?? '').trim();
  const normalized = normalizeHeader(raw);

  if (/^[1-3]$/.test(raw)) {
    return Number(raw);
  }

  const numericSkill = normalized.match(/[1-3]/);
  return numericSkill ? Number(numericSkill[0]) : null;
}

function getSkillNumberingRank(value: string | null | undefined) {
  const raw = String(value ?? '').trim();
  const normalized = normalizeHeader(raw);

  if (!normalized) {
    return null;
  }

  if (/^[1-3]$/.test(raw)) {
    return Number(raw) <= 2 ? 1 : 2;
  }

  const numericSkill = normalized.match(/[1-3]/);
  if (numericSkill) {
    return Number(numericSkill[0]) <= 2 ? 1 : 2;
  }

  if (['anf', 'anfaenger', 'anfanger', 'beginner', 'einsteiger'].includes(normalized) || normalized.includes('anfaeng')) {
    return 2;
  }

  if (
    ['standard', 'standart', 'fortgeschritten', 'fortgeschrittene', 'erfahren', 'mittel', 'medium', 'advanced'].includes(normalized) ||
    normalized.includes('fortgeschritten') ||
    normalized.includes('erfahren')
  ) {
    return 1;
  }

  if (
    ['leistung', 'leistungsstark', 'stark', 'competitive', 'sehrerfahren', 'sehrstark'].includes(normalized) ||
    normalized.includes('leistung') ||
    normalized.includes('sehrerfahren')
  ) {
    return 1;
  }

  return null;
}

function getSkillStrengthSortRank(value: string | null | undefined) {
  const raw = String(value ?? '').trim();
  const normalized = normalizeHeader(raw);

  if (!normalized) {
    return null;
  }

  if (/^[1-3]$/.test(raw)) {
    return Number(raw);
  }

  const numericSkill = normalized.match(/[1-3]/);
  if (numericSkill) {
    return Number(numericSkill[0]);
  }

  if (
    ['leistung', 'leistungsstark', 'stark', 'competitive', 'sehrerfahren', 'sehrstark'].includes(normalized) ||
    normalized.includes('leistung') ||
    normalized.includes('sehrerfahren') ||
    normalized.includes('sehrstark')
  ) {
    return 1;
  }

  if (
    ['standard', 'standart', 'fortgeschritten', 'fortgeschrittene', 'erfahren', 'mittel', 'medium', 'advanced'].includes(normalized) ||
    normalized.includes('fortgeschritten') ||
    normalized.includes('erfahren')
  ) {
    return 2;
  }

  if (
    ['anf', 'anfaenger', 'anfanger', 'beginner', 'einsteiger'].includes(normalized) ||
    normalized.includes('anfaeng') ||
    normalized.includes('anfang')
  ) {
    return 3;
  }

  return null;
}

function getMiniCategoryNumberingRank(categoryName: string) {
  const match = normalizeHeader(categoryName).match(/^mini([1-3])/);

  return match ? Number(match[1]) : null;
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
  requestBase: Pick<GameRequest, 'datum' | 'baseKategorie' | 'kategorie' | 'fieldGroup' | 'loadGroup' | 'timing' | 'timeWindow' | 'preferredFieldId'>
) {
  return createPairingCandidates(teams, requestBase);
}

function createPairingCandidates(
  teams: TeamEntry[],
  requestBase: Pick<GameRequest, 'datum' | 'baseKategorie' | 'kategorie' | 'fieldGroup' | 'loadGroup' | 'timing' | 'timeWindow' | 'preferredFieldId'>
) {
  const requests: GameRequest[] = [];

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
          sameClub: false,
        }];
      })
      .sort((a, b) => `${a.team1}:${a.team2}`.localeCompare(`${b.team1}:${b.team2}`, 'de'));

    requests.push(...roundRequests);
  });

  return requests;
}

function teamsCanMeet(team1: TeamEntry, team2: TeamEntry) {
  if (normalizeClubName(team1.club) === normalizeClubName(team2.club)) {
    return false;
  }

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
          dayStartMinutes: day.start,
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

function assignRefereesToGames<T extends PlannedSpiel>(
  plannedGames: T[],
  anmeldungen: AnmeldungRow[],
  timingProfil: SpielplanTimingProfile
): Array<T & { schiedsrichter: string | null }> {
  const providers = createRefereeProviders(anmeldungen);

  if (providers.length === 0) {
    return plannedGames.map((game) => ({ ...game, schiedsrichter: null }));
  }

  const providerBusy = new Map<string, PlannedGameWindow[]>();
  const providerLoads = new Map<string, number>();

  return [...plannedGames].sort(comparePlannedGames).map((game) => {
    const window = getPlannedGameWindow(game, timingProfil);
    const candidates = providers
      .filter((provider) =>
        providerCanWhistleGame(provider, game)
        && !providerIsPlayingDuring(provider, window, plannedGames, timingProfil)
        && providerCanWhistleDuring(provider, window, providerBusy)
      )
      .sort((a, b) => getProviderSchedulingScore(a, providerLoads, game) - getProviderSchedulingScore(b, providerLoads, game)
        || a.label.localeCompare(b.label, 'de'));
    const provider = candidates[0] || null;

    if (!provider) {
      return { ...game, schiedsrichter: null };
    }

    const busyEntries = providerBusy.get(provider.key) || [];
    const loadKey = getProviderLoadKey(provider, game);

    busyEntries.push(window);
    providerBusy.set(provider.key, busyEntries);
    providerLoads.set(loadKey, (providerLoads.get(loadKey) || 0) + 1);

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
      const categoryKey = getRefereeCategoryKey(team.kategorie);
      const categoryKeys = new Set(existing?.categoryKeys || []);
      const matchKeys = new Set(existing?.matchKeys || []);

      if (categoryKey) {
        categoryKeys.add(categoryKey);
      }

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
        categoryKeys: Array.from(categoryKeys).filter(Boolean),
        matchKeys: Array.from(matchKeys).filter(Boolean),
      });
    }
  }

  return Array.from(providers.values());
}

function getProviderSchedulingScore(provider: RefereeProvider, providerLoads: Map<string, number>, game: PlannedSpiel) {
  const load = providerLoads.get(getProviderLoadKey(provider, game)) || 0;

  if (provider.isSvp) {
    return load / 8 - 1;
  }

  return load / Math.max(1, provider.crewCount);
}

function getProviderLoadKey(provider: RefereeProvider, game: PlannedSpiel) {
  return `${provider.key}:${getRefereeCategoryKey(game.kategorie)}`;
}

function providerCanWhistleGame(provider: RefereeProvider, game: PlannedSpiel) {
  const categoryKey = getRefereeCategoryKey(game.kategorie);

  return Boolean(categoryKey && provider.categoryKeys.includes(categoryKey));
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

function providerIsPlayingDuring(
  provider: RefereeProvider,
  window: PlannedGameWindow,
  plannedGames: PlannedSpiel[],
  timingProfil: SpielplanTimingProfile
) {
  if (provider.isSvp || provider.matchKeys.length === 0) {
    return false;
  }

  return plannedGames.some((game) => {
    if (!windowsOverlap(window, getPlannedGameWindow(game, timingProfil))) {
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

function getPlannedGameWindow(game: PlannedSpiel, timingProfil: SpielplanTimingProfile): PlannedGameWindow {
  const startMinutes = parseTime(game.zeit);
  const timing = getSpielzeitRegelForKategorie(game.kategorie, timingProfil);
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

function getRefereeCategoryKey(categoryName: string) {
  const categoryWithoutSkill = String(categoryName ?? '').replace(/\s+\([^)]*\)\s*$/, '').trim();
  const normalizedCategory = normalizeCategoryName(categoryWithoutSkill);

  if (isMiniCategory(normalizedCategory)) {
    return 'mini';
  }

  if (isEJugendCategory(normalizedCategory)) {
    return 'ejugend';
  }

  return normalizeRefereeKey(stripImportedCategoryGender(normalizedCategory));
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
    && requestStartsOnKickoffGrid(slot, request)
    && requestAllowedOnField(slot, request)
    && requestKeepsTeamLoadUnderLimit(request, teamSchedule)
    && fieldCanHostAt(fieldSchedule.get(getFieldScheduleKey(slot)) || [], slot, request)
    && teamsAvoidImmediateFollowUp(slot, request, teamSchedule)
    && teamsCanPlayAt(slot, request, teamSchedule)
  );
}

function requestKeepsTeamLoadUnderLimit(
  request: GameRequest,
  teamSchedule: Map<string, TeamScheduleEntry[]>
) {
  if (!request.maxGamesPerTeam) {
    return true;
  }

  return [request.team1, request.team2].every((teamName) =>
    (teamSchedule.get(teamName)?.length || 0) < request.maxGamesPerTeam!
  );
}

function requestAllowedOnField(slot: ScheduleSlot, request: GameRequest) {
  if (request.preferredFieldId) {
    return slot.feld.id === request.preferredFieldId && fieldActiveOnDate(slot.feld, request.datum);
  }

  return categoryAllowedOnField(slot.feld, request.baseKategorie, request.datum);
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
    const group = groups.get(request.loadGroup) || new Set<string>();

    group.add(request.team1);
    group.add(request.team2);
    groups.set(request.loadGroup, group);
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
  const groupLoads = (requestTeamGroups.get(request.loadGroup) || [request.team1, request.team2])
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

    return restMinutes >= pauseMinutes;
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

function requestStartsOnKickoffGrid(slot: ScheduleSlot, request: GameRequest) {
  const gridStart = request.timeWindow?.startMinutes ?? getDayStartMinutes(slot);
  const slotDuration = getRequestSlotDuration(request, slot);

  return slot.startMinutes >= gridStart
    && (slot.startMinutes - gridStart) % Math.max(1, slotDuration) === 0;
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

function getDaySummaryTiming(
  datum: string,
  settings: TournamentScheduleSettings,
  timingProfil: SpielplanTimingProfile
) {
  if (datum === settings.turnierStartDatum) {
    return getSpielzeitRegelForKategorie('E-Jugend', timingProfil);
  }

  return getSpielzeitRegelForKategorie('D-Jugend', timingProfil);
}

function getDayTimingRuleText(
  datum: string,
  zeitbloecke: SpielplanZeitblock[],
  timingProfil: SpielplanTimingProfile
) {
  const blocksForDay = zeitbloecke.filter((block) => block.datum === datum);

  if (blocksForDay.length === 0) {
    return undefined;
  }

  return blocksForDay
    .map((block) => {
      const timing = getSpielzeitRegelForKategorie(block.kategorien[0] || block.label, timingProfil);
      return `${block.label}: ${block.startzeit}-${block.endzeit} Uhr, ${timing.spielzeit}+${timing.pausenzeit} Min`;
    })
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

function getDayStartMinutes(slot: ScheduleSlot) {
  return slot.dayStartMinutes;
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
