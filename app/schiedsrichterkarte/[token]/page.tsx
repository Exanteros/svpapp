"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Spiel {
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

export default function SchiedsrichterkartePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [spiel, setSpiel] = useState<Spiel | null>(null);
  const [toreTeam1, setToreTeam1] = useState("");
  const [toreTeam2, setToreTeam2] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSpiel() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/schiedsrichterkarten/token?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Spiel konnte nicht geladen werden");
        }

        setSpiel(data.spiel);
        setToreTeam1(data.spiel.tore_team1 === null || data.spiel.tore_team1 === undefined ? "" : String(data.spiel.tore_team1));
        setToreTeam2(data.spiel.tore_team2 === null || data.spiel.tore_team2 === undefined ? "" : String(data.spiel.tore_team2));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Spiel konnte nicht geladen werden");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadSpiel();
    }
  }, [token]);

  async function saveResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setSaved(false);
      setError(null);
      const response = await fetch("/api/schiedsrichterkarten/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          toreTeam1: Number(toreTeam1),
          toreTeam2: Number(toreTeam2),
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Ergebnis konnte nicht gespeichert werden");
      }

      setSpiel(data.spiel);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Ergebnis konnte nicht gespeichert werden");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[100svh] max-w-md items-center px-4">
        <Card className="w-full rounded-[8px]">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Spiel wird geladen...
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!spiel) {
    return (
      <main className="mx-auto flex min-h-[100svh] max-w-md items-center px-4">
        <Card className="w-full rounded-[8px] border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg">Karte nicht verfügbar</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {error || "Der Karten-Code konnte nicht gelesen werden."}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] bg-[#f6f7f1] px-4 py-6">
      <div className="mx-auto max-w-md">
        <Card className="rounded-[8px] border-[#d9dec8] bg-white">
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="outline" className="border-[#d9dec8] text-[#5e6d35]">
                {spiel.feld}
              </Badge>
              <ShieldCheck className="size-5 text-[#5e6d35]" />
            </div>
            <div>
              <CardTitle className="text-xl leading-tight">Ergebnis eintragen</CardTitle>
              <p className="!mt-2 text-sm text-muted-foreground">
                {formatDate(spiel.datum)} · {spiel.zeit} Uhr · {spiel.kategorie}
              </p>
              <p className="!mt-2 text-sm font-medium text-[#4f5d2f]">
                Schiri: {spiel.schiedsrichter || "Schiri offen"}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveResult} className="grid gap-5">
              <ScoreInput
                id="team1"
                label={spiel.team1}
                value={toreTeam1}
                onChange={setToreTeam1}
              />
              <ScoreInput
                id="team2"
                label={spiel.team2}
                value={toreTeam2}
                onChange={setToreTeam2}
              />

              {error && (
                <div className="rounded-[8px] border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {saved && (
                <div className="flex items-center gap-2 rounded-[8px] border border-[#d9dec8] bg-[#f6f7f1] p-3 text-sm text-[#4f5d2f]">
                  <CheckCircle2 className="size-4" />
                  Ergebnis gespeichert: {spiel.ergebnis}
                </div>
              )}

              <Button
                type="submit"
                disabled={saving || !isScore(toreTeam1) || !isScore(toreTeam2)}
                className="h-11 bg-[#5e6d35] text-white hover:bg-[#4f5d2f]"
              >
                {saving ? "Speichert..." : "Ergebnis übernehmen"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function ScoreInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-sm font-medium leading-5">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="numeric"
        pattern="[0-9]*"
        min={0}
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 text-center text-2xl font-semibold"
      />
    </div>
  );
}

function isScore(value: string) {
  const score = Number(value);

  return value.trim() !== "" && Number.isInteger(score) && score >= 0;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}
