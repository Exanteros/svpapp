"use client";

import { useMemo, useState } from "react";
import { Copy, Link as LinkIcon, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { DangerZone } from "./danger-zone";
import { formatDate, isActive } from "./format";
import { HelperDragBoard } from "./helper-drag-board";
import type { HelferAnmeldung, HelferBedarf } from "./types";

interface HelpersPanelProps {
  bedarf: HelferBedarf[];
  anmeldungen: HelferAnmeldung[];
  helferLink: string;
  defaultDate: string;
  saving?: boolean;
  onSaveBedarf: (bedarf: Omit<HelferBedarf, "id" | "created_at">, id?: string) => Promise<void> | void;
  onDeleteBedarf: (bedarf: HelferBedarf) => void;
  onGenerateLink: () => void;
  onHelferStatusChange: (anmeldungId: string, status: string) => void;
  onDeleteAnmeldung: (anmeldung: HelferAnmeldung) => void;
  onCreateDemo: () => void;
  onFlush: () => void;
}

const categories = [
  { value: "getraenke", label: "Getränke" },
  { value: "kaffee_kuchen", label: "Kaffee/Kuchen" },
  { value: "grill", label: "Grill" },
  { value: "waffeln_suess", label: "Waffeln/Süß" },
  { value: "aufbau", label: "Aufbau" },
  { value: "sonstiges", label: "Sonstiges" },
];

function createEmptyForm(defaultDate: string): Omit<HelferBedarf, "id" | "created_at"> {
  return {
    titel: "",
    beschreibung: "",
    datum: defaultDate,
    startzeit: "09:00",
    endzeit: "11:00",
    anzahlBenötigt: 1,
    kategorie: "sonstiges",
    aktiv: true,
  };
}

export function HelpersPanel({
  bedarf,
  anmeldungen,
  helferLink,
  defaultDate,
  saving = false,
  onSaveBedarf,
  onDeleteBedarf,
  onGenerateLink,
  onHelferStatusChange,
  onDeleteAnmeldung,
  onCreateDemo,
  onFlush,
}: HelpersPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [form, setForm] = useState(() => createEmptyForm(defaultDate));

  const coverage = useMemo(() => {
    const needed = bedarf.reduce((sum, item) => sum + Number(item.anzahlBenötigt || 0), 0);
    const activeAnmeldungen = anmeldungen.filter((anmeldung) => anmeldung.status !== "abgesagt");
    const byNeed = activeAnmeldungen.reduce<Map<string, number>>((result, anmeldung) => {
      result.set(anmeldung.helferBedarfId, (result.get(anmeldung.helferBedarfId) || 0) + 1);
      return result;
    }, new Map());
    const undercovered = bedarf.filter((item) => isActive(item.aktiv) && (byNeed.get(item.id) || 0) < Number(item.anzahlBenötigt || 0)).length;

    return { needed, signed: activeAnmeldungen.length, byNeed, undercovered };
  }, [bedarf, anmeldungen]);
  const bedarfById = useMemo(() => new Map(bedarf.map((item) => [item.id, item])), [bedarf]);

  function getNeedCoverage(item: HelferBedarf) {
    const signed = coverage.byNeed.get(item.id) || 0;
    const needed = Number(item.anzahlBenötigt || 0);

    return {
      signed,
      needed,
      isUndercovered: signed < needed,
    };
  }

  function openCreateDialog() {
    setEditingId(undefined);
    setForm(createEmptyForm(defaultDate));
    setDialogOpen(true);
  }

  function openEditDialog(item: HelferBedarf) {
    setEditingId(item.id);
    setForm({
      titel: item.titel,
      beschreibung: item.beschreibung || "",
      datum: item.datum,
      startzeit: item.startzeit,
      endzeit: item.endzeit,
      anzahlBenötigt: Number(item.anzahlBenötigt || 1),
      kategorie: item.kategorie,
      aktiv: isActive(item.aktiv),
    });
    setDialogOpen(true);
  }

  function submitForm(event: React.FormEvent) {
    event.preventDefault();
    onSaveBedarf(form, editingId);
    setDialogOpen(false);
  }

  function moveBedarf(item: HelferBedarf, patch: Partial<Pick<HelferBedarf, "datum" | "startzeit" | "endzeit" | "kategorie">>) {
    return onSaveBedarf(
      {
        titel: item.titel,
        beschreibung: item.beschreibung || "",
        datum: patch.datum || item.datum,
        startzeit: patch.startzeit || item.startzeit,
        endzeit: patch.endzeit || item.endzeit,
        anzahlBenötigt: Number(item.anzahlBenötigt || 1),
        kategorie: patch.kategorie || item.kategorie,
        aktiv: isActive(item.aktiv),
      },
      item.id
    );
  }

  async function copyLink() {
    if (!helferLink) return;
    await navigator.clipboard.writeText(helferLink);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-[8px]">
          <CardContent className="p-5">
            <p className="!mt-0 text-sm text-muted-foreground">Bedarf</p>
            <p className="!mt-2 text-2xl font-semibold">{coverage.needed}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[8px]">
          <CardContent className="p-5">
            <p className="!mt-0 text-sm text-muted-foreground">Anmeldungen</p>
            <p className="!mt-2 text-2xl font-semibold">{coverage.signed}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[8px]">
          <CardContent className="p-5">
            <p className="!mt-0 text-sm text-muted-foreground">Deckung</p>
            <p className="!mt-2 text-2xl font-semibold">{coverage.needed ? Math.round((coverage.signed / coverage.needed) * 100) : 0}%</p>
            <p className="!mt-1 text-xs text-muted-foreground">{coverage.undercovered} Aufgabe(n) unterdeckt</p>
          </CardContent>
        </Card>
      </div>

      <HelperDragBoard
        bedarf={bedarf}
        anmeldungen={anmeldungen}
        defaultDate={defaultDate}
        saving={saving}
        onMoveBedarf={moveBedarf}
        onOpenBedarf={openEditDialog}
      />

      <Card className="rounded-[8px]">
        <CardHeader className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="text-lg">Helfer-Bedarf</CardTitle>
            <p className="!mt-1 text-sm text-muted-foreground">Aufgaben planen und den öffentlichen Anmeldelink verwalten.</p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button variant="outline" onClick={onGenerateLink} className="w-full sm:w-auto">
              <LinkIcon className="size-4" />
              Link generieren
            </Button>
            <Button onClick={openCreateDialog} className="w-full bg-[#5e6d35] text-white hover:bg-[#4f5d2f] sm:w-auto">
              <Plus className="size-4" />
              Bedarf
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {helferLink && (
            <div className="flex flex-col gap-3 rounded-[8px] border border-[#d9dec8] bg-[#f6f7f1] p-3 sm:flex-row sm:items-center sm:justify-between">
              <code className="text-xs break-all">{helferLink}</code>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="size-4" />
                Kopieren
              </Button>
            </div>
          )}

          {bedarf.length === 0 ? (
            <div className="rounded-[8px] border border-dashed p-8 text-center text-sm text-muted-foreground">
              Noch kein Helfer-Bedarf angelegt.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:hidden">
                {bedarf.map((item) => {
                  const itemCoverage = getNeedCoverage(item);

                  return (
                    <div key={item.id} className="rounded-[8px] border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button type="button" onClick={() => openEditDialog(item)} className="text-left text-base font-semibold hover:underline">
                            {item.titel}
                          </button>
                          <p className="!mt-1 text-xs text-muted-foreground">{categories.find((category) => category.value === item.kategorie)?.label}</p>
                        </div>
                        <Badge variant="outline" className={isActive(item.aktiv) ? "shrink-0 border-[#d9dec8] text-[#5e6d35]" : "shrink-0"}>
                          {isActive(item.aktiv) ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="block text-xs text-muted-foreground">Datum</span>
                          {formatDate(item.datum)}
                        </div>
                        <div>
                          <span className="block text-xs text-muted-foreground">Zeit</span>
                          {item.startzeit} - {item.endzeit}
                        </div>
                        <div>
                          <span className="block text-xs text-muted-foreground">Deckung</span>
                          <Badge variant="outline" className={itemCoverage.isUndercovered ? "border-amber-300 bg-amber-50 text-amber-900" : "border-[#d9dec8] text-[#5e6d35]"}>
                            {itemCoverage.signed}/{itemCoverage.needed}
                          </Badge>
                        </div>
                        <div className="flex items-end justify-end">
                          <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDeleteBedarf(item)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden xl:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aufgabe</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Zeit</TableHead>
                      <TableHead>Bedarf</TableHead>
                      <TableHead>Deckung</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bedarf.map((item) => {
                      const itemCoverage = getNeedCoverage(item);

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="grid gap-1">
                              <button type="button" onClick={() => openEditDialog(item)} className="text-left font-medium hover:underline">
                                {item.titel}
                              </button>
                              <span className="text-xs text-muted-foreground">{categories.find((category) => category.value === item.kategorie)?.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(item.datum)}</TableCell>
                          <TableCell>{item.startzeit} - {item.endzeit}</TableCell>
                          <TableCell>{item.anzahlBenötigt}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={itemCoverage.isUndercovered ? "border-amber-300 bg-amber-50 text-amber-900" : "border-[#d9dec8] text-[#5e6d35]"}>
                              {itemCoverage.signed}/{itemCoverage.needed}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={isActive(item.aktiv) ? "border-[#d9dec8] text-[#5e6d35]" : ""}>
                              {isActive(item.aktiv) ? "Aktiv" : "Inaktiv"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDeleteBedarf(item)}>
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[8px]">
        <CardHeader>
          <CardTitle className="text-lg">Helfer-Anmeldungen</CardTitle>
        </CardHeader>
        <CardContent>
          {anmeldungen.length === 0 ? (
            <div className="rounded-[8px] border border-dashed p-8 text-center text-sm text-muted-foreground">
              Noch keine Helfer-Anmeldungen.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:hidden">
                {anmeldungen.map((anmeldung) => (
                  <div key={anmeldung.id} className="rounded-[8px] border bg-white p-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">{anmeldung.name}</h3>
                      <p className="!mt-1 text-xs text-muted-foreground">{bedarfById.get(anmeldung.helferBedarfId)?.titel || "Ohne Aufgabe"}</p>
                      <p className="!mt-1 break-all text-xs text-muted-foreground">{anmeldung.email}</p>
                      {anmeldung.telefon && <p className="!mt-1 text-xs text-muted-foreground">{anmeldung.telefon}</p>}
                    </div>
                    <div className="mt-4 grid gap-2">
                      <Select value={anmeldung.status} onValueChange={(value) => onHelferStatusChange(anmeldung.id, value)}>
                        <SelectTrigger className="h-9 w-full bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="angemeldet">Angemeldet</SelectItem>
                          <SelectItem value="bestätigt">Bestätigt</SelectItem>
                          <SelectItem value="abgesagt">Abgesagt</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex justify-end">
                        <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDeleteAnmeldung(anmeldung)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden xl:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Aufgabe</TableHead>
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anmeldungen.map((anmeldung) => (
                      <TableRow key={anmeldung.id}>
                        <TableCell className="font-medium">{anmeldung.name}</TableCell>
                        <TableCell>{bedarfById.get(anmeldung.helferBedarfId)?.titel || "Ohne Aufgabe"}</TableCell>
                        <TableCell>
                          <div className="grid gap-1">
                            <span>{anmeldung.email}</span>
                            {anmeldung.telefon && <span className="text-xs text-muted-foreground">{anmeldung.telefon}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select value={anmeldung.status} onValueChange={(value) => onHelferStatusChange(anmeldung.id, value)}>
                            <SelectTrigger className="h-8 w-[132px] bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="angemeldet">Angemeldet</SelectItem>
                              <SelectItem value="bestätigt">Bestätigt</SelectItem>
                              <SelectItem value="abgesagt">Abgesagt</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDeleteAnmeldung(anmeldung)}>
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
        title="Helfer Gefahrbereich"
        description="Demo-Bedarf und das Leeren aller Helfer-Daten sind vom Tagesgeschäft getrennt."
        demoLabel="Demo-Helfer anlegen"
        flushLabel="Helfer-Daten leeren"
        affectedCount={bedarf.length + anmeldungen.length}
        onCreateDemo={onCreateDemo}
        onFlush={onFlush}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
          <form onSubmit={submitForm}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Bedarf bearbeiten" : "Bedarf anlegen"}</DialogTitle>
              <DialogDescription>Aufgabe, Zeitfenster und benötigte Personen festlegen.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="titel">Titel</Label>
                <Input id="titel" value={form.titel} onChange={(event) => setForm({ ...form, titel: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="beschreibung">Beschreibung</Label>
                <Textarea
                  id="beschreibung"
                  value={form.beschreibung}
                  onChange={(event) => setForm({ ...form, beschreibung: event.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="datum">Datum</Label>
                  <Input id="datum" type="date" value={form.datum} onChange={(event) => setForm({ ...form, datum: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startzeit">Start</Label>
                  <Input id="startzeit" type="time" value={form.startzeit} onChange={(event) => setForm({ ...form, startzeit: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endzeit">Ende</Label>
                  <Input id="endzeit" type="time" value={form.endzeit} onChange={(event) => setForm({ ...form, endzeit: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select value={form.kategorie} onValueChange={(value) => setForm({ ...form, kategorie: value as HelferBedarf["kategorie"] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anzahl">Benötigt</Label>
                  <Input
                    id="anzahl"
                    type="number"
                    min={1}
                    value={form.anzahlBenötigt}
                    onChange={(event) => setForm({ ...form, anzahlBenötigt: Number(event.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="aktiv">Öffentlich aktiv</Label>
                <Switch id="aktiv" checked={Boolean(form.aktiv)} onCheckedChange={(checked) => setForm({ ...form, aktiv: checked })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
              <Button type="submit" className="bg-[#5e6d35] text-white hover:bg-[#4f5d2f]">Speichern</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
