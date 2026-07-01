export const TOURNAMENT_DEFAULTS = {
  name: 'Rasenturnier Puschendorf 2025',
  publicTitle: 'Handball-Turnier 2025',
  startDate: '2025-07-05',
  endDate: '2025-07-06',
  saturdayStartTime: '13:00',
  saturdayEndTime: '17:00',
  sundayStartTime: '10:00',
  sundayEndTime: '17:00',
  registrationDeadline: '2025-06-30',
  teamFee: 25,
  missingRefereeFee: 20,
  maxTeamsPerCategorySelection: 5,
} as const;

const TEXT_YEAR_PATTERN = /\b20\d{2}\b/g;

export function getTournamentYear(dateString: string = TOURNAMENT_DEFAULTS.startDate) {
  const date = parseTournamentDate(dateString);

  return date?.getFullYear() || new Date().getFullYear();
}

export function replaceTextYear(value: string, year: number | string) {
  const normalizedValue = String(value || '').replace(/\s+/g, ' ').trim();
  const normalizedYear = String(year || '').trim();

  if (!normalizedValue || !normalizedYear) {
    return normalizedValue;
  }

  return normalizedValue.match(TEXT_YEAR_PATTERN)
    ? normalizedValue.replace(TEXT_YEAR_PATTERN, normalizedYear)
    : `${normalizedValue} ${normalizedYear}`;
}

export function formatTournamentDate(dateString: string) {
  const date = parseTournamentDate(dateString);

  if (!date) {
    return dateString;
  }

  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function parseTournamentDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export const TEAM_CATEGORIES = [
  { id: 'mini-3', name: 'Mini 3 (echte Anfänger)', needsSkill: false, day: 'Samstag' },
  { id: 'mini-2', name: 'Mini 2 (Anfänger)', needsSkill: false, day: 'Samstag' },
  { id: 'mini-1', name: 'Mini 1 (Fortgeschrittene)', needsSkill: false, day: 'Samstag' },
  { id: 'e-jugend', name: 'E-Jugend', needsSkill: true, day: 'Samstag' },
  { id: 'd-weiblich', name: 'D-Jugend weiblich', needsSkill: true, day: 'Sonntag' },
  { id: 'd-maennlich', name: 'D-Jugend männlich', needsSkill: true, day: 'Sonntag' },
  { id: 'c-weiblich', name: 'C-Jugend weiblich', needsSkill: true, day: 'Sonntag' },
  { id: 'c-maennlich', name: 'C-Jugend männlich', needsSkill: true, day: 'Sonntag' },
  { id: 'b-weiblich', name: 'B-Jugend weiblich', needsSkill: true, day: 'Sonntag' },
  { id: 'b-maennlich', name: 'B-Jugend männlich', needsSkill: true, day: 'Sonntag' },
  { id: 'a-weiblich', name: 'A-Jugend weiblich', needsSkill: true, day: 'Sonntag' },
  { id: 'a-maennlich', name: 'A-Jugend männlich', needsSkill: true, day: 'Sonntag' },
] as const;

export const SKILL_LEVELS = ['Anfänger', 'Standard', 'Leistung'] as const;

const CATEGORY_NAMES_WITH_SKILL = new Set(
  TEAM_CATEGORIES
    .filter((category) => category.needsSkill)
    .map((category) => category.name.toLocaleLowerCase('de-DE'))
);

const SCHEDULE_SKILL_SUFFIXES = new Set([
  'anfänger',
  'anfaenger',
  'fortgeschritten',
  'fortgeschrittene',
  'erfahren',
  'sehr erfahren',
  'leistung',
  'standard',
  'standart',
]);

export function formatScheduleCategoryLabel(category: string) {
  const match = category.match(/^(.*?)\s+\(([^()]+)\)\s*$/);

  if (!match) {
    return category;
  }

  const baseCategory = match[1].trim();
  const suffix = match[2].trim().toLocaleLowerCase('de-DE');

  if (
    CATEGORY_NAMES_WITH_SKILL.has(baseCategory.toLocaleLowerCase('de-DE')) &&
    SCHEDULE_SKILL_SUFFIXES.has(suffix)
  ) {
    return baseCategory;
  }

  return category;
}

export type TeamDisplayNameMap = ReadonlyMap<string, string>;

interface TeamDisplayNameEntry {
  teamName: string;
  category?: string | null;
}

interface TeamDisplayGame {
  kategorie: string;
  team1: string;
  team2: string;
}

const TEAM_NUMBER_SUFFIX_PATTERN = /\s+(\d+)$/;
const TEAM_CATEGORY_SUFFIX_PATTERN =
  /\s+(?:mini(?:\s*\d+)?(?:\s*\([^)]*\))?|[a-e]-jugend(?:\s+(?:weiblich|männlich|maennlich|mannlich|gemischt))?|(?:w|m|g|gm)[a-e])$/i;

