// Export-Funktionen für die Turnierverwaltung

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
 * Exportiert die Anmeldungsdaten als CSV-Datei
 */
export function exportAnmeldungenCSV(anmeldungen: Anmeldung[], turnierName: string) {
  const headers = ['Verein', 'Kontakt', 'Email', 'Mobil', 'Teams', 'Kategorien', 'Kosten', 'Status', 'Anmeldedatum'];
  let csvContent = headers.join(',') + '\n';
  
  anmeldungen.forEach(anmeldung => {
    const teams = anmeldung.teams.reduce((acc: number, team: Team) => acc + team.anzahl, 0);
    const kategorien = anmeldung.teams.map((team: Team) => `${team.kategorie} (${team.anzahl})`).join('; ');
    const row = [
      `"${anmeldung.verein}"`,
      `"${anmeldung.kontakt}"`,
      `"${anmeldung.email}"`,
      `"${anmeldung.mobil}"`,
      teams,
      `"${kategorien}"`,
      anmeldung.kosten,
      `"${anmeldung.status}"`,
      `"${new Date(anmeldung.created_at).toLocaleDateString('de-DE')}"`
    ];
    csvContent += row.join(',') + '\n';
  });
  
  downloadFile(
    csvContent,
    `Anmeldungen_${turnierName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`,
    'text/csv'
  );
}

/**
 * Exportiert die Statistiken als CSV-Datei
 */
export function exportStatistikenCSV(statistiken: Statistiken, turnierName: string) {
  const headers = ['Kategorie', 'Anzahl Teams', 'Kosten'];
  let csvContent = headers.join(',') + '\n';
  
  csvContent += `"Gesamte Anmeldungen","${statistiken.anmeldungen}","${statistiken.gesamtKosten} €"\n`;
  csvContent += `"Gesamte Teams","${statistiken.teams}",""\n`;
  csvContent += `"Bezahlte Anmeldungen","${statistiken.bezahlt}",""\n`;
  csvContent += `"Verwendete Felder","${statistiken.fieldsUsed}",""\n`;
  csvContent += '\n';
  
  csvContent += '"Teams pro Kategorie:","",""\n';
  Object.entries(statistiken.kategorien).forEach(([kategorie, anzahl]) => {
    csvContent += `"${kategorie}","${anzahl}",""\n`;
  });
  
  downloadFile(
    csvContent,
    `Statistiken_${turnierName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`,
    'text/csv'
  );
}

/**
 * NEUE SCHÖNE PDF-EXPORT-FUNKTION
 * Exportiert wunderschöne Shadcn-Style Tabellen als PDF
 */
export async function exportBeautifulSpielplanPDF(spiele: Spiel[], turnierEinstellungen: TurnierEinstellungen) {
  const statusDiv = createSpinner();
  document.body.appendChild(statusDiv);
  
  try {
    updateSpinner(statusDiv, '⏳ Lade Export-Bibliotheken...');
    
    const html2pdf = await loadHtml2PDF();
    
    updateSpinner(statusDiv, '🎨 Erstelle wunderschöne Tabellen...');
    
    const wantSeparateFiles = confirm(
      '🎯 Wie möchten Sie den Spielplan exportieren?\n\n' +
      '✅ OK = Separate PDFs pro Feld (empfohlen für beste Qualität)\n' +
      '❌ Abbrechen = Alles in einer PDF'
    );
    
    if (wantSeparateFiles) {
      await exportSeparateBeautifulPDFs(spiele, turnierEinstellungen, html2pdf, statusDiv);
    } else {
      await exportCompleteBeautifulPDF(spiele, turnierEinstellungen, html2pdf, statusDiv);
    }
    
  } catch (error) {
    console.error('Fehler beim PDF-Export:', error);
    updateSpinner(statusDiv, '❌ Export fehlgeschlagen');
    alert('Fehler beim PDF-Export: ' + (error as Error).message);
  } finally {
    setTimeout(() => {
      if (document.body.contains(statusDiv)) {
        document.body.removeChild(statusDiv);
      }
    }, 2000);
  }
}

