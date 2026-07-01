import { NextRequest, NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { notifySpielplanChanged } from "@/lib/spielplan-events";
import { verifyRefereeCardToken } from "@/lib/referee-card-token";

interface SpielRow {
  id: string | number;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  status: string;
  ergebnis?: string | null;
  tore_team1?: number | null;
  tore_team2?: number | null;
  schiedsrichter?: string | null;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const payload = verifyRefereeCardToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Ungültiger Karten-Code" }, { status: 400 });
  }

  const spiel = getSpiel(payload.spielId);

  if (!spiel) {
    return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    spiel,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, toreTeam1, toreTeam2 } = await request.json();
    const payload = verifyRefereeCardToken(String(token || ""));

    if (!payload) {
      return NextResponse.json({ error: "Ungültiger Karten-Code" }, { status: 400 });
    }

    const scoreTeam1 = parseScore(toreTeam1);
    const scoreTeam2 = parseScore(toreTeam2);

    if (scoreTeam1 === null || scoreTeam2 === null) {
      return NextResponse.json({ error: "Tore müssen ganze Zahlen ab 0 sein" }, { status: 400 });
    }

    const existingSpiel = getSpiel(payload.spielId);

    if (!existingSpiel) {
      return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 });
    }

    if (existingSpiel.status === "beendet" && existingSpiel.ergebnis) {
      return NextResponse.json(
        { error: "Dieses Ergebnis wurde bereits gespeichert" },
        { status: 409 }
      );
    }

    const db = getDatabase();
    const ergebnis = `${scoreTeam1}:${scoreTeam2}`;
    const result = db.prepare(`
      UPDATE spiele
      SET ergebnis = ?, tore_team1 = ?, tore_team2 = ?, status = 'beendet'
      WHERE id = ?
    `).run(ergebnis, scoreTeam1, scoreTeam2, payload.spielId);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 });
    }

    notifySpielplanChanged({ reason: "referee-card-result", spielId: payload.spielId, status: "beendet" });

    return NextResponse.json({
      success: true,
      spiel: getSpiel(payload.spielId),
    });
  } catch (error) {
    console.error("Fehler beim Speichern der Schiedsrichterkarte:", error);
    return NextResponse.json({ error: "Ergebnis konnte nicht gespeichert werden" }, { status: 500 });
  }
}

function getSpiel(spielId: string) {
  const db = getDatabase();

  return db.prepare("SELECT * FROM spiele WHERE id = ?").get(spielId) as SpielRow | undefined;
}

function parseScore(value: unknown) {
  const score = Number(value);

  if (!Number.isInteger(score) || score < 0 || score > 999) {
    return null;
  }

  return score;
}