export function createTeamDisplayNameMapFromGames(spiele: TeamDisplayGame[]) {
  return createTeamDisplayNameMap(spiele.flatMap((spiel) => {
    const category = formatScheduleCategoryLabel(spiel.kategorie);

    return [
      { teamName: spiel.team1, category },
      { teamName: spiel.team2, category },
    ];
  }));
}

export function createTeamDisplayNameMap(teamNames: Array<string | TeamDisplayNameEntry>) {
  const entriesByTeamName = new Map<string, TeamDisplayNameEntry>();

  teamNames.forEach((entry) => {
    const normalizedEntry = normalizeTeamDisplayEntry(entry);

    if (normalizedEntry) {
      entriesByTeamName.set(normalizedEntry.teamName, normalizedEntry);
    }
  });

  const entries = Array.from(entriesByTeamName.values());
  const groupedByBaseAndCategory = new Map<string, TeamDisplayNameEntry[]>();
  const displayNames = new Map<string, string>();

  entries.forEach((entry) => {
    const baseKey = getTeamDisplayKey(entry.teamName);
    const categoryKey = getTeamDisplayCategoryKey(entry);
    const groupKey = `${baseKey}:${categoryKey}`;
    const group = groupedByBaseAndCategory.get(groupKey) || [];

    group.push(entry);
    groupedByBaseAndCategory.set(groupKey, group);
  });

  groupedByBaseAndCategory.forEach((entriesForBaseAndCategory) => {
    const sortedEntries = [...entriesForBaseAndCategory].sort((a, b) =>
      a.teamName.localeCompare(b.teamName, 'de-DE', { numeric: true, sensitivity: 'base' })
    );

    sortedEntries.forEach((entry, index) => {
      const baseName = getTeamDisplayBaseName(entry.teamName);
      const displayName = sortedEntries.length > 1
        ? `${baseName} ${index + 1}`
        : baseName;

      displayNames.set(entry.teamName, displayName);
    });
  });

  return displayNames;
}

export function formatTeamDisplayName(teamName: string, displayNameMap?: TeamDisplayNameMap) {
  const normalizedName = normalizeTeamDisplayInput(teamName);

  return displayNameMap?.get(normalizedName) || getTeamDisplayBaseName(normalizedName);
}

export function getTeamDisplayBaseName(teamName: string) {
  const normalizedName = normalizeTeamDisplayInput(teamName);
  const nameWithoutNumber = normalizedName.replace(TEAM_NUMBER_SUFFIX_PATTERN, '').trim();
  const nameWithoutCategory = nameWithoutNumber
    .replace(TEAM_CATEGORY_SUFFIX_PATTERN, '')
    .trim();

  return nameWithoutCategory || nameWithoutNumber || normalizedName;
}

export function getTeamDisplayKey(teamName: string) {
  return normalizeTeamDisplayKey(getTeamDisplayBaseName(teamName));
}

function normalizeTeamDisplayInput(value: string) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeTeamDisplayEntry(entry: string | TeamDisplayNameEntry) {
  if (typeof entry === 'string') {
    const teamName = normalizeTeamDisplayInput(entry);

    return teamName ? { teamName } : null;
  }

  const teamName = normalizeTeamDisplayInput(entry.teamName);

  if (!teamName) {
    return null;
  }

  return {
    teamName,
    category: normalizeTeamDisplayInput(entry.category || ''),
  };
}

function getTeamDisplayCategoryKey(entry: TeamDisplayNameEntry) {
  const category = normalizeTeamDisplayInput(entry.category || '');

  return normalizeTeamDisplayKey(category || getTeamDisplayCategoryName(entry.teamName));
}

function getTeamDisplayCategoryName(teamName: string) {
  const normalizedName = normalizeTeamDisplayInput(teamName);
  const nameWithoutNumber = normalizedName.replace(TEAM_NUMBER_SUFFIX_PATTERN, '').trim();
  const categoryMatch = nameWithoutNumber.match(TEAM_CATEGORY_SUFFIX_PATTERN);

  return categoryMatch?.[0]?.trim() || '';
}

