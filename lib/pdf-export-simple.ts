// Einfache PDF-Export-Funktionen für Spielpläne
// Diese Datei stellt die grundlegenden PDF-Export-Funktionen wieder her

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createTeamDisplayNameMapFromGames, formatScheduleCategoryLabel, formatTeamDisplayName } from './tournament';

export interface Spiel {
  id: string;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  status: string;
  ergebnis?: string;
}

export interface TurnierConfig {
  turnierName: string;
  startgeld: string;
  schiriGeld: string;
  turnierStartDatum: string;
  turnierEndDatum: string;
}

// Einfache CSV-Export-Funktion für Spielpläne
export function exportSpielplanCSV(spiele: Spiel[], config: TurnierConfig) {
  console.log('📊 Exportiere Spielplan als CSV...');
  
  try {
    const teamDisplayNames = createTeamDisplayNameMapFromGames(spiele);
    // CSV-Header
    const headers = ['Datum', 'Zeit', 'Feld', 'Kategorie', 'Team 1', 'Team 2', 'Status', 'Ergebnis'];
    
    // CSV-Daten
    const csvData = spiele.map(spiel => [
      spiel.datum,
      spiel.zeit,
      spiel.feld,
      formatScheduleCategoryLabel(spiel.kategorie),
      formatTeamDisplayName(spiel.team1, teamDisplayNames),
      formatTeamDisplayName(spiel.team2, teamDisplayNames),
      spiel.status,
      spiel.ergebnis || ''
    ]);
    
    // CSV-String erstellen
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download auslösen
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `spielplan_${config.turnierName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ CSV-Export erfolgreich');
  } catch (error) {
    console.error('❌ Fehler beim CSV-Export:', error);
    throw error;
  }
}

const PDF_MARGIN_X = 8;
const PDF_MARGIN_TOP = 8;
const PDF_MARGIN_BOTTOM = 8;

type PdfColor = [number, number, number];

interface FieldColor {
  fill: PdfColor;
  text: PdfColor;
  border: PdfColor;
}

const FIELD_COLORS: FieldColor[] = [
  { fill: [232, 239, 215], text: [53, 64, 31], border: [94, 109, 53] },
  { fill: [226, 238, 235], text: [31, 76, 68], border: [83, 135, 122] },
  { fill: [238, 232, 221], text: [88, 62, 38], border: [159, 123, 82] },
  { fill: [229, 233, 242], text: [51, 63, 92], border: [103, 119, 159] },
  { fill: [242, 229, 229], text: [91, 52, 52], border: [154, 101, 101] },
  { fill: [235, 232, 242], text: [67, 56, 91], border: [116, 100, 153] }
];

export function exportSimpleSpielplanPDF(spiele: Spiel[], config: TurnierConfig) {
  console.log('📄 PDF-Export wird erstellt...');
  
  try {
    const doc = createSpielplanPdf(spiele, config);
    const fileName = `Spielplan_${config.turnierName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    console.log('✅ PDF-Export erfolgreich erstellt:', fileName);
  } catch (error) {
    console.error('❌ Fehler beim PDF-Export:', error);
    throw error;
  }
}

export function previewSpielplanPDF(spiele: Spiel[], config: TurnierConfig) {
  console.log('👁️ PDF-Vorschau wird erstellt...');
  
  try {
    const doc = createSpielplanPdf(spiele, config);
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
    
    console.log('✅ PDF-Vorschau erfolgreich geöffnet');
  } catch (error) {
    console.error('❌ Fehler bei PDF-Vorschau:', error);
    throw error;
  }
}

function createSpielplanPdf(spiele: Spiel[], config: TurnierConfig) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const spieleNachTagUndFeld = groupGamesByDayAndField(spiele);
  const tage = Object.keys(spieleNachTagUndFeld).sort(sortDates);
  const fieldColors = createFieldColorMap(spiele);
  const teamDisplayNames = createTeamDisplayNameMapFromGames(spiele);

  if (tage.length === 0) {
    drawEmptySpielplanPage(doc, config);
    return doc;
  }

  let hasRenderedPage = false;

  tage.forEach((tag) => {
    const dayTitle = formatGermanDayTitle(tag);
    const fields = Object.keys(spieleNachTagUndFeld[tag]).sort((a, b) => a.localeCompare(b, 'de-DE', { numeric: true }));

    fields.forEach((feld) => {
      if (hasRenderedPage) {
        doc.addPage();
      }

      hasRenderedPage = true;

      const fieldGames = spieleNachTagUndFeld[tag][feld];
      const fieldColor = fieldColors.get(feld) || FIELD_COLORS[0];
      const headerCategoryTitle = getHeaderCategoryTitle(fieldGames);

      const pageWidth = getPageWidth(doc);
      const availableWidth = pageWidth - PDF_MARGIN_X * 2;
      const timeWidth = 20;
      const categoryWidth = 50;
      const resultWidth = 28;
      const teamWidth = (availableWidth - timeWidth - categoryWidth - resultWidth) / 2;

      const tableData = [...fieldGames]
        .sort(sortGamesByDateTime)
        .map(spiel => [
          spiel.zeit,
          cleanCategoryLabel(spiel.kategorie),
          formatTeamDisplayName(spiel.team1, teamDisplayNames),
          formatTeamDisplayName(spiel.team2, teamDisplayNames),
          formatResult(spiel.ergebnis)
        ]);

      autoTable(doc, {
        startY: 38,
        head: [['Zeit', 'Kategorie', 'Team 1', 'Team 2', 'Ergebnis']],
        body: tableData,
        theme: 'grid',
        margin: { top: 38, left: PDF_MARGIN_X, right: PDF_MARGIN_X, bottom: PDF_MARGIN_BOTTOM },
        tableWidth: availableWidth,
        showHead: 'everyPage',
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: { top: 1.7, right: 1.9, bottom: 1.7, left: 1.9 },
          lineColor: fieldColor.border,
          lineWidth: 0.1,
          overflow: 'linebreak',
          valign: 'middle',
          textColor: [42, 45, 33]
        },
        headStyles: {
          fillColor: fieldColor.border,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.9,
          halign: 'left'
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          minCellHeight: 6.6
        },
        alternateRowStyles: {
          fillColor: fieldColor.fill
        },
        columnStyles: {
          0: { cellWidth: timeWidth, halign: 'center' },
          1: { cellWidth: categoryWidth },
          2: { cellWidth: teamWidth },
          3: { cellWidth: teamWidth },
          4: { cellWidth: resultWidth, halign: 'center' }
        },
        willDrawPage: function() {
          drawSpielplanHeader(doc, config, dayTitle, feld, fieldGames.length, fieldColor, headerCategoryTitle);
        },
        didDrawPage: function() {
          drawSpielplanFooter(doc, `${dayTitle} | ${feld}`);
        }
      });
    });
  });

  return doc;
}

