/**
 * Authenticated API Client for Admin Operations
 * Automatically handles API key authentication and error handling
 */

// Get API key from environment, cookies, or localStorage
const getApiKey = (): string => {
  if (typeof window !== 'undefined') {
    // Zuerst aus dem localStorage lesen
    const localStorageKey = localStorage.getItem('svp-admin-key');
    if (localStorageKey) {
      return localStorageKey;
    }
    
    // Dann aus Cookies lesen
    const cookies = document.cookie.split(';').map(cookie => cookie.trim());
    const apiKeyCookie = cookies.find(cookie => cookie.startsWith('svp-admin-key='));
    if (apiKeyCookie) {
      const apiKey = apiKeyCookie.split('=')[1];
      if (apiKey) {
        return apiKey;
      }
    }
    
    // Kein API-Key gefunden
    return '';
  }
  
  return process.env.ADMIN_API_KEY || '';
};

// Get session token from localStorage
const getSessionToken = (): string | null => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('svp-session-token');
    console.log('🔍 getSessionToken aufgerufen, Token gefunden:', token ? token.substring(0, 8) + '...' : 'KEIN TOKEN');
    return token;
  }
  console.log('🔍 getSessionToken aufgerufen, aber window ist undefined');
  return null;
};

// Store API key securely in both cookie and localStorage
export const setApiKey = (key: string): void => {
  if (typeof window !== 'undefined') {
    // Speichere im localStorage
    localStorage.setItem('svp-admin-key', key);
    
    // Speichere im Cookie (1 Tag Gültigkeit, nur über HTTPS im Produktionsmodus)
    const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 1);
    
    document.cookie = `svp-admin-key=${key};expires=${expireDate.toUTCString()};path=/;${secure}SameSite=Lax`;
    console.log('🔑 API Key in Cookie und localStorage gespeichert');
  }
};

// Store session token securely
export const setSessionToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('svp-session-token', token);
  }
};

// Remove API key from localStorage and cookies (logout)
export const clearApiKey = (): void => {
  if (typeof window !== 'undefined') {
    // Entferne aus localStorage
    localStorage.removeItem('svp-admin-key');
    
    // Entferne aus Cookie durch Setzen eines abgelaufenen Datums
    document.cookie = 'svp-admin-key=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;';
    console.log('🔒 API Key aus Cookie und localStorage entfernt');
  }
};

// Remove session token (logout)
export const clearSessionToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('svp-session-token');
  }
};

// Clear all authentication data
export const clearAllAuth = (): void => {
  if (typeof window !== 'undefined') {
    // Remove all possible authentication keys from localStorage
    localStorage.removeItem('svp-admin-key');
    localStorage.removeItem('svp-session-token');
    
    // Remove from sessionStorage
    sessionStorage.removeItem('svp-admin-key');
    sessionStorage.removeItem('svp-session-token');
    
    // Remove from cookies
    document.cookie = 'svp-admin-key=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;';
    document.cookie = 'svp-session-token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;';
    
    console.log('🔓 Alle Authentifizierungsdaten wurden gelöscht (localStorage, sessionStorage, Cookies)');
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Prüfe API-Key im localStorage
  const apiKeyLocalStorage = localStorage.getItem('svp-admin-key');
  
  // Prüfe API-Key im Cookie
  const cookies = document.cookie.split(';').map(cookie => cookie.trim());
  const apiKeyCookie = cookies.find(cookie => cookie.startsWith('svp-admin-key='));
  const apiKey = apiKeyLocalStorage || (apiKeyCookie ? apiKeyCookie.split('=')[1] : null);
  
  // Prüfe Session Token
  const sessionToken = localStorage.getItem('svp-session-token');
  const sessionExpires = localStorage.getItem('svp-session-token-expires');
  
  // Check API key first
  if (apiKey) {
    return true;
  }
  
  // Check session token and expiration
  if (sessionToken && sessionExpires) {
    const expiresAt = parseInt(sessionExpires);
    if (Date.now() < expiresAt) {
      return true;
    } else {
      // Token expired, clean up
      localStorage.removeItem('svp-session-token');
      localStorage.removeItem('svp-session-token-expires');
      return false;
    }
  }
  
  return false;
};

/**
 * Make authenticated API request
 */
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  console.log('🔍 authenticatedFetch aufgerufen für URL:', url);
  
  const apiKey = getApiKey();
  const sessionToken = getSessionToken();
  
  console.log('🔑 API Key:', apiKey ? 'VORHANDEN' : 'NICHT VORHANDEN');
  console.log('🎫 Session Token:', sessionToken ? sessionToken.substring(0, 8) + '...' : 'NICHT VORHANDEN');
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  // Authentifizierungsheader hinzufügen
  if (sessionToken) {
    defaultHeaders['X-Session-Token'] = sessionToken;
    console.log('✅ Session-Token zu Headers hinzugefügt');
  } else if (apiKey) {
    defaultHeaders['X-API-Key'] = apiKey;
    console.log('✅ API-Key zu Headers hinzugefügt');
  } else {
    console.log('⚠️ Keine Authentifizierungsdaten verfügbar');
  }

  // Debug-Ausgabe
  console.log('📋 Finale Headers:', Object.keys(defaultHeaders));

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Handle authentication errors
    if (response.status === 401) {
      console.error('🚫 Authentifizierung fehlgeschlagen');
      // Clear all authentication data
      clearAllAuth();
      // Redirect to login or show error
      if (typeof window !== 'undefined') {
        alert('Sitzung abgelaufen. Bitte erneut anmelden.');
        window.location.href = '/admin/login';
      }
      throw new Error('Authentifizierung fehlgeschlagen');
    }
    
    // Handle rate limiting
    if (response.status === 429) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const message = `Zu viele Anfragen. Versuchen Sie es ${resetTime ? `in ${Math.ceil((parseInt(resetTime) * 1000 - Date.now()) / 1000)} Sekunden` : 'später'} erneut.`;
      throw new Error(message);
    }
    
    // Handle other errors
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
    
  } catch (error) {
    console.error('API Fehler:', error);
    throw error;
  }
}