function normalizeTeamDisplayKey(value: string) {
  return normalizeTeamDisplayInput(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface AnmeldungTeam {
  kategorie: string;
  anzahl: number;
  schiri: boolean;
  spielstaerke?: string;
  schiriName?: string;
}

export interface AnmeldungContact {
  verein: string;
  kontakt: string;
  email: string;
  mobil: string;
}

export interface AnmeldungPayload extends AnmeldungContact {
  teams: AnmeldungTeam[];
}

export interface FeldTagesEinstellungen {
  spielzeit: number;
  pausenzeit: number;
  halbzeitpause: number;
  zweiHalbzeiten: boolean;
}

export type SpielplanTimingProfil = 'kompakt' | 'standard' | 'lang';
export type SpielplanTimingGruppe = 'miniE' | 'd' | 'cba';
export type SpielplanTimingOverrides = Partial<Record<SpielplanTimingGruppe, Partial<FeldTagesEinstellungen>>>;

export interface SpielplanTimingProfile {
  id: SpielplanTimingProfil;
  label: string;
  description: string;
  targetGamesPerTeam: number;
  teamCounts: Record<SpielplanTimingGruppe, number>;
  miniE: FeldTagesEinstellungen;
  d: FeldTagesEinstellungen;
  cba: FeldTagesEinstellungen;
}

export interface SpielplanTimingProfileContext {
  settings?: PartialTournamentScheduleSettings;
  feldEinstellungen?: unknown;
  spielplanZeitbloecke?: unknown;
  anmeldungen?: Array<{
    teams?: Array<{
      kategorie?: string | null;
      anzahl?: number | string | null;
    }>;
  }>;
}

const SPIELPLAN_TIMING_PROFILE_DEFINITIONS: Array<{
  id: SpielplanTimingProfil;
  label: string;
  description: string;
  targetGamesPerTeam: number;
}> = [
  {
    id: 'kompakt',
    label: 'Viele Spiele',
    description: 'Kürzere Spiele, mehr mögliche Runden pro Mannschaft.',
    targetGamesPerTeam: 8,
  },
  {
    id: 'standard',
    label: 'Normal',
    description: 'Ausgewogener Vorschlag aus Spieldauer und Rundenanzahl.',
    targetGamesPerTeam: 6,
  },
  {
    id: 'lang',
    label: 'Lange Spielzeit',
    description: 'Längere Spiele, dafür weniger mögliche Runden.',
    targetGamesPerTeam: 4,
  },
];

const DEFAULT_TIMING_TEAM_COUNTS: Record<SpielplanTimingGruppe, number> = {
  miniE: 0,
  d: 0,
  cba: 0,
};

const FALLBACK_TIMING_MINUTES: Record<SpielplanTimingProfil, Record<SpielplanTimingGruppe, number>> = {
  kompakt: { miniE: 6, d: 9, cba: 12 },
  standard: { miniE: 7, d: 10, cba: 13 },
  lang: { miniE: 8, d: 11, cba: 14 },
};

const DYNAMIC_TIMING_LIMITS: Record<SpielplanTimingGruppe, { min: number; max: number }> = {
  miniE: { min: 5, max: 12 },
  d: { min: 7, max: 15 },
  cba: { min: 9, max: 18 },
};

export const SPIELPLAN_TIMING_PROFILES = createFallbackSpielplanTimingProfiles();

export function normalizeSpielplanTimingProfil(value: unknown): SpielplanTimingProfil {
  return SPIELPLAN_TIMING_PROFILE_DEFINITIONS.some((profile) => profile.id === value)
    ? value as SpielplanTimingProfil
    : 'standard';
}

export function getDynamicSpielplanTimingProfiles(context: SpielplanTimingProfileContext = {}): SpielplanTimingProfile[] {
  const settings = resolveTournamentScheduleSettings(context.settings || {});
  const zeitbloecke = normalizeSpielplanZeitbloecke(context.spielplanZeitbloecke, settings);
  const fields = normalizeFeldEinstellungen(context.feldEinstellungen ?? DEFAULT_FELD_EINSTELLUNGEN);
  const teamCounts = countTeamsByTimingGroup(context.anmeldungen || []);
  const capacityMinutes = getTimingGroupCapacityMinutes(settings, zeitbloecke, fields);

  return SPIELPLAN_TIMING_PROFILE_DEFINITIONS.map((definition) => {
    const timings = {
      miniE: createSpielzeitRegel(calculateDynamicSpielzeit('miniE', definition.id, definition.targetGamesPerTeam, teamCounts, capacityMinutes)),
      d: createSpielzeitRegel(calculateDynamicSpielzeit('d', definition.id, definition.targetGamesPerTeam, teamCounts, capacityMinutes)),
      cba: createSpielzeitRegel(calculateDynamicSpielzeit('cba', definition.id, definition.targetGamesPerTeam, teamCounts, capacityMinutes)),
    };
    const totalTeams = teamCounts.miniE + teamCounts.d + teamCounts.cba;

    return {
      ...definition,
      description: totalTeams > 0
        ? `${definition.description} Berechnet aus ${totalTeams} Team${totalTeams === 1 ? '' : 's'}.`
        : definition.description,
      teamCounts,
      ...timings,
    };
  });
}

export function getSpielplanTimingProfile(
  profileId: unknown,
  profiles: SpielplanTimingProfile[] = SPIELPLAN_TIMING_PROFILES
): SpielplanTimingProfile {
  if (isSpielplanTimingProfile(profileId)) {
    return profileId;
  }

  const normalizedProfile = normalizeSpielplanTimingProfil(profileId);

  return profiles.find((profile) => profile.id === normalizedProfile)
    || profiles.find((profile) => profile.id === 'standard')
    || SPIELPLAN_TIMING_PROFILES[1];
}

export function getSpielzeitRegelForKategorie(
  categoryName: string,
  profileId: unknown = 'standard',
  profiles?: SpielplanTimingProfile[]
): FeldTagesEinstellungen {
  const group = getSpielplanTimingGruppeForKategorie(categoryName);
  const profile = getSpielplanTimingProfile(profileId, profiles);

  if (group === 'miniE') {
    return profile.miniE;
  }

  if (group === 'd') {
    return profile.d;
  }

  return profile.cba;
}

export function getSpielplanTimingGruppeForKategorie(categoryName: string): SpielplanTimingGruppe {
  const normalized = normalizeSpielzeitKategorie(categoryName);

  if (normalized.startsWith('mini') || normalized.startsWith('ejugend')) {
    return 'miniE';
  }

  if (normalized.startsWith('djugend')) {
    return 'd';
  }

  return 'cba';
}

function createFallbackSpielplanTimingProfiles(): SpielplanTimingProfile[] {
  return SPIELPLAN_TIMING_PROFILE_DEFINITIONS.map((definition) => ({
    ...definition,
    teamCounts: { ...DEFAULT_TIMING_TEAM_COUNTS },
    miniE: createSpielzeitRegel(FALLBACK_TIMING_MINUTES[definition.id].miniE),
    d: createSpielzeitRegel(FALLBACK_TIMING_MINUTES[definition.id].d),
    cba: createSpielzeitRegel(FALLBACK_TIMING_MINUTES[definition.id].cba),
  }));
}

function isSpielplanTimingProfile(value: unknown): value is SpielplanTimingProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SpielplanTimingProfile>;

  return Boolean(candidate.id && candidate.miniE && candidate.d && candidate.cba);
}

function countTeamsByTimingGroup(anmeldungen: NonNullable<SpielplanTimingProfileContext['anmeldungen']>) {
  return anmeldungen.reduce<Record<SpielplanTimingGruppe, number>>((counts, anmeldung) => {
    for (const team of anmeldung.teams || []) {
      const teamCount = Math.max(0, Math.floor(Number(team.anzahl || 0)));

      if (!team.kategorie || teamCount === 0) {
        continue;
      }

      counts[getSpielplanTimingGruppeForKategorie(team.kategorie)] += teamCount;
    }

    return counts;
  }, { ...DEFAULT_TIMING_TEAM_COUNTS });
}

function getTimingGroupCapacityMinutes(
  settings: TournamentScheduleSettings,
  zeitbloecke: SpielplanZeitblock[],
  fields: FeldEinstellungen[]
) {
  const capacity: Record<SpielplanTimingGruppe, number> = { ...DEFAULT_TIMING_TEAM_COUNTS };

  for (const block of zeitbloecke) {
    const blockDuration = Math.max(0, parseSpielplanTime(block.endzeit) - parseSpielplanTime(block.startzeit));

    if (blockDuration <= 0) {
      continue;
    }

    const groupsInBlock = Array.from(new Set(block.kategorien.map(getSpielplanTimingGruppeForKategorie)));

    for (const group of groupsInBlock) {
      const activeFieldCount = fields.filter((field) => fieldCanHostTimingGroup(field, block.datum, group)).length;
      const fallbackFieldCount = fields.filter((field) => fieldActiveOnDate(field, block.datum)).length;
      const fieldCount = activeFieldCount || fallbackFieldCount || 1;

      capacity[group] += blockDuration * fieldCount;
    }
  }

  return {
    miniE: capacity.miniE || getFallbackDayCapacity(settings.samstagStartzeit, settings.samstagEndzeit, fields, settings.turnierStartDatum),
    d: capacity.d || getFallbackDayCapacity(settings.sonntagStartzeit, settings.sonntagEndzeit, fields, settings.turnierEndDatum),
    cba: capacity.cba || getFallbackDayCapacity(settings.sonntagStartzeit, settings.sonntagEndzeit, fields, settings.turnierEndDatum),
  };
}

function calculateDynamicSpielzeit(
  group: SpielplanTimingGruppe,
  profileId: SpielplanTimingProfil,
  targetGamesPerTeam: number,
  teamCounts: Record<SpielplanTimingGruppe, number>,
  capacityMinutes: Record<SpielplanTimingGruppe, number>
) {
  const teamCount = teamCounts[group];
  const capacity = capacityMinutes[group];
  const fallback = FALLBACK_TIMING_MINUTES[profileId][group];

  if (teamCount < 2 || capacity <= 0) {
    return fallback;
  }

  const targetGames = Math.max(1, Math.ceil((teamCount * targetGamesPerTeam) / 2));
  const slotDuration = Math.floor(capacity / targetGames);
  const calculatedSpielzeit = slotDuration - 2;
  const limits = DYNAMIC_TIMING_LIMITS[group];

  return clampInteger(calculatedSpielzeit, limits.min, limits.max);
}

function getFallbackDayCapacity(startzeit: string, endzeit: string, fields: FeldEinstellungen[], datum: string) {
  const duration = Math.max(0, parseSpielplanTime(endzeit) - parseSpielplanTime(startzeit));
  const activeFieldCount = fields.filter((field) => fieldActiveOnDate(field, datum)).length || fields.length || 1;

  return duration * activeFieldCount;
}

function fieldCanHostTimingGroup(feld: FeldEinstellungen, datum: string, group: SpielplanTimingGruppe) {
  if (!fieldActiveOnDate(feld, datum)) {
    return false;
  }

  const allowedForDay = feld.erlaubteJahrgaengeProTag?.[datum];
  const allowedCategories = allowedForDay && allowedForDay.length > 0
    ? allowedForDay
    : feld.erlaubteJahrgaenge || [];

  if (allowedCategories.length === 0) {
    return true;
  }

  return allowedCategories.some((category) => getSpielplanTimingGruppeForKategorie(category) === group);
}

function fieldActiveOnDate(feld: FeldEinstellungen, datum: string) {
  return feld.aktiveTage?.[datum] !== false;
}

function createSpielzeitRegel(spielzeit: number, pausenzeit = 2): FeldTagesEinstellungen {
  return {
    spielzeit,
    pausenzeit,
    halbzeitpause: 0,
    zweiHalbzeiten: false,
  };
}

function normalizeSpielzeitKategorie(value: string) {
  const normalized = value
    .replace(/\([^)]*\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const shortCategoryMatch = normalized.match(/^(?:w|m|g|gm)?([abcde])$/);

  return shortCategoryMatch ? `${shortCategoryMatch[1]}jugend` : normalized;
}

function parseSpielplanTime(value: string, fallback = 0) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);

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

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.floor(value)));
}

