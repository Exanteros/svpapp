import JSZip from 'jszip';

import type { RegistrationImportEntry, RegistrationImportTeam, RegistrationImportWarning } from './db';
import { TEAM_CATEGORIES, SKILL_LEVELS } from './tournament';

type CanonicalColumn =
  | 'id'
  | 'verein'
  | 'kontakt'
  | 'email'
  | 'mobil'
  | 'kategorie'
  | 'geschlecht'
  | 'anzahl'
  | 'schiri'
  | 'schiriName'
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
    return (await parseXlsx(buffer)).flatMap((sheetRows) => rowsFromMatrix(sheetRows));
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

  const headers = resolveImportHeaders(matrix[headerIndex]);
  if (!headers.some(Boolean)) {
    return [];
  }

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

function resolveImportHeaders(rawHeaders: string[]) {
  const headers = rawHeaders.map((header) => canonicalColumn(header));
  const hasCategory = headers.includes('kategorie');
  const hasTeamList = headers.includes('teamsText');
  const hasRowTeamDetails = headers.includes('spielstaerke') || headers.includes('anzahl') || headers.includes('geschlecht');

  if (!hasCategory && hasTeamList && hasRowTeamDetails) {
    return headers.map((header, index) => {
      const normalized = normalizeHeader(rawHeaders[index]);
      return header === 'teamsText' && ['team', 'teams', 'mannschaft', 'mannschaften'].includes(normalized)
        ? 'kategorie'
        : header;
    });
  }

  return headers;
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
  const sheetPaths = await findSheetPaths(zip);
  const sheets: string[][][] = [];

  for (const sheetPath of sheetPaths) {
    const sheet = zip.file(sheetPath);

    if (sheet) {
      sheets.push(parseWorksheetXml(await sheet.async('text'), sharedStrings));
    }
  }

  if (sheets.length === 0) {
    throw new Error('In der XLSX-Datei wurde kein Tabellenblatt gefunden.');
  }

  return sheets;
}

async function findSheetPaths(zip: JSZip) {
  const workbookXml = await zip.file('xl/workbook.xml')?.async('text');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('text');

  if (workbookXml && relsXml) {
    const relationships = new Map<string, string>();

    for (const relMatch of relsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
      const attrs = relMatch[1];
      const id = attrs.match(/\bId="([^"]+)"/)?.[1];
      const target = attrs.match(/\bTarget="([^"]+)"/)?.[1];

      if (id && target) {
        relationships.set(id, target);
      }
    }

    const orderedSheetPaths = Array.from(workbookXml.matchAll(/<sheet\b[^>]*\br:id="([^"]+)"/g))
      .map((match) => relationships.get(match[1]))
      .filter((target): target is string => Boolean(target))
      .map(resolveWorkbookRelationshipTarget)
      .filter((path) => Boolean(zip.file(path)));

    if (orderedSheetPaths.length > 0) {
      return orderedSheetPaths;
    }
  }

  const worksheets = Object.keys(zip.files)
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
    .sort((a, b) => {
      const first = Number(a.match(/sheet(\d+)\.xml/i)?.[1] || 0);
      const second = Number(b.match(/sheet(\d+)\.xml/i)?.[1] || 0);

      return first - second;
    });

  if (worksheets.length > 0) {
    return worksheets;
  }

  throw new Error('In der XLSX-Datei wurde kein Tabellenblatt gefunden.');
}

