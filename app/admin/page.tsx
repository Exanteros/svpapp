"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CalendarDays, Download, ListChecks, Settings, ShieldCheck, Users, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/sonner";
import { exportAnmeldungenCSV, exportSpielplanXLSX, exportStatistikenCSV } from "@/lib/export-utils";
import { exportSimpleSpielplanPDF, previewSpielplanPDF } from "@/lib/pdf-export-simple";

import {
  AdminApiError,
  createHelferDemoData,
  createRegistrationDemoData,
  deleteAllSpiele,
  deleteHelferAnmeldung,
  deleteHelferBedarf,
  deleteRegistration,
  downloadDatabaseBackup,
  flushHelferDatabase,
  flushRegistrationDatabase,
  generateHelferLink,
  generateSpielplan,
  getAdminData,
  getFeldEinstellungen,
  getHelferData,
  getSpielplan,
  logout,
  publishSpielplan,
  restoreDatabaseBackup,
  saveFeldEinstellungen,
  saveHelferBedarf,
  saveSettings,
  updateHelferBedarf,
  updateHelferStatus,
  updateRegistrationInfo,
  updateRegistrationStatus,
  updateSpiel,
  uploadRegistrationImport,
  unpublishSpielplan,
} from "./_components/admin-api";
import { AdminShell } from "./_components/admin-shell";
import { AdminAccessPanel } from "./_components/admin-access-panel";
import { DayToolsPanel } from "./_components/day-tools-panel";
import { ExportsPanel } from "./_components/exports-panel";
import { HelpersPanel } from "./_components/helpers-panel";
import { OverviewPanel } from "./_components/overview-panel";
import { RegistrationsPanel } from "./_components/registrations-panel";
import { SchedulePanel } from "./_components/schedule-panel";
import { SettingsPanel } from "./_components/settings-panel";
import type {
  AdminNavItem,
  AdminSectionId,
  Anmeldung,
  FeldEinstellungen,
  HelferAnmeldung,
  HelferBedarf,
  RegistrationImportOptions,
  Spiel,
  TurnierEinstellungen,
} from "./_components/types";
import { DEFAULT_SETTINGS, DEFAULT_STATS } from "./_components/types";

type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
} | null;

const navItems: AdminNavItem[] = [
  { id: "overview", label: "Übersicht", description: "Lage und nächste Aktion", icon: ListChecks },
  { id: "registrations", label: "Anmeldungen", description: "Teams und Zahlungen", icon: Users },
  { id: "schedule", label: "Spielplan", description: "Planung und Veröffentlichung", icon: CalendarDays },
  { id: "day", label: "Turniertag", description: "Live Games und Ergebnisse", icon: Activity },
  { id: "helpers", label: "Helfer", description: "Bedarf und Rückmeldungen", icon: UserRoundCheck },
  { id: "settings", label: "Einstellungen", description: "Turnierdaten und Preise", icon: Settings },
  { id: "admins", label: "Admins", description: "Zugänge und Passkeys", icon: ShieldCheck },
  { id: "exports", label: "Export", description: "PDF, CSV und Nachbereitung", icon: Download },
];