export interface FeldEinstellungen extends FeldTagesEinstellungen {
  id: string;
  name: string;
  erlaubteJahrgaenge?: string[];
  erlaubteJahrgaengeProTag?: Record<string, string[]>;
  aktiveTage?: Record<string, boolean>;
  einstellungenProTag?: Record<string, FeldTagesEinstellungen>;
}

export interface TournamentScheduleSettings {
  turnierStartDatum: string;
  turnierEndDatum: string;
  samstagStartzeit: string;
  samstagEndzeit: string;
  sonntagStartzeit: string;
  sonntagEndzeit: string;
  spielplanTimingProfil: SpielplanTimingProfil;
  spielplanTimingOverrides: SpielplanTimingOverrides;
}

export interface SpielplanZeitblock {
  id: string;
  label: string;
  datum: string;
  startzeit: string;
  endzeit: string;
  kategorien: string[];
}

export type PartialTournamentScheduleSettings = Partial<TournamentScheduleSettings>;

export interface TournamentScoreVisibilitySettings extends PartialTournamentScheduleSettings {
  samstagToreSichtbar?: boolean;
  sonntagToreSichtbar?: boolean;
}

export interface ScoreBearingSpiel {
  datum: string;
  ergebnis?: string | null;
  tore_team1?: number | null;
  tore_team2?: number | null;
}

