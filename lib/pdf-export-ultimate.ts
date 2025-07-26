// ULTIMATIVE PDF-Export-Funktion mit PERFEKTEN Shadcn-Tabellen
// Diese Datei ersetzt alle bisherigen Versionen und erstellt wirklich schöne PDFs!

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
 * 🎯 HAUPTFUNKTION: Perfekte PDF-Exports mit Shadcn-Design
 */
export async function exportPerfectSpielplanPDF(spiele: Spiel[], turnierEinstellungen: TurnierEinstellungen) {
  console.log('🎯 PDF Export gestartet:', { spieleAnzahl: spiele.length, turnierEinstellungen });
  
  // Prüfe ob Spiele vorhanden sind
  if (!spiele || spiele.length === 0) {
    alert('❌ Keine Spiele vorhanden! Bitte erst einen Spielplan erstellen.');
    return;
  }
  
  const statusDiv = showStatusDialog();
  
  try {
    updateStatus(statusDiv, '📚 Lade PDF-Bibliotheken...');
    
    const html2pdf = await loadHtml2PDF();
    const JSZip = await loadJSZip();
    
    updateStatus(statusDiv, '🎨 Erstelle wunderschöne Tabellen...');
    
    // Frage User nach Export-Typ
    const exportChoice = confirm(
      '🏆 Wie möchten Sie exportieren?\n\n' +
      '✅ OK = Separate PDFs pro Feld (empfohlen)\n' +
      '❌ Abbrechen = Alles in einer PDF'
    );
    
    if (exportChoice) {
      await createSeparatePerfectPDFs(spiele, turnierEinstellungen, html2pdf, JSZip, statusDiv);
    } else {
      await createCombinedPerfectPDF(spiele, turnierEinstellungen, html2pdf, statusDiv);
    }
    
    updateStatus(statusDiv, '🎉 Export erfolgreich abgeschlossen!');
    
  } catch (error) {
    console.error('PDF-Export Fehler:', error);
    updateStatus(statusDiv, '❌ Export fehlgeschlagen');
    
    // Fallback: CSV-Export
    try {
      updateStatus(statusDiv, '💾 Erstelle Fallback CSV...');
      await createFallbackCSV(spiele, turnierEinstellungen);
      updateStatus(statusDiv, '✅ CSV-Fallback erstellt');
    } catch (csvError) {
      updateStatus(statusDiv, '❌ Auch CSV-Export fehlgeschlagen');
      alert('Leider konnte kein Export erstellt werden. Bitte versuchen Sie es später erneut.');
    }
  } finally {
    setTimeout(() => {
      if (document.body.contains(statusDiv)) {
        document.body.removeChild(statusDiv);
      }
    }, 3000);
  }
}

/**
 * Erstellt separate PDFs pro Feld mit perfektem Design
 */