function groupGamesByDayAndField(spiele: Spiel[]) {
  return spiele.reduce<Record<string, Record<string, Spiel[]>>>((acc, spiel) => {
    const tag = spiel.datum || 'Ohne Datum';
    const feld = spiel.feld || 'Ohne Feld';
    acc[tag] ??= {};
    acc[tag][feld] ??= [];
    acc[tag][feld].push(spiel);
    return acc;
  }, {});
}

function createFieldColorMap(spiele: Spiel[]) {
  const fields = Array.from(new Set(spiele.map(spiel => spiel.feld || 'Ohne Feld'))).sort((a, b) =>
    a.localeCompare(b, 'de-DE', { numeric: true })
  );

  return fields.reduce<Map<string, FieldColor>>((map, field, index) => {
    map.set(field, FIELD_COLORS[index % FIELD_COLORS.length]);
    return map;
  }, new Map());
}

function drawSpielplanHeader(
  doc: jsPDF,
  config: TurnierConfig,
  dayTitle: string,
  feld: string,
  gameCount: number,
  fieldColor: FieldColor = FIELD_COLORS[0],
  categoryTitle = ''
) {
  const pageWidth = getPageWidth(doc);
  const createdAt = new Date().toLocaleDateString('de-DE');

  doc.setFillColor(248, 249, 244);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setDrawColor(214, 216, 204);
  doc.line(PDF_MARGIN_X, 30, pageWidth - PDF_MARGIN_X, 30);

  doc.setTextColor(53, 64, 31);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(config.turnierName, PDF_MARGIN_X, PDF_MARGIN_TOP + 3);

  if (categoryTitle) {
    doc.setFontSize(18);
    doc.setTextColor(fieldColor.text[0], fieldColor.text[1], fieldColor.text[2]);
    doc.text(fitText(doc, categoryTitle, 104), pageWidth / 2, PDF_MARGIN_TOP + 6.4, { align: 'center' });
  }

  doc.setTextColor(53, 64, 31);
  doc.setFontSize(9.6);
  doc.text(dayTitle, PDF_MARGIN_X, PDF_MARGIN_TOP + 10);

  doc.setFillColor(fieldColor.fill[0], fieldColor.fill[1], fieldColor.fill[2]);
  doc.setDrawColor(fieldColor.border[0], fieldColor.border[1], fieldColor.border[2]);
  doc.rect(pageWidth - PDF_MARGIN_X - 44, PDF_MARGIN_TOP + 4, 44, 9, 'FD');
  doc.setTextColor(fieldColor.text[0], fieldColor.text[1], fieldColor.text[2]);
  doc.setFontSize(8.5);
  doc.text(feld, pageWidth - PDF_MARGIN_X - 22, PDF_MARGIN_TOP + 10.2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(88, 92, 74);
  doc.text(
    `Spielplan ${formatGermanDate(config.turnierStartDatum)} bis ${formatGermanDate(config.turnierEndDatum)}`,
    PDF_MARGIN_X,
    PDF_MARGIN_TOP + 17
  );

  doc.text(`Erstellt: ${createdAt} | Spiele: ${gameCount}`, pageWidth - PDF_MARGIN_X, PDF_MARGIN_TOP + 17, {
    align: 'right'
  });
}

function drawEmptySpielplanPage(doc: jsPDF, config: TurnierConfig) {
  drawSpielplanHeader(doc, config, 'Keine Spiele vorhanden', 'Ohne Feld', 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(88, 92, 74);
  doc.text('Es sind noch keine Spiele für den Druck vorhanden.', PDF_MARGIN_X, 45);
}

function drawSpielplanFooter(doc: jsPDF, feld: string) {
  const pageWidth = getPageWidth(doc);
  const pageHeight = getPageHeight(doc);
  const pageNumber = (doc.internal as any).getCurrentPageInfo?.().pageNumber || doc.getNumberOfPages();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(112, 116, 96);
  doc.text(feld, PDF_MARGIN_X, pageHeight - 4);
  doc.text(`Seite ${pageNumber}`, pageWidth - PDF_MARGIN_X, pageHeight - 4, { align: 'right' });
}

function formatGermanDate(dateString: string) {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  });
}