export const DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS: TournamentScheduleSettings = {
  turnierStartDatum: TOURNAMENT_DEFAULTS.startDate,
  turnierEndDatum: TOURNAMENT_DEFAULTS.endDate,
  samstagStartzeit: TOURNAMENT_DEFAULTS.saturdayStartTime,
  samstagEndzeit: TOURNAMENT_DEFAULTS.saturdayEndTime,
  sonntagStartzeit: TOURNAMENT_DEFAULTS.sundayStartTime,
  sonntagEndzeit: TOURNAMENT_DEFAULTS.sundayEndTime,
  spielplanTimingProfil: 'standard',
  spielplanTimingOverrides: {},
};

export function getDefaultSpielplanZeitbloecke(
  settings: TournamentScheduleSettings = DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS
): SpielplanZeitblock[] {
  return [
    {
      id: 'samstag-mini-e',
      label: 'Mini und E-Jugend',
      datum: settings.turnierStartDatum,
      startzeit: settings.samstagStartzeit,
      endzeit: settings.samstagEndzeit,
      kategorien: ['Mini', 'Mini 1', 'Mini 2', 'Mini 3', 'E-Jugend'],
    },
    {
      id: 'sonntag-d',
      label: 'D-Jugend',
      datum: settings.turnierEndDatum,
      startzeit: '10:00',
      endzeit: '13:00',
      kategorien: ['D-Jugend weiblich', 'D-Jugend männlich'],
    },
    {
      id: 'sonntag-cba',
      label: 'C-, B- und A-Jugend',
      datum: settings.turnierEndDatum,
      startzeit: '13:15',
      endzeit: settings.sonntagEndzeit,
      kategorien: [
        'C-Jugend weiblich',
        'C-Jugend männlich',
        'B-Jugend weiblich',
        'B-Jugend männlich',
        'A-Jugend weiblich',
        'A-Jugend männlich',
      ],
    },
  ];
}