/**
 * Admin API Client
 */
export const adminApi = {
  // Get admin data
  async getAdminData() {
    const response = await authenticatedFetch('/api/admin');
    return response.json();
  },

  // Update registration status
  async updateAnmeldungStatus(anmeldungId: string, status: string) {
    const response = await authenticatedFetch('/api/admin', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update_status',
        anmeldungId,
        status
      })
    });
    return response.json();
  },

  // Save tournament settings
  async saveSettings(settings: any) {
    const response = await authenticatedFetch('/api/admin', {
      method: 'POST',
      body: JSON.stringify({
        action: 'save_settings',
        settings
      })
    });
    return response.json();
  },

  // Delete registration
  async deleteAnmeldung(anmeldungId: string) {
    const response = await authenticatedFetch('/api/admin', {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete_anmeldung',
        anmeldungId
      })
    });
    return response.json();
  },
};

/**
 * Helfer API Client
 */
export const helferApi = {
  // Get helper data
  async getHelferData() {
    const response = await authenticatedFetch('/api/helfer');
    return response.json();
  },

  // Save helper requirement
  async saveHelferBedarf(bedarf: any) {
    const response = await authenticatedFetch('/api/helfer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'save_bedarf',
        bedarf
      })
    });
    return response.json();
  },

  // Delete helper requirement
  async deleteHelferBedarf(bedarfId: string) {
    const response = await authenticatedFetch('/api/helfer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete_bedarf',
        id: bedarfId
      })
    });
    return response.json();
  },

  // Generate helper link
  async generateHelferLink() {
    const response = await authenticatedFetch('/api/helfer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generate_link'
      })
    });
    return response.json();
  },

  // Update helper status
  async updateHelferStatus(anmeldungId: string, status: string) {
    const response = await authenticatedFetch('/api/helfer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update_status',
        anmeldungId,
        status
      })
    });
    return response.json();
  },

  // Update helper requirement
  async updateHelferBedarf(bedarfId: string, bedarf: any) {
    const response = await authenticatedFetch('/api/helfer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update_bedarf',
        id: bedarfId,
        data: bedarf
      })
    });
    return response.json();
  }
};

/**
 * Spielplan API Client
 */