// Hilfsfunktionen
async function exportSeparateBeautifulPDFs(
  spiele: Spiel[], 
  turnierEinstellungen: TurnierEinstellungen, 
  html2pdf: any, 
  statusDiv: HTMLElement
) {
  const JSZip = await loadJSZip();
  const zip = new JSZip();
  
  const spieleByField: {[feld: string]: Spiel[]} = {};
  spiele.forEach(spiel => {
    if (!spieleByField[spiel.feld]) {
      spieleByField[spiel.feld] = [];
    }
    spieleByField[spiel.feld].push(spiel);
  });
  
  const fields = Object.keys(spieleByField).sort();
  
  for (let i = 0; i < fields.length; i++) {
    const feld = fields[i];
    const feldSpiele = spieleByField[feld];
    
    updateSpinner(statusDiv, `🎨 Erstelle PDF für ${feld} (${i + 1}/${fields.length})...`);
    
    const htmlPage = createPerfectFieldPage(feldSpiele, feld, turnierEinstellungen);
    
    try {
      const pdfBlob = await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename: `${feld}.pdf`,
          image: { type: 'jpeg', quality: 1.0 },
          html2canvas: { 
            scale: 3,
            useCORS: true,
            letterRendering: true,
            backgroundColor: '#ffffff',
            logging: false
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
          }
        })
        .from(htmlPage)
        .output('blob');
      
      const cleanFieldName = feld.replace(/[^a-zA-Z0-9_-]/g, '_');
      zip.file(`Spielplan_${cleanFieldName}.pdf`, pdfBlob);
      
    } catch (error) {
      console.warn(`Fehler bei ${feld}:`, error);
      const textContent = createTextFallback(feldSpiele, feld, turnierEinstellungen);
      const cleanFieldName = feld.replace(/[^a-zA-Z0-9_-]/g, '_');
      zip.file(`Spielplan_${cleanFieldName}.txt`, textContent);
    }
    
    if (htmlPage.parentNode) {
      htmlPage.parentNode.removeChild(htmlPage);
    }
  }
  
  updateSpinner(statusDiv, '📦 Erstelle ZIP-Datei...');
  
  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  downloadFile(
    zipBlob,
    `Spielplaene_${turnierEinstellungen.turnierName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.zip`,
    'application/zip'
  );
  
  updateSpinner(statusDiv, '✅ ZIP-Export erfolgreich!');
}