export function normalizeSpielplanZeitbloecke(
  value: unknown,
  settings: TournamentScheduleSettings = DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS
): SpielplanZeitblock[] {
  const source = Array.isArray(value) && value.length > 0
    ? value
    : getDefaultSpielplanZeitbloecke(settings);

  return source
    .map((item, index) => {
      const input = item as Partial<SpielplanZeitblock>;
      const fallback = getDefaultSpielplanZeitbloecke(settings)[index];
      const kategorien = Array.isArray(input.kategorien)
        ? input.kategorien.filter(isNonEmptyString)
        : fallback?.kategorien ?? [];

      return {
        id: isNonEmptyString(input.id) ? input.id : `zeitblock-${index + 1}`,
        label: isNonEmptyString(input.label) ? input.label : fallback?.label ?? `Zeitblock ${index + 1}`,
        datum: isNonEmptyString(input.datum) ? input.datum : fallback?.datum ?? settings.turnierStartDatum,
        startzeit: isValidTime(input.startzeit) ? input.startzeit : fallback?.startzeit ?? settings.samstagStartzeit,
        endzeit: isValidTime(input.endzeit) ? input.endzeit : fallback?.endzeit ?? settings.samstagEndzeit,
        kategorien,
      };
    })
    .filter((block) => block.kategorien.length > 0 && timeToMinutes(block.endzeit) > timeToMinutes(block.startzeit));
}

export const DEFAULT_FELD_EINSTELLUNGEN: FeldEinstellungen[] = [
  { id: 'feld1', name: 'Feld 1', spielzeit: 10, pausenzeit: 2, halbzeitpause: 0, zweiHalbzeiten: false, erlaubteJahrgaenge: [], erlaubteJahrgaengeProTag: {}, aktiveTage: {}, einstellungenProTag: {} },
  { id: 'feld2', name: 'Feld 2', spielzeit: 12, pausenzeit: 3, halbzeitpause: 0, zweiHalbzeiten: false, erlaubteJahrgaenge: [], erlaubteJahrgaengeProTag: {}, aktiveTage: {}, einstellungenProTag: {} },
  { id: 'feld3', name: 'Feld 3', spielzeit: 15, pausenzeit: 2, halbzeitpause: 0, zweiHalbzeiten: false, erlaubteJahrgaenge: [], erlaubteJahrgaengeProTag: {}, aktiveTage: {}, einstellungenProTag: {} },
  { id: 'feld4', name: 'Feld 4', spielzeit: 8, pausenzeit: 2, halbzeitpause: 2, zweiHalbzeiten: true, erlaubteJahrgaenge: [], erlaubteJahrgaengeProTag: {}, aktiveTage: {}, einstellungenProTag: {} },
  { id: 'feld5', name: 'Beachfeld', spielzeit: 12, pausenzeit: 3, halbzeitpause: 0, zweiHalbzeiten: false, erlaubteJahrgaenge: [], erlaubteJahrgaengeProTag: {}, aktiveTage: {}, einstellungenProTag: {} },
];

export function cloneDefaultFeldEinstellungen() {
  return normalizeFeldEinstellungen(DEFAULT_FELD_EINSTELLUNGEN);
}

