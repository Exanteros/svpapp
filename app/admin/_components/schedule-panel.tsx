"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle, ExternalLink, Plus, Trash2, Wand2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { DangerZone } from "./danger-zone";
import { formatDate } from "./format";
import { ScheduleDragBoard } from "./schedule-drag-board";
import type { FeldEinstellungen, FeldTagesEinstellungen, Spiel, TurnierEinstellungen } from "./types";
import { TEAM_CATEGORIES } from "./types";

interface SchedulePanelProps {
  settings: TurnierEinstellungen;
  feldEinstellungen: FeldEinstellungen[];
  spiele: Spiel[];
  saving: boolean;
  onFeldSettingsSave: (settings: FeldEinstellungen[]) => boolean | Promise<boolean>;
  onGenerate: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDeleteAll: () => void;
  onSpielMove: (spielId: string, patch: Pick<Spiel, "datum" | "zeit" | "feld">) => Promise<unknown> | unknown;
}

export function SchedulePanel({
  settings,
  feldEinstellungen,
  spiele,
  saving,
  onFeldSettingsSave,
  onGenerate,
  onPublish,
  onUnpublish,
  onDeleteAll,
  onSpielMove,
}: SchedulePanelProps) {
  const [draftFields, setDraftFields] = useState(feldEinstellungen);
  const [savedSignature, setSavedSignature] = useState(() => JSON.stringify(feldEinstellungen));
  const draftSignature = useMemo(() => JSON.stringify(draftFields), [draftFields]);
  const hasUnsavedFields = draftSignature !== savedSignature;
  const previewHref = settings.spielplanStatus === "published" ? "/spielplan" : "/spielplan?preview=1";
  const days = useMemo(
    () => [
      { label: "Tag 1", date: settings.turnierStartDatum, time: `${settings.samstagStartzeit} - ${settings.samstagEndzeit}` },
      { label: "Tag 2", date: settings.turnierEndDatum, time: `${settings.sonntagStartzeit} - ${settings.sonntagEndzeit}` },
    ],
    [
      settings.turnierStartDatum,
      settings.turnierEndDatum,
      settings.samstagStartzeit,
      settings.samstagEndzeit,
      settings.sonntagStartzeit,
      settings.sonntagEndzeit,
    ]
  );
  const daySignature = useMemo(() => days.map((day) => day.date).join("|"), [days]);

  useEffect(() => {
    const nextFields = materializeFieldsForDays(feldEinstellungen, days);
    setDraftFields(nextFields);
    setSavedSignature(JSON.stringify(feldEinstellungen));
  }, [feldEinstellungen, daySignature, days]);

  function updateField(id: string, patch: Partial<FeldEinstellungen>) {
    setDraftFields((fields) =>
      fields.map((field) => (field.id === id ? { ...field, ...patch } : field))
    );
  }

  function addField() {
    setDraftFields((fields) => {
      const nextNumber = getNextFieldNumber(fields);
      const template = fields[fields.length - 1];
      const aktiveTage = days.reduce<Record<string, boolean>>((result, day) => {
        result[day.date] = true;
        return result;
      }, {});
      const einstellungenProTag = days.reduce<Record<string, FeldTagesEinstellungen>>((result, day) => {
        result[day.date] = getFieldDaySettings(template, day.date);
        return result;
      }, {});

      return [
        ...fields,
        {
          id: createFieldId(fields, nextNumber),
          name: `Feld ${nextNumber}`,
          spielzeit: template?.spielzeit ?? 10,
          pausenzeit: template?.pausenzeit ?? 2,
          halbzeitpause: template?.halbzeitpause ?? 0,
          zweiHalbzeiten: template?.zweiHalbzeiten ?? false,
          erlaubteJahrgaenge: [],
          erlaubteJahrgaengeProTag: {},
          aktiveTage,
          einstellungenProTag,
        },
      ];
    });
  }

  function deleteField(id: string) {
    setDraftFields((fields) => {
      if (fields.length <= 1) return fields;

      return fields.filter((field) => field.id !== id);
    });
  }

  function updateFieldDay(fieldId: string, date: string, active: boolean) {
    setDraftFields((fields) =>
      fields.map((field) => {
        if (field.id !== fieldId) return field;
        const nextSettings = getFieldDaySettings(field, date);

        return {
          ...field,
          aktiveTage: {
            ...(field.aktiveTage || {}),
            [date]: active,
          },
          einstellungenProTag: {
            ...(field.einstellungenProTag || {}),
            [date]: nextSettings,
          },
        };
      })
    );
  }

  function updateFieldDaySettings(fieldId: string, date: string, patch: Partial<FeldTagesEinstellungen>) {
    setDraftFields((fields) =>
      fields.map((field) => {
        if (field.id !== fieldId) return field;
        const current = getFieldDaySettings(field, date);

        return {
          ...field,
          einstellungenProTag: {
            ...(field.einstellungenProTag || {}),
            [date]: {
              ...current,
              ...patch,
            },
          },
        };
      })
    );
  }

  function addCategory(fieldId: string, date: string, category: string) {
    setDraftFields((fields) =>
      fields.map((field) => {
        if (field.id !== fieldId) return field;
        const current = field.erlaubteJahrgaengeProTag?.[date] || [];
        if (current.includes(category)) return field;

        return {
          ...field,
          erlaubteJahrgaengeProTag: {
            ...field.erlaubteJahrgaengeProTag,
            [date]: [...current, category],
          },
        };
      })
    );
  }

  function removeCategory(fieldId: string, date: string, category: string) {
    setDraftFields((fields) =>
      fields.map((field) => {
        if (field.id !== fieldId) return field;
        const current = field.erlaubteJahrgaengeProTag?.[date] || [];

        return {
          ...field,
          erlaubteJahrgaengeProTag: {
            ...field.erlaubteJahrgaengeProTag,
            [date]: current.filter((item) => item !== category),
          },
        };
      })
    );
  }

  async function saveFieldDraft() {
    const nextFields = materializeFieldsForDays(draftFields, days);
    const saved = await onFeldSettingsSave(nextFields);

    if (saved) {
      const nextSignature = JSON.stringify(nextFields);
      setDraftFields(nextFields);
      setSavedSignature(nextSignature);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["1", "Felder prüfen"],
          ["2", "Kategorien je Tag zuordnen"],
          ["3", "Spielplan generieren"],
          ["4", "Öffentlich prüfen"],
        ].map(([number, label]) => (
          <div key={number} className="rounded-[8px] border bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-[#eef1e5] text-sm font-semibold text-[#5e6d35]">
                {number}
              </span>
              <span className="text-sm font-medium">{label}</span>
            </div>
          </div>
        ))}
      </div>

      <Card className="min-w-0 overflow-hidden rounded-[8px]">
        <CardHeader className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-lg">1. Felder und Tage einrichten</CardTitle>
            <p className="!mt-1 text-sm text-muted-foreground">Jedes Feld bekommt pro Turniertag eigene Spielminuten, Pausen und Halbzeitwerte.</p>
          </div>
          <div className="grid gap-2 sm:flex sm:items-center">
            <Badge variant="outline" className="w-fit border-[#d9dec8] text-[#5e6d35]">
              {draftFields.length} Felder
            </Badge>
            <Button type="button" variant="outline" size="sm" onClick={addField} className="w-full sm:w-auto">
              <Plus className="size-4" />
              Feld hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-2 rounded-[8px] border border-[#d9dec8] bg-[#f6f7f1] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <span className="font-medium">{hasUnsavedFields ? "Ungespeicherte Feldeinstellungen" : "Feldeinstellungen gespeichert"}</span>
              <span className="ml-2 text-muted-foreground">
                {hasUnsavedFields ? "Speichern, bevor ein neuer Plan generiert wird." : "Bereit für die Spielplan-Erstellung."}
              </span>
            </div>
            <Button
              type="button"
              variant={hasUnsavedFields ? "default" : "outline"}
              size="sm"
              disabled={!hasUnsavedFields || saving}
              onClick={saveFieldDraft}
              className={hasUnsavedFields ? "w-full bg-[#5e6d35] text-white hover:bg-[#4f5d2f] sm:w-auto" : "w-full sm:w-auto"}
            >
              {saving ? "Speichert..." : "Felder speichern"}
            </Button>
          </div>
          <div className="grid min-w-0 gap-3 xl:grid-cols-2">
            {draftFields.map((field) => (
              <div key={field.id} className="min-w-0 overflow-hidden rounded-[8px] border p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Input
                    value={field.name}
                    onChange={(event) => updateField(field.id, { name: event.target.value })}
                    className="h-9 w-full bg-white font-medium sm:max-w-[180px]"
                  />
                  <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={draftFields.length <= 1}
                      onClick={() => deleteField(field.id)}
                      aria-label={`${field.name || "Feld"} entfernen`}
                      title={draftFields.length <= 1 ? "Mindestens ein Feld muss bleiben" : "Feld entfernen"}
                      className="ml-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3">
                  {days.map((day) => {
                    const daySettings = getFieldDaySettings(field, day.date);
                    const active = isFieldActiveOnDay(field, day.date);

                    return (
                      <div key={`${field.id}-${day.date}`} className="rounded-md border bg-[#f6f7f1] p-3">
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <label className="flex min-w-0 items-center gap-2 text-sm font-medium">
                            <Checkbox
                              checked={active}
                              onCheckedChange={(checked) => updateFieldDay(field.id, day.date, Boolean(checked))}
                            />
                            <span className="min-w-0 break-words">
                              {day.label} · {formatDate(day.date)}
                            </span>
                          </label>
                          <span className="text-xs text-muted-foreground">{day.time} Uhr</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Spielminuten</Label>
                            <Input
                              type="number"
                              min={1}
                              value={daySettings.spielzeit}
                              onChange={(event) => updateFieldDaySettings(field.id, day.date, { spielzeit: Number(event.target.value) })}
                              className="h-8 bg-white"
                              disabled={!active}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Pause</Label>
                            <Input
                              type="number"
                              min={0}
                              value={daySettings.pausenzeit}
                              onChange={(event) => updateFieldDaySettings(field.id, day.date, { pausenzeit: Number(event.target.value) })}
                              className="h-8 bg-white"
                              disabled={!active}
                            />
                          </div>
                          <label className="flex items-end gap-2 pb-2 text-xs text-muted-foreground">
                            <Checkbox
                              checked={daySettings.zweiHalbzeiten}
                              disabled={!active}
                              onCheckedChange={(checked) => updateFieldDaySettings(field.id, day.date, { zweiHalbzeiten: Boolean(checked) })}
                            />
                            Halbzeiten
                          </label>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">HZ-Pause</Label>
                            <Input
                              type="number"
                              min={0}
                              value={daySettings.halbzeitpause}
                              onChange={(event) => updateFieldDaySettings(field.id, day.date, { halbzeitpause: Number(event.target.value) })}
                              className="h-8 bg-white"
                              disabled={!active || !daySettings.zweiHalbzeiten}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden rounded-[8px]">
        <CardHeader>
          <CardTitle className="text-lg">2. Kategorien je Tag und Feld</CardTitle>
          <p className="!mt-1 text-sm text-muted-foreground">
            Nur aktive Felder erscheinen pro Tag. Ohne Auswahl sind auf einem Feld alle Kategorien erlaubt.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          {days.map((day) => (
            <div key={day.date} className="min-w-0 overflow-hidden rounded-[8px] border p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="!mt-0 text-sm font-medium">{day.label}: {formatDate(day.date)}</p>
                  <p className="!mt-1 text-xs text-muted-foreground">{day.time} Uhr</p>
                </div>
                <CalendarDays className="size-4 text-[#5e6d35]" />
              </div>
              <div className="grid min-w-0 gap-3 xl:grid-cols-2">
                {draftFields.filter((field) => isFieldActiveOnDay(field, day.date)).map((field) => {
                  const selected = field.erlaubteJahrgaengeProTag?.[day.date] || [];
                  const daySettings = getFieldDaySettings(field, day.date);

                  return (
                    <div key={`${day.date}-${field.id}`} className="min-w-0 overflow-hidden rounded-md bg-[#f6f7f1] p-3">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <span className="min-w-0 break-words text-sm font-medium">{field.name}</span>
                          <p className="!mt-1 text-xs text-muted-foreground">
                            {daySettings.spielzeit} Min Spiel · {daySettings.pausenzeit} Min Pause
                            {daySettings.zweiHalbzeiten ? ` · HZ ${daySettings.halbzeitpause} Min` : ""}
                          </p>
                        </div>
                        <Select onValueChange={(value) => addCategory(field.id, day.date, value)}>
                          <SelectTrigger className="h-8 w-full shrink-0 bg-white sm:w-[180px]">
                            <SelectValue placeholder="Kategorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEAM_CATEGORIES.filter((category) => !selected.includes(category)).map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex min-w-0 flex-wrap gap-1.5">
                        {selected.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Alle erlaubt</span>
                        ) : (
                          selected.map((category) => (
                            <Badge key={category} variant="outline" className="max-w-full whitespace-normal break-words bg-white">
                              {category}
                              <button
                                type="button"
                                className="ml-1 rounded-full hover:text-destructive"
                                onClick={() => removeCategory(field.id, day.date, category)}
                                aria-label={`${category} entfernen`}
                              >
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {draftFields.every((field) => !isFieldActiveOnDay(field, day.date)) && (
                <div className="rounded-[8px] border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
                  Für diesen Tag ist noch kein Feld aktiv.
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden rounded-[8px]">
        <CardHeader className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-lg">3. Generieren und prüfen</CardTitle>
            <p className="!mt-1 text-sm text-muted-foreground">Nach dem Generieren bleibt der Plan ein Entwurf, bis er veröffentlicht wird.</p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button
              onClick={onGenerate}
              disabled={saving || hasUnsavedFields}
              className="w-full bg-[#5e6d35] text-white hover:bg-[#4f5d2f] sm:w-auto"
              title={hasUnsavedFields ? "Bitte zuerst die Feldeinstellungen speichern" : undefined}
            >
              <Wand2 className="size-4" />
              {hasUnsavedFields ? "Erst Felder speichern" : "Spielplan generieren"}
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href={previewHref} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                {settings.spielplanStatus === "published" ? "Öffentliche Ansicht prüfen" : "Entwurfsvorschau"}
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {spiele.length === 0 ? (
            <div className="rounded-[8px] border border-dashed p-8 text-center text-sm text-muted-foreground">
              Noch kein Spielplan vorhanden.
            </div>
          ) : (
            <div className="rounded-[8px] border border-[#d9dec8] bg-[#f6f7f1] p-4 text-sm">
              <span className="font-medium">{spiele.length} Spiele erzeugt.</span>
              <span className="ml-2 text-muted-foreground">
                Unten im Spielbaum kannst du Zeiten und Felder per Drag-and-drop prüfen und verschieben.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <ScheduleDragBoard
        spiele={spiele}
        settings={settings}
        feldEinstellungen={draftFields}
        saving={saving}
        onSpielMove={onSpielMove}
      />

      <Card className="min-w-0 overflow-hidden rounded-[8px] border-[#d9dec8]">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <CheckCircle className="size-4 shrink-0 text-[#5e6d35]" />
            <span className="min-w-0 break-words">
              4. Veröffentlichung: {settings.spielplanStatus === "published"
                ? `Öffentlich${settings.spielplanPublishedAt ? ` seit ${formatDate(settings.spielplanPublishedAt.slice(0, 10))}` : ""}`
                : "Entwurf, noch nicht öffentlich sichtbar"}
            </span>
          </div>
          <div className="grid gap-2 sm:flex sm:shrink-0 sm:items-center">
            <Button
              type="button"
              variant="outline"
              disabled={spiele.length === 0 || saving}
              onClick={settings.spielplanStatus === "published" ? onUnpublish : onPublish}
              className="w-full sm:w-auto"
            >
              {settings.spielplanStatus === "published" ? "Zurückziehen" : "Veröffentlichen"}
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{settings.spielplanStatus === "published" ? "Öffentlich" : "Entwurf"}</span>
              <Switch checked={settings.spielplanStatus === "published"} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <DangerZone
        title="Spielplan Gefahrbereich"
        description="Löscht alle erzeugten Spiele. Feldeinstellungen und Anmeldungen bleiben erhalten."
        flushLabel="Alle Spiele löschen"
        affectedCount={spiele.length}
        onFlush={onDeleteAll}
      />
    </div>
  );
}

function getNextFieldNumber(fields: FeldEinstellungen[]) {
  const usedNumbers = fields
    .map((field) => field.name.match(/\d+/)?.[0] || field.id.match(/\d+/)?.[0])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  return usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : fields.length + 1;
}

function createFieldId(fields: FeldEinstellungen[], nextNumber: number) {
  const existingIds = new Set(fields.map((field) => field.id));
  let candidate = `feld${nextNumber}`;
  let suffix = 1;

  while (existingIds.has(candidate)) {
    candidate = `feld${nextNumber}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function isFieldActiveOnDay(field: FeldEinstellungen, date: string) {
  return field.aktiveTage?.[date] !== false;
}

function getFieldDaySettings(field: FeldEinstellungen | undefined, date: string): FeldTagesEinstellungen {
  return {
    spielzeit: Number(field?.einstellungenProTag?.[date]?.spielzeit ?? field?.spielzeit ?? 10),
    pausenzeit: Number(field?.einstellungenProTag?.[date]?.pausenzeit ?? field?.pausenzeit ?? 2),
    halbzeitpause: Number(field?.einstellungenProTag?.[date]?.halbzeitpause ?? field?.halbzeitpause ?? 0),
    zweiHalbzeiten: Boolean(field?.einstellungenProTag?.[date]?.zweiHalbzeiten ?? field?.zweiHalbzeiten ?? false),
  };
}

function materializeFieldsForDays(
  fields: FeldEinstellungen[],
  days: Array<{ date: string }>
): FeldEinstellungen[] {
  return fields.map((field) => {
    const einstellungenProTag = { ...(field.einstellungenProTag || {}) };
    const aktiveTage = { ...(field.aktiveTage || {}) };

    for (const day of days) {
      einstellungenProTag[day.date] = getFieldDaySettings(field, day.date);
      aktiveTage[day.date] = isFieldActiveOnDay(field, day.date);
    }

    const primaryDaySettings = days[0] ? einstellungenProTag[days[0].date] : getFieldDaySettings(field, "");

    return {
      ...field,
      ...primaryDaySettings,
      aktiveTage,
      einstellungenProTag,
    };
  });
}
