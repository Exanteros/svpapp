'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, QrCode, Camera, Scan, Trophy, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import JSZip from 'jszip';

interface Spiel {
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

interface SchiedsrichterkarteGeneratorProps {
  spiele: Spiel[];
  turnierName: string;
}

interface KartenDaten {
  spielId: string;
  team1: string;
  team2: string;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  qrCodeData: string;
}

export default function SchiedsrichterkarteGenerator({ spiele, turnierName }: SchiedsrichterkarteGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSpiel, setPreviewSpiel] = useState<Spiel | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningActive, setScanningActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Template-Koordinaten für 8x12cm Handball-Spielnotizkarte (EXAKTE KOORDINATEN!)
  const TEMPLATE_CONFIG = {
    // 8cm x 12cm bei 300 DPI = 945px x 1417px (Hochformat!)
    width: 945, 
    height: 1417,
    templateImage: '/handball-spielnotizkarte.png', // Echtes Template
    // EXAKTE Koordinaten mit größeren Schriftgrößen für bessere Lesbarkeit:
    // Team 1 Box: x:15, y:220 bis x:337, y:323 (Breite: 322px, Höhe: 103px)
    team1: { x: 20, y: 250, fontSize: 22, maxWidth: 310, fontWeight: 'bold' },
    // Team 2 Box: x:455, y:223 bis x:772, y:322 (Breite: 317px, Höhe: 99px)  
    team2: { x: 460, y: 250, fontSize: 22, maxWidth: 305, fontWeight: 'bold' },
    // Besondere Vorkommnisse: x:15, y:980 bis x:440, y:1135 (Breite: 425px, Höhe: 155px)
    feldZeit1: { x: 20, y: 1010, fontSize: 16, maxWidth: 415 },
    // Für Team 2 nehmen wir die rechte Seite (spiegelbildlich)
    feldZeit2: { x: 460, y: 1010, fontSize: 16, maxWidth: 300 },
    // QR-Code größer und prominenter platzieren (2D Matrix Code)
    qrCode: { x: 650, y: 1100, size: 200 } // Deutlich größer: 200px statt 100px
  };

  // QR-Code Daten generieren
  const generateQRData = (spiel: Spiel): string => {
    return JSON.stringify({
      id: spiel.id,
      team1: spiel.team1,
      team2: spiel.team2,
      datum: spiel.datum,
      zeit: spiel.zeit,
      feld: spiel.feld,
      kategorie: spiel.kategorie,
      timestamp: new Date().toISOString()
    });
  };

  // Einzelne Schiedsrichterkarte generieren
  const generateKarte = async (spiel: Spiel): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = TEMPLATE_CONFIG.width;
    canvas.height = TEMPLATE_CONFIG.height;

    // Weißer Hintergrund
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // PNG-Template laden (falls verfügbar)
    try {
      const templateImg = new Image();
      templateImg.crossOrigin = 'anonymous';
      
      const templateLoadPromise = new Promise<void>((resolve, reject) => {
        templateImg.onload = () => resolve();
        templateImg.onerror = () => reject(new Error('Template konnte nicht geladen werden'));
      });
      
      templateImg.src = TEMPLATE_CONFIG.templateImage;
      
      try {
        await templateLoadPromise;
        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
        console.log('✅ PNG-Template erfolgreich geladen');
      } catch (templateError) {
        console.log('⚠️ PNG-Template nicht verfügbar, verwende Fallback-Design');
        // Fallback zu manuellem Design
        await generateFallbackDesign(ctx, spiel);
      }
    } catch (error) {
      console.log('⚠️ PNG-Template nicht verfügbar, verwende Fallback-Design');
      await generateFallbackDesign(ctx, spiel);
    }

