"use client";

import { ClipboardCheck, Download, Eye, FileText, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SchiedsrichterkarteGenerator from "@/components/SchiedsrichterkarteGenerator";
import type { Spiel } from "./types";

interface ExportsPanelProps {
  spiele: Spiel[];
  turnierName: string;
  onExportRegistrations: () => void;
  onExportStats: () => void;
  onExportSchedule: () => void;
  onExportScheduleExcel: () => void;
  onPreviewSchedule: () => void;
}

export function ExportsPanel({
  spiele,
  turnierName,
  onExportRegistrations,
  onExportStats,
  onExportSchedule,
  onExportScheduleExcel,
  onPreviewSchedule,
}: ExportsPanelProps) {
  const exportGroups = [
    {
      title: "CSV",
      description: "Rohdaten für Tabellen, Abrechnung und Nachbereitung.",
      icon: Table2,
      actions: [
        {
          title: "Anmeldungen",
          description: "Team- und Kontaktdaten exportieren",
          icon: Download,
          onClick: onExportRegistrations,
        },
        {
          title: "Statistiken",
          description: "Auswertung und Abrechnung exportieren",
          icon: Download,
          onClick: onExportStats,
        },
      ],
    },
    {
      title: "Spielplan",
      description: "Spielplan prüfen und als druckfähige oder editierbare Datei sichern.",
      icon: FileText,
      actions: [
        {
          title: "Spielplan PDF",
          description: "Druckfähigen Spielplan herunterladen",
          icon: Download,
          onClick: onExportSchedule,
        },
        {
          title: "Spielplan Excel",
          description: "Bearbeitbare XLSX-Datei herunterladen",
          icon: Table2,
          onClick: onExportScheduleExcel,
        },
        {
          title: "PDF Vorschau",
          description: "Spielplan im Browser prüfen",
          icon: Eye,
          onClick: onPreviewSchedule,
        },
      ],
    },
  ];

  return (
    <div className="grid min-w-0 gap-5 overflow-hidden">
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {exportGroups.map((group) => (
          <Card key={group.title} className="min-w-0 overflow-hidden rounded-[8px]">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="flex min-w-0 items-center gap-2 text-lg">
                  <group.icon className="size-5 shrink-0 text-[#5e6d35]" />
                  <span className="min-w-0 break-words">{group.title}</span>
                </CardTitle>
                <p className="!mt-1 max-w-prose text-sm leading-5 text-muted-foreground">{group.description}</p>
              </div>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-3 sm:grid-cols-2">
              {group.actions.map((action) => (
                <Button
                  key={action.title}
                  variant="outline"
                  onClick={action.onClick}
                  className="h-auto min-w-0 whitespace-normal rounded-[8px] p-0 text-left"
                >
                  <span className="flex min-w-0 w-full items-start gap-3 p-4">
                    <action.icon className="mt-0.5 size-5 shrink-0 text-[#5e6d35]" />
                    <span className="min-w-0">
                      <span className="block break-words font-medium leading-5">{action.title}</span>
                      <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">{action.description}</span>
                    </span>
                  </span>
                </Button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="min-w-0 overflow-hidden rounded-[8px] border-[#d9dec8] bg-white">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex min-w-0 items-center gap-2 text-lg">
              <ClipboardCheck className="size-5 shrink-0 text-[#5e6d35]" />
              <span className="min-w-0 break-words">Nachbereitung</span>
            </CardTitle>
            <p className="!mt-1 max-w-prose text-sm leading-5 text-muted-foreground">
              Unterlagen für Schiedsrichterkarten und Ergebniseingabe.
            </p>
          </div>
        </CardHeader>
        <CardContent className="min-w-0">
          <SchiedsrichterkarteGenerator spiele={spiele} turnierName={turnierName} embedded />
        </CardContent>
      </Card>
    </div>
  );
}