function resolveWorkbookRelationshipTarget(target: string) {
  if (target.startsWith('/')) {
    return target.slice(1);
  }

  return `xl/${target.replace(/^\.\//, '')}`;
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
    jugend: 'kategorie',
    teamjugend: 'kategorie',
    mannschaftsjugend: 'kategorie',
    altersgruppe: 'kategorie',
    jahrgang: 'kategorie',
    altersklasse: 'kategorie',
    gruppe: 'kategorie',
    geschlecht: 'geschlecht',
    gender: 'geschlecht',
    mw: 'geschlecht',
    mwd: 'geschlecht',
    mwu: 'geschlecht',
    mwn: 'geschlecht',
    weiblichmaennlichgemischt: 'geschlecht',
    mannlichweiblichgemischt: 'geschlecht',
    maennlichweiblichgemischt: 'geschlecht',
    anzahl: 'anzahl',
    anzahlteams: 'anzahl',
    teamanzahl: 'anzahl',
    teamsanzahl: 'anzahl',
    schiri: 'schiri',
    schiedsrichter: 'schiri',
    referee: 'schiri',
    schiris: 'schiriName',
    anzahlschiri: 'schiriName',
    anzahlschiris: 'schiriName',
    schiriname: 'schiriName',
    schiriteam: 'schiriName',
    schiriverein: 'schiriName',
    schiedsrichtername: 'schiriName',
    schiedsrichterteam: 'schiriName',
    schiedsrichterverein: 'schiriName',
    refereeprovider: 'schiriName',
    refereeteam: 'schiriName',
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
  const category = normalizeTeamCategory(values.kategorie, values.geschlecht, values.spielstaerke);
  const skillLevel = normalizeSkillLevel(values.spielstaerke);
  const schiriName = parseRefereeProvider(values.schiriName) || parseRefereeProvider(values.schiri);
  const hasReferee = parseBoolean(values.schiri) ?? Boolean(schiriName);

  if (category) {
    teams.push({
      kategorie: category,
      anzahl: parsePositiveInteger(values.anzahl) || 1,
      schiri: hasReferee,
      schiriName,
      spielstaerke: shouldKeepSkillLevel(category, skillLevel) ? skillLevel : undefined,
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

  const skillLevel = normalizeSkillLevel(details);
  const normalizedCategory = normalizeTeamCategory(category, details, details);
  const schiriName = parseRefereeProvider(details, false);

  return {
    kategorie: normalizedCategory,
    anzahl: Number.isFinite(count) && count > 0 ? count : 1,
    schiri: Boolean(schiriName) || /\bschiri\b/i.test(details) && !/\b(ohne|kein|keine|nein)\b/i.test(details),
    schiriName,
    spielstaerke: shouldKeepSkillLevel(normalizedCategory, skillLevel) ? skillLevel : undefined,
  };
}

function normalizeTeamCategory(categoryValue: string | undefined, genderValue?: string | undefined, skillValue?: string | undefined) {
  const rawCategory = read(categoryValue);

  if (!rawCategory) {
    return '';
  }

  const shortCategory = normalizeShortHandballCategory(rawCategory);
  if (shortCategory) {
    return shortCategory;
  }

  const miniCategory = normalizeMiniCategory(rawCategory, skillValue);
  if (miniCategory) {
    return miniCategory;
  }

  const knownCategory = findKnownCategory(rawCategory);
  const explicitGender = parseGender(genderValue);
  const embeddedGender = parseGender(rawCategory);
  const gender = explicitGender || embeddedGender;

  if (knownCategory && !explicitGender) {
    return knownCategory;
  }

  const baseCategory = normalizeBaseCategory(stripGender(rawCategory));

  if (!gender) {
    return findKnownCategory(baseCategory) || baseCategory;
  }

  return findKnownCategory(`${baseCategory} ${gender.label}`) || `${baseCategory} ${gender.label}`;
}

function normalizeShortHandballCategory(value: string) {
  const normalized = normalizeHeader(value);
  const match = normalized.match(/^(w|m|g|gm)?([abcde])$/);

  if (!match) {
    return null;
  }

  const genderCode = match[1] || '';
  const baseCategory = `${match[2].toUpperCase()}-Jugend`;

  if (!genderCode) {
    return findKnownCategory(baseCategory) || baseCategory;
  }

  const genderLabel = genderCode === 'w'
    ? 'weiblich'
    : genderCode === 'm'
      ? 'männlich'
      : 'gemischt';

  return findKnownCategory(`${baseCategory} ${genderLabel}`) || `${baseCategory} ${genderLabel}`;
}

function normalizeMiniCategory(categoryValue: string, skillValue?: string) {
  const normalized = normalizeHeader(categoryValue);
  const explicitMini = normalized.match(/^mini([123])$/)?.[1];
  const numericSkill = normalizeNumericSkillLevel(skillValue);

  if (explicitMini) {
    return findKnownCategory(`Mini ${explicitMini}`) || `Mini ${explicitMini}`;
  }

  if (['mini', 'minis'].includes(normalized) && numericSkill) {
    return findKnownCategory(`Mini ${numericSkill}`) || `Mini ${numericSkill}`;
  }

  return null;
}

function normalizeBaseCategory(value: string) {
  const cleaned = read(value)
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, '-')
    .trim();
  const normalized = normalizeHeader(cleaned);

  const ageMatch = normalized.match(/^([abcde])(?:jugend)?$/);
  if (ageMatch) {
    return `${ageMatch[1].toUpperCase()}-Jugend`;
  }

  if (['minis', 'mini'].includes(normalized)) {
    return 'Mini';
  }

  const miniMatch = normalized.match(/^mini([123])$/);
  if (miniMatch) {
    return findKnownCategory(`Mini ${miniMatch[1]}`) || `Mini ${miniMatch[1]}`;
  }

  return cleaned;
}

function stripGender(value: string) {
  return read(value)
    .replace(/\b(gemischt|gem\.?|mixed|mix|coed)\b/gi, '')
    .replace(/\b(männlich|maennlich|mannlich|männl\.?|maennl\.?|mannl\.?|m\.?)\b/gi, '')
    .replace(/\b(weiblich|weibl\.?|w\.?)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*-\s*$/g, '')
    .trim();
}

function parseGender(value: string | undefined) {
  const normalized = normalizeHeader(value || '');

  if (!normalized) {
    return null;
  }

  if (
    ['gem', 'gemischt', 'mixed', 'mix', 'coed'].includes(normalized) ||
    normalized.includes('gemischt') ||
    normalized.includes('gem')
  ) {
    return { value: 'gemischt', label: 'gemischt' } as const;
  }

  if (
    ['w', 'weiblich', 'weibl', 'wbl', 'female', 'f'].includes(normalized) ||
    normalized.includes('weiblich') ||
    normalized.includes('weibl')
  ) {
    return { value: 'weiblich', label: 'weiblich' } as const;
  }

  if (
    ['m', 'mannlich', 'maennlich', 'mannl', 'maennl', 'mnl', 'monnl', 'moennl', 'male'].includes(normalized) ||
    normalized.includes('mannlich') ||
    normalized.includes('maennlich') ||
    normalized.includes('mannl') ||
    normalized.includes('maennl') ||
    normalized.includes('monnl') ||
    normalized.includes('moennl')
  ) {
    return { value: 'maennlich', label: 'männlich' } as const;
  }

  return null;
}

function normalizeSkillLevel(value: string | undefined) {
  const raw = read(value);
  const normalized = normalizeHeader(raw);

  if (!normalized) {
    return undefined;
  }

  const numericSkill = normalizeNumericSkillLevel(raw);
  if (numericSkill) {
    return numericSkill;
  }

  if (['anf', 'anfaenger', 'anfanger', 'beginner', 'einsteiger'].includes(normalized) || normalized.includes('anfaeng')) {
    return 'Anfänger';
  }

  if (
    ['leistung', 'leistungsstark', 'stark', 'competitive', 'sehrerfahren', 'sehrstark'].includes(normalized) ||
    normalized.includes('leistung') ||
    normalized.includes('sehrerfahren')
  ) {
    return 'Leistung';
  }

  if (
    ['standard', 'standart', 'fortgeschritten', 'fortgeschrittene', 'erfahren', 'mittel', 'medium', 'advanced'].includes(normalized) ||
    normalized.includes('fortgeschritten') ||
    normalized.includes('erfahren')
  ) {
    return 'Standard';
  }

  return SKILL_LEVELS.find((level) => normalizeHeader(level) === normalized) || undefined;
}

function normalizeNumericSkillLevel(value: string | undefined) {
  const raw = read(value);

  return /^[1-3]$/.test(raw) ? raw : null;
}

function shouldKeepSkillLevel(category: string, skillLevel: string | undefined) {
  return Boolean(skillLevel) && !normalizeHeader(category).startsWith('mini');
}

function findKnownCategory(value: string) {
  const normalized = normalizeHeader(value);
  return TEAM_CATEGORIES.find((category) => normalizeHeader(category.name) === normalized)?.name || null;
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
  if (['ja', 'yes', 'true', 'wahr', '1', 'x', 'schiri', 'mit', 'mitschiri', 'jaschiri'].includes(normalized)) return true;
  if (['nein', 'no', 'false', 'falsch', '0', 'ohne', 'kein', 'keine', 'ohneschiri', 'keinschiri', 'keineschiri'].includes(normalized)) return false;

  return undefined;
}

function parseRefereeProvider(value: string | undefined, allowUnlabeled = true) {
  const raw = read(value);

  if (!raw || parseBoolean(raw) !== undefined) {
    return undefined;
  }

  const labeled = raw.match(/(?:schiri|schiedsrichter|referee)\s*[:=-]\s*(.+)$/i);
  if (!labeled && !allowUnlabeled) {
    return undefined;
  }

  const provider = (labeled?.[1] || raw).replace(/\s+/g, ' ').trim();
  const normalized = normalizeHeader(provider);

  if (
    !provider ||
    /^\d+$/.test(provider) ||
    ['mitschiri', 'ohneschiri', 'keinschiri', 'keineschiri', 'schiri', 'schiris', 'anzahlschiris'].includes(normalized)
  ) {
    return undefined;
  }

  if (/\b(ohne|kein|keine|nein|no)\b/i.test(provider)) {
    return undefined;
  }

  return provider;
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
  const key = `${normalizeHeader(team.kategorie)}|${team.schiri ? '1' : '0'}|${normalizeHeader(team.schiriName || '')}|${normalizeHeader(team.spielstaerke || '')}`;
  const existing = teams.find((candidate) => {
    const candidateKey = `${normalizeHeader(candidate.kategorie)}|${candidate.schiri ? '1' : '0'}|${normalizeHeader(candidate.schiriName || '')}|${normalizeHeader(candidate.spielstaerke || '')}`;
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