export default function AdminPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSectionId>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldung[]>([]);
  const [statistiken, setStatistiken] = useState(DEFAULT_STATS);
  const [settings, setSettings] = useState<TurnierEinstellungen>(DEFAULT_SETTINGS);
  const [feldEinstellungen, setFeldEinstellungen] = useState<FeldEinstellungen[]>([]);
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [helferBedarf, setHelferBedarf] = useState<HelferBedarf[]>([]);
  const [helferAnmeldungen, setHelferAnmeldungen] = useState<HelferAnmeldung[]>([]);
  const [helferLink, setHelferLink] = useState("");
  const [moduleErrors, setModuleErrors] = useState<Record<string, string>>({});
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);

  const unpaidCount = useMemo(
    () => anmeldungen.filter((anmeldung) => anmeldung.status !== "bezahlt").length,
    [anmeldungen]
  );

  async function loadAll(showToast = false) {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        getAdminData(),
        getFeldEinstellungen(),
        getSpielplan(),
        getHelferData(),
      ]);
      const nextErrors: Record<string, string> = {};
      const labels = ["Admin-Daten", "Felder", "Spielplan", "Helfer"];

      const authFailure = results.find(
        (result) => result.status === "rejected" && result.reason instanceof AdminApiError && [401, 403].includes(result.reason.status)
      );

      if (authFailure) {
        router.replace("/admin/login");
        return;
      }

      const [adminResult, fieldResult, scheduleResult, helperResult] = results;

      if (adminResult.status === "fulfilled") {
        setAnmeldungen(adminResult.value.anmeldungen || []);
        setStatistiken(adminResult.value.statistiken || DEFAULT_STATS);
        setSettings({ ...DEFAULT_SETTINGS, ...(adminResult.value.settings || {}) });
      } else {
        nextErrors.admin = getLoadErrorMessage(labels[0], adminResult.reason);
      }

      if (fieldResult.status === "fulfilled") {
        setFeldEinstellungen(fieldResult.value || []);
      } else {
        nextErrors.fields = getLoadErrorMessage(labels[1], fieldResult.reason);
      }

      if (scheduleResult.status === "fulfilled") {
        setSpiele(scheduleResult.value || []);
      } else {
        nextErrors.schedule = getLoadErrorMessage(labels[2], scheduleResult.reason);
      }

      if (helperResult.status === "fulfilled") {
        setHelferBedarf(helperResult.value.bedarf || []);
        setHelferAnmeldungen(helperResult.value.anmeldungen || []);
        setHelferLink(helperResult.value.helferLink || "");
      } else {
        nextErrors.helpers = getLoadErrorMessage(labels[3], helperResult.reason);
      }

      setModuleErrors(nextErrors);

      if (showToast) {
        if (Object.keys(nextErrors).length > 0) {
          toast.warning("Einige Admin-Module konnten nicht geladen werden");
        } else {
          toast.success("Admin-Daten aktualisiert");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Admin-Daten konnten nicht geladen werden");
      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace("/admin/login");
    }
  }

  async function withMutation(label: string, mutation: () => Promise<void>): Promise<boolean> {
    try {
      setSaving(true);
      await mutation();
      toast.success(label);
      return true;
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Aktion fehlgeschlagen");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function requestConfirm(dialog: NonNullable<ConfirmDialogState>) {
    setConfirmDialog(dialog);
  }

  async function runConfirmedAction() {
    if (!confirmDialog) return;

    const action = confirmDialog.onConfirm;
    setConfirmDialog(null);
    await action();
  }

  async function handleRegistrationStatus(anmeldungId: string, status: string) {
    await withMutation("Status aktualisiert", async () => {
      await updateRegistrationStatus(anmeldungId, status);
      await loadAll();
    });
  }

  async function handleRegistrationInfo(anmeldungId: string, info: Pick<Anmeldung, "verein" | "kontakt" | "email" | "mobil" | "kosten">) {
    return withMutation("Vereinsdaten gespeichert", async () => {
      await updateRegistrationInfo(anmeldungId, info);
      await loadAll();
    });
  }

  function handleDeleteRegistration(anmeldung: Anmeldung) {
    requestConfirm({
      title: "Anmeldung löschen",
      description: `Die Anmeldung von "${anmeldung.verein}" mit ${anmeldung.teams.length} Team(s) wird dauerhaft entfernt.`,
      confirmLabel: "Anmeldung löschen",
      onConfirm: async () => {
        await withMutation("Anmeldung gelöscht", async () => {
          await deleteRegistration(anmeldung.id);
          await loadAll();
        });
      },
    });
  }

  async function handleBulkRegistrationStatus(anmeldungIds: string[], status: string) {
    return withMutation("Auswahl aktualisiert", async () => {
      await Promise.all(anmeldungIds.map((anmeldungId) => updateRegistrationStatus(anmeldungId, status)));
      await loadAll();
    });
  }

  function handleExportRegistrationSelection(anmeldungIds: string[]) {
    const selected = anmeldungen.filter((anmeldung) => anmeldungIds.includes(anmeldung.id));

    if (selected.length === 0) {
      toast.error("Keine Anmeldungen ausgewählt");
      return;
    }

    exportAnmeldungenCSV(toExportableAnmeldungen(selected));
  }

  function handlePaymentReminder(anmeldungIds: string[]) {
    const recipients = anmeldungen
      .filter((anmeldung) => anmeldungIds.includes(anmeldung.id) && anmeldung.status !== "bezahlt")
      .map((anmeldung) => anmeldung.email)
      .filter(Boolean);

    if (recipients.length === 0) {
      toast.error("Keine offenen Zahlungen in der Auswahl");
      return;
    }

    const subject = encodeURIComponent("Zahlungserinnerung Handball-Turnier SV Puschendorf");
    const body = encodeURIComponent(
      `Hallo,\n\nwir prüfen gerade die Anmeldungen für das Handball-Turnier des SV Puschendorf. Für eure Anmeldung ist bei uns noch keine Zahlung als eingegangen markiert.\n\nBitte meldet euch kurz, falls die Zahlung bereits unterwegs ist.\n\nViele Grüße\nSV Puschendorf`
    );
    window.location.href = `mailto:?bcc=${encodeURIComponent(recipients.join(","))}&subject=${subject}&body=${body}`;
  }

  async function handleRegistrationImport(file: File, options: RegistrationImportOptions) {
    try {
      setSaving(true);
      const result = await uploadRegistrationImport(file, options);
      await loadAll();
      toast.success(
        `Import abgeschlossen: ${result.summary.created} neu, ${result.summary.updated} aktualisiert`
      );
      return result;
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Import fehlgeschlagen");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleFieldSettingsChange(nextSettings: FeldEinstellungen[]) {
    return withMutation("Feldeinstellungen gespeichert", async () => {
      const response = await saveFeldEinstellungen(nextSettings);
      const savedFields = response.feldEinstellungen || nextSettings;
      setFeldEinstellungen(savedFields);
      setSettings((current) => ({ ...current, anzahlFelder: savedFields.length }));
    });
  }

  async function handleScheduleSettingsPatch(patch: Partial<TurnierEinstellungen>) {
    const previousSettings = settings;
    const nextSettings = { ...settings, ...patch };
    setSettings(nextSettings);

    const saved = await withMutation("Einstellungen gespeichert", async () => {
      const response = await saveSettings(nextSettings);
      setSettings(response.settings || nextSettings);
    });

    if (!saved) {
      setSettings(previousSettings);
    }
  }

  async function handleGenerateSchedule(settingsPatch: Partial<TurnierEinstellungen> = {}) {
    await withMutation("Spielplan generiert", async () => {
      const generationSettings = { ...settings, ...settingsPatch };
      const generated = await generateSpielplan(generationSettings, feldEinstellungen);
      setSpiele(generated.spiele);
      if (generated.feldEinstellungen) {
        setFeldEinstellungen(generated.feldEinstellungen);
      }
      setSettings((current) => ({ ...current, ...settingsPatch, spielplanStatus: "draft", spielplanPublishedAt: null }));
      if (generated.spielzeitOptimierung.length > 0) {
        toast.success(
          generated.spielzeitOptimierung
            .map((item) => {
              const timing = item.regelText || `${item.spielzeit} Min Spiel, ${item.pausenzeit} Min Pause`;
              return `${item.datum}: ${timing}, ${item.spiele} Spiele auf ${item.aktiveFelder} Feldern, ${item.ausgelasseneSpiele} Überhang`;
            })
            .join(" · ")
        );
      }
      await loadAll();
    });
  }

  async function handlePublishSchedule() {
    await withMutation("Spielplan veröffentlicht", async () => {
      const publication = await publishSpielplan();
      setSettings((current) => ({ ...current, ...publication }));
      await loadAll();
    });
  }

  async function handleUnpublishSchedule() {
    await withMutation("Spielplan zurückgezogen", async () => {
      const publication = await unpublishSpielplan();
      setSettings((current) => ({ ...current, ...publication }));
      await loadAll();
    });
  }

  function handleDeleteAllGames() {
    requestConfirm({
      title: "Spielplan leeren",
      description: `${spiele.length} Spiel(e) werden dauerhaft gelöscht. Der Spielplan wird wieder als Entwurf geführt.`,
      confirmLabel: "Spielplan leeren",
      onConfirm: async () => {
        await withMutation("Spielplan geleert", async () => {
          await deleteAllSpiele();
          setSpiele([]);
          setSettings((current) => ({ ...current, spielplanStatus: "draft", spielplanPublishedAt: null }));
          await loadAll();
        });
      },
    });
  }

  async function handleMoveSpiel(spielId: string, patch: Pick<Spiel, "datum" | "zeit" | "feld">) {
    return withMutation("Spiel verschoben", async () => {
      await updateSpiel(spielId, patch);
      setSpiele((current) =>
        current
          .map((spiel) => (spiel.id === spielId ? { ...spiel, ...patch } : spiel))
          .sort(compareSpiele)
      );
      setSettings((current) => ({ ...current, spielplanStatus: "draft", spielplanPublishedAt: null }));
    });
  }

  async function handleSaveSettings() {
    await withMutation("Einstellungen gespeichert", async () => {
      const response = await saveSettings(settings);
      setSettings({ ...DEFAULT_SETTINGS, ...(response.settings || settings) });
      await loadAll();
    });
  }

  async function handleDownloadBackup() {
    try {
      setBackupBusy(true);
      await downloadDatabaseBackup();
      toast.success("Backup heruntergeladen");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Backup konnte nicht heruntergeladen werden");
    } finally {
      setBackupBusy(false);
    }
  }

  async function handleRestoreBackup(file: File) {
    requestConfirm({
      title: "Backup wiederherstellen",
      description: `Die aktuelle Datenbank wird durch "${file.name}" ersetzt. Vorher wird automatisch ein Sicherheitsbackup erstellt.`,
      confirmLabel: "Backup wiederherstellen",
      onConfirm: async () => {
        try {
          setBackupBusy(true);
          await restoreDatabaseBackup(file);
          toast.success("Backup wiederhergestellt");
          await loadAll();
        } catch (error) {
          console.error(error);
          toast.error(error instanceof Error ? error.message : "Backup konnte nicht wiederhergestellt werden");
        } finally {
          setBackupBusy(false);
        }
      },
    });
  }

  async function handleSaveHelferBedarf(bedarf: Omit<HelferBedarf, "id" | "created_at">, id?: string) {
    await withMutation("Helfer-Bedarf gespeichert", async () => {
      if (id) {
        await updateHelferBedarf(id, bedarf);
      } else {
        await saveHelferBedarf(bedarf);
      }
      const data = await getHelferData();
      setHelferBedarf(data.bedarf || []);
      setHelferAnmeldungen(data.anmeldungen || []);
      setHelferLink(data.helferLink || "");
    });
  }

  function handleDeleteHelferBedarf(bedarf: HelferBedarf) {
    requestConfirm({
      title: "Helfer-Bedarf löschen",
      description: `Der Bedarf "${bedarf.titel}" am ${bedarf.datum} von ${bedarf.startzeit} bis ${bedarf.endzeit} wird entfernt.`,
      confirmLabel: "Bedarf löschen",
      onConfirm: async () => {
        await withMutation("Helfer-Bedarf gelöscht", async () => {
          await deleteHelferBedarf(bedarf.id);
          const data = await getHelferData();
          setHelferBedarf(data.bedarf || []);
          setHelferAnmeldungen(data.anmeldungen || []);
        });
      },
    });
  }

  async function handleGenerateHelferLink() {
    await withMutation("Helfer-Link generiert", async () => {
      const data = await generateHelferLink();
      setHelferLink(data.helferLink || "");
    });
  }

  async function handleHelferStatus(anmeldungId: string, status: string) {
    await withMutation("Helfer-Status aktualisiert", async () => {
      await updateHelferStatus(anmeldungId, status);
      const data = await getHelferData();
      setHelferAnmeldungen(data.anmeldungen || []);
    });
  }

  function handleDeleteHelferAnmeldung(anmeldung: HelferAnmeldung) {
    requestConfirm({
      title: "Helfer-Anmeldung löschen",
      description: `Die Rückmeldung von "${anmeldung.name}" wird dauerhaft aus der Helferliste entfernt.`,
      confirmLabel: "Helfer-Anmeldung löschen",
      onConfirm: async () => {
        await withMutation("Helfer-Anmeldung gelöscht", async () => {
          await deleteHelferAnmeldung(anmeldung.id);
          const data = await getHelferData();
          setHelferAnmeldungen(data.anmeldungen || []);
        });
      },
    });
  }

  function exportSchedulePdf() {
    if (spiele.length === 0) {
      toast.error("Kein Spielplan vorhanden");
      return;
    }

    exportSimpleSpielplanPDF(toExportableSpiele(spiele), toPdfSettings(settings));
  }

  function previewSchedulePdf() {
    if (spiele.length === 0) {
      toast.error("Kein Spielplan vorhanden");
      return;
    }

    previewSpielplanPDF(toExportableSpiele(spiele), toPdfSettings(settings));
  }

  async function exportScheduleExcel() {
    if (spiele.length === 0) {
      toast.error("Kein Spielplan vorhanden");
      return;
    }

    try {
      await exportSpielplanXLSX(toExportableSpiele(spiele), settings);
      toast.success("Spielplan als Excel exportiert");
    } catch (error) {
      console.error("Excel-Export fehlgeschlagen:", error);
      toast.error("Excel-Export konnte nicht erstellt werden");
    }
  }

  const section = (() => {
    switch (activeSection) {
      case "overview":
        return (
          <OverviewPanel
            statistiken={statistiken}
            anmeldungen={anmeldungen}
            spiele={spiele}
            helferAnmeldungen={helferAnmeldungen}
            settings={settings}
            onNavigate={setActiveSection}
          />
        );
      case "registrations":
        return (
          <RegistrationsPanel
            anmeldungen={anmeldungen}
            onStatusChange={handleRegistrationStatus}
            onInfoUpdate={handleRegistrationInfo}
            onBulkStatusChange={handleBulkRegistrationStatus}
            onExportSelected={handleExportRegistrationSelection}
            onPaymentReminder={handlePaymentReminder}
            onImport={handleRegistrationImport}
            onDelete={handleDeleteRegistration}
            onCreateDemo={() =>
              withMutation("Demo-Anmeldungen erstellt", async () => {
                await createRegistrationDemoData();
                await loadAll();
              })
            }
            onFlush={() =>
              withMutation("Anmeldungen geleert", async () => {
                await flushRegistrationDatabase();
                await loadAll();
              })
            }
          />
        );
      case "schedule":
        return (
          <SchedulePanel
            settings={settings}
            feldEinstellungen={feldEinstellungen}
            spiele={spiele}
            saving={saving}
            onFeldSettingsSave={handleFieldSettingsChange}
            onSettingsPatch={handleScheduleSettingsPatch}
            onGenerate={handleGenerateSchedule}
            onPublish={handlePublishSchedule}
            onUnpublish={handleUnpublishSchedule}
            onDeleteAll={handleDeleteAllGames}
            onSpielMove={handleMoveSpiel}
          />
        );
      case "day":
        return <DayToolsPanel />;
      case "helpers":
        return (
          <HelpersPanel
            bedarf={helferBedarf}
            anmeldungen={helferAnmeldungen}
            helferLink={helferLink}
            defaultDate={settings.turnierStartDatum}
            saving={saving}
            onSaveBedarf={handleSaveHelferBedarf}
            onDeleteBedarf={handleDeleteHelferBedarf}
            onGenerateLink={handleGenerateHelferLink}
            onHelferStatusChange={handleHelferStatus}
            onDeleteAnmeldung={handleDeleteHelferAnmeldung}
            onCreateDemo={() =>
              withMutation("Demo-Helfer erstellt", async () => {
                await createHelferDemoData();
                const data = await getHelferData();
                setHelferBedarf(data.bedarf || []);
                setHelferAnmeldungen(data.anmeldungen || []);
              })
            }
            onFlush={() =>
              withMutation("Helfer-Daten geleert", async () => {
                await flushHelferDatabase();
                const data = await getHelferData();
                setHelferBedarf(data.bedarf || []);
                setHelferAnmeldungen(data.anmeldungen || []);
              })
            }
          />
        );
      case "settings":
        return (
          <SettingsPanel
            settings={settings}
            saving={saving}
            backupBusy={backupBusy}
            onChange={setSettings}
            onSave={handleSaveSettings}
            onDownloadBackup={handleDownloadBackup}
            onRestoreBackup={handleRestoreBackup}
          />
        );
      case "admins":
        return <AdminAccessPanel />;
      case "exports":
        return (
          <ExportsPanel
            spiele={spiele}
            turnierName={settings.turnierName}
            onExportRegistrations={() => exportAnmeldungenCSV(toExportableAnmeldungen(anmeldungen))}
            onExportStats={() => exportStatistikenCSV(statistiken, toExportableAnmeldungen(anmeldungen))}
            onExportSchedule={exportSchedulePdf}
            onExportScheduleExcel={exportScheduleExcel}
            onPreviewSchedule={previewSchedulePdf}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <>
      <AdminShell
        activeSection={activeSection}
        navItems={navItems}
        loading={loading || saving}
        onSectionChange={setActiveSection}
        onRefresh={() => loadAll(true)}
        onLogout={handleLogout}
      >
        {loading ? (
          <div className="rounded-[8px] border bg-white p-8 text-sm text-muted-foreground">
            Dashboard wird geladen...
          </div>
        ) : (
          <>
            {Object.keys(moduleErrors).length > 0 && (
              <div className="mb-5 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="!mt-0 font-medium">Einige Admin-Daten konnten nicht geladen werden.</p>
                <ul className="!my-2 !ml-4 list-disc">
                  {Object.entries(moduleErrors).map(([key, message]) => (
                    <li key={key}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
            {activeSection === "overview" && unpaidCount > 0 && (
              <div className="mb-5 rounded-[8px] border border-[#d9dec8] bg-white p-4 text-sm text-muted-foreground">
                {unpaidCount} Anmeldung(en) sind noch nicht als bezahlt markiert.
              </div>
            )}
            {section}
          </>
        )}
      </AdminShell>
      <AlertDialog open={Boolean(confirmDialog)} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void runConfirmedAction();
              }}
            >
              {confirmDialog?.confirmLabel || "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster />
    </>
  );
}

function toExportableSpiele(spiele: Spiel[]) {
  return spiele.map((spiel) => ({
    ...spiel,
    ergebnis: spiel.ergebnis || undefined,
  }));
}

function toExportableAnmeldungen(anmeldungen: Anmeldung[]) {
  return anmeldungen.map((anmeldung) => ({
    ...anmeldung,
    teams: anmeldung.teams.map((team) => ({
      ...team,
      schiri: Boolean(team.schiri),
      schiriName: team.schiriName || team.schiri_name || undefined,
      spielstaerke: team.spielstaerke || undefined,
    })),
  }));
}

function toPdfSettings(settings: TurnierEinstellungen) {
  return {
    turnierName: settings.turnierName,
    startgeld: String(settings.startgeld),
    schiriGeld: String(settings.schiriGeld),
    turnierStartDatum: settings.turnierStartDatum,
    turnierEndDatum: settings.turnierEndDatum,
  };
}

function compareSpiele(first: Spiel, second: Spiel) {
  return `${first.datum}-${first.zeit}-${first.feld}-${first.kategorie}-${first.team1}`.localeCompare(
    `${second.datum}-${second.zeit}-${second.feld}-${second.kategorie}-${second.team1}`,
    "de"
  );
}

function getLoadErrorMessage(label: string, error: unknown) {
  if (error instanceof Error) {
    return `${label}: ${error.message}`;
  }

  return `${label}: konnte nicht geladen werden`;
}
