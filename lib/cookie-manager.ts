// Cookie-Utility für die Verwaltung von Cookies
export interface CookieConsent {
  essential: boolean;
  functional: boolean;
  timestamp: string;
  version: string;
}

const COOKIE_CONSENT_KEY = 'svp_cookie_consent';
const CURRENT_VERSION = '1.0';

export class CookieManager {
  // Cookie-Einwilligung abrufen
  static getConsent(): CookieConsent | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!stored) return null;
      
      const consent = JSON.parse(stored) as CookieConsent;
      
      // Prüfen ob Version aktuell ist
      if (!consent.version || consent.version !== CURRENT_VERSION) {
        this.clearConsent();
        return null;
      }
      
      return consent;
    } catch (error) {
      console.error('Fehler beim Lesen der Cookie-Einwilligung:', error);
      return null;
    }
  }

  // Cookie-Einwilligung speichern
  static setConsent(essential: boolean, functional: boolean): void {
    if (typeof window === 'undefined') return;
    
    const consent: CookieConsent = {
      essential,
      functional,
      timestamp: new Date().toISOString(),
      version: CURRENT_VERSION
    };
    
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
      
      // Cookies entsprechend der Einwilligung setzen/löschen
      this.applyCookieSettings(consent);
      
      // Event für andere Komponenten
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: consent }));
    } catch (error) {
      console.error('Fehler beim Speichern der Cookie-Einwilligung:', error);
    }
  }

  // Cookie-Einwilligung löschen
  static clearConsent(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    this.clearFunctionalCookies();
  }

  // Prüfen ob Einwilligung vorliegt
  static hasConsent(): boolean {
    return this.getConsent() !== null;
  }

  // Prüfen ob bestimmte Cookie-Kategorie erlaubt ist
  static isAllowed(category: 'essential' | 'functional'): boolean {
    const consent = this.getConsent();
    if (!consent) return category === 'essential'; // Essential Cookies sind immer erlaubt
    
    return consent[category];
  }

  // Cookie-Einstellungen anwenden
  private static applyCookieSettings(consent: CookieConsent): void {
    // Notwendige Cookies sind immer erlaubt, nichts zu tun
    
    // Funktionale Cookies verwalten
    if (!consent.functional) {
      this.clearFunctionalCookies();
    } else {
      this.enableFunctionalCookies();
    }
  }

  // Funktionale Cookies löschen
  private static clearFunctionalCookies(): void {
    if (typeof document === 'undefined') return;
    
    // Liste der funktionalen Cookies die gelöscht werden sollen
    const functionalCookies = [
      'svp_form_data',
      'svp_language_preference',
      'svp_theme_preference',
      'svp_user_preferences'
    ];
    
    functionalCookies.forEach(cookieName => {
      // Cookie löschen durch Setzen auf expired
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
    });
    
    // Auch aus localStorage entfernen
    const functionalStorageKeys = [
      'svp_form_backup',
      'svp_ui_preferences',
      'svp_user_settings'
    ];
    
    functionalStorageKeys.forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Funktionale Cookies aktivieren
  private static enableFunctionalCookies(): void {
    // Hier könnten funktionale Cookies gesetzt werden
    // Momentan passiert das erst bei Bedarf in den jeweiligen Komponenten
    console.log('Funktionale Cookies aktiviert');
  }

  // Cookie setzen (mit Einwilligungsprüfung)
  static setCookie(name: string, value: string, days: number = 30, category: 'essential' | 'functional' = 'functional'): boolean {
    if (typeof document === 'undefined') return false;
    
    // Prüfen ob Cookie-Kategorie erlaubt ist
    if (!this.isAllowed(category)) {
      console.warn(`Cookie ${name} nicht gesetzt: Kategorie ${category} nicht erlaubt`);
      return false;
    }
    
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
    return true;
  }

  // Cookie lesen
  static getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    
    return null;
  }

  // Cookie löschen
  static deleteCookie(name: string): void {
    if (typeof document === 'undefined') return;
    
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
  }

  // Lokalen Storage mit Einwilligungsprüfung verwenden
  static setLocalStorage(key: string, value: string, category: 'essential' | 'functional' = 'functional'): boolean {
    if (typeof window === 'undefined') return false;
    
    if (!this.isAllowed(category)) {
      console.warn(`LocalStorage ${key} nicht gesetzt: Kategorie ${category} nicht erlaubt`);
      return false;
    }
    
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Fehler beim Setzen von LocalStorage:', error);
      return false;
    }
  }

  // Session Storage mit Einwilligungsprüfung verwenden
  static setSessionStorage(key: string, value: string, category: 'essential' | 'functional' = 'functional'): boolean {
    if (typeof window === 'undefined') return false;
    
    if (!this.isAllowed(category)) {
      console.warn(`SessionStorage ${key} nicht gesetzt: Kategorie ${category} nicht erlaubt`);
      return false;
    }
    
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Fehler beim Setzen von SessionStorage:', error);
      return false;
    }
  }
}
