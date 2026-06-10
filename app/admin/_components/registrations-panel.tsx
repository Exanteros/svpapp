"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, Pencil, Search, Send, Trash2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { DangerZone } from "./danger-zone";
import { formatDateTime, formatEuro } from "./format";
import type { Anmeldung, RegistrationImportOptions, RegistrationImportResult, RegistrationStatus } from "./types";

interface RegistrationsPanelProps {
  anmeldungen: Anmeldung[];
  onStatusChange: (anmeldungId: string, status: string) => void;
  onInfoUpdate: (anmeldungId: string, info: RegistrationInfoForm) => boolean | Promise<boolean>;
  onBulkStatusChange: (anmeldungIds: string[], status: RegistrationStatus) => boolean | Promise<boolean>;
  onExportSelected: (anmeldungIds: string[]) => void;
  onPaymentReminder: (anmeldungIds: string[]) => void;
  onImport: (file: File, options: RegistrationImportOptions) => Promise<RegistrationImportResult | null>;
  onDelete: (anmeldung: Anmeldung) => void;
  onCreateDemo: () => void;
  onFlush: () => void;
}

interface RegistrationInfoForm {
  verein: string;
  kontakt: string;
  email: string;
  mobil: string;
  kosten: number;
}

const statusOptions = [
  { value: "all", label: "Alle Status" },
  { value: "angemeldet", label: "Angemeldet" },
  { value: "bezahlt", label: "Bezahlt" },
  { value: "storniert", label: "Storniert" },
];

