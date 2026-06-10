"use client";

import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type { TurnierEinstellungen } from "./types";

interface SettingsPanelProps {
  settings: TurnierEinstellungen;
  saving: boolean;
  onChange: (settings: TurnierEinstellungen) => void;
  onSave: () => void;
}

export function SettingsPanel({ settings, saving, onChange, onSave }: SettingsPanelProps) {
  function update<K extends keyof TurnierEinstellungen>(key: K, value: TurnierEinstellungen[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <div className="grid gap-5 pb-20">
      <Card className="rounded-[8px]">
        <CardHeader>
          <CardTitle className="text-lg">Turnier</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="turnierName">Turniername</Label>
            <Input id="turnierName" value={settings.turnierName} onChange={(event) => update("turnierName", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Admin E-Mail</Label>
            <Input id="adminEmail" type="email" value={settings.adminEmail} onChange={(event) => update("adminEmail", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start">Startdatum</Label>
            <Input id="start" type="date" value={settings.turnierStartDatum} onChange={(event) => update("turnierStartDatum", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Enddatum</Label>
            <Input id="end" type="date" value={settings.turnierEndDatum} onChange={(event) => update("turnierEndDatum", event.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[8px]">
        <CardHeader>
          <CardTitle className="text-lg">Tage und Zeiten</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="samstagStart">Tag 1 Start</Label>
            <Input id="samstagStart" type="time" value={settings.samstagStartzeit} onChange={(event) => update("samstagStartzeit", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="samstagEnde">Tag 1 Ende</Label>
            <Input id="samstagEnde" type="time" value={settings.samstagEndzeit} onChange={(event) => update("samstagEndzeit", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sonntagStart">Tag 2 Start</Label>
            <Input id="sonntagStart" type="time" value={settings.sonntagStartzeit} onChange={(event) => update("sonntagStartzeit", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sonntagEnde">Tag 2 Ende</Label>
            <Input id="sonntagEnde" type="time" value={settings.sonntagEndzeit} onChange={(event) => update("sonntagEndzeit", event.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3 sm:col-span-2">
            <div>
              <Label htmlFor="samstagTore">Tag 1 Tore öffentlich</Label>
              <p className="!mt-1 text-xs text-muted-foreground">Aus: Ergebnisse werden intern gespeichert, aber öffentlich nicht angezeigt.</p>
            </div>
            <Switch
              id="samstagTore"
              checked={settings.samstagToreSichtbar}
              onCheckedChange={(value) => update("samstagToreSichtbar", value)}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3 sm:col-span-2">
            <div>
              <Label htmlFor="sonntagTore">Tag 2 Tore öffentlich</Label>
              <p className="!mt-1 text-xs text-muted-foreground">An: Ergebnisse erscheinen im öffentlichen Spielplan und bei Resultaten.</p>
            </div>
            <Switch
              id="sonntagTore"
              checked={settings.sonntagToreSichtbar}
              onCheckedChange={(value) => update("sonntagToreSichtbar", value)}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3 sm:col-span-2 xl:col-span-4">
            <div>
              <Label htmlFor="ergebnisTabellen">Tabellen auf Ergebnisse-Seite</Label>
              <p className="!mt-1 text-xs text-muted-foreground">
                Aus: /ergebnisse zeigt Resultate und Toranzahl ohne Ranking. An: Tabellen mit Punkten und Platzierungen werden angezeigt.
              </p>
            </div>
            <Switch
              id="ergebnisTabellen"
              checked={settings.ergebnisTabellenAktiv}
              onCheckedChange={(value) => update("ergebnisTabellenAktiv", value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[8px]">
        <CardHeader>
          <CardTitle className="text-lg">Anmeldung und Zahlung</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="startgeld">Startgeld</Label>
            <Input id="startgeld" type="number" value={settings.startgeld} onChange={(event) => update("startgeld", Number(event.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schiriGeld">Schiri-Gebühr</Label>
            <Input id="schiriGeld" type="number" value={settings.schiriGeld} onChange={(event) => update("schiriGeld", Number(event.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxTeams">Max. Teams</Label>
            <Input id="maxTeams" type="number" value={settings.maxTeamsProKategorie} onChange={(event) => update("maxTeamsProKategorie", Number(event.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Sichtbarkeit</Label>
            <Select value={settings.sichtbarkeit} onValueChange={(value) => update("sichtbarkeit", value as TurnierEinstellungen["sichtbarkeit"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Öffentlich</SelectItem>
                <SelectItem value="private">Privat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <div>
              <Label htmlFor="anmeldungAktiv">Team-Anmeldung aktiv</Label>
              <p className="!mt-1 text-xs text-muted-foreground">Aus: Button verschwindet und die Anmeldeseite nimmt keine Teams an.</p>
            </div>
            <Switch
              id="anmeldungAktiv"
              checked={settings.anmeldungAktiv}
              onCheckedChange={(value) => update("anmeldungAktiv", value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="emails">Automatische E-Mails</Label>
            <Switch id="emails" checked={settings.automatischeEmails} onCheckedChange={(value) => update("automatischeEmails", value)} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <Label htmlFor="datenschutz">Datenschutz bestätigt erforderlich</Label>
            <Switch id="datenschutz" checked={settings.datenschutz} onCheckedChange={(value) => update("datenschutz", value)} />
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/90 px-3 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl justify-end">
          <Button onClick={onSave} disabled={saving} className="w-full bg-[#5e6d35] text-white hover:bg-[#4f5d2f] sm:w-auto">
            <Save className="size-4" />
            {saving ? "Speichert..." : "Einstellungen speichern"}
          </Button>
        </div>
      </div>
    </div>
  );
}