export function normalizeFeldEinstellungen(value: unknown): FeldEinstellungen[] {
  const source = Array.isArray(value) && value.length > 0 ? value : DEFAULT_FELD_EINSTELLUNGEN;

  return source.map((feld, index) => {
    const input = feld as Partial<FeldEinstellungen>;

    const baseSettings: FeldTagesEinstellungen = {
      spielzeit: toPositiveInteger(input.spielzeit, DEFAULT_FELD_EINSTELLUNGEN[index]?.spielzeit ?? 10),
      pausenzeit: toNonNegativeInteger(input.pausenzeit, DEFAULT_FELD_EINSTELLUNGEN[index]?.pausenzeit ?? 2),
      halbzeitpause: toNonNegativeInteger(input.halbzeitpause, DEFAULT_FELD_EINSTELLUNGEN[index]?.halbzeitpause ?? 0),
      zweiHalbzeiten: Boolean(input.zweiHalbzeiten),
    };

    return {
      id: typeof input.id === 'string' && input.id.trim() ? input.id : `feld${index + 1}`,
      name: normalizeFeldName(input.name, `Feld ${index + 1}`),
      ...baseSettings,
      erlaubteJahrgaenge: Array.isArray(input.erlaubteJahrgaenge) ? input.erlaubteJahrgaenge.filter(isNonEmptyString) : [],
      erlaubteJahrgaengeProTag: normalizeJahrgaengeProTag(input.erlaubteJahrgaengeProTag),
      aktiveTage: normalizeAktiveTage(input.aktiveTage),
      einstellungenProTag: normalizeFeldEinstellungenProTag(input.einstellungenProTag, baseSettings),
    };
  });
}

export function getDuplicateFeldnamen(value: unknown): string[] {
  const fields = normalizeFeldEinstellungen(value);
  const seenNames = new Map<string, string>();
  const duplicateNames = new Map<string, string>();

  for (const field of fields) {
    const name = normalizeFeldName(field.name, '');
    const key = normalizeFeldNameKey(name);

    if (!key) {
      continue;
    }

    const firstName = seenNames.get(key);

    if (firstName) {
      duplicateNames.set(key, firstName);
    } else {
      seenNames.set(key, name);
    }
  }

  return Array.from(duplicateNames.values()).sort((a, b) => a.localeCompare(b, 'de'));
}

export function resolveFeldEinstellungenForDate(feld: FeldEinstellungen, datum: string): FeldEinstellungen {
  const daySettings = feld.einstellungenProTag?.[datum];

  return daySettings ? { ...feld, ...daySettings } : feld;
}

export function resolveTournamentScheduleSettings(
  settings: PartialTournamentScheduleSettings = {}
): TournamentScheduleSettings {
  return {
    turnierStartDatum: settings.turnierStartDatum || DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.turnierStartDatum,
    turnierEndDatum: settings.turnierEndDatum || DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.turnierEndDatum,
    samstagStartzeit: settings.samstagStartzeit || DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.samstagStartzeit,
    samstagEndzeit: settings.samstagEndzeit || DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.samstagEndzeit,
    sonntagStartzeit: settings.sonntagStartzeit || DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.sonntagStartzeit,
    sonntagEndzeit: settings.sonntagEndzeit || DEFAULT_TOURNAMENT_SCHEDULE_SETTINGS.sonntagEndzeit,
    spielplanTimingProfil: normalizeSpielplanTimingProfil(settings.spielplanTimingProfil),
    spielplanTimingOverrides: normalizeSpielplanTimingOverrides(settings.spielplanTimingOverrides),
  };
}

export function applySpielplanTimingOverrides(
  profile: SpielplanTimingProfile,
  overrides: unknown
): SpielplanTimingProfile {
  const normalizedOverrides = normalizeSpielplanTimingOverrides(overrides);

  if (Object.keys(normalizedOverrides).length === 0) {
    return profile;
  }

  return {
    ...profile,
    miniE: applyTimingOverride(profile.miniE, normalizedOverrides.miniE),
    d: applyTimingOverride(profile.d, normalizedOverrides.d),
    cba: applyTimingOverride(profile.cba, normalizedOverrides.cba),
  };
}

export function normalizeSpielplanTimingOverrides(value: unknown): SpielplanTimingOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return (['miniE', 'd', 'cba'] as SpielplanTimingGruppe[]).reduce<SpielplanTimingOverrides>((result, group) => {
    const override = normalizeTimingOverride((value as Record<string, unknown>)[group]);

    if (override) {
      result[group] = override;
    }

    return result;
  }, {});
}

export function getScoreVisibilityByDate(settings: TournamentScoreVisibilitySettings = {}) {
  const scheduleSettings = resolveTournamentScheduleSettings(settings);

  return {
    [scheduleSettings.turnierStartDatum]: settings.samstagToreSichtbar === true,
    [scheduleSettings.turnierEndDatum]: settings.sonntagToreSichtbar !== false,
  };
}

export function areScoresPublicForDate(settings: TournamentScoreVisibilitySettings, datum: string) {
  return getScoreVisibilityByDate(settings)[datum] === true;
}