export function RegistrationsPanel({
  anmeldungen,
  onStatusChange,
  onInfoUpdate,
  onBulkStatusChange,
  onExportSelected,
  onPaymentReminder,
  onImport,
  onDelete,
  onCreateDemo,
  onFlush,
}: RegistrationsPanelProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [editingAnmeldung, setEditingAnmeldung] = useState<Anmeldung | null>(null);
  const [editForm, setEditForm] = useState<RegistrationInfoForm>(() => createInfoForm());
  const [savingInfo, setSavingInfo] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<RegistrationImportOptions["mode"]>("teams_payments");
  const [replaceTeams, setReplaceTeams] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<RegistrationImportResult | null>(null);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return anmeldungen.filter((anmeldung) => {
      const matchesStatus = status === "all" || anmeldung.status === status;
      const haystack = [
        anmeldung.verein,
        anmeldung.kontakt,
        anmeldung.email,
        anmeldung.mobil,
        ...anmeldung.teams.map((team) => team.kategorie),
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [anmeldungen, query, status]);

  const filteredIds = useMemo(() => filtered.map((anmeldung) => anmeldung.id), [filtered]);
  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const selectedFilteredCount = filteredIds.filter((id) => selectedIds.has(id)).length;
  const allFilteredSelected = filteredIds.length > 0 && selectedFilteredCount === filteredIds.length;

  useEffect(() => {
    const availableIds = new Set(anmeldungen.map((anmeldung) => anmeldung.id));
    setSelectedIds((current) => new Set(Array.from(current).filter((id) => availableIds.has(id))));
  }, [anmeldungen]);

  function toggleSelection(anmeldungId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(anmeldungId);
      } else {
        next.delete(anmeldungId);
      }

      return next;
    });
  }

  function toggleFilteredSelection(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);

      filteredIds.forEach((id) => {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });

      return next;
    });
  }

  async function markSelectedPaid() {
    const updated = await onBulkStatusChange(selectedArray, "bezahlt");

    if (updated) {
      setSelectedIds(new Set());
    }
  }

  function openEditDialog(anmeldung: Anmeldung) {
    setEditingAnmeldung(anmeldung);
    setEditForm(createInfoForm(anmeldung));
  }

  async function saveInfo(event: React.FormEvent) {
    event.preventDefault();

    if (!editingAnmeldung) {
      return;
    }

    try {
      setSavingInfo(true);
      const updated = await onInfoUpdate(editingAnmeldung.id, {
        ...editForm,
        kosten: Number(editForm.kosten),
      });

      if (updated) {
        setEditingAnmeldung(null);
      }
    } finally {
      setSavingInfo(false);
    }
  }

  async function startImport() {
    if (!importFile) {
      return;
    }

    try {
      setImporting(true);
      const result = await onImport(importFile, {
        mode: importMode,
        replaceTeams: importMode === "teams_payments" ? replaceTeams : false,
      });

      if (result) {
        setImportResult(result);
        setImportFile(null);
      }
    } finally {
      setImporting(false);
    }
  }

  function downloadImportTemplate() {
    const rows = [
      ["Verein", "Kontakt", "Email", "Mobil", "Kategorie", "Anzahl Teams", "Schiri", "Spielstärke", "Kosten", "Status"],
      ["SV Musterstadt", "Max Mustermann", "max@sv-musterstadt.de", "01701234567", "E-Jugend", "2", "ja", "Fortgeschritten", "50", "bezahlt"],
      ["SV Musterstadt", "Max Mustermann", "max@sv-musterstadt.de", "01701234567", "Mini 1 (Fortgeschrittene)", "1", "nein", "", "95", "angemeldet"],
    ];
    const csv = rows.map((row) => row.map(escapeCsvCell).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "svp_import_vorlage.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-5">
      <Card className="min-w-0 overflow-hidden rounded-[8px]">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSpreadsheet className="size-5 text-[#5e6d35]" />
                Teams und Zahlungen importieren
              </CardTitle>
              <p className="!mt-1 text-sm text-muted-foreground">
                CSV oder XLSX mit Überschriften einlesen und vorhandene Vereine aktualisieren.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={downloadImportTemplate} className="w-full lg:w-auto">
              <Download className="size-4" />
              Vorlage
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_220px_220px]">
            <div className="space-y-2">
              <Label htmlFor="registration-import-file">Importdatei</Label>
              <Input
                id="registration-import-file"
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setImportFile(event.target.files?.[0] || null);
                  setImportResult(null);
                }}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration-import-mode">Modus</Label>
              <Select value={importMode} onValueChange={(value) => setImportMode(value as RegistrationImportOptions["mode"])}>
                <SelectTrigger id="registration-import-mode" className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teams_payments">Teams + Zahlungen</SelectItem>
                  <SelectItem value="payments_only">Nur Zahlungen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={!importFile || importing}
                onClick={startImport}
                className="w-full bg-[#5e6d35] text-white hover:bg-[#4f5d2f]"
              >
                <Upload className="size-4" />
                {importing ? "Importiert..." : "Importieren"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[8px] border border-[#d9dec8] bg-[#f6f7f1] p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <label className="flex min-w-0 items-center gap-2">
              <Checkbox
                checked={replaceTeams && importMode === "teams_payments"}
                disabled={importMode === "payments_only"}
                onCheckedChange={(checked) => setReplaceTeams(Boolean(checked))}
              />
              <span className="min-w-0 break-words">Teams vorhandener Vereine ersetzen</span>
            </label>
            <span className="min-w-0 break-words">
              {importFile ? importFile.name : "Erwartete Spalten: Verein, Kontakt, Email, Mobil, Kategorie, Anzahl Teams, Schiri, Kosten, Status"}
            </span>
          </div>

          {importResult && (
            <div className="rounded-[8px] border border-[#d9dec8] bg-white p-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <ImportStat label="Neu" value={importResult.summary.created} />
                <ImportStat label="Aktualisiert" value={importResult.summary.updated} />
                <ImportStat label="Zahlungen" value={importResult.summary.paymentsUpdated} />
                <ImportStat label="Teamzeilen" value={importResult.summary.teamsInserted} />
              </div>
              {importResult.summary.warnings.length > 0 && (
                <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  <p className="!mt-0 font-medium">{importResult.summary.warnings.length} Hinweis(e)</p>
                  <ul className="!mb-0 !mt-2 !ml-4 list-disc">
                    {importResult.summary.warnings.slice(0, 5).map((warning, index) => (
                      <li key={`${warning.row || "row"}-${index}`}>
                        {warning.row ? `Zeile ${warning.row}: ` : ""}
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden rounded-[8px]">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-lg">Anmeldungen</CardTitle>
              <p className="!mt-1 text-sm text-muted-foreground">
                Registrierungen prüfen, filtern und Zahlungsstatus pflegen.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-[#d9dec8] text-[#5e6d35]">
              {filtered.length} von {anmeldungen.length}
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_210px]">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Verein, Kontakt, E-Mail oder Kategorie suchen"
                className="bg-white pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3 rounded-[8px] border border-[#d9dec8] bg-[#f6f7f1] p-3 xl:flex-row xl:items-center xl:justify-between">
            <label className="flex min-w-0 items-center gap-2 text-sm">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={(checked) => toggleFilteredSelection(Boolean(checked))}
                aria-label="Alle gefilterten Anmeldungen auswählen"
              />
              <span className="min-w-0 break-words">
                {selectedIds.size > 0
                  ? `${selectedIds.size} ausgewählt`
                  : `${filtered.length} gefilterte Anmeldung(en)`}
              </span>
            </label>
            <div className="grid gap-2 sm:grid-cols-3 xl:flex xl:shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={markSelectedPaid}
                className="w-full xl:w-auto"
              >
                <CheckCircle2 className="size-4" />
                Bezahlt
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => onExportSelected(selectedArray)}
                className="w-full xl:w-auto"
              >
                <Download className="size-4" />
                Export
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => onPaymentReminder(selectedArray)}
                className="w-full xl:w-auto"
              >
                <Send className="size-4" />
                Erinnerung
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="rounded-[8px] border border-dashed p-8 text-center text-sm text-muted-foreground">
              Keine passenden Anmeldungen gefunden.
            </div>
          ) : (
            <>
              <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:hidden">
                {filtered.map((anmeldung) => (
                  <div key={anmeldung.id} className="min-w-0 overflow-hidden rounded-[8px] border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <Checkbox
                          checked={selectedIds.has(anmeldung.id)}
                          onCheckedChange={(checked) => toggleSelection(anmeldung.id, Boolean(checked))}
                          aria-label={`${anmeldung.verein} auswählen`}
                          className="mt-1 shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold tracking-normal">{anmeldung.verein}</h3>
                          <p className="!mt-1 break-words text-sm text-muted-foreground">{anmeldung.kontakt}</p>
                          <p className="!mt-1 break-all text-xs text-muted-foreground">{anmeldung.email}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-medium">{formatEuro(anmeldung.kosten)}</div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {anmeldung.teams.map((team, index) => (
                        <Badge
                          key={`${team.id || team.kategorie}-${index}`}
                          variant="outline"
                          className="max-w-full whitespace-normal break-words bg-[#f6f7f1] text-xs"
                        >
                          {team.anzahl}x {team.kategorie}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-2">
                      <Select value={anmeldung.status} onValueChange={(value) => onStatusChange(anmeldung.id, value)}>
                        <SelectTrigger className="h-9 w-full bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="angemeldet">Angemeldet</SelectItem>
                          <SelectItem value="bezahlt">Bezahlt</SelectItem>
                          <SelectItem value="storniert">Storniert</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-xs text-muted-foreground">{formatDateTime(anmeldung.created_at)}</span>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Vereinsdaten bearbeiten"
                            onClick={() => openEditDialog(anmeldung)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Anmeldung löschen"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDelete(anmeldung)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden xl:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allFilteredSelected}
                          onCheckedChange={(checked) => toggleFilteredSelection(Boolean(checked))}
                          aria-label="Alle gefilterten Anmeldungen auswählen"
                        />
                      </TableHead>
                      <TableHead>Verein</TableHead>
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Teams</TableHead>
                      <TableHead>Kosten</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((anmeldung) => (
                      <TableRow key={anmeldung.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(anmeldung.id)}
                            onCheckedChange={(checked) => toggleSelection(anmeldung.id, Boolean(checked))}
                            aria-label={`${anmeldung.verein} auswählen`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{anmeldung.verein}</TableCell>
                        <TableCell>
                          <div className="grid gap-1">
                            <span>{anmeldung.kontakt}</span>
                            <span className="text-xs text-muted-foreground">{anmeldung.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-md flex-wrap gap-1.5">
                            {anmeldung.teams.map((team, index) => (
                              <Badge key={`${team.id || team.kategorie}-${index}`} variant="outline" className="bg-[#f6f7f1]">
                                {team.anzahl}x {team.kategorie}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{formatEuro(anmeldung.kosten)}</TableCell>
                        <TableCell>
                          <Select value={anmeldung.status} onValueChange={(value) => onStatusChange(anmeldung.id, value)}>
                            <SelectTrigger className="h-8 w-[132px] bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="angemeldet">Angemeldet</SelectItem>
                              <SelectItem value="bezahlt">Bezahlt</SelectItem>
                              <SelectItem value="storniert">Storniert</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDateTime(anmeldung.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Vereinsdaten bearbeiten"
                              onClick={() => openEditDialog(anmeldung)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Anmeldung löschen"
                              className="text-destructive hover:text-destructive"
                              onClick={() => onDelete(anmeldung)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DangerZone
        title="Anmeldungen Gefahrbereich"
        description="Demo-Daten und das Leeren der Anmeldungsliste sind bewusst aus dem normalen Arbeitsfluss ausgelagert."
        demoLabel="Demo-Teams anlegen"
        flushLabel="Anmeldungen leeren"
        affectedCount={anmeldungen.length}
        onCreateDemo={onCreateDemo}
        onFlush={onFlush}
      />

      <Sheet open={Boolean(editingAnmeldung)} onOpenChange={(open) => !open && setEditingAnmeldung(null)}>
        <SheetContent side="right" className="!w-full !max-w-[560px] gap-0 p-0 sm:!w-[560px] sm:!max-w-[560px]">
          <form onSubmit={saveInfo} className="flex h-full min-h-0 flex-col">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle>Vereinsdaten bearbeiten</SheetTitle>
              <SheetDescription>
                Kontakt- und Rechnungsdaten der Anmeldung anpassen.
              </SheetDescription>
            </SheetHeader>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-verein">Verein</Label>
                <Input
                  id="edit-verein"
                  value={editForm.verein}
                  onChange={(event) => setEditForm({ ...editForm, verein: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-kontakt">Kontakt</Label>
                <Input
                  id="edit-kontakt"
                  value={editForm.kontakt}
                  onChange={(event) => setEditForm({ ...editForm, kontakt: event.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">E-Mail</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-mobil">Mobil</Label>
                  <Input
                    id="edit-mobil"
                    value={editForm.mobil}
                    onChange={(event) => setEditForm({ ...editForm, mobil: event.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-kosten">Kosten</Label>
                <Input
                  id="edit-kosten"
                  type="number"
                  min={0}
                  step={1}
                  value={editForm.kosten}
                  onChange={(event) => setEditForm({ ...editForm, kosten: Number(event.target.value) })}
                  required
                />
              </div>
            </div>
            <SheetFooter className="border-t bg-white px-5 py-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setEditingAnmeldung(null)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={savingInfo} className="bg-[#5e6d35] text-white hover:bg-[#4f5d2f]">
                {savingInfo ? "Speichert..." : "Speichern"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function createInfoForm(anmeldung?: Anmeldung): RegistrationInfoForm {
  return {
    verein: anmeldung?.verein || "",
    kontakt: anmeldung?.kontakt || "",
    email: anmeldung?.email || "",
    mobil: anmeldung?.mobil || "",
    kosten: Number(anmeldung?.kosten || 0),
  };
}

function ImportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-[#f6f7f1] p-3">
      <p className="!m-0 text-xs text-muted-foreground">{label}</p>
      <p className="!m-0 text-lg font-semibold text-[#5e6d35]">{value}</p>
    </div>
  );
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
