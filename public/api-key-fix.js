// API Key Debug-Hilfsfunktionen

// Den API-Schlüssel zurücksetzen und neu einstellen
function resetApiKey() {
  console.log('API-Schlüssel wird zurückgesetzt...');
  
  // Standard-API-Schlüssel
  const apiKey = 'svp-admin-2025-secure-key';
  
  // In localStorage speichern
  localStorage.setItem('svp-admin-key', apiKey);
  
  // In Cookie speichern
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + 7); // 7 Tage gültig
  document.cookie = `svp-admin-key=${apiKey};expires=${expireDate.toUTCString()};path=/;SameSite=Lax`;
  
  console.log('API-Schlüssel wurde zurückgesetzt und neu gesetzt!');
  
  return apiKey;
}

// Einen API-Test durchführen
async function testApiKey() {
  const apiKey = localStorage.getItem('svp-admin-key') || 'svp-admin-2025-secure-key';
  console.log(`API-Test wird durchgeführt mit Schlüssel: ${apiKey}`);
  
  try {
    // Direkter Aufruf mit Standard API-Schlüssel
    const response = await fetch('/api/helfer', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'svp-admin-2025-secure-key'
      }
    });
    
    const responseBody = await response.json();
    
    console.log(`API-Antwort: Status ${response.status}`);
    console.log('Antwortdaten:', responseBody);
    
    if (response.status === 200) {
      console.log('✅ API-Test erfolgreich!');
    } else {
      console.log('❌ API-Test fehlgeschlagen!');
    }
    
    return { status: response.status, data: responseBody };
  } catch (error) {
    console.error('API-Test Fehler:', error);
    return { error: error.message };
  }
}

// Detaillierte API-Schlüssel-Diagnose
async function diagnoseApiKey() {
  console.log('API-Schlüssel-Diagnose wird durchgeführt...');
  
  // 1. Aktuelle Werte prüfen
  const localStorage_key = localStorage.getItem('svp-admin-key');
  const cookies = document.cookie.split(';').map(cookie => cookie.trim());
  const apiKeyCookie = cookies.find(cookie => cookie.startsWith('svp-admin-key='));
  const cookie_key = apiKeyCookie ? apiKeyCookie.split('=')[1] : null;
  
  console.log('Aktueller Status:');
  console.log(`- localStorage: ${localStorage_key ? `"${localStorage_key}"` : 'nicht gesetzt'}`);
  console.log(`- Cookie: ${cookie_key ? `"${cookie_key}"` : 'nicht gesetzt'}`);
  
  // 2. Debug-Endpunkt aufrufen
  try {
    const response = await fetch('/api/debug/key-check', {
      headers: { 'X-API-Key': localStorage_key || 'svp-admin-2025-secure-key' }
    });
    const data = await response.json();
    
    console.log('Server-Debug-Informationen:');
    console.log(data);
    
    // 3. Test mit explizitem Wert
    const testResponse = await fetch('/api/debug/key-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testKey: 'svp-admin-2025-secure-key' })
    });
    const testData = await testResponse.json();
    
    console.log('Expliziter Vergleichstest:');
    console.log(testData);
    
    return { localStorage_key, cookie_key, debug: data, test: testData };
  } catch (error) {
    console.error('Diagnose-Fehler:', error);
    return { error: error.message };
  }
}

// ALLES IN EINEM: Fix und Test
async function fixAndTest() {
  // 1. API-Schlüssel zurücksetzen
  resetApiKey();
  
  // 2. API-Test durchführen
  const testResult = await testApiKey();
  
  // 3. Bei Bedarf Diagnose durchführen
  if (testResult.status !== 200) {
    console.log('Test fehlgeschlagen - detaillierte Diagnose wird durchgeführt...');
    await diagnoseApiKey();
  }
  
  return testResult;
}

// Instruktionen anzeigen
console.log(`
=====================================================
SVP-App API-Schlüssel Fehlerbehebung
=====================================================

Verfügbare Funktionen:

1. resetApiKey() 
   - Setzt den API-Schlüssel auf den Standard zurück
   
2. testApiKey() 
   - Testet den API-Zugriff
   
3. diagnoseApiKey() 
   - Zeigt detaillierte Diagnoseinformationen
   
4. fixAndTest() 
   - Führt alle Schritte auf einmal durch (empfohlen)

Empfehlung: fixAndTest() ausführen und Ergebnisse prüfen.
`);