export function hideInternalScoresForPublic<T extends ScoreBearingSpiel>(
  spiele: T[],
  settings: TournamentScoreVisibilitySettings
) {
  return spiele.map((spiel) => {
    if (areScoresPublicForDate(settings, spiel.datum)) {
      return spiel;
    }

    return {
      ...spiel,
      ergebnis: null,
      tore_team1: null,
      tore_team2: null,
    };
  });
}

function normalizeJahrgaengeProTag(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, string[]>>((result, [datum, jahrgaenge]) => {
    if (!isNonEmptyString(datum) || !Array.isArray(jahrgaenge)) {
      return result;
    }

    const normalizedJahrgaenge = jahrgaenge.filter(isNonEmptyString);
    if (normalizedJahrgaenge.length > 0) {
      result[datum] = normalizedJahrgaenge;
    }

    return result;
  }, {});
}

function normalizeAktiveTage(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, boolean>>((result, [datum, active]) => {
    if (!isNonEmptyString(datum)) {
      return result;
    }

    result[datum] = active !== false;
    return result;
  }, {});
}

function normalizeFeldEinstellungenProTag(value: unknown, fallback: FeldTagesEinstellungen) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, FeldTagesEinstellungen>>((result, [datum, rawSettings]) => {
    if (!isNonEmptyString(datum) || !rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
      return result;
    }

    const settings = rawSettings as Partial<FeldTagesEinstellungen>;
    result[datum] = {
      spielzeit: toPositiveInteger(settings.spielzeit, fallback.spielzeit),
      pausenzeit: toNonNegativeInteger(settings.pausenzeit, fallback.pausenzeit),
      halbzeitpause: toNonNegativeInteger(settings.halbzeitpause, fallback.halbzeitpause),
      zweiHalbzeiten: Boolean(settings.zweiHalbzeiten),
    };
    return result;
  }, {});
}

function normalizeFeldName(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim()
    ? value.replace(/\s+/g, ' ').trim()
    : fallback;
}

function normalizeFeldNameKey(value: string) {
  return normalizeFeldName(value, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .trim();
}

function applyTimingOverride(
  fallback: FeldTagesEinstellungen,
  override?: Partial<FeldTagesEinstellungen>
): FeldTagesEinstellungen {
  if (!override) {
    return fallback;
  }

  return {
    spielzeit: toPositiveInteger(override.spielzeit, fallback.spielzeit),
    pausenzeit: toNonNegativeInteger(override.pausenzeit, fallback.pausenzeit),
    halbzeitpause: toNonNegativeInteger(override.halbzeitpause, fallback.halbzeitpause),
    zweiHalbzeiten: typeof override.zweiHalbzeiten === 'boolean' ? override.zweiHalbzeiten : fallback.zweiHalbzeiten,
  };
}

function normalizeTimingOverride(value: unknown): Partial<FeldTagesEinstellungen> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const input = value as Partial<FeldTagesEinstellungen>;
  const override: Partial<FeldTagesEinstellungen> = {};

  if (input.spielzeit !== undefined) {
    override.spielzeit = toPositiveInteger(input.spielzeit, 1);
  }

  if (input.pausenzeit !== undefined) {
    override.pausenzeit = toNonNegativeInteger(input.pausenzeit, 0);
  }

  if (input.halbzeitpause !== undefined) {
    override.halbzeitpause = toNonNegativeInteger(input.halbzeitpause, 0);
  }

  if (typeof input.zweiHalbzeiten === 'boolean') {
    override.zweiHalbzeiten = input.zweiHalbzeiten;
  }

  return Object.keys(override).length > 0 ? override : null;
}

function toPositiveInteger(value: unknown, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function toNonNegativeInteger(value: unknown, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? Math.floor(numericValue) : fallback;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidTime(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return Number.isInteger(hours)
    && Number.isInteger(minutes)
    && hours >= 0
    && hours <= 23
    && minutes >= 0
    && minutes <= 59;
}

function timeToMinutes(value: string) {
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getCategoryByName(categoryName: string) {
  return TEAM_CATEGORIES.find((category) => category.name === categoryName);
}

export function categoryNeedsSkill(categoryName: string) {
  return getCategoryByName(categoryName)?.needsSkill ?? false;
}

export function calculateTeamCost(team: Pick<AnmeldungTeam, 'anzahl' | 'schiri'>) {
  const baseCost = team.anzahl * TOURNAMENT_DEFAULTS.teamFee;
  const refereeCost = team.schiri ? 0 : team.anzahl * TOURNAMENT_DEFAULTS.missingRefereeFee;

  return baseCost + refereeCost;
}

export function calculateRegistrationCost(teams: readonly Pick<AnmeldungTeam, 'anzahl' | 'schiri'>[]) {
  return teams.reduce((total, team) => total + calculateTeamCost(team), 0);
}

export function formatEuro(amount: number) {
  return `${amount}€`;
}
