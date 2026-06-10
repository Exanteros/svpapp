import type { ComponentType } from "react";

export type AdminSectionId =
  | "overview"
  | "registrations"
  | "schedule"
  | "day"
  | "helpers"
  | "settings"
  | "exports";

export interface Team {
  id: string;
  kategorie: string;
  anzahl: number;
  schiri: boolean | number;
  spielstaerke?: string | null;
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
  turnierName: "Rasenturnier Puschendorf 2025",
  startgeld: 25,
  schiriGeld: 20,
  maxTeamsProKategorie: 8,
  anmeldeschluss: "2025-06-30",
  anzahlFelder: 5,
  adminEmail: "admin@sv-puschendorf.de",
  automatischeEmails: true,
  anmeldungAktiv: true,
  sichtbarkeit: "public",
  zahlungsarten: ["Überweisung", "PayPal", "Barzahlung"],
  datenschutz: true,
  turnierStartDatum: "2025-07-05",
  turnierEndDatum: "2025-07-06",
  samstagStartzeit: "13:00",
  samstagEndzeit: "17:00",
  sonntagStartzeit: "10:00",
  sonntagEndzeit: "17:00",
  samstagToreSichtbar: false,
  sonntagToreSichtbar: true,
  ergebnisTabellenAktiv: false,
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
