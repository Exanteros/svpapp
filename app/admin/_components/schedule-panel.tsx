"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { CalendarDays, CheckCircle, Download, ExternalLink, Plus, RotateCcw, SlidersHorizontal, Trash2, Upload, UserRoundCheck, Wand2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { applySpielplanTimingOverrides, getDuplicateFeldnamen, getDynamicSpielplanTimingProfiles, normalizeSpielplanTimingOverrides } from "@/lib/tournament";

import { DangerZone } from "./danger-zone";
import { formatDate } from "./format";
import { ScheduleDragBoard } from "./schedule-drag-board";
import type { Anmeldung, FeldEinstellungen, FeldTagesEinstellungen, Spiel, SpielplanTimingGruppe, SpielplanTimingOverrides, SpielplanZeitblock, TurnierEinstellungen } from "./types";
import { TEAM_CATEGORIES } from "./types";

interface SchedulePanelProps {
  settings: TurnierEinstellungen;
  feldEinstellungen: FeldEinstellungen[];
  anmeldungen: Anmeldung[];
  spiele: Spiel[];
  saving: boolean;
  onFeldSettingsSave: (settings: FeldEinstellungen[]) => boolean | Promise<boolean>;
  onSettingsPatch: (patch: Partial<TurnierEinstellungen>) => void | Promise<void>;
  onGenerate: (settingsPatch?: Partial<TurnierEinstellungen>) => void;
  onExportSnapshot: () => void;
  onImportSnapshot: (file: File) => void | Promise<void>;
  onAssignReferees: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDeleteAll: () => void;
  onSpielMove: (spielId: string, patch: Pick<Spiel, "datum" | "zeit" | "feld">) => Promise<unknown> | unknown;
}

const TIMING_GROUPS: Array<{ id: SpielplanTimingGruppe; label: string; hint: string }> = [
  { id: "miniE", label: "Mini / E", hint: "Samstag" },
  { id: "d", label: "D-Jugend", hint: "Sonntag Vormittag" },
  { id: "cba", label: "C / B / A", hint: "Sonntag Nachmittag" },
];

