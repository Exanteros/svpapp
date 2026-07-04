export interface SpielGoalLike {
  status?: string | null;
  ergebnis?: string | null;
  tore_team1?: number | null;
  tore_team2?: number | null;
}

export interface GoalStats {
  goals: number;
  games: number;
}

export function calculateGoalStats(spiele: SpielGoalLike[]): GoalStats {
  return spiele.reduce<GoalStats>((stats, spiel) => {
    const goals = getSpielGoalTotal(spiel);

    if (goals === null) {
      return stats;
    }

    return {
      goals: stats.goals + goals,
      games: stats.games + 1,
    };
  }, { goals: 0, games: 0 });
}

export function getSpielGoalTotal(spiel: SpielGoalLike) {
  const team1Goals = normalizeGoalValue(spiel.tore_team1);
  const team2Goals = normalizeGoalValue(spiel.tore_team2);
  const hasSavedResult = Boolean(spiel.ergebnis?.trim()) || spiel.status === 'beendet';

  if (team1Goals !== null && team2Goals !== null && (hasSavedResult || team1Goals + team2Goals > 0)) {
    return team1Goals + team2Goals;
  }

  return parseResultGoals(spiel.ergebnis);
}

function normalizeGoalValue(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.floor(value);
}

function parseResultGoals(value: string | null | undefined) {
  const match = value?.match(/(\d+)\s*[:-]\s*(\d+)/);

  if (!match) {
    return null;
  }

  return Number(match[1]) + Number(match[2]);
}
