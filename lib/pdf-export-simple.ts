// Einfache und zuverlässige PDF-Export-Funktion
// Diese Version ist minimal und sollte immer funktionieren

export interface SimpleSpiel {
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

export interface SimpleTurnierEinstellungen {
  turnierName: string;
  startgeld: string;
  schiriGeld: string;
  turnierStartDatum: string;
  turnierEndDatum: string;
}

/**
 * Einfacher PDF-Export mit reinem HTML/CSS - sollte immer funktionieren
 */
export function exportSimpleSpielplanPDF(spiele: SimpleSpiel[], einstellungen: SimpleTurnierEinstellungen) {
  console.log('🚀 Starte einfachen PDF-Export mit', spiele.length, 'Spielen');
  
  if (!spiele || spiele.length === 0) {
    alert('❌ Keine Spiele vorhanden! Bitte erst einen Spielplan erstellen.');
    return;
  }

  // Erstelle HTML-String für den Export
  const htmlContent = createSimpleHTML(spiele, einstellungen);
  
  // Öffne neues Fenster und drucke
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('❌ Popup wurde blockiert. Bitte Popup-Blocker deaktivieren.');
    return;
  }
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Warte kurz und starte dann den Druck
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}

/**
 * Zeigt eine Vorschau des PDF-Layouts an
 */
export function previewSpielplanPDF(spiele: SimpleSpiel[], einstellungen: SimpleTurnierEinstellungen) {
  console.log('👁️ Zeige PDF-Vorschau für', spiele.length, 'Spiele');
  
  if (!spiele || spiele.length === 0) {
    alert('❌ Keine Spiele vorhanden! Bitte erst einen Spielplan erstellen.');
    return;
  }

  // Erstelle HTML-String für die Vorschau
  const htmlContent = createSimpleHTML(spiele, einstellungen);
  
  // Öffne Vorschau in neuem Tab
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    alert('❌ Popup wurde blockiert. Bitte Popup-Blocker deaktivieren.');
    return;
  }
  
  // Füge Vorschau-Controls hinzu
  const previewHTML = htmlContent.replace(
    '</head>',
    `
    <style>
      .preview-controls {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 1000;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .preview-controls button {
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 12px;
        margin: 2px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }
      .preview-controls button:hover {
        background: #0056b3;
      }
      @media print {
        .preview-controls { display: none; }
      }
    </style>
    </head>`
  ).replace(
    '<body>',
    `<body>
    <div class="preview-controls">
      <strong>📄 PDF-Vorschau</strong><br>
      <button onclick="window.print()">🖨️ Drucken/Als PDF speichern</button>
      <button onclick="window.close()">❌ Schließen</button>
    </div>`
  );
  
  previewWindow.document.write(previewHTML);
  previewWindow.document.close();
  previewWindow.focus();
}

/**
 * Erstellt einfachen HTML-String für den PDF-Export
 */