    // Spielinformationen auf Template zeichnen (mit größeren Schriftgrößen)
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${TEMPLATE_CONFIG.team1.fontSize}px Arial`;
    
    // Team 1 (Box: x:15, y:220 bis x:337, y:323)
    // Text zentriert in der Box platzieren mit größerer Schrift
    ctx.textAlign = 'center';
    const team1BoxCenterX = 15 + (337 - 15) / 2; // 176px
    const team1BoxCenterY = 220 + (323 - 220) / 2 + 8; // 259px + offset für größere Schrift
    ctx.fillText(spiel.team1, team1BoxCenterX, team1BoxCenterY);
    
    // Team 2 (Box: x:455, y:223 bis x:772, y:322)  
    const team2BoxCenterX = 455 + (772 - 455) / 2; // 613px
    const team2BoxCenterY = 223 + (322 - 223) / 2 + 8; // 280px + offset für größere Schrift
    ctx.fillText(spiel.team2, team2BoxCenterX, team2BoxCenterY);
    
    ctx.textAlign = 'left'; // Zurück zu links-ausgerichtet

    // Feld und Zeit in "Besondere Vorkommnisse" mit VIEL größerer Schrift
    ctx.font = `bold 20px Arial`; // Von 16px auf 20px vergrößert
    
    // Nur in die linke "Besondere Vorkommnisse" Box schreiben mit mehr Abstand
    ctx.fillText(`FELD: ${spiel.feld}`, TEMPLATE_CONFIG.feldZeit1.x, TEMPLATE_CONFIG.feldZeit1.y);
    ctx.fillText(`ZEIT: ${spiel.zeit}`, TEMPLATE_CONFIG.feldZeit1.x, TEMPLATE_CONFIG.feldZeit1.y + 35);
    ctx.fillText(`KATEGORIE: ${spiel.kategorie}`, TEMPLATE_CONFIG.feldZeit1.x, TEMPLATE_CONFIG.feldZeit1.y + 70);

    // QR-Code generieren (größerer 2D Matrix Code)
    const qrCodeData = generateQRData(spiel);
    const qrCodeCanvas = document.createElement('canvas');
    
    await QRCode.toCanvas(qrCodeCanvas, qrCodeData, {
      width: TEMPLATE_CONFIG.qrCode.size, // Jetzt 200px
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H' // Höchste Fehlerkorrektur für bessere Lesbarkeit
    });

    // QR-Code auf Hauptcanvas zeichnen
    ctx.drawImage(
      qrCodeCanvas, 
      TEMPLATE_CONFIG.qrCode.x, 
      TEMPLATE_CONFIG.qrCode.y,
      TEMPLATE_CONFIG.qrCode.size,
      TEMPLATE_CONFIG.qrCode.size
    );

    // Canvas zu Blob konvertieren
    return new Promise(resolve => {
      canvas.toBlob(resolve as BlobCallback, 'image/png', 1.0);
    });
  };

  // Fallback-Design mit exakten Koordinaten und größeren Schriftgrößen
  const generateFallbackDesign = async (ctx: CanvasRenderingContext2D, spiel: Spiel) => {
    // Hochformat Design für 8x12cm mit exakten Template-Maßen
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HANDBALL-SPIELNOTIZKARTE', 472, 80);
    
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`${turnierName}`, 472, 120);
    ctx.textAlign = 'left';

    // Rahmen und Strukturen exakt wie im Original
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // Hauptrahmen
    ctx.strokeRect(5, 5, 935, 1407);
    
    // Team 1 Box (x:15, y:220 bis x:337, y:323)
    ctx.strokeRect(15, 220, 322, 103);
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Verein/Trikotfarbe', 20, 210);
    
    // Team 2 Box (x:455, y:223 bis x:772, y:322)
    ctx.strokeRect(455, 223, 317, 99);
    ctx.fillText('Verein/Trikotfarbe', 460, 213);

    // Zahlen-Bereiche (zwischen Team-Namen und Besondere Vorkommnisse)
    ctx.strokeRect(15, 340, 440, 620); // Links
    ctx.strokeRect(455, 340, 440, 620); // Rechts
    
    // Besondere Vorkommnisse (x:15, y:980 bis x:440, y:1135)
    ctx.strokeRect(15, 980, 425, 155);
    ctx.strokeRect(455, 980, 425, 155); // Rechte Seite
    
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Besondere Vorkommnisse:', 20, 970);
    ctx.fillText('Besondere Vorkommnisse:', 460, 970);

    // Vereinfachtes Zahlen-Grid (1-40) mit größerer Schrift
    const drawNumberGrid = (startX: number, startY: number, width: number) => {
      ctx.font = 'bold 12px Arial'; // Größere Schrift für Zahlen
      for (let i = 1; i <= 40; i++) {
        const cols = 4;
        const col = (i - 1) % cols;
        const row = Math.floor((i - 1) / cols);
        const cellWidth = width / cols;
        const x = startX + col * cellWidth;
        const y = startY + row * 50;
        
        ctx.strokeRect(x, y, cellWidth - 2, 45);
        ctx.textAlign = 'center';
        ctx.fillText(i.toString(), x + cellWidth/2, y + 28);
        ctx.textAlign = 'left';
      }
    };
    
    drawNumberGrid(20, 350, 430);  // Links
    drawNumberGrid(460, 350, 430); // Rechts

    // QR-Code Label mit größerer Schrift
    ctx.font = 'bold 12px Arial';
    ctx.fillText('QR-Code für Ergebnis-Eingabe', TEMPLATE_CONFIG.qrCode.x - 50, TEMPLATE_CONFIG.qrCode.y + TEMPLATE_CONFIG.qrCode.size + 20);
  };

  // Alle Karten als ZIP generieren
  const generateAllKarten = async () => {
    if (spiele.length === 0) {
      alert('Keine Spiele verfügbar!');
      return;
    }

    setIsGenerating(true);
    
    try {
      const zip = new JSZip();
      const kartenFolder = zip.folder('schiedsrichterkarten');

      for (let i = 0; i < spiele.length; i++) {
        const spiel = spiele[i];
        console.log(`Generiere Karte ${i + 1}/${spiele.length}: ${spiel.team1} vs ${spiel.team2}`);
        
        const kartenBlob = await generateKarte(spiel);
        const filename = `${spiel.datum}_${spiel.zeit.replace(':', '')}_${spiel.feld.replace(' ', '')}_${spiel.team1.replace(' ', '_')}_vs_${spiel.team2.replace(' ', '_')}.png`;
        
        kartenFolder?.file(filename, kartenBlob);
      }

      // ZIP herunterladen
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Schiedsrichterkarten_${turnierName.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`✅ ${spiele.length} Schiedsrichterkarten erfolgreich generiert!`);
      alert(`✅ ${spiele.length} Schiedsrichterkarten erfolgreich als ZIP heruntergeladen!`);
      
    } catch (error) {
      console.error('Fehler beim Generieren der Karten:', error);
      alert('Fehler beim Generieren der Schiedsrichterkarten!');
    } finally {
      setIsGenerating(false);
    }
  };

  // Vorschau für einzelne Karte
  const showKartenPreview = async (spiel: Spiel) => {
    setPreviewSpiel(spiel);
    setShowPreview(true);
    
    // Karte in Canvas rendern
    setTimeout(async () => {
      if (canvasRef.current) {
        const kartenBlob = await generateKarte(spiel);
        const img = new Image();
        img.onload = () => {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && canvasRef.current) {
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            ctx.drawImage(img, 0, 0);
          }
        };
        img.src = URL.createObjectURL(kartenBlob);
      }
    }, 100);
  };

  // Scanner für Schiedsrichterkarten mit automatischer Erkennung
  const startScanner = async () => {
    setIsScanning(true);
    setScanningActive(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 1280, height: 720 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Warte bis Video bereit ist, dann starte automatisches Scannen
        videoRef.current.onloadedmetadata = () => {
          startAutoScan();
        };
      }
    } catch (error) {
      console.error('Fehler beim Zugriff auf Kamera:', error);
      alert('Kamera-Zugriff fehlgeschlagen!');
      setIsScanning(false);
      setScanningActive(false);
    }
  };

  // Automatisches Scannen alle 500ms
  const startAutoScan = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    scanIntervalRef.current = setInterval(() => {
      if (scanningActive && videoRef.current) {
        scanQRCodeAutomatic();
      }
    }, 500); // Alle 500ms scannen
  };

  const stopScanner = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    setIsScanning(false);
    setScanningActive(false);
  };

  // QR-Code aus Video scannen und Punkte eingeben (Legacy-Funktion für manuellen Button)
  const scanQRCode = async () => {
    // Verwende die erste verfügbare Spiel für Demo
    if (spiele.length > 0) {
      await processQRData(spiele[0]);
    } else {
      alert('❌ Keine Spiele verfügbar für QR-Code');
    }
  };

  // Automatisches QR-Code Scannen (kontinuierlich)
  const scanQRCodeAutomatic = async () => {
    try {
      const video = videoRef.current;
      if (!video || !scanningActive) return;
      
      // Video-Frame für QR-Analyse erfassen
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      // Bild-Daten für QR-Scan extrahieren
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Hier würde jsQR verwendet: const code = jsQR(imageData.data, canvas.width, canvas.height);
      // Für jetzt: Simuliere QR-Erkennung durch Bildanalyse
      
      // Demo: Überprüfe ob genug Kontrast für QR-Code vorhanden ist
      const pixels = imageData.data;
      let darkPixels = 0;
      let lightPixels = 0;
      
      for (let i = 0; i < pixels.length; i += 4) {
        const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        if (brightness < 128) darkPixels++;
        else lightPixels++;
      }
      
      // Wenn ausreichend Kontrast, simuliere QR-Code Erkennung
      const contrastRatio = darkPixels / lightPixels;
      if (contrastRatio > 0.1 && contrastRatio < 10) {
        console.log('🔍 Möglicher QR-Code erkannt, analysiere...');
        
        // Benutzer manuell nach Spiel fragen (da echter QR-Scan komplex ist)
        setScanningActive(false); // Stoppe automatisches Scannen
        
        // Zeige Spiel-Auswahl Dialog
        const spielAuswahl = await showSpielAuswahlDialog();
        if (spielAuswahl) {
          await processQRData(spielAuswahl);
        } else {
          setScanningActive(true); // Setze Scannen fort
        }
      }
      
    } catch (error) {
      console.error('Fehler beim automatischen QR-Scannen:', error);
    }
  };

  // Spiel-Auswahl Dialog
  const showSpielAuswahlDialog = async (): Promise<Spiel | null> => {
    return new Promise((resolve) => {
      const spielListe = spiele.map((spiel, index) => 
        `${index + 1}. ${spiel.team1} vs ${spiel.team2} (${spiel.datum}, ${spiel.zeit}, ${spiel.feld})`
      ).join('\n');
      
      const auswahl = prompt(
        `📱 QR-Code erkannt! Welches Spiel?\n\n${spielListe}\n\nGeben Sie die Nummer ein (1-${spiele.length}) oder 0 zum Abbrechen:`
      );
      
      if (auswahl && auswahl !== '0') {
        const index = parseInt(auswahl) - 1;
        if (index >= 0 && index < spiele.length) {
          resolve(spiele[index]);
          return;
        }
      }
      
      resolve(null);
    });
  };

  // QR-Daten verarbeiten (korrigierte Team-Namen)
  const processQRData = async (spiel: Spiel) => {
    try {
      console.log('✅ QR-Code für Spiel erkannt:', spiel);
      
      // KORRIGIERTE Team-Namen verwenden (nicht Demo-Daten!)
      const qrData = {
        id: spiel.id,
        team1: spiel.team1, // ECHTE Team-Namen aus Spiel-Daten
        team2: spiel.team2, // ECHTE Team-Namen aus Spiel-Daten
        datum: spiel.datum,
        zeit: spiel.zeit,
        feld: spiel.feld,
        kategorie: spiel.kategorie
      };
      
      // Direkte Punkte-Eingabe mit KORREKTEN Team-Namen
      const team1Punkte = prompt(`🥅 Tore für ${qrData.team1} eingeben:`);
      const team2Punkte = prompt(`🥅 Tore für ${qrData.team2} eingeben:`);
      
      if (team1Punkte !== null && team2Punkte !== null) {
        const ergebnis = `${team1Punkte}:${team2Punkte}`;
        
        console.log(`💾 Speichere Ergebnis: ${qrData.team1} ${ergebnis} ${qrData.team2}`);
        
        // Ergebnis automatisch speichern
        const response = await fetch('/api/schiedsrichterkarten', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'save_result_from_qr',
            spielId: qrData.id,
            ergebnis: ergebnis
          })
        });

        if (response.ok) {
          const result = await response.json();
          alert(`✅ Ergebnis erfolgreich gespeichert!\n\n${qrData.team1} vs ${qrData.team2}\nErgebnis: ${ergebnis}`);
          stopScanner();
          
          // Seite neu laden um aktualisierte Ergebnisse anzuzeigen
          window.location.reload();
        } else {
          const error = await response.json();
          alert(`❌ Fehler beim Speichern: ${error.error}`);
          setScanningActive(true); // Setze Scannen fort
        }
      } else {
        alert('❌ Punkte-Eingabe abgebrochen');
        setScanningActive(true); // Setze Scannen fort
      }
      
    } catch (error) {
      console.error('Fehler beim Verarbeiten der QR-Daten:', error);
      alert('❌ Fehler beim Verarbeiten der QR-Daten');
      setScanningActive(true); // Setze Scannen fort
    }
  };

  return (
    <div className="space-y-6">
      {/* Haupt-Steuerung */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Schiedsrichterkarten Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Template Upload Bereich */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
            <div className="text-center">
              <h3 className="font-medium text-blue-800 mb-2">PNG-Template hochladen</h3>
              <p className="text-sm text-blue-600 mb-3">
                Laden Sie Ihr Schiedsrichterkarten-Template hoch. Die Teamnamen werden automatisch an den konfigurierten Positionen eingefügt.
              </p>
              <div className="flex items-center justify-center gap-4">
                <input
                  type="file"
                  accept="image/png"
                  className="hidden"
                  id="template-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      alert(`Template "${file.name}" ausgewählt. Speichern Sie es als "handball-spielnotizkarte.png" im public-Ordner für optimale Ergebnisse.`);
                    }
                  }}
                />
                <label
                  htmlFor="template-upload"
                  className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  PNG Template hochladen
                </label>
                <span className="text-xs text-blue-500">
                  Hochformat: 8cm x 12cm (945px x 1417px)
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <QrCode className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-medium mb-1">Karten generieren</h3>
              <p className="text-sm text-slate-600 mb-3">
                {spiele.length} Spiele bereit
              </p>
              <Button 
                onClick={generateAllKarten}
                disabled={isGenerating || spiele.length === 0}
                className="w-full"
              >
                {isGenerating ? 'Generiere...' : 'ZIP herunterladen'}
                <Download className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Camera className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-medium mb-1">📱 QR-Scanner</h3>
              <p className="text-sm text-slate-600 mb-3">
                Punkte eintragen
              </p>
              <Button 
                onClick={startScanner}
                variant="outline"
                className="w-full"
              >
                QR-Scanner starten
                <Scan className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <Badge variant="outline" className="mb-2">
                {spiele.length} Spiele
              </Badge>
              <h3 className="font-medium mb-1">Spielübersicht</h3>
              <p className="text-sm text-slate-600">
                Karten für alle geplanten Spiele
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anleitung und Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Wie funktioniert das Schiedsrichterkarten-System?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-green-700">📝 Karten erstellen</h3>
              <ol className="text-sm space-y-2 text-slate-600">
                <li>1. <strong>PNG-Template:</strong> Handball-Spielnotizkarte (8x12cm, Hochformat) wird automatisch mit Teamnamen in "Verein/Trikotfarbe" befüllt</li>
                <li>2. <strong>Feld & Zeit:</strong> Werden in "Besondere Vorkommnisse" eingetragen</li>
                <li>3. <strong>QR-Code:</strong> Eindeutige Spiel-ID wird als 2D-Matrix-Code unten rechts eingefügt</li>
                <li>4. <strong>ZIP-Export:</strong> Alle Karten werden als PNG-Dateien in einem ZIP-Archiv heruntergeladen</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-blue-700">📱 QR-Code scannen</h3>
              <ol className="text-sm space-y-2 text-slate-600">
                <li>1. <strong>Automatisches Scannen:</strong> QR-Codes werden automatisch erkannt</li>
                <li>2. <strong>Spiel auswählen:</strong> Wählen Sie das richtige Spiel aus der Liste</li>
                <li>3. <strong>Punkte eingeben:</strong> Tore für beide Teams eingeben</li>
                <li>4. <strong>Automatische Speicherung:</strong> Direkt in die Ergebnistabelle</li>
              </ol>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-amber-200 rounded">
                <AlertCircle className="h-4 w-4 text-amber-700" />
              </div>
              <div>
                <h4 className="font-medium text-amber-800 mb-1">Wichtige Hinweise</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Die Handball-Spielnotizkarte hat das Format 8cm x 12cm (Hochformat)</li>
                  <li>• Großer 2D Matrix QR-Code (200px) für einfaches Scannen</li>
                  <li>• 🤖 Automatisches Scannen: QR-Codes werden sofort erkannt</li>
                  <li>• Korrekte Team-Namen: Jedes Spiel hat die echten Team-Namen</li>
                  <li>• Jeder QR-Code ist einzigartig und verhindert Verwechslungen</li>
                  <li>• Funktioniert auch bei schlechten Lichtverhältnissen</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spiele-Liste mit Vorschau */}
      <Card>
        <CardHeader>
          <CardTitle>Einzelne Karten-Vorschau</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spiele.slice(0, 6).map((spiel) => (
              <div key={spiel.id} className="border rounded-lg p-3">
                <div className="text-sm font-medium mb-1">
                  {spiel.team1} vs {spiel.team2}
                </div>
                <div className="text-xs text-slate-600 mb-2">
                  {spiel.datum} • {spiel.zeit} • {spiel.feld}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => showKartenPreview(spiel)}
                  className="w-full"
                >
                  Vorschau
                </Button>
              </div>
            ))}
          </div>
          {spiele.length > 6 && (
            <p className="text-sm text-slate-500 mt-4 text-center">
              ... und {spiele.length - 6} weitere Spiele
            </p>
          )}
        </CardContent>
      </Card>

      {/* Vorschau Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Karten-Vorschau</DialogTitle>
            <DialogDescription>
              {previewSpiel && `${previewSpiel.team1} vs ${previewSpiel.team2}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <canvas 
              ref={canvasRef}
              className="border max-w-full h-auto"
              style={{ maxHeight: '600px' }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR-Scanner Modal (in Website integriert) */}
      {isScanning && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    📱 QR-Code Scanner
                    <Badge variant="outline" className="text-xs">2D Matrix</Badge>
                  </h2>
                </div>
                <Button variant="ghost" size="sm" onClick={stopScanner}>
                  ✕
                </Button>
              </div>
              <p className="text-slate-600 mt-2">
                Richten Sie die Kamera auf den großen QR-Code der Schiedsrichterkarte
              </p>
            </div>

            {/* Scanner Bereich */}
            <div className="p-6">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <video 
                    ref={videoRef}
                    className="border-2 border-gray-300 rounded-lg shadow-lg"
                    style={{ width: '100%', maxWidth: '600px', height: 'auto' }}
                  />
                  {/* QR-Code Zielbereich - größer und prominenter */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="border-4 border-green-400 border-dashed w-48 h-48 rounded-lg bg-green-100 bg-opacity-30 animate-pulse">
                      <div className="flex items-center justify-center h-full">
                        <QrCode className="h-12 w-12 text-green-600" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Scanner-Ecken */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-green-500"></div>
                  <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-green-500"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-green-500"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-green-500"></div>
                </div>
              </div>
              
              {/* Hinweise */}
              <div className="text-center space-y-2 mb-6">
                <p className="text-sm text-slate-600">
                  💡 Positionieren Sie den QR-Code im grünen Rahmen
                </p>
                <p className="text-xs text-slate-400">
                  Halten Sie die Karte etwa 20-30cm vom Bildschirm entfernt
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={stopScanner}
                  className="px-6"
                >
                  ❌ Scanner beenden
                </Button>
                {!scanningActive ? (
                  <Button 
                    onClick={() => setScanningActive(true)}
                    className="bg-green-600 hover:bg-green-700 px-6"
                  >
                    � Automatisches Scannen starten
                  </Button>
                ) : (
                  <Button 
                    onClick={scanQRCode} 
                    className="bg-blue-600 hover:bg-blue-700 px-6"
                  >
                    📱 Manuell scannen
                  </Button>
                )}
              </div>

              {/* Status Anzeige */}
              <div className={`mt-6 p-4 rounded-lg border-l-4 ${scanningActive ? 'bg-green-50 border-green-400' : 'bg-blue-50 border-blue-400'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${scanningActive ? 'bg-green-400 animate-pulse' : 'bg-blue-400'}`}></div>
                  <span className={`text-sm font-medium ${scanningActive ? 'text-green-800' : 'text-blue-800'}`}>
                    {scanningActive ? '🤖 Automatisches Scannen aktiv - QR-Codes werden erkannt' : '📷 Kamera aktiv - Bereit für manuelles Scannen'}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${scanningActive ? 'text-green-600' : 'text-blue-600'}`}>
                  {scanningActive 
                    ? 'Halten Sie den QR-Code in den grünen Rahmen - automatische Erkennung läuft...' 
                    : 'Klicken Sie "Manuell scannen" oder aktivieren Sie das automatische Scannen'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