async function createSeparatePerfectPDFs(
  spiele: Spiel[], 
  turnierEinstellungen: TurnierEinstellungen, 
  html2pdf: any, 
  JSZip: any, 
  statusDiv: HTMLElement
) {
  console.log('📄 Erstelle separate PDFs für', spiele.length, 'Spiele');
  
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
  console.log('🏟️ Felder gefunden:', fields);
  
  if (fields.length === 0) {
    alert('❌ Keine Spiele mit Feld-Zuordnung gefunden!');
    return;
  }
  
  for (let i = 0; i < fields.length; i++) {
    const feld = fields[i];
    const feldSpiele = spieleByField[feld];
    
    console.log(`🎨 Erstelle PDF für ${feld} mit ${feldSpiele.length} Spielen`);
    updateStatus(statusDiv, `🎨 Erstelle PDF für ${feld} (${i + 1}/${fields.length})...`);
    
    // Erstelle perfekte HTML-Seite für dieses Feld
    const htmlPage = createPerfectFieldHTML(feldSpiele, feld, turnierEinstellungen);
    
    try {
      // Konvertiere zu PDF-Blob
      const pdfBlob = await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename: `${feld.replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 1.0 },
          html2canvas: { 
            scale: 3,
            useCORS: true,
            letterRendering: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: 794,
            height: 1123
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true,
            precision: 2
          }
        })
        .from(htmlPage)
        .outputPdf('blob');
      
      console.log(`✅ PDF für ${feld} erfolgreich erstellt, Größe: ${pdfBlob.size} bytes`);
      
      // Füge PDF zum ZIP hinzu
      zip.file(`${feld.replace(/\s+/g, '_')}.pdf`, pdfBlob);
      
    } catch (error) {
      console.error(`Fehler bei PDF für ${feld}:`, error);
      // Fallback: Textdatei
      const textContent = createTextFallback(feldSpiele, feld);
      zip.file(`${feld.replace(/\s+/g, '_')}_FALLBACK.txt`, textContent);
    }
    
    // HTML-Element wieder entfernen
    if (document.body.contains(htmlPage)) {
      document.body.removeChild(htmlPage);
    }
  }
  
  updateStatus(statusDiv, '📦 Packe ZIP-Datei...');
  
  // ZIP herunterladen
  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(zipBlob);
  link.download = `Spielplan_${turnierEinstellungen.turnierName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Erstellt eine kombinierte PDF mit allen Feldern
 */
async function createCombinedPerfectPDF(
  spiele: Spiel[], 
  turnierEinstellungen: TurnierEinstellungen, 
  html2pdf: any, 
  statusDiv: HTMLElement
) {
  updateStatus(statusDiv, '🎨 Erstelle kombinierte PDF...');
  
  // Gruppiere nach Feld
  const spieleByField: {[feld: string]: Spiel[]} = {};
  spiele.forEach(spiel => {
    if (!spieleByField[spiel.feld]) {
      spieleByField[spiel.feld] = [];
    }
    spieleByField[spiel.feld].push(spiel);
  });
  
  const htmlPage = createCombinedHTML(spieleByField, turnierEinstellungen);
  
  try {
    await html2pdf()
      .set({
        margin: [15, 15, 15, 15],
        filename: `Spielplan_Komplett_${turnierEinstellungen.turnierName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
          scale: 2.5,
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
    
  } catch (error) {
    console.error('Fehler bei kombinierter PDF:', error);
    throw error;
  } finally {
    if (htmlPage && htmlPage.parentNode) {
      htmlPage.parentNode.removeChild(htmlPage);
    }
  }
}

/**
 * Erstellt perfekte HTML-Seite für ein Feld
 */
function createPerfectFieldHTML(spiele: Spiel[], feldName: string, turnierEinstellungen: TurnierEinstellungen): HTMLElement {
  console.log(`📄 Erstelle HTML für ${feldName} mit ${spiele.length} Spielen:`, spiele);
  
  const page = document.createElement('div');
  page.style.cssText = `
    width: 794px;
    min-height: 1123px;
    padding: 40px;
    background: white;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    color: #0f172a;
    line-height: 1.5;
    position: absolute;
    left: -9999px;
    top: 0;
    box-sizing: border-box;
  `;
  
  // Titel-Bereich
  const header = document.createElement('div');
  header.style.cssText = `
    text-align: center;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 3px solid #e2e8f0;
  `;
  
  header.innerHTML = `
    <h1 style="
      font-size: 36px; 
      font-weight: 800; 
      color: #1e40af; 
      margin: 0 0 12px 0; 
      letter-spacing: -0.025em;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    ">
      ${feldName}
    </h1>
    <h2 style="
      font-size: 22px; 
      font-weight: 600; 
      color: #64748b; 
      margin: 0 0 8px 0;
      letter-spacing: -0.01em;
    ">
      ${turnierEinstellungen.turnierName}
    </h2>
    <p style="
      font-size: 14px; 
      color: #94a3b8; 
      margin: 0;
      font-weight: 500;
    ">
      ${spiele.length} Spiele • Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
    </p>
  `;
  
  // Perfekte Shadcn-Tabelle
  const tableContainer = createUltimateTable(spiele);
  
  page.appendChild(header);
  page.appendChild(tableContainer);
  document.body.appendChild(page);
  
  console.log(`✅ HTML für ${feldName} erstellt, Seiteninhalt:`, page.innerHTML.substring(0, 200) + '...');
  
  return page;
}

/**
 * 🏆 ULTIMATIVE SHADCN-TABELLE (das ist die beste!)
 */
function createUltimateTable(spiele: Spiel[]): HTMLElement {
  console.log(`📊 Erstelle Tabelle für ${spiele.length} Spiele`);
  
  if (spiele.length === 0) {
    console.warn('⚠️ Keine Spiele für Tabelle vorhanden!');
    const emptyDiv = document.createElement('div');
    emptyDiv.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Keine Spiele vorhanden</p>';
    return emptyDiv;
  }
  
  const container = document.createElement('div');
  container.style.cssText = `
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  `;
  
  const table = document.createElement('table');
  table.style.cssText = `
    width: 100%;
    border-collapse: collapse;
    font-size: 15px;
    background: white;
  `;
  
  // Header mit Gradient
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr style="
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
      color: white;
    ">
      <th style="
        text-align: left; 
        padding: 18px 20px; 
        font-weight: 700; 
        font-size: 14px; 
        text-transform: uppercase; 
        letter-spacing: 0.05em; 
        width: 15%;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      ">Uhrzeit</th>
      <th style="
        text-align: left; 
        padding: 18px 20px; 
        font-weight: 700; 
        font-size: 14px; 
        text-transform: uppercase; 
        letter-spacing: 0.05em; 
        width: 20%;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      ">Kategorie</th>
      <th style="
        text-align: left; 
        padding: 18px 20px; 
        font-weight: 700; 
        font-size: 14px; 
        text-transform: uppercase; 
        letter-spacing: 0.05em; 
        width: 30%;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      ">Team 1</th>
      <th style="
        text-align: left; 
        padding: 18px 20px; 
        font-weight: 700; 
        font-size: 14px; 
        text-transform: uppercase; 
        letter-spacing: 0.05em; 
        width: 30%;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      ">Team 2</th>
      <th style="
        text-align: center; 
        padding: 18px 20px; 
        font-weight: 700; 
        font-size: 14px; 
        text-transform: uppercase; 
        letter-spacing: 0.05em; 
        width: 15%;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      ">Status</th>
    </tr>
  `;
  
  // Body mit perfekten Zeilen
  const tbody = document.createElement('tbody');
  
  spiele
    .sort((a, b) => a.zeit.localeCompare(b.zeit))
    .forEach((spiel, index) => {
      const row = document.createElement('tr');
      row.style.cssText = `
        border-bottom: 1px solid #f1f5f9;
        background: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};
        transition: background-color 0.15s ease;
      `;
      
      // Zeit - Hervorgehoben
      const zeitCell = document.createElement('td');
      zeitCell.style.cssText = `
        padding: 16px 20px; 
        font-weight: 700; 
        color: #1e40af; 
        font-size: 16px;
        font-variant-numeric: tabular-nums;
        border-bottom: 1px solid #f1f5f9;
      `;
      zeitCell.textContent = spiel.zeit;
      
      // Kategorie mit schönem Badge
      const katCell = document.createElement('td');
      katCell.style.cssText = 'padding: 16px 20px; border-bottom: 1px solid #f1f5f9;';
      const badge = document.createElement('span');
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 600;
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        color: #1e40af;
        border: 1px solid #93c5fd;
        border-radius: 8px;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      `;
      badge.textContent = spiel.kategorie;
      katCell.appendChild(badge);
      
      // Team 1
      const team1Cell = document.createElement('td');
      team1Cell.style.cssText = `
        padding: 16px 20px; 
        color: #1e293b; 
        font-weight: 600;
        font-size: 15px;
        border-bottom: 1px solid #f1f5f9;
      `;
      team1Cell.textContent = spiel.team1;
      
      // Team 2
      const team2Cell = document.createElement('td');
      team2Cell.style.cssText = `
        padding: 16px 20px; 
        color: #1e293b; 
        font-weight: 600;
        font-size: 15px;
        border-bottom: 1px solid #f1f5f9;
      `;
      team2Cell.textContent = spiel.team2;
      
      // Status mit perfektem Badge
      const statusCell = document.createElement('td');
      statusCell.style.cssText = 'padding: 16px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;';
      const statusBadge = document.createElement('span');
      
      let statusColor, statusBg, statusBorder;
      switch (spiel.status.toLowerCase()) {
        case 'beendet':
          statusColor = '#065f46';
          statusBg = 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)';
          statusBorder = '#34d399';
          break;
        case 'laufend':
          statusColor = '#92400e';
          statusBg = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
          statusBorder = '#f59e0b';
          break;
        default:
          statusColor = '#374151';
          statusBg = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
          statusBorder = '#9ca3af';
      }
      
      statusBadge.style.cssText = `
        display: inline-flex;
        align-items: center;
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 600;
        background: ${statusBg};
        color: ${statusColor};
        border: 1px solid ${statusBorder};
        border-radius: 6px;
        min-width: 70px;
        justify-content: center;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      `;
      
      let statusText = spiel.status;
      if (spiel.ergebnis) {
        statusText = `${spiel.ergebnis}`;
      }
      statusBadge.textContent = statusText;
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
  container.appendChild(table);
  
  return container;
}

/**
 * Erstellt kombinierte HTML mit allen Feldern
 */
function createCombinedHTML(spieleByField: {[feld: string]: Spiel[]}, turnierEinstellungen: TurnierEinstellungen): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = `
    width: 794px;
    background: white;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0f172a;
    position: absolute;
    left: -9999px;
    top: 0;
    padding: 30px;
    box-sizing: border-box;
  `;
  
  // Haupt-Titel
  const mainHeader = document.createElement('div');
  mainHeader.style.cssText = `
    text-align: center;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 3px solid #e2e8f0;
  `;
  mainHeader.innerHTML = `
    <h1 style="font-size: 32px; font-weight: 800; color: #1e40af; margin: 0 0 8px 0;">
      Kompletter Spielplan
    </h1>
    <h2 style="font-size: 20px; font-weight: 600; color: #64748b; margin: 0;">
      ${turnierEinstellungen.turnierName}
    </h2>
  `;
  page.appendChild(mainHeader);
  
  // Für jedes Feld eine Tabelle
  Object.keys(spieleByField).sort().forEach((feld, index) => {
    if (index > 0) {
      const pageBreak = document.createElement('div');
      pageBreak.style.cssText = 'page-break-before: always; margin-top: 40px;';
      page.appendChild(pageBreak);
    }
    
    const fieldHeader = document.createElement('h3');
    fieldHeader.style.cssText = `
      font-size: 24px;
      font-weight: 700;
      color: #1e40af;
      margin: 30px 0 20px 0;
      text-align: center;
    `;
    fieldHeader.textContent = feld;
    
    const table = createUltimateTable(spieleByField[feld]);
    table.style.marginBottom = '30px';
    
    page.appendChild(fieldHeader);
    page.appendChild(table);
  });
  
  document.body.appendChild(page);
  return page;
}

// Hilfsfunktionen (Status, Loader, etc.)
function showStatusDialog(): HTMLElement {
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px 40px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    text-align: center;
    min-width: 350px;
    border: 2px solid #e2e8f0;
  `;
  
  div.innerHTML = `
    <div style="font-size: 24px; margin-bottom: 15px;">🎯</div>
    <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 18px; font-weight: 600;">PDF-Export</h3>
    <p id="status-text" style="margin: 0; color: #64748b; font-size: 14px;">Wird gestartet...</p>
  `;
  
  document.body.appendChild(div);
  return div;
}

function updateStatus(statusDiv: HTMLElement, message: string) {
  const statusText = statusDiv.querySelector('#status-text');
  if (statusText) {
    statusText.textContent = message;
  }
}

async function loadHtml2PDF() {
  if (typeof window !== 'undefined' && (window as any).html2pdf) {
    return (window as any).html2pdf;
  }
  
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  
  return new Promise((resolve, reject) => {
    script.onload = () => resolve((window as any).html2pdf);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadJSZip() {
  if (typeof window !== 'undefined' && (window as any).JSZip) {
    return (window as any).JSZip;
  }
  
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  
  return new Promise((resolve, reject) => {
    script.onload = () => resolve((window as any).JSZip);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function createTextFallback(spiele: Spiel[], feldName: string): string {
  let content = `SPIELPLAN - ${feldName}\n`;
  content += '='.repeat(50) + '\n\n';
  
  spiele
    .sort((a, b) => a.zeit.localeCompare(b.zeit))
    .forEach(spiel => {
      content += `${spiel.zeit} | ${spiel.kategorie} | ${spiel.team1} vs ${spiel.team2} | ${spiel.status}\n`;
    });
  
  content += `\nErstellt: ${new Date().toLocaleString('de-DE')}\n`;
  return content;
}

async function createFallbackCSV(spiele: Spiel[], turnierEinstellungen: TurnierEinstellungen) {
  const headers = ['Feld', 'Zeit', 'Kategorie', 'Team 1', 'Team 2', 'Status', 'Ergebnis'];
  const csvContent = [
    headers.join(','),
    ...spiele.map(spiel => [
      `"${spiel.feld}"`,
      `"${spiel.zeit}"`,
      `"${spiel.kategorie}"`,
      `"${spiel.team1}"`,
      `"${spiel.team2}"`,
      `"${spiel.status}"`,
      `"${spiel.ergebnis || ''}"`
    ].join(','))
  ].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Spielplan_${turnierEinstellungen.turnierName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