function formatGermanDayTitle(dateString: string) {
  if (dateString === 'Ohne Datum') {
    return dateString;
  }

  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function cleanCategoryLabel(category: string) {
  return formatScheduleCategoryLabel(category);
}

function getHeaderCategoryTitle(spiele: Spiel[]) {
  const labels = Array.from(new Set(spiele.map((spiel) => cleanCategoryLabel(spiel.kategorie)).filter(Boolean)));

  if (labels.length === 0) {
    return '';
  }

  if (labels.length === 1) {
    return labels[0];
  }

  const baseLabels = Array.from(new Set(labels.map(toBaseCategoryLabel)));
  const compactLabels = baseLabels.length <= 3 ? baseLabels : labels;

  if (compactLabels.length <= 3) {
    return compactLabels.join(' / ');
  }

  return 'Mehrere Jugenden';
}

function toBaseCategoryLabel(label: string) {
  if (/^mini\b/i.test(label)) return 'Mini';
  if (/^e-jugend\b/i.test(label)) return 'E-Jugend';
  if (/^d-jugend\b/i.test(label)) return 'D-Jugend';
  if (/^c-jugend\b/i.test(label)) return 'C-Jugend';
  if (/^b-jugend\b/i.test(label)) return 'B-Jugend';
  if (/^a-jugend\b/i.test(label)) return 'A-Jugend';
  return label;
}

function fitText(doc: jsPDF, text: string, maxWidth: number) {
  if (doc.getTextWidth(text) <= maxWidth) {
    return text;
  }

  let next = text;

  while (next.length > 1 && doc.getTextWidth(`${next}...`) > maxWidth) {
    next = next.slice(0, -1);
  }

  return `${next}...`;
}

function formatResult(result: string | undefined) {
  const trimmed = result?.trim() || '';
  return trimmed === '-' || trimmed === '-:-' ? '' : trimmed;
}

function sortGamesByDateTime(a: Spiel, b: Spiel) {
  return `${a.datum} ${a.zeit} ${a.feld}`.localeCompare(`${b.datum} ${b.zeit} ${b.feld}`, 'de-DE', {
    numeric: true
  });
}

function sortDates(a: string, b: string) {
  if (a === 'Ohne Datum') {
    return 1;
  }

  if (b === 'Ohne Datum') {
    return -1;
  }

  return a.localeCompare(b);
}

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);

  if (year && month && day) {
    return new Date(year, month - 1, day);
  }

  return new Date(dateString);
}

function getPageWidth(doc: jsPDF) {
  const pageSize = doc.internal.pageSize as any;
  return typeof pageSize.getWidth === 'function' ? pageSize.getWidth() : pageSize.width;
}

function getPageHeight(doc: jsPDF) {
  const pageSize = doc.internal.pageSize as any;
  return typeof pageSize.getHeight === 'function' ? pageSize.getHeight() : pageSize.height;
}