async function exportCompleteBeautifulPDF(
  spiele: Spiel[], 
  turnierEinstellungen: TurnierEinstellungen, 
  html2pdf: any, 
  statusDiv: HTMLElement
) {
  updateSpinner(statusDiv, '🎨 Erstelle komplette PDF...');
  
  const spieleByField: {[feld: string]: Spiel[]} = {};
  spiele.forEach(spiel => {
    if (!spieleByField[spiel.feld]) {
      spieleByField[spiel.feld] = [];
    }
    spieleByField[spiel.feld].push(spiel);
  });
  
  const htmlPage = createCompleteDocument(spieleByField, turnierEinstellungen);
  
  try {
    await html2pdf()
      .set({
        margin: [15, 15, 15, 15],
        filename: `Kompletter_Spielplan_${turnierEinstellungen.turnierName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          backgroundColor: '#ffffff',
          logging: false
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        }
      })
      .from(htmlPage)
      .save();
    
    updateSpinner(statusDiv, '✅ PDF erfolgreich erstellt!');
    
  } catch (error) {
    console.error('Fehler bei PDF:', error);
    updateSpinner(statusDiv, '❌ Fehler bei PDF-Erstellung');
    throw error;
  }
  
  if (htmlPage.parentNode) {
    htmlPage.parentNode.removeChild(htmlPage);
  }
}

function createPerfectFieldPage(feldSpiele: Spiel[], feldName: string, turnierEinstellungen: TurnierEinstellungen): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = `
    width: 210mm;
    min-height: 297mm;
    padding: 20mm;
    background: white;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #0f172a;
    line-height: 1.6;
    position: absolute;
    left: -9999px;
    top: 0;
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #e2e8f0;
  `;
  header.innerHTML = `
    <h1 style="font-size: 28px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.025em;">
      Spielplan ${feldName}
    </h1>
    <h2 style="font-size: 18px; font-weight: 500; color: #64748b; margin: 0 0 12px 0;">
      ${turnierEinstellungen.turnierName}
    </h2>
    <p style="font-size: 12px; color: #94a3b8; margin: 0;">
      ${feldSpiele.length} Spiele • Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
    </p>
  `;
  
  const tableCard = createBeautifulShadcnTable(feldSpiele);
  
  page.appendChild(header);
  page.appendChild(tableCard);
  document.body.appendChild(page);
  
  return page;
}

function createBeautifulShadcnTable(spiele: Spiel[]): HTMLElement {
  const card = document.createElement('div');
  card.style.cssText = `
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  `;
  
  const table = document.createElement('table');
  table.style.cssText = `
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  `;
  
  // Header mit echtem Shadcn-Style
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
      <th style="text-align: left; padding: 12px 16px; font-weight: 500; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; width: 15%;">Uhrzeit</th>
      <th style="text-align: left; padding: 12px 16px; font-weight: 500; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; width: 18%;">Kategorie</th>
      <th style="text-align: left; padding: 12px 16px; font-weight: 500; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; width: 32%;">Team 1</th>
      <th style="text-align: left; padding: 12px 16px; font-weight: 500; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; width: 32%;">Team 2</th>
      <th style="text-align: left; padding: 12px 16px; font-weight: 500; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; width: 12%;">Status</th>
    </tr>
  `;
  
  // Body mit perfektem Styling
  const tbody = document.createElement('tbody');
  
  spiele
    .sort((a, b) => a.zeit.localeCompare(b.zeit))
    .forEach((spiel, index) => {
      const row = document.createElement('tr');
      row.style.cssText = `
        border-bottom: 1px solid #f1f5f9;
        background: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};
      `;
      
      // Zeit
      const zeitCell = document.createElement('td');
      zeitCell.style.cssText = 'padding: 12px 16px; font-weight: 500; color: #0f172a; font-variant-numeric: tabular-nums;';
      zeitCell.textContent = spiel.zeit;
      
      // Kategorie mit schönem Badge
      const katCell = document.createElement('td');
      katCell.style.cssText = 'padding: 12px 16px;';
      const badge = document.createElement('span');
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 500;
        background: #dbeafe;
        color: #1e40af;
        border: 1px solid #93c5fd;
        border-radius: 4px;
      `;
      badge.textContent = spiel.kategorie;
      katCell.appendChild(badge);
      
      // Team 1
      const team1Cell = document.createElement('td');
      team1Cell.style.cssText = 'padding: 12px 16px; color: #334155; font-weight: 400;';
      team1Cell.textContent = spiel.team1;
      
      // Team 2
      const team2Cell = document.createElement('td');
      team2Cell.style.cssText = 'padding: 12px 16px; color: #334155; font-weight: 400;';
      team2Cell.textContent = spiel.team2;
      
      // Status mit farbigem Badge
      const statusCell = document.createElement('td');
      statusCell.style.cssText = 'padding: 12px 16px;';
      const statusBadge = document.createElement('span');
      
      let statusColor, statusBg;
      switch (spiel.status.toLowerCase()) {
        case 'beendet':
          statusColor = '#166534';
          statusBg = '#dcfce7';
          break;
        case 'laufend':
          statusColor = '#92400e';
          statusBg = '#fef3c7';
          break;
        default:
          statusColor = '#475569';
          statusBg = '#f1f5f9';
      }
      
      statusBadge.style.cssText = `
        display: inline-flex;
        align-items: center;
        padding: 1px 6px;
        font-size: 10px;
        font-weight: 500;
        background: ${statusBg};
        color: ${statusColor};
        border-radius: 3px;
      `;
      statusBadge.textContent = spiel.status;
      statusCell.appendChild(statusBadge);
      
      row.appendChild(zeitCell);
      row.appendChild(katCell);
      row.appendChild(team1Cell);
      row.appendChild(team2Cell);
      row.appendChild(statusCell);
      tbody.appendChild(row);
    });
  
  table.appendChild(thead);
  table.appendChild(tbody);
  card.appendChild(table);
  
  return card;
}

function createCompleteDocument(spieleByField: {[feld: string]: Spiel[]}, turnierEinstellungen: TurnierEinstellungen): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = `
    width: 210mm;
    background: white;
    padding: 20mm;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #0f172a;
    line-height: 1.6;
    position: absolute;
    left: -9999px;
    top: 0;
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    text-align: center;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 2px solid #e2e8f0;
  `;
  header.innerHTML = `
    <h1 style="font-size: 32px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; letter-spacing: -0.025em;">
      Kompletter Spielplan
    </h1>
    <h2 style="font-size: 20px; font-weight: 500; color: #64748b; margin: 0 0 16px 0;">
      ${turnierEinstellungen.turnierName}
    </h2>
    <p style="font-size: 14px; color: #94a3b8; margin: 0;">
      ${Object.values(spieleByField).flat().length} Spiele auf ${Object.keys(spieleByField).length} Feldern • 
      Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
    </p>
  `;
  page.appendChild(header);
  
  Object.keys(spieleByField).sort().forEach((feld, index) => {
    const feldSpiele = spieleByField[feld];
    
    const fieldSection = document.createElement('div');
    fieldSection.style.cssText = `margin-bottom: 40px; ${index > 0 ? 'page-break-before: always;' : ''}`;
    
    const fieldTitle = document.createElement('h3');
    fieldTitle.style.cssText = `
      font-size: 20px;
      font-weight: 600;
      color: #0f172a;
      margin: 0 0 20px 0;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    `;
    fieldTitle.textContent = `${feld} (${feldSpiele.length} Spiele)`;
    
    fieldSection.appendChild(fieldTitle);
    fieldSection.appendChild(createBeautifulShadcnTable(feldSpiele));
    page.appendChild(fieldSection);
  });
  
  document.body.appendChild(page);
  return page;
}

function createSpinner(): HTMLElement {
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #3b82f6;
    border-radius: 12px;
    padding: 24px;
    z-index: 10000;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    text-align: center;
    font-family: ui-sans-serif, system-ui, sans-serif;
    min-width: 320px;
  `;
  spinner.innerHTML = `
    <div style="width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
    <div id="spinner-text" style="font-size: 16px; font-weight: 500; color: #1f2937;">Initialisiere Export...</div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  return spinner;
}

function updateSpinner(spinner: HTMLElement, message: string): void {
  const textElement = spinner.querySelector('#spinner-text');
  if (textElement) {
    textElement.textContent = message;
  }
}

async function loadHtml2PDF(): Promise<any> {
  try {
    const module = await import('html2pdf.js' as any);
    return module.default || module;
  } catch (error) {
    if (!(window as any).html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      document.head.appendChild(script);
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    }
    return (window as any).html2pdf;
  }
}

async function loadJSZip(): Promise<any> {
  try {
    const module = await import('jszip');
    return module.default;
  } catch (error) {
    if (!(window as any).JSZip) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      document.head.appendChild(script);
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    }
    return (window as any).JSZip;
  }
}

function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function createTextFallback(spiele: Spiel[], feldName: string, turnierEinstellungen: TurnierEinstellungen): string {
  let content = `Spielplan ${feldName}\n`;
  content += `${turnierEinstellungen.turnierName}\n`;
  content += `${spiele.length} Spiele\n`;
  content += '='.repeat(50) + '\n\n';
  
  spiele.sort((a, b) => a.zeit.localeCompare(b.zeit)).forEach(spiel => {
    content += `${spiel.zeit} - ${spiel.kategorie}\n`;
    content += `${spiel.team1} vs ${spiel.team2}\n`;
    content += `Status: ${spiel.status}\n\n`;
  });
  
  return content;
}
