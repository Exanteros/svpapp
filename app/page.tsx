import HomePageClient, { type TurnierEinstellungen } from "./home-page-client";

import { getAdminSettings } from "@/lib/db";
import { resolveTournamentScheduleSettings } from "@/lib/tournament";

export const dynamic = "force-dynamic";

const fallbackTurnierEinstellungen: TurnierEinstellungen = {
  turnierStartDatum: "2025-07-05",
  turnierEndDatum: "2025-07-06",
  samstagStartzeit: "13:00",
  samstagEndzeit: "17:00",
  sonntagStartzeit: "10:00",
  sonntagEndzeit: "17:00",
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
