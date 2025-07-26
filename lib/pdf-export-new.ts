// Neue, verbesserte PDF-Export-Funktionen mit echten Shadcn-Tabellen

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
 * NEUE HAUPTFUNKTION: Exportiert schöne Shadcn-Tabellen als PDF
 */
export async function exportBeautifulSpielplanPDF(spiele: Spiel[], turnierEinstellungen: TurnierEinstellungen) {
  // Status-Dialog anzeigen
  const statusDiv = createSpinner();
  document.body.appendChild(statusDiv);
  
  try {
    updateSpinner(statusDiv, 'Lade Export-Bibliotheken...');
    
    // HTML2PDF laden
    const html2pdf = await loadHtml2PDF();
    
    updateSpinner(statusDiv, 'Erstelle wunderschöne Tabellen...');
    
    // Frage den User nach der Export-Option
    const wantSeparateFiles = confirm(
      '🎯 Wie möchten Sie den Spielplan exportieren?\n\n' +
      '✅ OK = Separate PDFs pro Feld (empfohlen)\n' +
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

/**
 * Erstellt separate PDFs pro Feld (empfohlen für beste Qualität)
 */
async function exportSeparateBeautifulPDFs(
  spiele: Spiel[], 
  turnierEinstellungen: TurnierEinstellungen, 
  html2pdf: any, 
  statusDiv: HTMLElement
) {
  // JSZip laden
  const JSZip = await loadJSZip();
  const zip = new JSZip();
  
  // Gruppiere Spiele nach Feld
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
    
    updateSpinner(statusDiv, `🎨 Erstelle schöne PDF für ${feld} (${i + 1}/${fields.length})...`);
    
    // Erstelle perfekte HTML-Seite für dieses Feld
    const htmlPage = createPerfectFieldPage(feldSpiele, feld, turnierEinstellungen);
    
    try {
      // PDF generieren
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
      
      // PDF zur ZIP hinzufügen
      const cleanFieldName = feld.replace(/[^a-zA-Z0-9_-]/g, '_');
      zip.file(`Spielplan_${cleanFieldName}.pdf`, pdfBlob);
      
    } catch (error) {
      console.warn(`Fehler bei ${feld}:`, error);
      // Fallback: Text-Datei
      const textContent = createTextFallback(feldSpiele, feld, turnierEinstellungen);
      const cleanFieldName = feld.replace(/[^a-zA-Z0-9_-]/g, '_');
      zip.file(`Spielplan_${cleanFieldName}.txt`, textContent);
    }
    
    // HTML-Element cleanup
    if (htmlPage.parentNode) {
      htmlPage.parentNode.removeChild(htmlPage);
    }
  }
  
  updateSpinner(statusDiv, '📦 Erstelle ZIP-Datei...');
  
  // ZIP generieren und herunterladen
  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  downloadBlob(
    zipBlob,
    `Spielplaene_${turnierEinstellungen.turnierName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.zip`
  );
  
  updateSpinner(statusDiv, '✅ ZIP-Export erfolgreich!');
}

/**
 * Erstellt eine komplette PDF mit allen Feldern
 */
async function exportCompleteBeautifulPDF(
  spiele: Spiel[], 
  turnierEinstellungen: TurnierEinstellungen, 
  html2pdf: any, 
  statusDiv: HTMLElement
) {
  updateSpinner(statusDiv, '🎨 Erstelle komplette wunderschöne PDF...');
  
  // Gruppiere nach Feld
  const spieleByField: {[feld: string]: Spiel[]} = {};
  spiele.forEach(spiel => {
    if (!spieleByField[spiel.feld]) {
      spieleByField[spiel.feld] = [];
    }
    spieleByField[spiel.feld].push(spiel);
  });
  
  // Erstelle komplette HTML-Seite
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
    
    updateSpinner(statusDiv, '✅ Komplette PDF erfolgreich erstellt!');
    
  } catch (error) {
    console.error('Fehler bei kompletter PDF:', error);
    updateSpinner(statusDiv, '❌ Fehler bei PDF-Erstellung');
    throw error;
  }
  
  // Cleanup
  if (htmlPage.parentNode) {
    htmlPage.parentNode.removeChild(htmlPage);
  }
}

/**
 * Erstellt eine perfekte HTML-Seite für ein Feld mit ULTIMATIVEM Shadcn-Design
 */
function createPerfectFieldPage(feldSpiele: Spiel[], feldName: string, turnierEinstellungen: TurnierEinstellungen): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = `
    width: 210mm;
    min-height: 297mm;
    padding: 20mm;
    background: hsl(0 0% 100%);
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    color: hsl(222.2 84% 4.9%);
    line-height: 1.6;
    position: absolute;
    left: -9999px;
    top: 0;
    box-sizing: border-box;
  `;
  
  // PERFEKTER SHADCN HEADER
  const header = document.createElement('div');
  header.style.cssText = `
    text-align: center;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid hsl(214.3 31.8% 91.4%);
  `;
  
  // Haupt-Titel mit Shadcn Typography
  const title = document.createElement('h1');
  title.style.cssText = `
    scroll-margin: 5rem;
    font-size: 2.25rem;
    line-height: 2.5rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: hsl(222.2 84% 4.9%);
    margin: 0 0 0.75rem 0;
  `;
  title.textContent = `Spielplan ${feldName}`;
  
  // Untertitel
  const subtitle = document.createElement('h2');
  subtitle.style.cssText = `
    font-size: 1.5rem;
    line-height: 2rem;
    font-weight: 600;
    letter-spacing: -0.025em;
    color: hsl(215.4 16.3% 46.9%);
    margin: 0 0 0.5rem 0;
  `;
  subtitle.textContent = turnierEinstellungen.turnierName;
  
  // Info-Text
  const info = document.createElement('p');
  info.style.cssText = `
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: hsl(215.4 16.3% 46.9%);
    margin: 0;
  `;
  info.textContent = `${feldSpiele.length} Spiele • Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  
  header.appendChild(title);
  header.appendChild(subtitle);
  header.appendChild(info);
  
  // ULTIMATIVE SHADCN-TABELLE
  const tableContainer = createShadcnTable(feldSpiele);
  
  page.appendChild(header);
  page.appendChild(tableContainer);
  document.body.appendChild(page);
  
  return page;
}

/**
 * 🎯 ULTIMATIVE SHADCN-TABELLE - PERFEKT WIE IM BROWSER!
 */
function createShadcnTable(spiele: Spiel[]): HTMLElement {
  // Main Card Container - Exakt wie Shadcn
  const card = document.createElement('div');
  card.style.cssText = `
    background: #ffffff;
    border: 1px solid hsl(214.3 31.8% 91.4%);
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 1px 3px 0 hsl(0 0% 0% / 0.1), 0 1px 2px -1px hsl(0 0% 0% / 0.1);
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  `;
  
  // Table Element - Shadcn Style
  const table = document.createElement('table');
  table.style.cssText = `
    width: 100%;
    caption-side: bottom;
    border-collapse: collapse;
    font-size: 0.875rem;
    line-height: 1.25rem;
  `;
  
  // Table Header - Exakte Shadcn Farben
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.style.cssText = `
    border-bottom: 1px solid hsl(214.3 31.8% 91.4%);
    background: hsl(210 40% 98%);
  `;
  
  const headers = [
    { text: 'Uhrzeit', width: '20%' },
    { text: 'Kategorie', width: '20%' },
    { text: 'Team 1', width: '28%' },
    { text: 'Team 2', width: '28%' },
    { text: 'Status', width: '14%' }
  ];
  
  headers.forEach(header => {
    const th = document.createElement('th');
    th.style.cssText = `
      height: 3rem;
      padding: 0 0.75rem;
      text-align: left;
      vertical-align: middle;
      font-weight: 500;
      color: hsl(215.4 16.3% 46.9%);
      font-size: 0.75rem;
      line-height: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      width: ${header.width};
      border-bottom: 1px solid hsl(214.3 31.8% 91.4%);
    `;
    th.textContent = header.text;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Table Body - Mit perfekten Shadcn Farben
  const tbody = document.createElement('tbody');
  
  spiele
    .sort((a, b) => a.zeit.localeCompare(b.zeit))
    .forEach((spiel, index) => {
      const row = document.createElement('tr');
      row.style.cssText = `
        border-bottom: 1px solid hsl(214.3 31.8% 91.4%);
        background: ${index % 2 === 0 ? 'hsl(0 0% 100%)' : 'hsl(210 40% 98%)'};
        transition-colors: 150ms;
      `;
      
      // Zeit Cell - Hervorgehoben
      const zeitCell = document.createElement('td');
      zeitCell.style.cssText = `
        padding: 1rem 0.75rem;
        vertical-align: middle;
        font-weight: 600;
        color: hsl(222.2 84% 4.9%);
        font-size: 0.875rem;
        line-height: 1.25rem;
        font-variant-numeric: tabular-nums;
      `;
      zeitCell.textContent = spiel.zeit;
      
      // Kategorie Cell mit Shadcn Badge
      const katCell = document.createElement('td');
      katCell.style.cssText = `
        padding: 1rem 0.75rem;
        vertical-align: middle;
      `;
      
      const badge = document.createElement('div');
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        border-radius: 9999px;
        border: 1px solid transparent;
        padding: 0.25rem 0.75rem;
        font-size: 0.75rem;
        line-height: 1rem;
        font-weight: 600;
        background: hsl(214.3 31.8% 91.4%);
        color: hsl(222.2 84% 4.9%);
        transition-colors: 150ms;
        white-space: nowrap;
      `;
      badge.textContent = spiel.kategorie;
      katCell.appendChild(badge);
      
      // Team 1 Cell
      const team1Cell = document.createElement('td');
      team1Cell.style.cssText = `
        padding: 1rem 0.75rem;
        vertical-align: middle;
        color: hsl(222.2 84% 4.9%);
        font-size: 0.875rem;
        line-height: 1.25rem;
        font-weight: 500;
      `;
      team1Cell.textContent = spiel.team1;
      
      // Team 2 Cell
      const team2Cell = document.createElement('td');
      team2Cell.style.cssText = `
        padding: 1rem 0.75rem;
        vertical-align: middle;
        color: hsl(222.2 84% 4.9%);
        font-size: 0.875rem;
        line-height: 1.25rem;
        font-weight: 500;
      `;
      team2Cell.textContent = spiel.team2;
      
      // Status Cell mit perfektem Shadcn Badge
      const statusCell = document.createElement('td');
      statusCell.style.cssText = `
        padding: 1rem 0.75rem;
        vertical-align: middle;
      `;
      
      const statusBadge = document.createElement('div');
      let badgeStyles = '';
      
      switch (spiel.status.toLowerCase()) {
        case 'beendet':
          badgeStyles = `
            background: hsl(142.1 76.2% 36.3% / 0.1);
            color: hsl(142.1 76.2% 36.3%);
            border-color: hsl(142.1 76.2% 36.3% / 0.2);
          `;
          break;
        case 'laufend':
          badgeStyles = `
            background: hsl(47.9 95.8% 53.1% / 0.1);
            color: hsl(20.5 90.2% 48.2%);
            border-color: hsl(47.9 95.8% 53.1% / 0.2);
          `;
          break;
        default:
          badgeStyles = `
            background: hsl(215.4 16.3% 46.9% / 0.1);
            color: hsl(215.4 16.3% 46.9%);
            border-color: hsl(215.4 16.3% 46.9% / 0.2);
          `;
      }
      
      statusBadge.style.cssText = `
        display: inline-flex;
        align-items: center;
        border-radius: 9999px;
        border: 1px solid;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        line-height: 1rem;
        font-weight: 500;
        transition-colors: 150ms;
        white-space: nowrap;
        ${badgeStyles}
      `;
      
      let statusText = spiel.status;
      if (spiel.ergebnis) {
        statusText = `${spiel.ergebnis}`;
      }
      statusBadge.textContent = statusText;
      statusCell.appendChild(statusBadge);
      
      // Alle Cells zur Row hinzufügen
      row.appendChild(zeitCell);
      row.appendChild(katCell);
      row.appendChild(team1Cell);
      row.appendChild(team2Cell);
      row.appendChild(statusCell);
      tbody.appendChild(row);
    });
  
  table.appendChild(tbody);
  card.appendChild(table);
  
  return card;
}

/**
 * Erstellt komplettes HTML-Dokument mit allen Feldern
 */
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
  
  // Header
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
  
  // Für jedes Feld
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
    fieldSection.appendChild(createShadcnTable(feldSpiele));
    page.appendChild(fieldSection);
  });
  
  document.body.appendChild(page);
  return page;
}

// Hilfsfunktionen
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
  if (typeof window !== 'undefined' && (window as any).html2pdf) {
    return (window as any).html2pdf;
  }
  
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  document.head.appendChild(script);
  
  return new Promise((resolve, reject) => {
    script.onload = () => resolve((window as any).html2pdf);
    script.onerror = reject;
  });
}

async function loadJSZip(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).JSZip) {
    return (window as any).JSZip;
  }
  
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  document.head.appendChild(script);
  
  return new Promise((resolve, reject) => {
    script.onload = () => resolve((window as any).JSZip);
    script.onerror = reject;
  });
}

function downloadBlob(blob: Blob, filename: string): void {
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