export function SchedulePanel({
  settings,
  feldEinstellungen,
  anmeldungen,
  spiele,
  saving,
  onFeldSettingsSave,
  onSettingsPatch,
  onGenerate,
  onExportSnapshot,
  onImportSnapshot,
  onAssignReferees,
  onPublish,
  onUnpublish,
  onDeleteAll,
  onSpielMove,
}: SchedulePanelProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [draftFields, setDraftFields] = useState(feldEinstellungen);
  const [draftZeitbloecke, setDraftZeitbloecke] = useState<SpielplanZeitblock[]>(() =>
    materializeZeitbloecke(settings.spielplanZeitbloecke, settings)
  );
  const [draftTimingOverrides, setDraftTimingOverrides] = useState<SpielplanTimingOverrides>(() =>
    normalizeTimingOverridesForAdmin(settings.spielplanTimingOverrides)
  );
  const [savedSignature, setSavedSignature] = useState(() => JSON.stringify(feldEinstellungen));
  const [savedTimingOverridesSignature, setSavedTimingOverridesSignature] = useState(() =>
    JSON.stringify(normalizeTimingOverridesForAdmin(settings.spielplanTimingOverrides))
  );
  const draftSignature = useMemo(() => JSON.stringify(draftFields), [draftFields]);
  const hasUnsavedFields = draftSignature !== savedSignature;
  const duplicateFeldnamen = useMemo(() => getDuplicateFeldnamen(draftFields), [draftFields]);
  const hasDuplicateFeldnamen = duplicateFeldnamen.length > 0;
  const savedZeitbloeckeSignature = useMemo(
    () => JSON.stringify(materializeZeitbloecke(settings.spielplanZeitbloecke, settings)),
    [settings]
  );
  const draftZeitbloeckeSignature = useMemo(() => JSON.stringify(draftZeitbloecke), [draftZeitbloecke]);
  const hasUnsavedZeitbloecke = draftZeitbloeckeSignature !== savedZeitbloeckeSignature;
  const autoSpielzeiten = settings.spielzeitenAutomatisch !== false;
  const selectedTimingProfile = settings.spielplanTimingProfil || "standard";
  const hasUnsavedGeneratorSetup = hasUnsavedFields || hasUnsavedZeitbloecke || hasDuplicateFeldnamen;
  const timingOverrides = useMemo(
    () => normalizeTimingOverridesForAdmin(draftTimingOverrides),
    [draftTimingOverrides]
  );
  const draftTimingOverridesSignature = useMemo(() => JSON.stringify(timingOverrides), [timingOverrides]);
  const hasUnsavedTimingOverrides = draftTimingOverridesSignature !== savedTimingOverridesSignature;
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
  const dynamicTimingProfiles = useMemo(() => getDynamicSpielplanTimingProfiles({
    settings,
    feldEinstellungen: draftFields,
    spielplanZeitbloecke: draftZeitbloecke,
    anmeldungen,
  }), [anmeldungen, draftFields, draftZeitbloecke, settings]);
  const selectedSuggestedTimingProfile = useMemo(() => (
    dynamicTimingProfiles.find((profile) => profile.id === selectedTimingProfile)
      || dynamicTimingProfiles.find((profile) => profile.id === "standard")
      || dynamicTimingProfiles[0]
  ), [dynamicTimingProfiles, selectedTimingProfile]);
  const activeTimingProfile = useMemo(() => (
    selectedSuggestedTimingProfile
      ? applySpielplanTimingOverrides(selectedSuggestedTimingProfile, timingOverrides)
      : null
  ), [selectedSuggestedTimingProfile, timingOverrides]);

  useEffect(() => {
    const nextFields = materializeFieldsForDays(feldEinstellungen, days);
    setDraftFields(nextFields);
    setSavedSignature(JSON.stringify(feldEinstellungen));
  }, [feldEinstellungen, daySignature, days]);

  useEffect(() => {
    setDraftZeitbloecke(materializeZeitbloecke(settings.spielplanZeitbloecke, settings));
  }, [
    settings.spielplanZeitbloecke,
    settings.turnierStartDatum,
    settings.turnierEndDatum,
    settings.samstagStartzeit,
    settings.samstagEndzeit,
    settings.sonntagStartzeit,
    settings.sonntagEndzeit,
  ]);

  useEffect(() => {
    const nextOverrides = normalizeTimingOverridesForAdmin(settings.spielplanTimingOverrides);
    setDraftTimingOverrides(nextOverrides);
    setSavedTimingOverridesSignature(JSON.stringify(nextOverrides));
  }, [settings.spielplanTimingOverrides]);

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

  function updateZeitblock(id: string, patch: Partial<SpielplanZeitblock>) {
    setDraftZeitbloecke((blocks) =>
      blocks.map((block) => (block.id === id ? { ...block, ...patch } : block))
    );
  }

  function addZeitblock() {
    setDraftZeitbloecke((blocks) => [
      ...blocks,
      {
        id: createZeitblockId(blocks),
        label: `Zeitblock ${blocks.length + 1}`,
        datum: settings.turnierEndDatum,
        startzeit: settings.sonntagStartzeit,
        endzeit: settings.sonntagEndzeit,
        kategorien: [],
      },
    ]);
  }

  function deleteZeitblock(id: string) {
    setDraftZeitbloecke((blocks) => blocks.filter((block) => block.id !== id));
  }

  function addZeitblockCategory(id: string, category: string) {
    setDraftZeitbloecke((blocks) =>
      blocks.map((block) => {
        if (block.id !== id || block.kategorien.includes(category)) return block;

        return {
          ...block,
          kategorien: [...block.kategorien, category],
        };
      })
    );
  }

  function removeZeitblockCategory(id: string, category: string) {
    setDraftZeitbloecke((blocks) =>
      blocks.map((block) => block.id === id
        ? { ...block, kategorien: block.kategorien.filter((item) => item !== category) }
        : block
      )
    );
  }

  async function saveFieldDraft() {
    if (hasDuplicateFeldnamen) {
      return false;
    }

    const nextFields = materializeFieldsForDays(draftFields, days);
    const saved = await onFeldSettingsSave(nextFields);

    if (saved) {
      const nextSignature = JSON.stringify(nextFields);
      setDraftFields(nextFields);
      setSavedSignature(nextSignature);
    }
  }

  async function saveZeitbloecke() {
    const nextBlocks = materializeZeitbloecke(draftZeitbloecke, settings);
    await onSettingsPatch({ spielplanZeitbloecke: nextBlocks });
  }

  async function saveZeitbloeckeAndGenerate() {
    const nextBlocks = materializeZeitbloecke(draftZeitbloecke, settings);
    await onSettingsPatch({ spielplanZeitbloecke: nextBlocks });
    onGenerate({ spielplanZeitbloecke: nextBlocks });
  }

  async function saveTimingOverrides() {
    const nextOverrides = normalizeTimingOverridesForAdmin(timingOverrides);
    await onSettingsPatch({ spielplanTimingOverrides: nextOverrides });
    setDraftTimingOverrides(nextOverrides);
    setSavedTimingOverridesSignature(JSON.stringify(nextOverrides));
  }

  async function saveTimingOverridesAndGenerate() {
    const nextOverrides = normalizeTimingOverridesForAdmin(timingOverrides);
    await onSettingsPatch({ spielplanTimingOverrides: nextOverrides });
    setDraftTimingOverrides(nextOverrides);
    setSavedTimingOverridesSignature(JSON.stringify(nextOverrides));
    onGenerate({ spielplanTimingOverrides: nextOverrides });
  }

  function selectTimingProfile(profileId: TurnierEinstellungen["spielplanTimingProfil"]) {
    setDraftTimingOverrides({});
    setSavedTimingOverridesSignature(JSON.stringify({}));
    void onSettingsPatch({ spielplanTimingProfil: profileId, spielplanTimingOverrides: {} });
  }

  function handleSnapshotImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file) {
      void onImportSnapshot(file);
    }
  }

  function resetTimingOverrides() {
    setDraftTimingOverrides({});
  }

  function updateTimingOverride(
    group: SpielplanTimingGruppe,
    key: "spielzeit" | "pausenzeit",
    value: string
  ) {
    if (!selectedSuggestedTimingProfile || value === "") {
      return;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return;
    }

    const base = selectedSuggestedTimingProfile[group];
    const nextGroup = {
      ...base,
      ...(timingOverrides[group] || {}),
      [key]: Math.max(key === "spielzeit" ? 1 : 0, Math.floor(numericValue)),
      halbzeitpause: 0,
      zweiHalbzeiten: false,
    };

    setDraftTimingOverrides(normalizeTimingOverridesForAdmin({
      ...timingOverrides,
      [group]: nextGroup,
    }));
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
            <p className="!mt-1 text-sm text-muted-foreground">Beim Generieren werden Zeitblöcke, aktive Felder und Anmeldungen zu einem kompakten Plan verrechnet.</p>
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
          <div className="mb-4 flex flex-col gap-3 rounded-[8px] border border-[#d9dec8] bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 pr-0 sm:pr-4">
              <Label htmlFor="autoSpielzeiten" className="text-sm font-medium">Spielzeiten automatisch berechnen</Label>
              <p className="!mt-1 text-sm text-muted-foreground">
                Der Generator nutzt die Zeitblöcke und verteilt die Spiele passend auf die verfügbaren Felder.
              </p>
            </div>
            <Switch
              id="autoSpielzeiten"
              checked={autoSpielzeiten}
              disabled={saving}
              onCheckedChange={(checked) => {
                void onSettingsPatch({ spielzeitenAutomatisch: Boolean(checked) });
              }}
            />
          </div>
          <div className="mb-4 overflow-hidden rounded-[8px] border border-[#d9dec8] bg-white">
            <div className="border-b border-[#e1e4d8] bg-[#f6f7f1] p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">Zeitblöcke für den Generator</h3>
                    <Badge variant="outline" className="border-[#d9dec8] bg-white text-[#4f5d2f]">
                      {draftZeitbloecke.length} Block{draftZeitbloecke.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <p className="!mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Kategorien werden nur innerhalb ihres Blocks geplant. Start, Ende und Kategorieauswahl kannst du pro Turnier wiederverwenden.
                </p>
              </div>
                <div className="grid gap-2 sm:grid-cols-3 xl:flex xl:shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={addZeitblock} className="w-full sm:w-auto">
                  <Plus className="size-4" />
                  Block hinzufügen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasUnsavedZeitbloecke || saving}
                  onClick={saveZeitbloecke}
                  className="w-full sm:w-auto"
                >
                  Blöcke speichern
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving}
                  onClick={saveZeitbloeckeAndGenerate}
                  className="w-full bg-[#5e6d35] text-white hover:bg-[#4f5d2f] sm:w-auto"
                >
                  <Wand2 className="size-4" />
                  Speichern & generieren
                </Button>
                </div>
              </div>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2 2xl:grid-cols-3">
              {draftZeitbloecke.map((block) => {
                const selected = block.kategorien || [];

                return (
                  <div key={block.id} className="min-w-0 overflow-hidden rounded-[8px] border border-[#e1e4d8] bg-[#fbfbf8]">
                    <div className="border-b border-[#e1e4d8] bg-white p-3">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <Label className="text-xs text-muted-foreground">Name</Label>
                          <Input
                            value={block.label}
                            onChange={(event) => updateZeitblock(block.id, { label: event.target.value })}
                            className="mt-1 h-9 bg-white font-medium"
                            aria-label="Zeitblock Name"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={draftZeitbloecke.length <= 1}
                          onClick={() => deleteZeitblock(block.id)}
                          aria-label={`${block.label || "Zeitblock"} entfernen`}
                          className="mt-5 shrink-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 p-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Tag</Label>
                        <Select value={block.datum} onValueChange={(value) => updateZeitblock(block.id, { datum: value })}>
                          <SelectTrigger className="h-9 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {days.map((day) => (
                              <SelectItem key={day.date} value={day.date}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Start</Label>
                        <Input
                          type="time"
                          value={block.startzeit}
                          onChange={(event) => updateZeitblock(block.id, { startzeit: event.target.value })}
                          className="h-9 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Ende</Label>
                        <Input
                          type="time"
                          value={block.endzeit}
                          onChange={(event) => updateZeitblock(block.id, { endzeit: event.target.value })}
                          className="h-9 bg-white"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <div className="min-w-0">
                        <Label className="text-xs text-muted-foreground">Kategorien</Label>
                      <Select onValueChange={(value) => addZeitblockCategory(block.id, value)}>
                          <SelectTrigger className="mt-1 h-9 bg-white">
                          <SelectValue placeholder="Kategorie hinzufügen" />
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
                      <Badge variant="outline" className="h-9 justify-center border-[#d9dec8] bg-white px-3 text-[#4f5d2f]">
                        {selected.length} gewählt
                      </Badge>
                    </div>
                    <div className="flex min-w-0 flex-wrap gap-1.5 rounded-[8px] border border-dashed border-[#d9dec8] bg-white p-2">
                      {selected.length === 0 ? (
                        <span className="text-xs text-destructive">Keine Kategorie ausgewählt</span>
                      ) : selected.map((category) => (
                        <Badge key={category} variant="outline" className="max-w-full whitespace-normal break-words border-[#d9dec8] bg-[#f6f7f1] pr-1.5">
                          {category}
                          <button
                            type="button"
                            className="ml-1 rounded-full hover:text-destructive"
                            onClick={() => removeZeitblockCategory(block.id, category)}
                            aria-label={`${category} aus Zeitblock entfernen`}
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={[
            "mb-4 flex flex-col gap-2 rounded-[8px] border p-3 sm:flex-row sm:items-center sm:justify-between",
            hasDuplicateFeldnamen
              ? "border-destructive/30 bg-destructive/5"
              : "border-[#d9dec8] bg-[#f6f7f1]",
          ].join(" ")}>
            <div className="text-sm">
              <span className="font-medium">
                {hasDuplicateFeldnamen
                  ? "Doppelte Feldnamen"
                  : hasUnsavedFields
                    ? "Ungespeicherte Feldeinstellungen"
                    : "Feldeinstellungen gespeichert"}
              </span>
              <span className="ml-2 text-muted-foreground">
                {hasDuplicateFeldnamen
                  ? `Bitte eindeutig machen: ${duplicateFeldnamen.join(", ")}.`
                  : hasUnsavedFields
                    ? "Speichern, bevor ein neuer Plan generiert wird."
                    : "Die Spielzeiten werden beim Generieren nach Kategorie gesetzt."}
              </span>
            </div>
            <Button
              type="button"
              variant={hasUnsavedFields ? "default" : "outline"}
              size="sm"
              disabled={!hasUnsavedFields || saving || hasDuplicateFeldnamen}
              onClick={saveFieldDraft}
              title={hasDuplicateFeldnamen ? "Feldnamen müssen eindeutig sein" : undefined}
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
                        {autoSpielzeiten ? (
                          <div className="rounded-md border border-dashed border-[#d9dec8] bg-white/70 px-3 py-2 text-xs text-muted-foreground">
                            Auto aktiv: Der Generator nutzt die gespeicherten Zeitblöcke und füllt die verfügbaren Feldzeiten kompakt.
                          </div>
                        ) : (
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
                        )}
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
                            {autoSpielzeiten
                              ? "Auto · Zeitblock-gesteuert"
                              : `${daySettings.spielzeit} Min Spiel · ${daySettings.pausenzeit} Min Pause${daySettings.zweiHalbzeiten ? ` · HZ ${daySettings.halbzeitpause} Min` : ""}`}
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
            <p className="!mt-1 text-sm text-muted-foreground">Der Algorithmus berechnet Spielzeiten aus Mannschaftsanzahl, Zeitblöcken und aktiven Feldern.</p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button
              onClick={hasUnsavedTimingOverrides ? saveTimingOverridesAndGenerate : () => onGenerate()}
              disabled={saving || hasUnsavedGeneratorSetup}
              className="w-full bg-[#5e6d35] text-white hover:bg-[#4f5d2f] sm:w-auto"
              title={hasDuplicateFeldnamen
                ? "Feldnamen müssen eindeutig sein"
                : hasUnsavedGeneratorSetup
                  ? "Bitte zuerst Felder oder Zeitblöcke speichern"
                  : undefined}
            >
              <Wand2 className="size-4" />
              {hasDuplicateFeldnamen
                ? "Feldnamen doppelt"
                : hasUnsavedGeneratorSetup
                ? "Erst Setup speichern"
                : hasUnsavedTimingOverrides
                  ? "Spielzeiten speichern & generieren"
                  : "Spielplan generieren"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onAssignReferees}
              disabled={saving || spiele.length === 0}
              className="w-full sm:w-auto"
              title={spiele.length === 0 ? "Bitte zuerst einen Spielplan erstellen" : undefined}
            >
              <UserRoundCheck className="size-4" />
              Schiris zuweisen
            </Button>
            <div className="flex min-h-10 items-center justify-between gap-3 rounded-[8px] border border-[#e1e4d8] bg-white px-3 py-2 sm:w-auto">
              <Label htmlFor="schiri-view" className="whitespace-nowrap text-xs font-medium text-[#4f5d2f]">
                Schiri-Anzeige
              </Label>
              <Switch
                id="schiri-view"
                checked={settings.schiedsrichterAnzeigeAktiv !== false}
                disabled={saving}
                onCheckedChange={(checked) => {
                  void onSettingsPatch({ schiedsrichterAnzeigeAktiv: Boolean(checked) });
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onExportSnapshot}
              disabled={saving || spiele.length === 0}
              className="w-full sm:w-auto"
              title={spiele.length === 0 ? "Bitte zuerst einen Spielplan erstellen" : undefined}
            >
              <Download className="size-4" />
              Exportieren
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleSnapshotImportChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => importInputRef.current?.click()}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              <Upload className="size-4" />
              Importieren
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
          {autoSpielzeiten && (
            <div className="mb-4 rounded-[8px] border border-[#d9dec8] bg-white p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Spielzeit-Vorschlag auswählen</h3>
                  <p className="!mt-1 text-sm text-muted-foreground">
                    Die drei Profile werden dynamisch aus den aktuellen Anmeldungen berechnet. Mehr Teams ergeben kürzere Spiele, weniger Teams längere Spiele.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit border-[#d9dec8] text-[#5e6d35]">
                  gleiche Anpfiffzeiten
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {dynamicTimingProfiles.map((profile) => {
                  const active = selectedTimingProfile === profile.id;

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        selectTimingProfile(profile.id);
                      }}
                      className={[
                        "rounded-[8px] border p-4 text-left transition",
                        active
                          ? "border-[#5e6d35] bg-[#f6f7f1] shadow-sm ring-2 ring-[#d9dec8]"
                          : "border-[#e1e4d8] bg-[#fbfbf8] hover:border-[#cdd5bd]",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold">{profile.label}</span>
                        {active && (
                          <Badge className="bg-[#5e6d35] text-white">
                            aktiv
                          </Badge>
                        )}
                      </div>
                      <p className="!mt-2 text-xs leading-5 text-muted-foreground">{profile.description}</p>
                      <div className="mt-3 grid gap-1 text-xs text-[#4f5d2f]">
                        <span>Mini/E: {profile.miniE.spielzeit}+{profile.miniE.pausenzeit} Min</span>
                        <span>D: {profile.d.spielzeit}+{profile.d.pausenzeit} Min</span>
                        <span>C/B/A: {profile.cba.spielzeit}+{profile.cba.pausenzeit} Min</span>
                      </div>
                      <div className="mt-3 rounded-[6px] border border-[#e1e4d8] bg-white px-2 py-1.5 text-[11px] text-muted-foreground">
                        Ziel: ca. {profile.targetGamesPerTeam} Spiele pro Mannschaft
                      </div>
                    </button>
                  );
                })}
              </div>
              {activeTimingProfile && selectedSuggestedTimingProfile && (
                <div className="mt-4 rounded-[8px] border border-[#e1e4d8] bg-[#fbfbf8] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <SlidersHorizontal className="size-4 text-[#5e6d35]" />
                        <h3 className="text-sm font-semibold">Spielzeiten feinjustieren</h3>
                        <Badge variant="outline" className={hasUnsavedTimingOverrides ? "border-[#d9dec8] bg-white text-[#4f5d2f]" : "border-[#e1e4d8] bg-white text-muted-foreground"}>
                          {hasUnsavedTimingOverrides ? "ungespeichert" : Object.keys(timingOverrides).length > 0 ? "manuell" : "Vorschlag"}
                        </Badge>
                      </div>
                      <p className="!mt-1 text-sm leading-6 text-muted-foreground">
                        Ändere die Minuten, wenn dir der Vorschlag nicht passt. Alle Spiele derselben Altersgruppe behalten gemeinsame Anpfiffzeiten.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={Object.keys(timingOverrides).length === 0 || saving}
                        onClick={resetTimingOverrides}
                        className="w-full sm:w-auto"
                      >
                        <RotateCcw className="size-4" />
                        Vorschlag
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!hasUnsavedTimingOverrides || saving}
                        onClick={saveTimingOverrides}
                        className="w-full bg-[#5e6d35] text-white hover:bg-[#4f5d2f] sm:w-auto"
                      >
                        Spielzeiten speichern
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    {TIMING_GROUPS.map((group) => {
                      const timing = activeTimingProfile[group.id];
                      const suggestedTiming = selectedSuggestedTimingProfile[group.id];
                      const isCustom = timing.spielzeit !== suggestedTiming.spielzeit || timing.pausenzeit !== suggestedTiming.pausenzeit;

                      return (
                        <div key={group.id} className="rounded-[8px] border border-[#e1e4d8] bg-white p-3">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">{group.label}</div>
                              <div className="text-xs text-muted-foreground">{group.hint}</div>
                            </div>
                            {isCustom && (
                              <Badge variant="outline" className="border-[#d9dec8] text-[#4f5d2f]">
                                angepasst
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Spielzeit</Label>
                              <Input
                                type="number"
                                min={1}
                                value={timing.spielzeit}
                                disabled={saving}
                                onChange={(event) => updateTimingOverride(group.id, "spielzeit", event.target.value)}
                                className="h-9 bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Pause</Label>
                              <Input
                                type="number"
                                min={0}
                                value={timing.pausenzeit}
                                disabled={saving}
                                onChange={(event) => updateTimingOverride(group.id, "pausenzeit", event.target.value)}
                                className="h-9 bg-white"
                              />
                            </div>
                          </div>
                          <p className="!mt-2 text-[11px] text-muted-foreground">
                            Vorschlag: {suggestedTiming.spielzeit}+{suggestedTiming.pausenzeit} Min
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
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

function materializeZeitbloecke(
  blocks: SpielplanZeitblock[] | undefined,
  settings: TurnierEinstellungen
): SpielplanZeitblock[] {
  const source = Array.isArray(blocks) && blocks.length > 0
    ? blocks
    : DEFAULT_ZEITBLOECKE(settings);

  return source
    .map((block, index) => ({
      id: block.id || `zeitblock-${index + 1}`,
      label: block.label || `Zeitblock ${index + 1}`,
      datum: block.datum || settings.turnierStartDatum,
      startzeit: normalizeTimeInput(block.startzeit, settings.samstagStartzeit),
      endzeit: normalizeTimeInput(block.endzeit, settings.samstagEndzeit),
      kategorien: Array.isArray(block.kategorien) ? block.kategorien.filter(Boolean) : [],
    }))
    .filter((block) => block.kategorien.length > 0 || source.length === 1);
}

function DEFAULT_ZEITBLOECKE(settings: TurnierEinstellungen): SpielplanZeitblock[] {
  return [
    {
      id: "samstag-mini-e",
      label: "Mini und E-Jugend",
      datum: settings.turnierStartDatum,
      startzeit: settings.samstagStartzeit,
      endzeit: settings.samstagEndzeit,
      kategorien: ["Mini", "Mini 1", "Mini 2", "Mini 3", "E-Jugend"],
    },
    {
      id: "sonntag-d",
      label: "D-Jugend",
      datum: settings.turnierEndDatum,
      startzeit: "10:00",
      endzeit: "13:00",
      kategorien: ["D-Jugend weiblich", "D-Jugend männlich"],
    },
    {
      id: "sonntag-cba",
      label: "C-, B- und A-Jugend",
      datum: settings.turnierEndDatum,
      startzeit: "13:15",
      endzeit: settings.sonntagEndzeit,
      kategorien: [
        "C-Jugend weiblich",
        "C-Jugend männlich",
        "B-Jugend weiblich",
        "B-Jugend männlich",
        "A-Jugend weiblich",
        "A-Jugend männlich",
      ],
    },
  ];
}

function createZeitblockId(blocks: SpielplanZeitblock[]) {
  const existingIds = new Set(blocks.map((block) => block.id));
  let index = blocks.length + 1;
  let id = `zeitblock-${index}`;

  while (existingIds.has(id)) {
    index += 1;
    id = `zeitblock-${index}`;
  }

  return id;
}

function normalizeTimeInput(value: string | undefined, fallback: string) {
  return /^\d{1,2}:\d{2}$/.test(value || "") ? value as string : fallback;
}

function normalizeTimingOverridesForAdmin(value: unknown): SpielplanTimingOverrides {
  return normalizeSpielplanTimingOverrides(value) as SpielplanTimingOverrides;
}
