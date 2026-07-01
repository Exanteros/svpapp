import type { ComponentType } from "react";
import { TOURNAMENT_DEFAULTS } from "@/lib/tournament";

export type AdminSectionId =
  | "overview"
  | "registrations"
  | "schedule"
  | "day"
  | "helpers"
  | "settings"
  | "admins"
  | "exports";

export interface Team {
  id: string;
  kategorie: string;
  anzahl: number;
  schiri: boolean | number;
  spielstaerke?: string | null;
  schiriName?: string | null;
  schiri_name?: string | null;
}

export interface Anmeldung {
  id: string;
  verein: string;
  kontakt: string;
  email: string;
  mobil: string;
  kosten: number;
  status: RegistrationStatus;
  created_at: string;
  teams: Team[];
}

export interface Spiel {
  id: string;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  status: SpielStatus;
  ergebnis?: string | null;
  tore_team1?: number | null;
  tore_team2?: number | null;
  schiedsrichter?: string | null;
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
  erlaubteJahrgaenge: string[];
  erlaubteJahrgaengeProTag: Record<string, string[]>;
  aktiveTage: Record<string, boolean>;
  einstellungenProTag: Record<string, FeldTagesEinstellungen>;
}

export interface SpielFeldRename {
  id: string;
  from: string;
  to: string;
}

export interface SpielplanZeitblock {
  id: string;
  label: string;
  datum: string;
  startzeit: string;
  endzeit: string;
  kategorien: string[];
}

export type SpielplanTimingGruppe = "miniE" | "d" | "cba";
export type SpielplanTimingOverrides = Partial<Record<SpielplanTimingGruppe, Partial<FeldTagesEinstellungen>>>;

export interface Statistiken {
  anmeldungen: number;
  teams: number;
  bezahlt: number;
  gesamtKosten: number;
  kategorien: Record<string, number>;
  fieldsUsed: number;
}

export interface TurnierEinstellungen {
  turnierName: string;
  startgeld: number;
  schiriGeld: number;
  maxTeamsProKategorie: number;
  anmeldeschluss: string;
  anzahlFelder: number;
  adminEmail: string;
  automatischeEmails: boolean;
  anmeldungAktiv: boolean;
  sichtbarkeit: "public" | "private";
  zahlungsarten: string[];
  datenschutz: boolean;
  turnierStartDatum: string;
  turnierEndDatum: string;
  samstagStartzeit: string;
  samstagEndzeit: string;
  sonntagStartzeit: string;
  sonntagEndzeit: string;
  samstagToreSichtbar: boolean;
  sonntagToreSichtbar: boolean;
  ergebnisTabellenAktiv: boolean;
  spielzeitenAutomatisch: boolean;
  spielplanTimingProfil: "kompakt" | "standard" | "lang";
  spielplanTimingOverrides: SpielplanTimingOverrides;
  spielplanZeitbloecke: SpielplanZeitblock[];
  spielplanStatus: SpielplanStatus;
  spielplanPublishedAt?: string | null;
}

export type RegistrationStatus = "angemeldet" | "bezahlt" | "storniert";
export type SpielStatus = "geplant" | "laufend" | "halbzeit" | "beendet";
export type SpielplanStatus = "draft" | "published";

export interface HelferBedarf {
  id: string;
  titel: string;
  beschreibung: string;
  datum: string;
  startzeit: string;
  endzeit: string;
  anzahlBenötigt: number;
  kategorie:
    | "getraenke"
    | "kaffee_kuchen"
    | "grill"
    | "waffeln_suess"
    | "aufbau"
    | "sonstiges";
  aktiv: boolean | number;
  created_at: string;
}

export interface HelferAnmeldung {
  id: string;
  helferBedarfId: string;
  name: string;
  email: string;
  telefon?: string | null;
  bemerkung?: string | null;
  kuchenspende?: string | null;
  status: "angemeldet" | "bestätigt" | "abgesagt";
  created_at: string;
}

export interface AdminData {
  anmeldungen: Anmeldung[];
  statistiken: Statistiken;
  settings: TurnierEinstellungen;
}

export type RegistrationImportMode = "teams_payments" | "payments_only";

export interface RegistrationImportOptions {
  mode: RegistrationImportMode;
  replaceTeams: boolean;
}

