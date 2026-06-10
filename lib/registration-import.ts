import JSZip from 'jszip';

import type { RegistrationImportEntry, RegistrationImportTeam, RegistrationImportWarning } from './db';

type CanonicalColumn =
  | 'id'
  | 'verein'
  | 'kontakt'
  | 'email'
  | 'mobil'
  | 'kategorie'
  | 'anzahl'
  | 'schiri'
  | 'spielstaerke'
  | 'kosten'
  | 'status'
  | 'teamsText';

type ParsedImportRow = {
  rowNumber: number;
  values: Partial<Record<CanonicalColumn, string>>;
};

export type NormalizedRegistrationImport = {
  entries: RegistrationImportEntry[];
  warnings: RegistrationImportWarning[];
  rows: number;
};

export async function parseRegistrationImportFile(filename: string, buffer: ArrayBuffer) {
  const normalizedFilename = filename.toLowerCase();

  if (normalizedFilename.endsWith('.xlsx')) {
    return rowsFromMatrix(await parseXlsx(buffer));
  }

  if (normalizedFilename.endsWith('.csv') || normalizedFilename.endsWith('.txt')) {
    const text = new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '');
    return rowsFromMatrix(parseCsv(text));
  }

  throw new Error('Bitte eine CSV- oder XLSX-Datei hochladen.');
}

export function normalizeRegistrationImportRows(rows: ParsedImportRow[]): NormalizedRegistrationImport {
  const warnings: RegistrationImportWarning[] = [];
  const grouped = new Map<string, RegistrationImportEntry>();

  for (const row of rows) {
    const values = row.values;
    const verein = read(values.verein);
    const email = read(values.email);
    const id = read(values.id);
    const key = createGroupKey({ id, verein, email });

    if (!key) {
      warnings.push({ row: row.rowNumber, message: 'Keine Zuordnung möglich: ID, Verein oder E-Mail fehlt.' });
      continue;
    }

    const entry = grouped.get(key) || {
      id: id || undefined,
      verein,
      kontakt: read(values.kontakt) || undefined,
      email: email || undefined,
      mobil: read(values.mobil) || undefined,
      kosten: parseMoney(values.kosten),
      status: parseRegistrationStatus(values.status),
      teams: [],
      sourceRows: [],
    };

    entry.id ||= id || undefined;
    entry.verein ||= verein;
    entry.kontakt ||= read(values.kontakt) || undefined;
    entry.email ||= email || undefined;
    entry.mobil ||= read(values.mobil) || undefined;
    entry.kosten ??= parseMoney(values.kosten);
    entry.status ??= parseRegistrationStatus(values.status);
    entry.sourceRows.push(row.rowNumber);

    const rowTeams = parseTeams(values);
    for (const team of rowTeams) {
      mergeTeam(entry.teams, team);
    }

    grouped.set(key, entry);
  }

  return {
    entries: Array.from(grouped.values()),
    warnings,
    rows: rows.length,
  };
}

function rowsFromMatrix(matrix: string[][]): ParsedImportRow[] {
  const headerIndex = matrix.findIndex((row) => row.some((cell) => read(cell)));

  if (headerIndex === -1) {
    return [];
  }

  const headers = matrix[headerIndex].map((header) => canonicalColumn(header));
  const rows: ParsedImportRow[] = [];

  for (let index = headerIndex + 1; index < matrix.length; index += 1) {
    const sourceRow = matrix[index];

    if (!sourceRow.some((cell) => read(cell))) {
      continue;
    }

    const values: Partial<Record<CanonicalColumn, string>> = {};
    sourceRow.forEach((cell, cellIndex) => {
      const column = headers[cellIndex];
      if (column) {
        values[column] = read(cell);
      }
    });

    rows.push({
      rowNumber: index + 1,
      values,
    });
  }

  return rows;
}

function parseCsv(text: string) {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows;
}

async function parseXlsx(buffer: ArrayBuffer) {
  const zip = await JSZip.loadAsync(buffer);
  const sharedStrings = await readSharedStrings(zip);
  const sheetPath = await findFirstSheetPath(zip);
  const sheet = zip.file(sheetPath);

  if (!sheet) {
    throw new Error('In der XLSX-Datei wurde kein erstes Tabellenblatt gefunden.');
  }

  return parseWorksheetXml(await sheet.async('text'), sharedStrings);
}