export const spielplanApi = {
  // Get schedule (public, no auth required)
  async getSpielplan(datum?: string) {
    console.log('📊 spielplanApi.getSpielplan aufgerufen', datum ? `für Datum ${datum}` : 'ohne Datumsfilter');
    
    const url = datum ? `/api/spielplan?datum=${datum}` : '/api/spielplan';
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('❌ Fehler beim Laden des Spielplans:', response.status, response.statusText);
      throw new Error('Fehler beim Laden des Spielplans');
    }
    
    const data = await response.json();
    console.log(`✅ Spielplan geladen: ${data.spiele?.length || 0} Spiele`);
    return data;
  },

  // Generate schedule (admin only)
  async generateSpielplan(settings: any, feldEinstellungen: any) {
    console.log('🎯 spielplanApi.generateSpielplan aufgerufen mit:');
    console.log('⚙️ Settings:', settings);
    console.log('🏟️ Felder:', feldEinstellungen.map((f: any) => f.name).join(', '));
    
    try {
      const response = await authenticatedFetch('/api/spielplan', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generate',
          settings,
          feldEinstellungen
        })
      });
      
      const data = await response.json();
      console.log(`✅ Spielplan generiert: ${data.spiele?.length || 0} Spiele`);
      return data;
    } catch (error) {
      console.error('❌ Fehler bei der Spielplan-Generierung:', error);
      throw error;
    }
  },

  // Create game (admin only)
  async createSpiel(spiel: any) {
    const response = await authenticatedFetch('/api/spielplan', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        spiel
      })
    });
    return response.json();
  },

  // Update game (admin only)
  async updateSpiel(spielId: string, spiel: any) {
    const response = await authenticatedFetch('/api/spielplan', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update',
        spielId,
        spiel
      })
    });
    return response.json();
  },

  // Update game result (admin only)
  async updateSpielErgebnis(spielId: string, ergebnis: string, status: string) {
    const response = await authenticatedFetch('/api/spielplan', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update',
        spielId,
        ergebnis,
        status
      })
    });
    return response.json();
  },

  // Delete game (admin only)
  async deleteSpiel(spielId: string) {
    const response = await authenticatedFetch('/api/spielplan', {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete',
        spielId
      })
    });
    return response.json();
  },

  // Delete all games
  async deleteAllSpiele() {
    console.log('🗑️ Lösche alle Spiele...');
    
    try {
      const response = await authenticatedFetch('/api/spielplan', {
        method: 'POST',
        body: JSON.stringify({
          action: 'deleteAll'
        })
      });
      
      const data = await response.json();
      console.log(`✅ Alle Spiele gelöscht: ${data.result?.deleted || 0} Einträge entfernt`);
      return data;
    } catch (error) {
      console.error('❌ Fehler beim Löschen der Spiele:', error);
      throw error;
    }
  },
};

/**
 * Authentication utilities
 */
export const authUtils = {
  // Test API key
  async testApiKey(key: string): Promise<boolean> {
    try {
      const tempKey = getApiKey();
      setApiKey(key);
      
      const response = await authenticatedFetch('/api/admin');
      const result = response.ok;
      
      if (!result) {
        setApiKey(tempKey); // Restore previous key if test failed
      }
      
      return result;
    } catch (error) {
      console.error('API Key Test fehlgeschlagen:', error);
      return false;
    }
  },

  // Login with API key
  async loginWithApiKey(apiKey: string): Promise<boolean> {
    const isValid = await this.testApiKey(apiKey);
    if (isValid) {
      setApiKey(apiKey);
      return true;
    }
    return false;
  },

  // Login with session token
  loginWithToken(token: string): boolean {
    if (token && token.trim()) {
      setSessionToken(token);
      return true;
    }
    return false;
  },

  // Set token (for compatibility)
  setToken(token: string): void {
    setSessionToken(token);
  },

  // Login function (backwards compatibility)
  async login(apiKey: string): Promise<boolean> {
    return this.loginWithApiKey(apiKey);
  },

  // Logout
  async logout() {
    console.log('🔓 Logout-Prozess gestartet...');
    
    const sessionToken = getSessionToken();
    
    // If we have a session token, notify the server
    if (sessionToken) {
      try {
        console.log('🔓 Server über Logout benachrichtigen...');
        await fetch('/api/auth/passkey', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'logout',
            token: sessionToken
          }),
        });
        console.log('✅ Server wurde über Logout benachrichtigt');
      } catch (error) {
        console.warn('⚠️ Fehler beim Benachrichtigen des Servers:', error);
      }
    }

    // Clear all authentication data
    clearAllAuth();
    
    console.log('🔓 Alle lokalen Daten gelöscht');
    
    if (typeof window !== 'undefined') {
      // Force reload to clear any cached state
      console.log('🔄 Weiterleitung zur Login-Seite...');
      window.location.replace('/admin/login');
    }
  }
};

/**
 * Error handling utility
 */
export const handleApiError = (error: Error): string => {
  console.error('API Fehler:', error);
  
  if (error.message.includes('Authentifizierung')) {
    return 'Sitzung abgelaufen. Bitte melden Sie sich erneut an.';
  }
  
  if (error.message.includes('Zu viele Anfragen')) {
    return error.message;
  }
  
  if (error.message.includes('Netzwerk')) {
    return 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
  }
  
  return error.message || 'Ein unbekannter Fehler ist aufgetreten.';
};
