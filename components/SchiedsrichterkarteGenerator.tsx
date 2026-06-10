"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, QrCode, Upload, X } from "lucide-react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Spiel {
  id: string;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  status: string;
  ergebnis?: string | null;
}

interface SchiedsrichterkarteGeneratorProps {
  spiele: Spiel[];
  turnierName: string;
  embedded?: boolean;
}

interface ScoreCode {
  spielId: string;
  code: string;
}

interface UploadedLogo {
  dataUrl: string;
  name: string;
  aspectRatio: number;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const PAGE_MARGIN = 8;
const CARD_GAP = 3;
const CARD_COLUMNS = 3;
const CARD_ROWS = 3;
const CARDS_PER_PAGE = CARD_COLUMNS * CARD_ROWS;
const CARD_WIDTH = (PAGE_WIDTH - PAGE_MARGIN * 2 - CARD_GAP * (CARD_COLUMNS - 1)) / CARD_COLUMNS;
const CARD_HEIGHT = (PAGE_HEIGHT - PAGE_MARGIN * 2 - CARD_GAP * (CARD_ROWS - 1)) / CARD_ROWS;
const LOGO_STORAGE_KEY = "svp_referee_card_logo";
const QR_SIZE = 6;
const QR_Y = 9.1;
const TEAM_ONE_Y = 16.2;
const TEAM_TWO_Y = 22.2;
const GOAL_STRIKE_Y = 30.4;
const GOAL_GRID_GAP = 2;
const GOAL_GRID_COLUMNS = 5;
const GOAL_GRID_CELL_HEIGHT = 9.65;

export default function SchiedsrichterkarteGenerator({
  spiele,
  turnierName,
  embedded = false,
}: SchiedsrichterkarteGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedLogo, setUploadedLogo] = useState<UploadedLogo | null>(null);
  const playableGames = useMemo(
    () => spiele.filter((spiel) => spiel.team1 && spiel.team2),
    [spiele]
  );
  const pageCount = Math.max(1, Math.ceil(playableGames.length / CARDS_PER_PAGE));

