// API-Authentifizierung zurücksetzen und neu einrichten
// Dieses Skript kann in der Browserkonsole ausgeführt werden, um Authentifizierungsprobleme zu beheben

function resetApiAuth() {
  console.log('🔄 Authentifizierung wird zurückgesetzt...');
  
  // Alle Auth-Daten entfernen
  localStorage.removeItem('svp-admin-key');
  localStorage.removeItem('svp-session-token');
  sessionStorage.removeItem('svp-admin-key');
  sessionStorage.removeItem('svp-session-token');
  
  // Cookies löschen
  document.cookie = 'svp-admin-key=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;';
  document.cookie = 'svp-session-token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;';
  
  console.log('✅ Alle Auth-Daten gelöscht');
  
  // API-Key neu setzen
  const apiKey = 'svp-admin-2025-secure-key'; // Der Standard-API-Key aus der .env.local Datei
  
  // In localStorage speichern
  localStorage.setItem('svp-admin-key', apiKey);
  
  // In Cookie speichern (1 Tag gültig)
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + 1);
  document.cookie = `svp-admin-key=${apiKey};expires=${expireDate.toUTCString()};path=/;SameSite=Lax`;
  
  console.log('🔑 API-Key neu gesetzt in localStorage und Cookie');
  console.log('🔄 Seite wird in 2 Sekunden neu geladen...');
  
  // Seite neu laden, um die Änderungen zu übernehmen
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}

// API-Key Status prüfen
function checkApiKeyStatus() {
  console.log('🔍 Prüfe API-Key Status...');
  
  // LocalStorage prüfen
  const localStorageKey = localStorage.getItem('svp-admin-key');
  console.log(`📦 LocalStorage API-Key: ${localStorageKey ? '✅ Vorhanden' : '❌ Fehlt'}`);
  if (localStorageKey) {
    console.log(`   Wert: ${localStorageKey.substring(0, 8)}...`);
  }
  
  // Cookie prüfen
  const cookies = document.cookie.split(';').map(cookie => cookie.trim());
  const apiKeyCookie = cookies.find(cookie => cookie.startsWith('svp-admin-key='));
  console.log(`🍪 Cookie API-Key: ${apiKeyCookie ? '✅ Vorhanden' : '❌ Fehlt'}`);
  if (apiKeyCookie) {
    const apiKey = apiKeyCookie.split('=')[1];
    console.log(`   Wert: ${apiKey.substring(0, 8)}...`);
  }
  
  // Session Token prüfen
  const sessionToken = localStorage.getItem('svp-session-token');
  console.log(`🎫 Session Token: ${sessionToken ? '✅ Vorhanden' : '❌ Fehlt'}`);
}

// Führe diese Funktionen direkt aus
console.log('=== SVP-App API-Authentifizierungs-Diagnose ===');
checkApiKeyStatus();
console.log('\nUm die Authentifizierung zurückzusetzen und neu einzurichten, führen Sie folgende Funktion aus:');
console.log('resetApiAuth()');