function createSimpleHTML(spiele: SimpleSpiel[], einstellungen: SimpleTurnierEinstellungen): string {
  console.log('📄 Erstelle HTML für', spiele.length, 'Spiele');
  
  // Gruppiere Spiele nach Feld
  const spieleByField: {[feld: string]: SimpleSpiel[]} = {};
  spiele.forEach(spiel => {
    if (!spieleByField[spiel.feld]) {
      spieleByField[spiel.feld] = [];
    }
    spieleByField[spiel.feld].push(spiel);
  });
  
  const fields = Object.keys(spieleByField).sort();
  console.log('📋 Felder:', fields);
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Spielplan - ${einstellungen.turnierName}</title>
  <style>
    @page {
      margin: 1cm;
      size: A4 landscape; /* Querformat */
    }
    
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 0;
      color: #000;
      line-height: 1.2;
      background: white;
    }
    
    .page {
      page-break-after: always;
      height: 19cm; /* A4 Querformat Höhe minus Rand */
      width: 27.7cm; /* A4 Querformat Breite minus Rand */
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .page:last-child {
      page-break-after: avoid;
    }
    
    .header {
      text-align: center;
      margin-bottom: 15px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      flex-shrink: 0;
    }
    
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #000;
      margin: 0 0 5px 0;
    }
    
    .subtitle {
      font-size: 16px;
      color: #333;
      margin: 0 0 3px 0;
    }
    
    .info {
      font-size: 10px;
      color: #666;
      margin: 0;
    }
    
    .table-container {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border: 2px solid #000;
      flex: 1;
      table-layout: fixed;
    }
    
    th {
      background: #000;
      color: white;
      padding: 8px 6px;
      text-align: left;
      font-weight: bold;
      font-size: 12px;
      border: 1px solid #000;
    }
    
    td {
      padding: 6px 6px;
      border: 1px solid #000;
      font-size: 10px;
      vertical-align: middle;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    /* Jede zweite Zeile hellblau */
    tr:nth-child(even) {
      background: #e3f2fd; /* Hellblau */
    }
    
    tr:nth-child(odd) {
      background: white;
    }
    
    .zeit {
      font-weight: bold;
      color: #000;
      width: 12%;
    }
    
    .kategorie {
      width: 15%;
      font-weight: 500;
    }
    
    .team {
      width: 30%;
    }
    
    .status {
      width: 13%;
      text-align: center;
    }
    
    .status-badge {
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 9px;
      font-weight: bold;
      border: 1px solid #000;
    }
    
    .status-geplant {
      background: white;
      color: #000;
    }
    
    .status-laufend {
      background: #f5f5f5;
      color: #000;
    }
    
    .status-beendet {
      background: #e0e0e0;
      color: #000;
    }
    
    /* Dynamische Schriftgröße basierend auf Anzahl Spiele */
    .small-text { font-size: 9px; }
    .medium-text { font-size: 10px; }
    .large-text { font-size: 11px; }
    
    @media print {
      body { 
        print-color-adjust: exact; 
        -webkit-print-color-adjust: exact;
      }
      .page { 
        page-break-after: always; 
        height: 19cm;
        width: 27.7cm;
      }
      .page:last-child { 
        page-break-after: avoid; 
      }
      table {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
`;

  // Erstelle für jedes Feld eine Seite
  fields.forEach((feld, fieldIndex) => {
    const feldSpiele = spieleByField[feld].sort((a, b) => a.zeit.localeCompare(b.zeit));
    
    // Berechne Schriftgröße basierend auf Anzahl Spiele
    let textSizeClass = 'medium-text';
    if (feldSpiele.length > 25) {
      textSizeClass = 'small-text';
    } else if (feldSpiele.length < 15) {
      textSizeClass = 'large-text';
    }
    
    html += `
  <div class="page">
    <div class="header">
      <h1 class="title">${feld}</h1>
      <h2 class="subtitle">${einstellungen.turnierName}</h2>
      <p class="info">${feldSpiele.length} Spiele • Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
    
    <div class="table-container">
      <table class="${textSizeClass}">
        <thead>
          <tr>
            <th class="zeit">Uhrzeit</th>
            <th class="kategorie">Kategorie</th>
            <th class="team">Team 1</th>
            <th class="team">Team 2</th>
            <th class="status">Status</th>
          </tr>
        </thead>
        <tbody>
`;

    feldSpiele.forEach((spiel, index) => {
      const statusClass = `status-${spiel.status}`;
      const statusText = spiel.status === 'geplant' ? 'Geplant' : 
                        spiel.status === 'laufend' ? 'Läuft' : 
                        spiel.status === 'beendet' ? 'Beendet' : spiel.status;
      
      html += `
          <tr>
            <td class="zeit">${spiel.zeit}</td>
            <td class="kategorie">${spiel.kategorie}</td>
            <td class="team">${spiel.team1}</td>
            <td class="team">${spiel.team2}</td>
            <td class="status">
              <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
          </tr>
`;
    });

    html += `
        </tbody>
      </table>
    </div>
  </div>
`;
  });

  html += `
</body>
</html>
`;

  console.log('✅ HTML erstellt, Länge:', html.length, 'Zeichen');
  return html;
}

/**
 * Export als CSV-Fallback
 */
export function exportSpielplanCSV(spiele: SimpleSpiel[], einstellungen: SimpleTurnierEinstellungen) {
  console.log('📊 Erstelle CSV für', spiele.length, 'Spiele');
  
  if (!spiele || spiele.length === 0) {
    alert('❌ Keine Spiele vorhanden!');
    return;
  }
  
  // CSV-Header
  let csv = 'Datum,Zeit,Feld,Kategorie,Team 1,Team 2,Status,Ergebnis\n';
  
  // Daten hinzufügen
  spiele
    .sort((a, b) => {
      const dateCompare = a.datum.localeCompare(b.datum);
      if (dateCompare !== 0) return dateCompare;
      return a.zeit.localeCompare(b.zeit);
    })
    .forEach(spiel => {
      csv += `"${spiel.datum}","${spiel.zeit}","${spiel.feld}","${spiel.kategorie}","${spiel.team1}","${spiel.team2}","${spiel.status}","${spiel.ergebnis || ''}"\n`;
    });
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `Spielplan_${einstellungen.turnierName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log('✅ CSV-Download gestartet');
}
