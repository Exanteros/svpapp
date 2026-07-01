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

const TEAM_NUMBER_SUFFIX_PATTERN = /\s+(\d+)$/;
const TEAM_CATEGORY_SUFFIX_PATTERN =
  /\s+(?:mini(?:\s*\d+)?(?:\s*\([^)]*\))?|[a-e]-jugend(?:\s+(?:weiblich|männlich|maennlich|mannlich|gemischt))?|(?:w|m|g|gm)[a-e])$/i;

export function createTeamDisplayNameMap(teamNames: string[]) {
  const normalizedTeamNames = Array.from(
    new Set(teamNames.map(normalizeTeamDisplayInput).filter(Boolean))
  );
  const groupedByBaseKey = new Map<string, string[]>();

  normalizedTeamNames.forEach((teamName) => {
    const baseKey = getTeamDisplayKey(teamName);
    const group = groupedByBaseKey.get(baseKey) || [];

    group.push(teamName);
    groupedByBaseKey.set(baseKey, group);
  });

  const displayNames = new Map<string, string>();

  groupedByBaseKey.forEach((teamNamesForBase) => {
    const sortedTeamNames = [...teamNamesForBase].sort((a, b) =>
      a.localeCompare(b, 'de-DE', { numeric: true, sensitivity: 'base' })
    );

    sortedTeamNames.forEach((teamName, index) => {
      const baseName = getTeamDisplayBaseName(teamName);
      const displayName = sortedTeamNames.length > 1
        ? `${baseName} ${index + 1}`
        : baseName;

      displayNames.set(teamName, displayName);
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

export function getSpielzeitRegelForKategorie(categoryName: string): FeldTagesEinstellungen {
  const normalized = normalizeSpielzeitKategorie(categoryName);

  if (normalized.startsWith('mini') || normalized.startsWith('ejugend')) {
    return createSpielzeitRegel(7);
  }

  if (normalized.startsWith('djugend')) {
    return createSpielzeitRegel(10);
  }

  return createSpielzeitRegel(13);
}

function createSpielzeitRegel(spielzeit: number): FeldTagesEinstellungen {
  return {
    spielzeit,
    pausenzeit: 2,
    halbzeitpause: 0,
    zweiHalbzeiten: false,
  };
}

function normalizeSpielzeitKategorie(value: string) {
  return value
    .replace(/\([^)]*\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
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
      name: typeof input.name === 'string' && input.name.trim() ? input.name : `Feld ${index + 1}`,
      ...baseSettings,
      erlaubteJahrgaenge: Array.isArray(input.erlaubteJahrgaenge) ? input.erlaubteJahrgaenge.filter(isNonEmptyString) : [],
      erlaubteJahrgaengeProTag: normalizeJahrgaengeProTag(input.erlaubteJahrgaengeProTag),
      aktiveTage: normalizeAktiveTage(input.aktiveTage),
      einstellungenProTag: normalizeFeldEinstellungenProTag(input.einstellungenProTag, baseSettings),
    };
  });
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
  };
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
