import HomePageClient, { type TurnierEinstellungen } from "./home-page-client";

import { getAdminSettings } from "@/lib/db";
import { resolveTournamentScheduleSettings, TOURNAMENT_DEFAULTS } from "@/lib/tournament";

export const dynamic = "force-dynamic";

const fallbackTurnierEinstellungen: TurnierEinstellungen = {
  turnierStartDatum: TOURNAMENT_DEFAULTS.startDate,
  turnierEndDatum: TOURNAMENT_DEFAULTS.endDate,
  samstagStartzeit: TOURNAMENT_DEFAULTS.saturdayStartTime,
  samstagEndzeit: TOURNAMENT_DEFAULTS.saturdayEndTime,
  sonntagStartzeit: TOURNAMENT_DEFAULTS.sundayStartTime,
  sonntagEndzeit: TOURNAMENT_DEFAULTS.sundayEndTime,
  anmeldungAktiv: false,
};

function getInitialTurnierEinstellungen(): TurnierEinstellungen {
  try {
    const settings = getAdminSettings();
    const scheduleSettings = resolveTournamentScheduleSettings(settings);

    return {
      turnierStartDatum: scheduleSettings.turnierStartDatum,
      turnierEndDatum: scheduleSettings.turnierEndDatum,
      samstagStartzeit: scheduleSettings.samstagStartzeit,
      samstagEndzeit: scheduleSettings.samstagEndzeit,
      sonntagStartzeit: scheduleSettings.sonntagStartzeit,
      sonntagEndzeit: scheduleSettings.sonntagEndzeit,
      anmeldungAktiv: settings.anmeldungAktiv !== false,
    };
  } catch (error) {
    console.error("Homepage-SEO-Daten konnten nicht geladen werden:", error);
    return fallbackTurnierEinstellungen;
  }
}

export default function HomePage() {
  return <HomePageClient initialTurnierEinstellungen={getInitialTurnierEinstellungen()} />;
}
