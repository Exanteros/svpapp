# 🎨 Splash Screens - SVG zu PNG Konvertierung

## Erstellte Splash Screens mit SV Puschendorf Design

Alle Splash Screens verwenden jetzt das gelb/orange Kreis-Design von der Hauptseite:
- **Hauptfarbe**: Orange (#f97316) 
- **Akzentfarbe**: Weißer Kreis mit 30% Transparenz
- **Hintergrund**: Gradient von Orange-50 (#fff7ed) zu Weiß
- **Typografie**: System-UI Schriftart
- **Dekorative Elemente**: Kleine orange Kreise mit verschiedenen Transparenzen

## 📱 Erstellte Dateien (SVG):

### iPhone Splash Screens
- `iphone-mini-portrait.svg` (375x812) - iPhone 12 mini
- `iphone-12-portrait.svg` (390x844) - iPhone 12/13/14 
- `iphone-12-landscape.svg` (844x390) - iPhone 12/13/14 Landscape
- `iphone-pro-portrait.svg` (414x896) - iPhone 12/13/14 Pro

### iPad Splash Screens  
- `ipad-portrait.svg` (820x1180) - iPad Portrait
- `ipad-landscape.svg` (1180x820) - iPad Landscape

## 🔄 SVG zu PNG Konvertierung

### Option 1: Online-Tools
Nutze Online-Konverter wie:
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/
- https://www.freeconvert.com/svg-to-png

### Option 2: Command Line (ImageMagick)
```bash
# Installiere ImageMagick
brew install imagemagick  # macOS
# oder
sudo apt-get install imagemagick  # Ubuntu

# Konvertiere alle SVG-Dateien
cd public/splash/
for file in *.svg; do
  convert "$file" "${file%.svg}.png"
done
```

### Option 3: Node.js Script
```bash
npm install sharp
```

Dann erstelle `convert-splash.js`:
```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const splashDir = './public/splash/';
const svgFiles = fs.readdirSync(splashDir).filter(file => file.endsWith('.svg'));

svgFiles.forEach(async (svgFile) => {
  const svgPath = path.join(splashDir, svgFile);
  const pngPath = path.join(splashDir, svgFile.replace('.svg', '.png'));
  
  try {
    await sharp(svgPath)
      .png()
      .toFile(pngPath);
    console.log(`✅ Converted ${svgFile} to ${svgFile.replace('.svg', '.png')}`);
  } catch (error) {
    console.error(`❌ Error converting ${svgFile}:`, error);
  }
});
```

Ausführen:
```bash
node convert-splash.js
```

## 📱 iOS Meta Tags (bereits implementiert)

Die folgenden Meta Tags sind bereits im Layout hinzugefügt:

```html
<!-- iPhone 12 mini -->
<link rel="apple-touch-startup-image" 
  media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  href="/splash/iphone-mini-portrait.svg" />

<!-- iPhone 12/13/14 -->  
<link rel="apple-touch-startup-image"
  media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  href="/splash/iphone-12-portrait.svg" />

<!-- iPhone 12/13/14 Landscape -->
<link rel="apple-touch-startup-image"
  media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" 
  href="/splash/iphone-12-landscape.svg" />

<!-- iPad Portrait -->
<link rel="apple-touch-startup-image"
  media="screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
  href="/splash/ipad-portrait.svg" />

<!-- iPad Landscape -->
<link rel="apple-touch-startup-image"
  media="screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
  href="/splash/ipad-landscape.svg" />
```

## 🎨 Design-Details

### Farben
- **Hauptkreis**: `#f97316` (Orange-500)
- **Innerer Kreis**: `#ffffff` mit 30% Opacity
- **Hintergrund-Gradient**: `#fff7ed` → `#ffffff`
- **Text**: `#1f2937` (Gray-800) für Haupttext, `#6b7280` (Gray-500) für Untertitel
- **Footer**: `#9ca3af` (Gray-400)

### Dekorative Elemente
- Kleine Kreise in verschiedenen Größen (4-12px)
- Orange (#f97316) mit Transparenzen: 20%, 25%, 30%, 40%
- Strategisch um den Hauptkreis positioniert

### Typografie
- **Haupttext**: System-UI, fett, 28-42px je nach Gerät
- **Untertitel**: System-UI, normal, 16-24px je nach Gerät  
- **Footer**: System-UI, normal, 11-16px je nach Gerät

## ✅ Nächste Schritte

1. **PNG konvertieren**: Verwende eine der oben genannten Methoden
2. **Layout aktualisieren**: Ändere `.svg` zu `.png` in den Meta Tags wenn gewünscht
3. **Testen**: Teste die Splash Screens auf verschiedenen iOS-Geräten
4. **Optimieren**: Komprimiere PNG-Dateien für bessere Performance

Die SVG-Versionen funktionieren bereits perfekt und sind oft kleiner als PNG-Dateien!