  useEffect(() => {
    try {
      const savedLogo = localStorage.getItem(LOGO_STORAGE_KEY);

      if (savedLogo) {
        setUploadedLogo(JSON.parse(savedLogo));
      }
    } catch (error) {
      console.error("Logo konnte nicht geladen werden:", error);
      localStorage.removeItem(LOGO_STORAGE_KEY);
    }
  }, []);

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte eine Bilddatei hochladen");
      return;
    }

    try {
      const logo = await prepareLogo(file);
      setUploadedLogo(logo);
      localStorage.setItem(LOGO_STORAGE_KEY, JSON.stringify(logo));
      toast.success("Logo für Schiedsrichterkarten gespeichert");
    } catch (error) {
      console.error(error);
      toast.error("Logo konnte nicht verarbeitet werden");
    }
  }

  function removeLogo() {
    setUploadedLogo(null);
    localStorage.removeItem(LOGO_STORAGE_KEY);
    toast.success("Logo entfernt");
  }

  async function generateA4Cards() {
    if (playableGames.length === 0) {
      toast.error("Kein Spielplan vorhanden");
      return;
    }

    setIsGenerating(true);

    try {
      const codes = await createScoreCodes(playableGames.map((spiel) => spiel.id));
      const codesByGameId = new Map(codes.map((code) => [code.spielId, code.code]));
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      for (let index = 0; index < playableGames.length; index++) {
        if (index > 0 && index % CARDS_PER_PAGE === 0) {
          doc.addPage();
        }

        const pageIndex = index % CARDS_PER_PAGE;
        const column = pageIndex % CARD_COLUMNS;
        const row = Math.floor(pageIndex / CARD_COLUMNS);
        const x = PAGE_MARGIN + column * (CARD_WIDTH + CARD_GAP);
        const y = PAGE_MARGIN + row * (CARD_HEIGHT + CARD_GAP);
        const spiel = playableGames[index];
        const scoreCode = codesByGameId.get(spiel.id);

        if (!scoreCode) {
          throw new Error(`Kein Karten-Code für Spiel ${spiel.id}`);
        }

        const qrDataUrl = await QRCode.toDataURL(scoreCode, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 160,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });

        drawCard(doc, spiel, qrDataUrl, uploadedLogo, x, y, index + 1, turnierName);
      }

      addCutMarks(doc);
      doc.save(`Schiedsrichterkarten_A4_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`${playableGames.length} Schiedsrichterkarten erstellt`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Schiedsrichterkarten konnten nicht erstellt werden");
    } finally {
      setIsGenerating(false);
    }
  }

  const content = (
    <>
      <CardHeader className="flex min-w-0 flex-col gap-3 px-0 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <CardTitle className="text-lg">Schiedsrichterkarten</CardTitle>
          <p className="!mt-1 text-sm text-muted-foreground">
            DIN A4 Druckbogen mit 9 Spielpaarungen und App-Code zur Ergebniseingabe in der PWA.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-[#d9dec8] text-[#5e6d35]">
          {playableGames.length} Spiele · {pageCount} Seite(n)
        </Badge>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4 px-0 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-center">
        <div className="grid min-w-0 gap-3 md:grid-cols-3">
          <div className="min-w-0 overflow-hidden rounded-[8px] border bg-white p-4">
            <FileText className="mb-3 size-5 text-[#5e6d35]" />
            <p className="!mt-0 break-words text-sm font-medium">A4 Layout</p>
            <p className="!mt-1 break-words text-xs leading-5 text-muted-foreground">3 x 3 Karten pro Seite, mit Schnittmarken.</p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-[8px] border bg-white p-4">
            <QrCode className="mb-3 size-5 text-[#5e6d35]" />
            <p className="!mt-0 break-words text-sm font-medium">App-Code</p>
            <p className="!mt-1 break-words text-xs leading-5 text-muted-foreground">Kein Weblink: Der Code funktioniert im Admin/PWA-Scanner.</p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-[8px] border bg-white p-4">
            <p className="!mt-0 break-words text-sm font-medium">Handy-Eingabe</p>
            <p className="!mt-1 break-words text-xs leading-5 text-muted-foreground">Scan öffnet den rechten Ergebnisbereich.</p>
          </div>
        </div>
        <div className="grid min-w-0 gap-3">
          <div className="min-w-0 overflow-hidden rounded-[8px] border bg-white p-3">
            <p className="!mt-0 break-words text-sm font-medium">Logo oben rechts</p>
            <p className="!mt-1 break-words text-xs leading-5 text-muted-foreground">
              {uploadedLogo ? uploadedLogo.name : "Optionales Logo für jede Karte hochladen."}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row xl:flex-col">
              <label className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-center text-sm font-medium leading-5 transition-colors hover:bg-accent">
                <Upload className="size-4" />
                <span className="min-w-0 break-words">Logo hochladen</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="sr-only" />
              </label>
              {uploadedLogo && (
                <Button type="button" variant="ghost" size="sm" onClick={removeLogo} className="h-auto min-h-8 whitespace-normal text-muted-foreground">
                  <X className="size-4" />
                  Logo entfernen
                </Button>
              )}
            </div>
          </div>
          <Button
            type="button"
            disabled={isGenerating || playableGames.length === 0}
            onClick={generateA4Cards}
            className="h-auto min-h-9 w-full whitespace-normal bg-[#5e6d35] text-white hover:bg-[#4f5d2f]"
          >
            <FileText className="size-4" />
            <span className="min-w-0 break-words">{isGenerating ? "PDF wird erstellt..." : "A4 Karten-PDF erstellen"}</span>
          </Button>
        </div>
      </CardContent>
    </>
  );

  if (embedded) {
    return <div className="min-w-0 overflow-hidden">{content}</div>;
  }

  return (
    <Card className="min-w-0 overflow-hidden rounded-[8px] px-6">
      {content}
    </Card>
  );
}

function prepareLogo(file: File) {
  return new Promise<UploadedLogo>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        const maxSize = 420;
        const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Logo konnte nicht gelesen werden"));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          name: file.name,
          aspectRatio: width / height,
        });
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Logo konnte nicht geladen werden"));
    };

    image.src = objectUrl;
  });
}

async function createScoreCodes(spielIds: string[]) {
  const response = await fetch("/api/schiedsrichterkarten", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "create_score_codes",
      spielIds,
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Karten-Codes konnten nicht erstellt werden");
  }

  return (data.codes || []) as ScoreCode[];
}

function drawCard(
  doc: jsPDF,
  spiel: Spiel,
  qrDataUrl: string,
  logo: UploadedLogo | null,
  x: number,
  y: number,
  index: number,
  turnierName: string
) {
  doc.setDrawColor(40);
  doc.setLineWidth(0.25);
  doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT);

  doc.setFillColor(246, 247, 241);
  doc.rect(x, y, CARD_WIDTH, 7.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.9);
  doc.text("Schiedsrichterkarte", x + 2.5, y + 3.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.4);
  const logoBox = getLogoBox(logo, x + CARD_WIDTH - 11.4, y + 0.9, 8.9, 5.4);
  const headerRight = logo ? logoBox.x - 1.6 : x + CARD_WIDTH - 2.5;
  doc.text(`Nr. ${index}`, headerRight, y + 3.5, { align: "right" });
  doc.text(trimText(doc, turnierName, headerRight - x - 2.5), x + 2.5, y + 6.2);

  if (logo) {
    doc.addImage(logo.dataUrl, "PNG", logoBox.x, logoBox.y, logoBox.width, logoBox.height);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.6);
  const qrX = x + CARD_WIDTH - QR_SIZE - 2.5;
  const qrY = y + QR_Y;
  const infoWidth = CARD_WIDTH - QR_SIZE - 9;
  doc.text(trimText(doc, `${formatDate(spiel.datum)} · ${spiel.zeit} Uhr`, infoWidth), x + 2.5, y + 10.4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.text(trimText(doc, spiel.feld, infoWidth), x + 2.5, y + 12.9);

  doc.addImage(qrDataUrl, "PNG", qrX, qrY, QR_SIZE, QR_SIZE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(3.2);
  doc.text("Scan", qrX + QR_SIZE / 2, qrY + QR_SIZE + 1.4, { align: "center" });

  drawTeamBox(doc, x + 2.5, y + TEAM_ONE_Y, CARD_WIDTH - 5, spiel.team1, "Team 1");
  drawTeamBox(doc, x + 2.5, y + TEAM_TWO_Y, CARD_WIDTH - 5, spiel.team2, "Team 2");

  drawGoalStrikeList(doc, x + 2.5, y + GOAL_STRIKE_Y, CARD_WIDTH - 5);
}

function getLogoBox(
  logo: UploadedLogo | null,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
) {
  if (!logo) {
    return { x, y, width: maxWidth, height: maxHeight };
  }

  const aspectRatio = Number.isFinite(logo.aspectRatio) && logo.aspectRatio > 0 ? logo.aspectRatio : 1;
  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    x: x + maxWidth - width,
    y: y + (maxHeight - height) / 2,
    width,
    height,
  };
}

function drawTeamBox(doc: jsPDF, x: number, y: number, width: number, teamName: string, label: string) {
  doc.setDrawColor(80);
  doc.setLineWidth(0.15);
  doc.rect(x, y, width, 5.1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(3.4);
  doc.text(label, x + 1.5, y + 1.9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  doc.text(trimText(doc, teamName, width - 3), x + 1.5, y + 4.5);
}

function drawGoalStrikeList(doc: jsPDF, x: number, y: number, width: number) {
  const teamWidth = (width - GOAL_GRID_GAP) / 2;

  drawGoalGrid(doc, x, y, teamWidth, "T1");
  drawGoalGrid(doc, x + teamWidth + GOAL_GRID_GAP, y, teamWidth, "T2");
}

function drawGoalGrid(doc: jsPDF, x: number, y: number, width: number, label: string) {
  const columns = GOAL_GRID_COLUMNS;
  const cellWidth = width / columns;
  const cellHeight = GOAL_GRID_CELL_HEIGHT;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.4);
  doc.text(label, x, y - 1.1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);
  doc.setDrawColor(80);
  doc.setLineWidth(0.14);

  for (let goal = 1; goal <= 30; goal++) {
    const zeroBased = goal - 1;
    const column = zeroBased % columns;
    const row = Math.floor(zeroBased / columns);
    const cellX = x + column * cellWidth;
    const cellY = y + row * cellHeight;

    doc.rect(cellX, cellY, cellWidth, cellHeight);
    doc.text(String(goal), cellX + cellWidth / 2, cellY + 6.2, { align: "center" });
  }
}

function addCutMarks(doc: jsPDF) {
  const pageTotal = doc.getNumberOfPages();

  for (let page = 1; page <= pageTotal; page++) {
    doc.setPage(page);
    doc.setDrawColor(180);
    doc.setLineWidth(0.1);

    for (let column = 1; column < CARD_COLUMNS; column++) {
      const cutX = PAGE_MARGIN + column * CARD_WIDTH + (column - 0.5) * CARD_GAP;
      doc.line(cutX, PAGE_MARGIN - 2, cutX, PAGE_MARGIN);
      doc.line(cutX, PAGE_HEIGHT - PAGE_MARGIN, cutX, PAGE_HEIGHT - PAGE_MARGIN + 2);
    }

    for (let row = 1; row < CARD_ROWS; row++) {
      const cutY = PAGE_MARGIN + row * CARD_HEIGHT + (row - 0.5) * CARD_GAP;
      doc.line(PAGE_MARGIN - 2, cutY, PAGE_MARGIN, cutY);
      doc.line(PAGE_WIDTH - PAGE_MARGIN, cutY, PAGE_WIDTH - PAGE_MARGIN + 2, cutY);
    }
  }
}

function trimText(doc: jsPDF, text: string, maxWidth: number) {
  if (doc.getTextWidth(text) <= maxWidth) {
    return text;
  }

  let next = text;

  while (next.length > 1 && doc.getTextWidth(`${next}...`) > maxWidth) {
    next = next.slice(0, -1);
  }

  return `${next}...`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}
