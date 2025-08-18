import { useState, useEffect } from 'react';
import { CookieManager, CookieConsent } from '@/lib/cookie-manager';

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // Initial consent laden
    const currentConsent = CookieManager.getConsent();
    setConsent(currentConsent);
    setHasConsent(currentConsent !== null);

    // Event-Listener für Consent-Änderungen
    const handleConsentChange = (event: CustomEvent) => {
      const newConsent = event.detail as CookieConsent;
      setConsent(newConsent);
      setHasConsent(true);
    };

    window.addEventListener('cookieConsentChanged', handleConsentChange as EventListener);

    return () => {
      window.removeEventListener('cookieConsentChanged', handleConsentChange as EventListener);
    };
  }, []);

  const updateConsent = (essential: boolean, functional: boolean) => {
    CookieManager.setConsent(essential, functional);
  };

  const clearConsent = () => {
    CookieManager.clearConsent();
    setConsent(null);
    setHasConsent(false);
  };

  const isAllowed = (category: 'essential' | 'functional'): boolean => {
    return CookieManager.isAllowed(category);
  };

  const setCookie = (name: string, value: string, days?: number, category?: 'essential' | 'functional'): boolean => {
    return CookieManager.setCookie(name, value, days, category);
  };

  const getCookie = (name: string): string | null => {
    return CookieManager.getCookie(name);
  };

  const setStorage = (key: string, value: string, category?: 'essential' | 'functional'): boolean => {
    return CookieManager.setLocalStorage(key, value, category);
  };

  return {
    consent,
    hasConsent,
    isAllowed,
    updateConsent,
    clearConsent,
    setCookie,
    getCookie,
    setStorage,
    // Convenience getters
    essentialAllowed: isAllowed('essential'),
    functionalAllowed: isAllowed('functional'),
  };
}