async function findFirstSheetPath(zip: JSZip) {
  const workbookXml = await zip.file('xl/workbook.xml')?.async('text');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('text');

  if (workbookXml && relsXml) {
    const sheetId = workbookXml.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
    if (sheetId) {
      const relationship = new RegExp(`<Relationship\\b[^>]*\\bId="${escapeRegExp(sheetId)}"[^>]*>`, 'i').exec(relsXml)?.[0];
      const target = relationship?.match(/\bTarget="([^"]+)"/)?.[1];

      if (target) {
        return target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
      }
    }
  }

  if (zip.file('xl/worksheets/sheet1.xml')) {
    return 'xl/worksheets/sheet1.xml';
  }

  const worksheet = Object.keys(zip.files).find((path) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path));
  if (worksheet) {
    return worksheet;
  }

  throw new Error('In der XLSX-Datei wurde kein Tabellenblatt gefunden.');
}

async function readSharedStrings(zip: JSZip) {
  const xml = await zip.file('xl/sharedStrings.xml')?.async('text');
  if (!xml) return [];

  return Array.from(xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)).map((match) => {
    const parts = Array.from(match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)).map((part) => decodeXml(part[1]));
    return parts.join('');
  });
}

function parseWorksheetXml(xml: string, sharedStrings: string[]) {
  const rows: string[][] = [];

  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];

    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/\br="([A-Z]+)\d+"/i)?.[1] || '';
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] || '';
      const columnIndex = ref ? columnLettersToIndex(ref) : row.length;
      let value = '';

      if (type === 'inlineStr') {
        value = Array.from(body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)).map((part) => decodeXml(part[1])).join('');
      } else {
        const rawValue = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] || '';
        value = type === 's' ? sharedStrings[Number(rawValue)] || '' : decodeXml(rawValue);
      }

      row[columnIndex] = value;
    }

    rows.push(row);
  }

  return rows;
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || '';
  const candidates = [',', ';', '\t'];

  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ',';
}

function canonicalColumn(header: string): CanonicalColumn | null {
  const normalized = normalizeHeader(header);
  const aliases: Record<string, CanonicalColumn> = {
    id: 'id',
    anmeldungid: 'id',
    anmeldungsid: 'id',
    registrationid: 'id',
    verein: 'verein',
    club: 'verein',
    mannschaftsverein: 'verein',
    kontakt: 'kontakt',
    kontaktperson: 'kontakt',
    ansprechpartner: 'kontakt',
    name: 'kontakt',
    email: 'email',
    mail: 'email',
    emailadresse: 'email',
    mobil: 'mobil',
    telefon: 'mobil',
    handy: 'mobil',
    mobile: 'mobil',
    kategorie: 'kategorie',
    jahrgang: 'kategorie',
    altersklasse: 'kategorie',
    gruppe: 'kategorie',
    anzahl: 'anzahl',
    anzahlteams: 'anzahl',
    teamanzahl: 'anzahl',
    teamsanzahl: 'anzahl',
    schiri: 'schiri',
    schiedsrichter: 'schiri',
    referee: 'schiri',
    spielstaerke: 'spielstaerke',
    spielstarke: 'spielstaerke',
    staerke: 'spielstaerke',
    starke: 'spielstaerke',
    niveau: 'spielstaerke',
    kosten: 'kosten',
    betrag: 'kosten',
    startgeld: 'kosten',
    summe: 'kosten',
    status: 'status',
    zahlung: 'status',
    zahlungsstatus: 'status',
    bezahlt: 'status',
    paid: 'status',
    teams: 'teamsText',
    teamliste: 'teamsText',
    mannschaften: 'teamsText',
  };

  return aliases[normalized] || null;
}

function parseTeams(values: Partial<Record<CanonicalColumn, string>>) {
  const teams: RegistrationImportTeam[] = [];
  const category = read(values.kategorie);

  if (category) {
    teams.push({
      kategorie: category,
      anzahl: parsePositiveInteger(values.anzahl) || 1,
      schiri: parseBoolean(values.schiri) ?? false,
      spielstaerke: read(values.spielstaerke) || undefined,
    });
  }

  const text = read(values.teamsText);
  if (text) {
    for (const team of parseTeamList(text)) {
      teams.push(team);
    }
  }

  return teams;
}

