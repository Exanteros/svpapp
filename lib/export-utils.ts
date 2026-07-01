// Finale, saubere Export-Utilities ohne Fehler

import JSZip from 'jszip';

import { createTeamDisplayNameMap, formatScheduleCategoryLabel, formatTeamDisplayName } from './tournament';

export interface Team {
  id: string;
  kategorie: string;
  anzahl: number;
  schiri: boolean;
  spielstaerke?: string;
  schiriName?: string;
  schiri_name?: string | null;
}

export interface Anmeldung {
  id: string;
  verein: string;
  kontakt: string;
  email: string;
  mobil: string;
  kosten: number;
  status: string;
  created_at: string;
  teams: Team[];
}

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
  schiedsrichter?: string | null;
}

export interface Statistiken {
  anmeldungen: number;
  teams: number;
  bezahlt: number;
  gesamtKosten: number;
  kategorien: { [key: string]: number };
  fieldsUsed: number;
}

export interface TurnierEinstellungen {
  turnierName: string;
  startgeld: number;
  schiriGeld: number;
  maxTeamsProKategorie: number;
  anmeldeschluss: string;
  anzahlFelder: number;
  adminEmail: string;
  automatischeEmails: boolean;
  sichtbarkeit: 'public' | 'private';
  zahlungsarten: string[];
  datenschutz: boolean;
  turnierStartDatum: string;
  turnierEndDatum: string;
}

/**
 * Exportiert Anmeldungen als CSV
 */
export function exportAnmeldungenCSV(anmeldungen: Anmeldung[]) {
  const headers = [
    'Verein',
    'Kontakt',
    'Email',
    'Mobil',
    'Kosten',
    'Status',
    'Anmeldedatum',
    'Teams'
  ];

  const csvContent = [
    headers.join(','),
    ...anmeldungen.map(anmeldung => [
      `"${anmeldung.verein}"`,
      `"${anmeldung.kontakt}"`,
      `"${anmeldung.email}"`,
      `"${anmeldung.mobil}"`,
      anmeldung.kosten.toString(),
      `"${anmeldung.status}"`,
      `"${new Date(anmeldung.created_at).toLocaleDateString('de-DE')}"`,
      `"${anmeldung.teams.map(t => `${t.kategorie} (${t.anzahl} Spieler${t.schiri ? ', Schiri' : ''})`).join('; ')}"`
    ].join(','))
  ].join('\n');

  downloadCSV(csvContent, `anmeldungen_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Exportiert Statistiken als CSV
 */
export function exportStatistikenCSV(statistiken: Statistiken, anmeldungen: Anmeldung[]) {
  const headers = [
    'Kategorie',
    'Anzahl Teams',
    'Durchschnittliche Teamgröße',
    'Schiris verfügbar',
    'Gesamtkosten'
  ];

  // Berechne detaillierte Statistiken pro Kategorie
  const kategorieStats: { [key: string]: { teams: number; spieler: number; schiris: number; kosten: number } } = {};
  
  anmeldungen.forEach(anmeldung => {
    anmeldung.teams.forEach(team => {
      if (!kategorieStats[team.kategorie]) {
        kategorieStats[team.kategorie] = { teams: 0, spieler: 0, schiris: 0, kosten: 0 };
      }
      kategorieStats[team.kategorie].teams++;
      kategorieStats[team.kategorie].spieler += team.anzahl;
      if (team.schiri) kategorieStats[team.kategorie].schiris++;
      kategorieStats[team.kategorie].kosten += anmeldung.kosten / anmeldung.teams.length;
    });
  });

  const csvContent = [
    headers.join(','),
    ...Object.entries(kategorieStats).map(([kategorie, stats]) => [
      `"${kategorie}"`,
      stats.teams.toString(),
      (stats.spieler / stats.teams).toFixed(1),
      stats.schiris.toString(),
      `${stats.kosten.toFixed(2)}€`
    ].join(','))
  ].join('\n');

  downloadCSV(csvContent, `statistiken_${new Date().toISOString().split('T')[0]}.csv`);
}

export async function exportSpielplanXLSX(spiele: Spiel[], config: Pick<TurnierEinstellungen, 'turnierName'>) {
  const teamDisplayNames = createTeamDisplayNameMap(spiele.flatMap((spiel) => [spiel.team1, spiel.team2]));
  const rows = [
    ['Datum', 'Zeit', 'Feld', 'Kategorie', 'Team 1', 'Team 2', 'Schiedsrichter', 'Status', 'Ergebnis'],
    ...[...spiele]
      .sort((a, b) => `${a.datum}-${a.zeit}-${a.feld}`.localeCompare(`${b.datum}-${b.zeit}-${b.feld}`, 'de'))
      .map((spiel) => [
        spiel.datum,
        `${spiel.zeit} Uhr`,
        spiel.feld,
        formatScheduleCategoryLabel(spiel.kategorie),
        formatTeamDisplayName(spiel.team1, teamDisplayNames),
        formatTeamDisplayName(spiel.team2, teamDisplayNames),
        spiel.schiedsrichter || '',
        spiel.status,
        spiel.ergebnis || '',
      ]),
  ];
  const zip = new JSZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`);
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  zip.folder('xl')?.file('workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Spielplan" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`);
  zip.folder('xl')?.folder('_rels')?.file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
  zip.folder('xl')?.file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><name val="Aptos"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`);
  zip.folder('xl')?.folder('worksheets')?.file('sheet1.xml', createWorksheetXml(rows));

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const filename = `spielplan_${sanitizeFilename(config.turnierName)}_${new Date().toISOString().split('T')[0]}.xlsx`;

  downloadBlob(blob, filename);
}

/**
 * Hilfsfunktion zum Herunterladen von CSV-Dateien
 */
function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

function createWorksheetXml(rows: string[][]) {
  const columnWidths = [14, 12, 14, 24, 36, 36, 28, 16, 14];
  const cols = columnWidths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('');
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, columnIndex) => {
          const ref = `${columnName(columnIndex + 1)}${rowIndex + 1}`;
          const style = rowIndex === 0 ? ' s="1"' : '';

          return `<c r="${ref}" t="inlineStr"${style}><is><t>${escapeXml(cell)}</t></is></c>`;
        })
        .join('');

      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${cols}</cols>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

function columnName(index: number) {
  let current = index;
  let name = '';

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
}

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeFilename(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '')
    || 'spielplan';
}
