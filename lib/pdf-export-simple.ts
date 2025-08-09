// Einfache PDF-Export-Funktionen für Spielpläne
// Diese Datei stellt die grundlegenden PDF-Export-Funktionen wieder her

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    // CSV-Header
    const headers = ['Datum', 'Zeit', 'Feld', 'Kategorie', 'Team 1', 'Team 2', 'Status', 'Ergebnis'];
    
    // CSV-Daten
    const csvData = spiele.map(spiel => [
      spiel.datum,
      spiel.zeit,
      spiel.feld,
      spiel.kategorie,
      spiel.team1,
      spiel.team2,
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

// Placeholder für PDF-Export (wird später implementiert)
export function exportSimpleSpielplanPDF(spiele: Spiel[], config: TurnierConfig) {
  console.log('📄 PDF-Export wird erstellt...');
  
  try {
    // Neues PDF-Dokument erstellen (Querformat)
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Hilfsfunktion für deutsches Datumsformat
    const formatGermanDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit'
      });
    };
    
    // Spiele nach Feldern gruppieren
    const spieleNachFeld = spiele.reduce((acc: { [key: string]: Spiel[] }, spiel) => {
      if (!acc[spiel.feld]) {
        acc[spiel.feld] = [];
      }
      acc[spiel.feld].push(spiel);
      return acc;
    }, {});
    
    const felder = Object.keys(spieleNachFeld).sort();
    
    felder.forEach((feld, feldIndex) => {
      // Neue Seite für jedes Feld (außer beim ersten)
      if (feldIndex > 0) {
        doc.addPage();
      }
      
      // Titel und Header für das Feld
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${config.turnierName} - ${feld}`, 148, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Spielplan vom ${formatGermanDate(config.turnierStartDatum)} bis ${formatGermanDate(config.turnierEndDatum)}`, 148, 22, { align: 'center' });
      
      // Infos kompakter
      doc.setFontSize(8);
      doc.text(`Startgeld: ${config.startgeld}€ | Schiri: ${config.schiriGeld}€`, 20, 30);
      doc.text(`Erstellt: ${new Date().toLocaleDateString('de-DE')} | Spiele: ${spieleNachFeld[feld].length}`, 200, 30);
      
      // Spiele für dieses Feld nach Datum und Zeit sortieren
      const sortierteSpiele = spieleNachFeld[feld].sort((a, b) => {
        const dateTimeA = new Date(`${a.datum} ${a.zeit}`);
        const dateTimeB = new Date(`${b.datum} ${b.zeit}`);
        return dateTimeA.getTime() - dateTimeB.getTime();
      });
      
      // Tabellendaten vorbereiten mit deutschem Datumsformat
      const tableData = sortierteSpiele.map(spiel => [
        formatGermanDate(spiel.datum),
        spiel.zeit,
        spiel.kategorie,
        spiel.team1,
        spiel.team2,
        spiel.status,
        spiel.ergebnis || '-'
      ]);
      
      // Tabelle erstellen mit autoTable - kompakter für mehr Spiele pro Seite
      autoTable(doc, {
        startY: 38,
        head: [['Datum', 'Zeit', 'Kategorie', 'Team 1', 'Team 2', 'Status', 'Ergebnis']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 1.5,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 22 }, // Datum
          1: { cellWidth: 18 }, // Zeit
          2: { cellWidth: 30 }, // Kategorie
          3: { cellWidth: 55 }, // Team 1
          4: { cellWidth: 55 }, // Team 2
          5: { cellWidth: 22 }, // Status
          6: { cellWidth: 25 }  // Ergebnis
        },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        showHead: 'everyPage',
        pageBreak: 'avoid',
        didDrawPage: function(data: any) {
          // Seitenzahl und Feld-Info hinzufügen
          const pageSize = doc.internal.pageSize;
          doc.setFontSize(7);
          doc.text(`${feld} - Seite ${feldIndex + 1}/${felder.length}`, 
            pageSize.width - 60, pageSize.height - 8);
        }
      });
    });
    
    // PDF herunterladen
    const fileName = `Spielplan_${config.turnierName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    console.log('✅ PDF-Export erfolgreich erstellt:', fileName);
  } catch (error) {
    console.error('❌ Fehler beim PDF-Export:', error);
    throw error;
  }
}

// Placeholder für PDF-Vorschau (wird später implementiert)
export function previewSpielplanPDF(spiele: Spiel[], config: TurnierConfig) {
  console.log('👁️ PDF-Vorschau wird erstellt...');
  
  try {
    // Neues PDF-Dokument erstellen (Querformat)
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Hilfsfunktion für deutsches Datumsformat
    const formatGermanDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit'
      });
    };
    
    // Spiele nach Feldern gruppieren
    const spieleNachFeld = spiele.reduce((acc: { [key: string]: Spiel[] }, spiel) => {
      if (!acc[spiel.feld]) {
        acc[spiel.feld] = [];
      }
      acc[spiel.feld].push(spiel);
      return acc;
    }, {});
    
    const felder = Object.keys(spieleNachFeld).sort();
    
    felder.forEach((feld, feldIndex) => {
      // Neue Seite für jedes Feld (außer beim ersten)
      if (feldIndex > 0) {
        doc.addPage();
      }
      
      // Titel und Header für das Feld
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${config.turnierName} - ${feld}`, 148, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Spielplan vom ${formatGermanDate(config.turnierStartDatum)} bis ${formatGermanDate(config.turnierEndDatum)}`, 148, 22, { align: 'center' });
      
      // Infos kompakter
      doc.setFontSize(8);
      doc.text(`Startgeld: ${config.startgeld}€ | Schiri: ${config.schiriGeld}€`, 20, 30);
      doc.text(`Erstellt: ${new Date().toLocaleDateString('de-DE')} | Spiele: ${spieleNachFeld[feld].length}`, 200, 30);
      
      // Spiele für dieses Feld nach Datum und Zeit sortieren
      const sortierteSpiele = spieleNachFeld[feld].sort((a, b) => {
        const dateTimeA = new Date(`${a.datum} ${a.zeit}`);
        const dateTimeB = new Date(`${b.datum} ${b.zeit}`);
        return dateTimeA.getTime() - dateTimeB.getTime();
      });
      
      // Tabellendaten vorbereiten mit deutschem Datumsformat
      const tableData = sortierteSpiele.map(spiel => [
        formatGermanDate(spiel.datum),
        spiel.zeit,
        spiel.kategorie,
        spiel.team1,
        spiel.team2,
        spiel.status,
        spiel.ergebnis || '-'
      ]);
      
      // Tabelle erstellen mit autoTable - kompakter für mehr Spiele pro Seite
      autoTable(doc, {
        startY: 38,
        head: [['Datum', 'Zeit', 'Kategorie', 'Team 1', 'Team 2', 'Status', 'Ergebnis']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 1.5,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 22 }, // Datum
          1: { cellWidth: 18 }, // Zeit
          2: { cellWidth: 30 }, // Kategorie
          3: { cellWidth: 55 }, // Team 1
          4: { cellWidth: 55 }, // Team 2
          5: { cellWidth: 22 }, // Status
          6: { cellWidth: 25 }  // Ergebnis
        },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        showHead: 'everyPage',
        pageBreak: 'avoid',
        didDrawPage: function(data: any) {
          // Seitenzahl und Feld-Info hinzufügen
          const pageSize = doc.internal.pageSize;
          doc.setFontSize(7);
          doc.text(`${feld} - Seite ${feldIndex + 1}/${felder.length}`, 
            pageSize.width - 60, pageSize.height - 8);
        }
      });
    });
    
    // PDF in neuem Tab öffnen (Vorschau)
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
    
    console.log('✅ PDF-Vorschau erfolgreich geöffnet');
  } catch (error) {
    console.error('❌ Fehler bei PDF-Vorschau:', error);
    throw error;
  }
}
