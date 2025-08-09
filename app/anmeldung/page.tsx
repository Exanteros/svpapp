"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Euro, Info } from "lucide-react";
import Link from "next/link";

interface TeamRegistration {
  category: string;
  teamCount: number;
  hasReferee: boolean;
  skillLevel?: string;
}

export default function AnmeldungPage() {
  const [contactData, setContactData] = useState({
    verein: "",
    kontakt: "",
    email: "",
    mobil: "",
  });

  const [registrations, setRegistrations] = useState<TeamRegistration[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const addRegistration = (category: string, teamCount: number, hasReferee: boolean, skillLevel?: string) => {
    const newRegistration: TeamRegistration = {
      category,
      teamCount,
      hasReferee,
      skillLevel,
    };
    setRegistrations([...registrations, newRegistration]);
  };

  const removeRegistration = (index: number) => {
    setRegistrations(registrations.filter((_, i) => i !== index));
  };

  const calculateTotalCost = () => {
    return registrations.reduce((total, reg) => {
      const baseCost = reg.teamCount * 25; // 25€ pro Team
      const refereeCost = reg.hasReferee ? 0 : reg.teamCount * 20; // 20€ extra wenn ohne Schiri
      return total + baseCost + refereeCost;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registrations.length === 0) {
      alert("Bitte wählen Sie mindestens eine Kategorie aus.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/anmeldungen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verein: contactData.verein,
          kontakt: contactData.kontakt,
          email: contactData.email,
          mobil: contactData.mobil,
          teams: registrations.map(reg => ({
            kategorie: reg.category,
            anzahl: reg.teamCount,
            schiri: reg.hasReferee,
            spielstaerke: reg.skillLevel
          }))
        })
      });

      const result = await response.json();

      if (response.ok) {
        const successMessage = [
          '✅ Anmeldung erfolgreich!',
          '',
          `Anmeldungs-ID: ${result.anmeldungId}`,
          `Bestätigungsmail gesendet an: ${contactData.email}`,
          ''
        ];

        if (result.teamEmail) {
          successMessage.push('📧 Automatisch erstellte Team-Email für isolierte Kommunikation:');
          successMessage.push(`${result.teamEmail}`);
          successMessage.push('');
          successMessage.push('Diese Email-Adresse können Sie für alle turnierrelevanten');
          successMessage.push('Rückfragen verwenden. Sie ist ausschließlich für Ihr Team.');
        }

        alert(successMessage.join('\n'));
        
        // Formular zurücksetzen
        setContactData({ verein: "", kontakt: "", email: "", mobil: "" });
        setRegistrations([]);
      } else {
        alert(`❌ Fehler bei der Anmeldung: ${result.error}`);
      }
    } catch (error) {
      console.error('Anmeldung fehlgeschlagen:', error);
      alert('❌ Anmeldung fehlgeschlagen. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
              Zurück
            </Link>
            <div className="flex items-center gap-3">
              {/* Handball Ball Icon */}
              <div className="relative w-8 h-8">
                <div className="w-8 h-8 bg-orange-500 rounded-full"></div>
                <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full"></div>
                <div className="absolute top-2 left-2 w-4 h-4 bg-orange-500 rounded-full"></div>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Team-Anmeldung</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Turnierinfo */}
          <Card className="mb-8 bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-orange-500" />
                Turnierinfo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Samstag, 5. Juli 2025</h4>
                  <p className="text-sm text-gray-600">13:00 - 17:00 Uhr</p>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• Mini-Kategorien (3, 2, 1)</li>
                    <li>• E-Jugend (weiblich, gemischt, männlich)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold">Sonntag, 6. Juli 2025</h4>
                  <p className="text-sm text-gray-600">10:00 - 14:00 Uhr & 13:00 - 17:00 Uhr</p>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• D-Jugend, C-Jugend</li>
                    <li>• B-Jugend, A-Jugend</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-900">Kosten:</h4>
                <p className="text-orange-800 text-sm">
                  • Startgeld: 25€ pro Mannschaft<br />
                  • Ohne Schiedsrichter: +20€ pro Mannschaft
                </p>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Kontaktdaten */}
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle>Kontaktdaten</CardTitle>
                <CardDescription>Ihre Vereins- und Kontaktinformationen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="verein">Verein *</Label>
                    <Input
                      id="verein"
                      value={contactData.verein}
                      onChange={(e) => setContactData({ ...contactData, verein: e.target.value })}
                      placeholder="SV Musterverein"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="kontakt">Ansprechpartner *</Label>
                    <Input
                      id="kontakt"
                      value={contactData.kontakt}
                      onChange={(e) => setContactData({ ...contactData, kontakt: e.target.value })}
                      placeholder="Max Mustermann"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-Mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={contactData.email}
                      onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                      placeholder="max@musterverein.de"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobil">Mobil *</Label>
                    <Input
                      id="mobil"
                      value={contactData.mobil}
                      onChange={(e) => setContactData({ ...contactData, mobil: e.target.value })}
                      placeholder="0123 456789"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team-Anmeldungen */}
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle>Team-Anmeldungen</CardTitle>
                <CardDescription>Wählen Sie die Kategorien und Anzahl der Teams</CardDescription>
              </CardHeader>
              <CardContent>
                <TeamRegistrationForm onAddRegistration={addRegistration} />
              </CardContent>
            </Card>

            {/* Angemeldete Teams */}
            {registrations.length > 0 && (
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle>Angemeldete Teams</CardTitle>
                  <CardDescription>Übersicht Ihrer Anmeldungen</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {registrations.map((reg, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="border-orange-300 text-orange-700">{reg.category}</Badge>
                          <span className="text-sm">
                            {reg.teamCount} Team{reg.teamCount > 1 ? 's' : ''}
                          </span>
                          {reg.skillLevel && (
                            <Badge variant="secondary" className="bg-gray-200 text-gray-700">{reg.skillLevel}</Badge>
                          )}
                          <Badge variant={reg.hasReferee ? "default" : "destructive"} className={reg.hasReferee ? "bg-green-100 text-green-800 border-green-300" : "bg-orange-100 text-orange-800 border-orange-300"}>
                            {reg.hasReferee ? "Mit Schiri" : "Ohne Schiri"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {reg.teamCount * 25 + (reg.hasReferee ? 0 : reg.teamCount * 20)}€
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRegistration(index)}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          >
                            Entfernen
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between font-semibold">
                    <span>Gesamtkosten:</span>
                    <span className="flex items-center gap-1 text-orange-600">
                      <Euro className="h-4 w-4" />
                      {calculateTotalCost()}€
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Zahlungsinfo */}
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle>Zahlungshinweise</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Bitte überweisen Sie das Startgeld auf das Vereinskonto des SV Puschendorf:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm font-mono">
                    <strong>Verwendungszweck:</strong><br />
                    "Rasenturnier 2025, {contactData.verein || '[Vereinsname]'}, {registrations.length} Team{registrations.length !== 1 ? 's' : ''}"
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3"
                disabled={registrations.length === 0 || isSubmitting}
              >
                {isSubmitting ? "Wird gesendet..." : "Anmeldung absenden"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function TeamRegistrationForm({ onAddRegistration }: { onAddRegistration: (category: string, teamCount: number, hasReferee: boolean, skillLevel?: string) => void }) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [teamCount, setTeamCount] = useState(1);
  const [hasReferee, setHasReferee] = useState(false);
  const [skillLevel, setSkillLevel] = useState("");

  const categories = [
    { id: "mini-3", name: "Mini 3 (echte Anfänger)", needsSkill: false, day: "Samstag" },
    { id: "mini-2", name: "Mini 2 (Anfänger)", needsSkill: false, day: "Samstag" },
    { id: "mini-1", name: "Mini 1 (Fortgeschrittene)", needsSkill: false, day: "Samstag" },
    { id: "e-jugend", name: "E-Jugend", needsSkill: true, day: "Samstag" },
    { id: "d-weiblich", name: "D-Jugend weiblich", needsSkill: true, day: "Sonntag" },
    { id: "d-männlich", name: "D-Jugend männlich", needsSkill: true, day: "Sonntag" },
    { id: "c-weiblich", name: "C-Jugend weiblich", needsSkill: true, day: "Sonntag" },
    { id: "c-männlich", name: "C-Jugend männlich", needsSkill: true, day: "Sonntag" },
    { id: "b-weiblich", name: "B-Jugend weiblich", needsSkill: true, day: "Sonntag" },
    { id: "b-männlich", name: "B-Jugend männlich", needsSkill: true, day: "Sonntag" },
    { id: "a-weiblich", name: "A-Jugend weiblich", needsSkill: true, day: "Sonntag" },
    { id: "a-männlich", name: "A-Jugend männlich", needsSkill: true, day: "Sonntag" },
  ];

  const skillLevels = ["Anfänger", "Fortgeschritten", "Leistung"];

  const handleAdd = () => {
    if (!selectedCategory) return;
    
    const category = categories.find(c => c.id === selectedCategory);
    if (!category) return;

    const needsSkill = category.needsSkill && !skillLevel;
    if (needsSkill) return;

    onAddRegistration(category.name, teamCount, hasReferee, skillLevel || undefined);
    
    // Reset form
    setSelectedCategory("");
    setTeamCount(1);
    setHasReferee(false);
    setSkillLevel("");
  };

  const selectedCategoryData = categories.find(c => c.id === selectedCategory);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="category">Kategorie</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Kategorie wählen" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name} ({category.day})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="teamCount">Anzahl Teams</Label>
          <Select value={teamCount.toString()} onValueChange={(value) => setTeamCount(parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((count) => (
                <SelectItem key={count} value={count.toString()}>
                  {count} Team{count > 1 ? 's' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="referee">Schiedsrichter</Label>
          <Select value={hasReferee.toString()} onValueChange={(value) => setHasReferee(value === "true")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Ja, mit Schiri</SelectItem>
              <SelectItem value="false">Nein, ohne Schiri (+20€)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedCategoryData?.needsSkill && (
          <div>
            <Label htmlFor="skillLevel">Spielstärke</Label>
            <Select value={skillLevel} onValueChange={setSkillLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Spielstärke wählen" />
              </SelectTrigger>
              <SelectContent>
                {skillLevels.map((level) => (
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
        onClick={handleAdd}
        disabled={!selectedCategory || (selectedCategoryData?.needsSkill && !skillLevel)}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
      >
        Team hinzufügen
      </Button>
    </div>
  );
}
