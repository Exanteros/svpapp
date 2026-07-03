"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, QrCode, Upload, X } from "lucide-react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createTeamDisplayNameMapFromGames,
  formatScheduleCategoryLabel,
  formatTeamDisplayName,
  type TeamDisplayNameMap,
} from "@/lib/tournament";

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
  schiedsrichter?: string | null;
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

const A6_PAGE_MARGIN = 2;
const A6_CARD_GAP = 2;
const BASE_CARD_WIDTH = 101;
const BASE_CARD_HEIGHT = 144;
const LOGO_STORAGE_KEY = "svp_referee_card_logo";
const CARD_PADDING_X = 4;
const QR_SIZE = 22;
const QR_Y = 14;
const TEAM_ONE_Y = 43.2;
const TEAM_TWO_Y = 54.3;
const GOAL_STRIKE_Y = 70;
const GOAL_GRID_GAP = 2;
const GOAL_GRID_COLUMNS = 5;
const GOAL_GRID_CELL_HEIGHT = 11.5;

interface CardAsset {
  spiel: Spiel;
  qrDataUrl: string;
  index: number;
}

interface CardBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

type A6PdfLayout = "single" | "double";

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
  const singlePageCount = playableGames.length;
  const doublePageCount = playableGames.length > 0 ? Math.ceil(playableGames.length / 2) : 0;

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

  async function generateA6Cards() {
    if (playableGames.length === 0) {
      toast.error("Kein Spielplan vorhanden");
      return;
    }

    setIsGenerating(true);

    try {
      const codes = await createScoreCodes(playableGames.map((spiel) => spiel.id));
      const codesByGameId = new Map(codes.map((code) => [code.spielId, code.code]));
      const cardAssets: CardAsset[] = [];

      for (let index = 0; index < playableGames.length; index++) {
        const spiel = playableGames[index];
        const scoreCode = codesByGameId.get(spiel.id);

        if (!scoreCode) {
          throw new Error(`Kein Karten-Code für Spiel ${spiel.id}`);
        }

        const qrDataUrl = await QRCode.toDataURL(scoreCode, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 420,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });

        cardAssets.push({ spiel, qrDataUrl, index: index + 1 });
      }

      const today = new Date().toISOString().slice(0, 10);
      const singleDoc = createA6CardsPdf(cardAssets, uploadedLogo, turnierName, "single");
      const doubleDoc = createA6CardsPdf(cardAssets, uploadedLogo, turnierName, "double");

      singleDoc.save(`Schiedsrichterkarten_A6_1-pro-Seite_${today}.pdf`);
      doubleDoc.save(`Schiedsrichterkarten_A6_2-pro-Seite_${today}.pdf`);
      toast.success(`${playableGames.length} Schiedsrichterkarten in 2 PDF-Dateien erstellt`);
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
            DIN A6 Karten mit App-Code zur Ergebniseingabe in der PWA.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-[#d9dec8] text-[#5e6d35]">
          {playableGames.length} Spiele · {singlePageCount} + {doublePageCount} A6-Seite(n)
        </Badge>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4 px-0">
        <div className="grid min-w-0 gap-3 md:grid-cols-3">
          <div className="min-w-0 overflow-hidden rounded-[8px] border bg-white p-4">
            <FileText className="mb-3 size-5 text-[#5e6d35]" />
            <p className="!mt-0 break-words text-sm font-medium">A6 Einzelkarten</p>
            <p className="!mt-1 break-words text-xs leading-5 text-muted-foreground">Eine Schiedsrichterkarte pro DIN A6-Seite.</p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-[8px] border bg-white p-4">
            <QrCode className="mb-3 size-5 text-[#5e6d35]" />
            <p className="!mt-0 break-words text-sm font-medium">A6 Doppelkarte</p>
            <p className="!mt-1 break-words text-xs leading-5 text-muted-foreground">Zwei Schiedsrichterkarten pro DIN A6-Querformatseite.</p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-[8px] border bg-white p-4">
            <p className="!mt-0 break-words text-sm font-medium">2 PDF-Dateien</p>
            <p className="!mt-1 break-words text-xs leading-5 text-muted-foreground">Einzelkarten und Doppelkarte werden getrennt gespeichert.</p>
          </div>
        </div>
        <div className="grid min-w-0 gap-3 rounded-[8px] border bg-[#f8faf5] p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <p className="!mt-0 break-words text-sm font-medium">Logo oben rechts</p>
              <p className="!mt-1 break-words text-xs leading-5 text-muted-foreground">
                {uploadedLogo ? uploadedLogo.name : "Optionales Logo für jede Karte hochladen."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
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
            onClick={generateA6Cards}
            className="h-auto min-h-10 w-full whitespace-normal bg-[#5e6d35] px-4 text-white hover:bg-[#4f5d2f] lg:w-auto"
          >
            <FileText className="size-4" />
            <span className="min-w-0 break-words">{isGenerating ? "PDFs werden erstellt..." : "A6 Karten-PDFs erstellen"}</span>
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

function createA6CardsPdf(
  cards: CardAsset[],
  logo: UploadedLogo | null,
  turnierName: string,
  layout: A6PdfLayout
) {
  const doc = new jsPDF({
    orientation: layout === "double" ? "landscape" : "portrait",
    unit: "mm",
    format: "a6",
  });
  const cardsPerPage = layout === "double" ? 2 : 1;
  const teamDisplayNames = createTeamDisplayNameMapFromGames(cards.map((card) => card.spiel));

  for (let index = 0; index < cards.length; index++) {
    if (index > 0 && index % cardsPerPage === 0) {
      doc.addPage();
    }

    const pageIndex = index % cardsPerPage;
    const bounds = layout === "double"
      ? getDoubleA6CardBounds(doc, pageIndex)
      : getSingleA6CardBounds(doc);
    const card = cards[index];

    drawCard(doc, card.spiel, card.qrDataUrl, logo, bounds, card.index, turnierName, teamDisplayNames);
  }

  if (layout === "double") {
    addA6DoubleCutMarks(doc);
  }

  return doc;
}

function getSingleA6CardBounds(doc: jsPDF): CardBounds {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  return {
    x: A6_PAGE_MARGIN,
    y: A6_PAGE_MARGIN,
    width: pageWidth - A6_PAGE_MARGIN * 2,
    height: pageHeight - A6_PAGE_MARGIN * 2,
  };
}

function getDoubleA6CardBounds(doc: jsPDF, pageIndex: number): CardBounds {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = (pageWidth - A6_PAGE_MARGIN * 2 - A6_CARD_GAP) / 2;

  return {
    x: A6_PAGE_MARGIN + pageIndex * (width + A6_CARD_GAP),
    y: A6_PAGE_MARGIN,
    width,
    height: pageHeight - A6_PAGE_MARGIN * 2,
  };
}

function drawCard(
  doc: jsPDF,
  spiel: Spiel,
  qrDataUrl: string,
  logo: UploadedLogo | null,
  bounds: CardBounds,
  index: number,
  turnierName: string,
  teamDisplayNames: TeamDisplayNameMap
) {
  const scale = Math.min(bounds.width / BASE_CARD_WIDTH, bounds.height / BASE_CARD_HEIGHT);
  const cardWidth = BASE_CARD_WIDTH * scale;
  const cardHeight = BASE_CARD_HEIGHT * scale;
  const x = bounds.x + (bounds.width - cardWidth) / 2;
  const y = bounds.y + (bounds.height - cardHeight) / 2;
  const size = (value: number) => value * scale;

  doc.setDrawColor(40);
  doc.setLineWidth(size(0.25));
  doc.rect(x, y, cardWidth, cardHeight);

  doc.setFillColor(246, 247, 241);
  doc.rect(x, y, cardWidth, size(10.8), "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size(7.2));
  doc.text("Schiedsrichterkarte", x + size(CARD_PADDING_X), y + size(5.3));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size(5));
  const logoBox = getLogoBox(logo, x + cardWidth - size(18), y + size(1.3), size(14), size(8.2));
  const headerRight = logo ? logoBox.x - size(1.8) : x + cardWidth - size(CARD_PADDING_X);
  doc.text(`Nr. ${index}`, headerRight, y + size(5.3), { align: "right" });
  doc.text(trimText(doc, turnierName, headerRight - x - size(CARD_PADDING_X)), x + size(CARD_PADDING_X), y + size(9.1));

  if (logo) {
    doc.addImage(logo.dataUrl, "PNG", logoBox.x, logoBox.y, logoBox.width, logoBox.height);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(size(5.3));
  const qrSize = size(QR_SIZE);
  const qrX = x + cardWidth - qrSize - size(CARD_PADDING_X);
  const qrY = y + size(QR_Y);
  const infoX = x + size(CARD_PADDING_X);
  const infoWidth = qrX - infoX - size(3);
  doc.text(trimText(doc, `${formatDate(spiel.datum)} · ${spiel.zeit} Uhr`, infoWidth), infoX, y + size(16));
  drawInfoLine(doc, infoX, y + size(23.4), infoWidth, "Klasse:", formatScheduleCategoryLabel(spiel.kategorie), scale);
  drawInfoLine(doc, infoX, y + size(30.8), infoWidth, "Feld:", spiel.feld, scale);
  const referee = spiel.schiedsrichter?.trim()
    ? formatRefereeCardTeamName(spiel.schiedsrichter, teamDisplayNames)
    : "Schiri offen";
  drawInfoLine(doc, infoX, y + size(38.2), infoWidth, "Schiri:", referee, scale);

  doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size(4.6));
  doc.text("Scan", qrX + qrSize / 2, qrY + qrSize + size(4), { align: "center" });

  drawTeamBox(doc, x + size(CARD_PADDING_X), y + size(TEAM_ONE_Y), cardWidth - size(CARD_PADDING_X * 2), formatRefereeCardTeamName(spiel.team1, teamDisplayNames), "Team 1", scale);
  drawTeamBox(doc, x + size(CARD_PADDING_X), y + size(TEAM_TWO_Y), cardWidth - size(CARD_PADDING_X * 2), formatRefereeCardTeamName(spiel.team2, teamDisplayNames), "Team 2", scale);

  drawGoalStrikeList(doc, x + size(CARD_PADDING_X), y + size(GOAL_STRIKE_Y), cardWidth - size(CARD_PADDING_X * 2), scale);
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

function drawTeamBox(doc: jsPDF, x: number, y: number, width: number, teamName: string, label: string, scale: number) {
  const boxHeight = 8.8 * scale;
  const paddingX = 1.9 * scale;
  const labelGap = 1.6 * scale;

  doc.setDrawColor(80);
  doc.setLineWidth(0.15 * scale);
  doc.rect(x, y, width, boxHeight);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4 * scale);
  const labelText = `${label}:`;
  const labelY = y + 6.35 * scale;
  doc.text(labelText, x + paddingX, labelY);
  const teamNameX = x + paddingX + doc.getTextWidth(labelText) + labelGap;
  const teamNameMaxWidth = width - (teamNameX - x) - paddingX;

  doc.setFont("helvetica", "bold");
  const fittedTeamName = fitTextToWidth(doc, teamName, teamNameMaxWidth, 7.4 * scale, 4.6 * scale);
  doc.setFontSize(fittedTeamName.fontSize);
  doc.text(fittedTeamName.text, teamNameX, y + 6.35 * scale);
}

function drawInfoLine(doc: jsPDF, x: number, y: number, width: number, label: string, value: string, scale: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4 * scale);
  doc.text(label, x, y);

  const gap = 1.6 * scale;
  const valueX = x + doc.getTextWidth(label) + gap;
  const valueWidth = width - (valueX - x);

  doc.setFont("helvetica", "bold");
  const fittedValue = fitTextToWidth(doc, value, valueWidth, 7.4 * scale, 4.6 * scale);
  doc.setFontSize(fittedValue.fontSize);
  doc.text(fittedValue.text, valueX, y);
}

function formatRefereeCardTeamName(teamName: string, displayNameMap: TeamDisplayNameMap) {
  const displayName = formatTeamDisplayName(teamName, displayNameMap);

  return displayName === formatTeamDisplayName(teamName)
    ? formatRefereeCardFallbackTeamName(teamName)
    : displayName;
}

function formatRefereeCardFallbackTeamName(teamName: string) {
  return String(teamName || "")
    .replace(
      /\s+(?:mini(?:\s*\d+)?(?:\s*\([^)]*\))?|[a-e]-jugend(?:\s+(?:weiblich|männlich|maennlich|mannlich|gemischt))?|(?:w|m|g|gm)[a-e])(?=\s+\d+$|$)/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function drawGoalStrikeList(doc: jsPDF, x: number, y: number, width: number, scale: number) {
  const gap = GOAL_GRID_GAP * scale;
  const teamWidth = (width - gap) / 2;

  drawGoalGrid(doc, x, y, teamWidth, "T1", scale);
  drawGoalGrid(doc, x + teamWidth + gap, y, teamWidth, "T2", scale);
}

function drawGoalGrid(doc: jsPDF, x: number, y: number, width: number, label: string, scale: number) {
  const columns = GOAL_GRID_COLUMNS;
  const cellWidth = width / columns;
  const cellHeight = GOAL_GRID_CELL_HEIGHT * scale;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.4 * scale);
  doc.text(label, x, y - 1.1 * scale);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4 * scale);
  doc.setDrawColor(80);
  doc.setLineWidth(0.14 * scale);

  for (let goal = 1; goal <= 30; goal++) {
    const zeroBased = goal - 1;
    const column = zeroBased % columns;
    const row = Math.floor(zeroBased / columns);
    const cellX = x + column * cellWidth;
    const cellY = y + row * cellHeight;

    doc.rect(cellX, cellY, cellWidth, cellHeight);
    doc.text(String(goal), cellX + cellWidth / 2, cellY + 6.2 * scale, { align: "center" });
  }
}

function addA6DoubleCutMarks(doc: jsPDF) {
  const pageTotal = doc.getNumberOfPages();

  for (let page = 1; page <= pageTotal; page++) {
    doc.setPage(page);
    doc.setDrawColor(180);
    doc.setLineWidth(0.1);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const cutX = pageWidth / 2;

    doc.line(cutX, A6_PAGE_MARGIN - 2, cutX, A6_PAGE_MARGIN);
    doc.line(cutX, pageHeight - A6_PAGE_MARGIN, cutX, pageHeight - A6_PAGE_MARGIN + 2);
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

function fitTextToWidth(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  preferredFontSize: number,
  minFontSize: number
) {
  for (let fontSize = preferredFontSize; fontSize >= minFontSize; fontSize -= 0.2) {
    doc.setFontSize(fontSize);

    if (doc.getTextWidth(text) <= maxWidth) {
      return { text, fontSize };
    }
  }

  doc.setFontSize(minFontSize);

  return {
    text: trimText(doc, text, maxWidth),
    fontSize: minFontSize,
  };
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}