export interface RegistrationImportWarning {
  row?: number;
  message: string;
}

export interface RegistrationImportResult {
  success: boolean;
  mode: RegistrationImportMode;
  replaceTeams: boolean;
  summary: {
    rows: number;
    entries: number;
    created: number;
    updated: number;
    skipped: number;
    paymentsUpdated: number;
    teamsInserted: number;
    teamsReplaced: number;
    warnings: RegistrationImportWarning[];
  };
}

export interface HelferData {
  bedarf: HelferBedarf[];
  anmeldungen: HelferAnmeldung[];
  helferLink: string;
}

export interface AdminNavItem {
  id: AdminSectionId;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

export const DEFAULT_STATS: Statistiken = {
  anmeldungen: 0,
  teams: 0,
  bezahlt: 0,
  gesamtKosten: 0,
  kategorien: {},
  fieldsUsed: 0,
};

export const DEFAULT_SETTINGS: TurnierEinstellungen = {
  turnierName: TOURNAMENT_DEFAULTS.name,
  startgeld: TOURNAMENT_DEFAULTS.teamFee,
  schiriGeld: TOURNAMENT_DEFAULTS.missingRefereeFee,
  maxTeamsProKategorie: TOURNAMENT_DEFAULTS.maxTeamsPerCategorySelection,
  anmeldeschluss: TOURNAMENT_DEFAULTS.registrationDeadline,
  anzahlFelder: 5,
  adminEmail: "admin@sv-puschendorf.de",
  automatischeEmails: true,
  anmeldungAktiv: true,
  sichtbarkeit: "public",
  zahlungsarten: ["Überweisung", "PayPal", "Barzahlung"],
  datenschutz: true,
  turnierStartDatum: TOURNAMENT_DEFAULTS.startDate,
  turnierEndDatum: TOURNAMENT_DEFAULTS.endDate,
  samstagStartzeit: TOURNAMENT_DEFAULTS.saturdayStartTime,
  samstagEndzeit: TOURNAMENT_DEFAULTS.saturdayEndTime,
  sonntagStartzeit: TOURNAMENT_DEFAULTS.sundayStartTime,
  sonntagEndzeit: TOURNAMENT_DEFAULTS.sundayEndTime,
  samstagToreSichtbar: false,
  sonntagToreSichtbar: true,
  ergebnisTabellenAktiv: false,
  spielzeitenAutomatisch: true,
  spielplanTimingProfil: "standard",
  spielplanTimingOverrides: {},
  spielplanZeitbloecke: [
    {
      id: "samstag-mini-e",
      label: "Mini und E-Jugend",
      datum: TOURNAMENT_DEFAULTS.startDate,
      startzeit: TOURNAMENT_DEFAULTS.saturdayStartTime,
      endzeit: TOURNAMENT_DEFAULTS.saturdayEndTime,
      kategorien: ["Mini", "Mini 1", "Mini 2", "Mini 3", "E-Jugend"],
    },
    {
      id: "sonntag-d",
      label: "D-Jugend",
      datum: TOURNAMENT_DEFAULTS.endDate,
      startzeit: TOURNAMENT_DEFAULTS.sundayStartTime,
      endzeit: "13:00",
      kategorien: ["D-Jugend weiblich", "D-Jugend männlich"],
    },
    {
      id: "sonntag-cba",
      label: "C-, B- und A-Jugend",
      datum: TOURNAMENT_DEFAULTS.endDate,
      startzeit: "13:15",
      endzeit: TOURNAMENT_DEFAULTS.sundayEndTime,
      kategorien: [
        "C-Jugend weiblich",
        "C-Jugend männlich",
        "B-Jugend weiblich",
        "B-Jugend männlich",
        "A-Jugend weiblich",
        "A-Jugend männlich",
      ],
    },
  ],
  spielplanStatus: "draft",
  spielplanPublishedAt: null,
};

export const TEAM_CATEGORIES = [
  "Mini",
  "Mini 1",
  "Mini 2",
  "Mini 3",
  "E-Jugend",
  "D-Jugend weiblich",
  "D-Jugend männlich",
  "C-Jugend weiblich",
  "C-Jugend männlich",
  "B-Jugend weiblich",
  "B-Jugend männlich",
  "A-Jugend weiblich",
  "A-Jugend männlich",
];
