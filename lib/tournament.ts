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

export const SKILL_LEVELS = ['Anfänger', 'Fortgeschritten', 'Leistung'] as const;

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

export interface AnmeldungTeam {
  kategorie: string;
  anzahl: number;
  schiri: boolean;
  spielstaerke?: string;
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
