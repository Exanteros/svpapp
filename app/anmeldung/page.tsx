"use client";

import { useEffect, useState } from "react";
import { Euro, Info, LockKeyhole, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TypographyH1, TypographyLead } from "@/components/ui/typography";
import {
  SKILL_LEVELS,
  TEAM_CATEGORIES,
  TOURNAMENT_DEFAULTS,
  calculateRegistrationCost,
  calculateTeamCost,
  formatEuro,
  type AnmeldungTeam,
} from "@/lib/tournament";

export default function AnmeldungPage() {
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const [contactData, setContactData] = useState({
    verein: "",
    kontakt: "",
    email: "",
    mobil: "",
  });
  const [registrations, setRegistrations] = useState<AnmeldungTeam[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalCost = calculateRegistrationCost(registrations);

  useEffect(() => {
    let cancelled = false;

    async function loadRegistrationState() {
      try {
        const response = await fetch("/api/public/turnier-einstellungen", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));

        if (!cancelled) {
          setRegistrationOpen(response.ok ? data.anmeldungAktiv === true : false);
        }
      } catch (error) {
        console.error("Fehler beim Laden des Anmeldestatus:", error);

        if (!cancelled) {
          setRegistrationOpen(false);
        }
      }
    }

    loadRegistrationState();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (registrations.length === 0) {
      alert("Bitte wählen Sie mindestens eine Kategorie aus.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/anmeldungen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...contactData,
          teams: registrations,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        alert(`Fehler bei der Anmeldung: ${result.error}`);
        return;
      }

      const successMessage = [
        "Anmeldung erfolgreich.",
        "",
        `Anmeldungs-ID: ${result.anmeldungId}`,
        result.emailSent
          ? `Bestätigungsmail gesendet an: ${contactData.email}`
          : "Es wurde keine Bestätigungsmail versendet. Bitte notieren Sie die Anmeldungs-ID.",
      ];

      alert(successMessage.join("\n"));
      setContactData({ verein: "", kontakt: "", email: "", mobil: "" });
      setRegistrations([]);
    } catch (error) {
      console.error("Anmeldung fehlgeschlagen:", error);
      alert("Anmeldung fehlgeschlagen. Bitte versuchen Sie es später erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationOpen === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Card className="rounded-[8px] border-[#d9dec8]">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Anmeldung wird geprüft...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!registrationOpen) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Card className="rounded-[8px] border-[#d9dec8]">
          <CardHeader>
            <LockKeyhole className="mb-2 size-5 text-[#5e6d35]" />
            <CardTitle>Team-Anmeldung geschlossen</CardTitle>
            <CardDescription>
              Die Online-Anmeldung ist derzeit nicht verfügbar.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Bitte nutze den Spielplan und die Ergebnisse. Falls du Fragen zur Anmeldung hast, wende dich direkt an den SV Puschendorf.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-3xl">
        <Badge variant="outline" className="mb-4">
          Team-Anmeldung
        </Badge>
        <TypographyH1>
          Mannschaften anmelden
        </TypographyH1>
        <TypographyLead className="mt-3 text-base">
          Vereinsdaten erfassen, Kategorien auswählen und die Startgebühr direkt prüfen.
        </TypographyLead>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kontaktdaten</CardTitle>
              <CardDescription>Die Kontaktperson erhält die Bestätigungsmail.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="verein">Verein</Label>
                <Input
                  id="verein"
                  value={contactData.verein}
                  onChange={(event) => setContactData({ ...contactData, verein: event.target.value })}
                  placeholder="SV Musterverein"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kontakt">Ansprechpartner</Label>
                <Input
                  id="kontakt"
                  value={contactData.kontakt}
                  onChange={(event) => setContactData({ ...contactData, kontakt: event.target.value })}
                  placeholder="Max Mustermann"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactData.email}
                  onChange={(event) => setContactData({ ...contactData, email: event.target.value })}
                  placeholder="max@musterverein.de"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobil">Mobil</Label>
                <Input
                  id="mobil"
                  value={contactData.mobil}
                  onChange={(event) => setContactData({ ...contactData, mobil: event.target.value })}
                  placeholder="0123 456789"
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team hinzufügen</CardTitle>
              <CardDescription>Kategorie, Anzahl, Schiedsrichter und Spielstärke wählen.</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamRegistrationForm
                onAddRegistration={(registration) => setRegistrations([...registrations, registration])}
              />
            </CardContent>
          </Card>

          {registrations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Angemeldete Teams</CardTitle>
                <CardDescription>{registrations.length} Eintrag{registrations.length === 1 ? "" : "e"} vorbereitet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {registrations.map((registration, index) => (
                  <div
                    key={`${registration.kategorie}-${index}`}
                    className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{registration.kategorie}</Badge>
                      <Badge variant="secondary">
                        {registration.anzahl} Team{registration.anzahl > 1 ? "s" : ""}
                      </Badge>
                      {registration.spielstaerke && <Badge variant="secondary">{registration.spielstaerke}</Badge>}
                      <Badge variant={registration.schiri ? "default" : "destructive"}>
                        {registration.schiri ? "Mit Schiri" : "Ohne Schiri"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{formatEuro(calculateTeamCost(registration))}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Team entfernen"
                        onClick={() => setRegistrations(registrations.filter((_, currentIndex) => currentIndex !== index))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Gesamtkosten</span>
                  <span className="flex items-center gap-1">
                    <Euro className="size-4" />
                    {formatEuro(totalCost)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={registrations.length === 0 || isSubmitting}>
              {isSubmitting ? "Wird gesendet..." : "Anmeldung absenden"}
            </Button>
          </div>
        </form>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <Info className="mb-2 size-5 text-muted-foreground" />
              <CardTitle>Turnierinfo</CardTitle>
              <CardDescription>Startgeld und Schiedsrichterpauschale</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Samstag</p>
                <p>Mini-Kategorien und E-Jugend</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Sonntag</p>
                <p>D- bis A-Jugend</p>
              </div>
              <Separator />
              <p>Startgeld: {formatEuro(TOURNAMENT_DEFAULTS.teamFee)} pro Mannschaft</p>
              <p>Ohne Schiedsrichter: +{formatEuro(TOURNAMENT_DEFAULTS.missingRefereeFee)} pro Mannschaft</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Zahlung</CardTitle>
              <CardDescription>Verwendungszweck für die Überweisung</CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block rounded-md border bg-muted p-3 text-xs leading-5 text-muted-foreground">
                Rasenturnier 2025, {contactData.verein || "[Vereinsname]"}, {registrations.length} Team{registrations.length !== 1 ? "s" : ""}
              </code>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function TeamRegistrationForm({ onAddRegistration }: { onAddRegistration: (registration: AnmeldungTeam) => void }) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [teamCount, setTeamCount] = useState(1);
  const [hasReferee, setHasReferee] = useState(false);
  const [skillLevel, setSkillLevel] = useState("");

  const selectedCategoryData = TEAM_CATEGORIES.find((category) => category.id === selectedCategory);

  const handleAdd = () => {
    if (!selectedCategoryData || (selectedCategoryData.needsSkill && !skillLevel)) {
      return;
    }

    onAddRegistration({
      kategorie: selectedCategoryData.name,
      anzahl: teamCount,
      schiri: hasReferee,
      spielstaerke: skillLevel || undefined,
    });

    setSelectedCategory("");
    setTeamCount(1);
    setHasReferee(false);
    setSkillLevel("");
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="category">Kategorie</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Kategorie wählen" />
            </SelectTrigger>
            <SelectContent>
              {TEAM_CATEGORIES.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name} ({category.day})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="teamCount">Anzahl Teams</Label>
          <Select value={teamCount.toString()} onValueChange={(value) => setTeamCount(Number.parseInt(value, 10))}>
            <SelectTrigger id="teamCount">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: TOURNAMENT_DEFAULTS.maxTeamsPerCategorySelection }, (_, index) => index + 1).map((count) => (
                <SelectItem key={count} value={count.toString()}>
                  {count} Team{count > 1 ? "s" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="referee">Schiedsrichter</Label>
          <Select value={hasReferee.toString()} onValueChange={(value) => setHasReferee(value === "true")}>
            <SelectTrigger id="referee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Ja, mit Schiri</SelectItem>
              <SelectItem value="false">Nein, ohne Schiri (+{formatEuro(TOURNAMENT_DEFAULTS.missingRefereeFee)})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedCategoryData?.needsSkill && (
          <div className="space-y-2">
            <Label htmlFor="skillLevel">Spielstärke</Label>
            <Select value={skillLevel} onValueChange={setSkillLevel}>
              <SelectTrigger id="skillLevel">
                <SelectValue placeholder="Spielstärke wählen" />
              </SelectTrigger>
              <SelectContent>
                {SKILL_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={handleAdd}
        disabled={!selectedCategory || (selectedCategoryData?.needsSkill && !skillLevel)}
        className="justify-self-start"
      >
        <Plus className="size-4" />
        Team hinzufügen
      </Button>
    </div>
  );
}