function parseTeamList(text: string) {
  return text
    .split(/[;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseTeamListItem)
    .filter((team): team is RegistrationImportTeam => Boolean(team));
}

function parseTeamListItem(value: string): RegistrationImportTeam | null {
  const parenthesized = value.match(/^(.*?)\s*\((.*?)\)\s*$/);
  let category = value.trim();
  let details = '';
  let count = 1;

  if (parenthesized) {
    category = parenthesized[1].trim();
    details = parenthesized[2].trim();
    count = Number.parseInt(details.match(/(\d+)/)?.[1] || '1', 10);
  } else {
    const prefixed = value.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (prefixed) {
      count = Number.parseInt(prefixed[1], 10);
      category = prefixed[2].trim();
    }
  }

  if (!category) {
    return null;
  }

  return {
    kategorie: category,
    anzahl: Number.isFinite(count) && count > 0 ? count : 1,
    schiri: /\bschiri\b/i.test(details) && !/\b(ohne|kein|keine|nein)\b/i.test(details),
    spielstaerke: details.match(/\b(Anfaenger|Anfänger|Fortgeschritten|Leistung)\b/i)?.[1],
  };
}

function parseRegistrationStatus(value: string | undefined): RegistrationImportEntry['status'] | undefined {
  const normalized = normalizeHeader(value || '');

  if (!normalized) {
    return undefined;
  }

  if (['bezahlt', 'paid', 'ja', 'yes', 'true', 'wahr', '1', 'x', 'eingegangen'].includes(normalized)) {
    return 'bezahlt';
  }

  if (['storniert', 'storno', 'abgesagt', 'cancelled', 'canceled'].includes(normalized)) {
    return 'storniert';
  }

  if (['offen', 'unbezahlt', 'nein', 'no', 'false', 'falsch', '0', 'angemeldet'].includes(normalized)) {
    return 'angemeldet';
  }

  return undefined;
}

function parseBoolean(value: string | undefined) {
  const normalized = normalizeHeader(value || '');

  if (!normalized) return undefined;
  if (['ja', 'yes', 'true', 'wahr', '1', 'x', 'schiri', 'mit'].includes(normalized)) return true;
  if (['nein', 'no', 'false', 'falsch', '0', 'ohne', 'kein', 'keine'].includes(normalized)) return false;

  return undefined;
}

function parsePositiveInteger(value: string | undefined) {
  const number = Number.parseInt(read(value).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseMoney(value: string | undefined) {
  const cleaned = read(value)
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:[,.]|$))/g, '')
    .replace(',', '.');
  const number = Number.parseFloat(cleaned);

  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : undefined;
}

function mergeTeam(teams: RegistrationImportTeam[], team: RegistrationImportTeam) {
  const key = `${normalizeHeader(team.kategorie)}|${team.schiri ? '1' : '0'}|${normalizeHeader(team.spielstaerke || '')}`;
  const existing = teams.find((candidate) => {
    const candidateKey = `${normalizeHeader(candidate.kategorie)}|${candidate.schiri ? '1' : '0'}|${normalizeHeader(candidate.spielstaerke || '')}`;
    return candidateKey === key;
  });

  if (existing) {
    existing.anzahl += team.anzahl;
  } else {
    teams.push(team);
  }
}

function createGroupKey(input: { id: string; verein: string; email: string }) {
  if (input.id) return `id:${input.id}`;

  const verein = normalizeHeader(input.verein);
  const email = normalizeHeader(input.email);

  if (verein && email) return `verein-email:${verein}|${email}`;
  if (verein) return `verein:${verein}`;
  if (email) return `email:${email}`;

  return '';
}

function normalizeHeader(value: string) {
  return read(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function read(value: unknown) {
  return String(value ?? '').trim();
}

function decodeXml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function columnLettersToIndex(letters: string) {
  return letters
    .toUpperCase()
    .split('')
    .reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
