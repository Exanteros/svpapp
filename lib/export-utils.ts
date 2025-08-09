// Finale, saubere Export-Utilities ohne Fehler

export interface Team {
  id: string;
  kategorie: string;
  anzahl: number;
  schiri: boolean;
  spielstaerke?: string;
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

/**
 * Hilfsfunktion zum Herunterladen von CSV-Dateien
 */
function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
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
