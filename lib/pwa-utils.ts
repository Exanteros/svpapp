// PWA Utilities
export class PWAUtils {
  static isInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check if running in standalone mode
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    
    // Check for iOS standalone mode
    if ('standalone' in window.navigator && (window.navigator as any).standalone) {
      return true;
    }
    
    return false;
  }

  static isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  }

  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return null;
    }
  }

  static async unregisterServiceWorker(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        console.log('✅ Service Worker unregistered');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Service Worker unregistration failed:', error);
      return false;
    }
  }

  static async clearCache(): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window)) {
      return;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('✅ All caches cleared');
    } catch (error) {
      console.error('❌ Cache clearing failed:', error);
    }
  }

  static async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  static async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          ...options
        });
      } else {
        new Notification(title, {
          icon: '/icons/icon-192x192.png',
          ...options
        });
      }
    }
  }

  static getInstallPrompt(): any {
    return (window as any).deferredPrompt;
  }

  static setInstallPrompt(prompt: any): void {
    (window as any).deferredPrompt = prompt;
  }

  static async shareContent(data: ShareData): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.share) {
      return false;
    }

    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.error('❌ Sharing failed:', error);
      return false;
    }
  }

  static async addToHomeScreen(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    const deferredPrompt = (window as any).deferredPrompt;
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA installation accepted');
        return true;
      } else {
        console.log('PWA installation dismissed');
        return false;
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
      return false;
    }
  }

  static async updateServiceWorker(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const updatePromises = registrations.map(registration => registration.update());
      await Promise.all(updatePromises);
      
      console.log('✅ Service worker updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating service worker:', error);
      return false;
    }
  }

  static async forceReload(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      // Clear all caches
      await this.clearCache();
      
      // Update service worker
      await this.updateServiceWorker();
      
      // Hard reload the page
      window.location.reload();
    } catch (error) {
      console.error('❌ Error during force reload:', error);
      // Fallback: simple reload
      window.location.reload();
    }
  }

  static detectPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
    if (typeof window === 'undefined') return 'unknown';

    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/android/.test(userAgent)) {
      return 'android';
    } else if (/windows|mac|linux/.test(userAgent)) {
      return 'desktop';
    }
    
    return 'unknown';
  }

  static getInstallInstructions(): string {
    const platform = this.detectPlatform();
    
    switch (platform) {
      case 'ios':
        return 'Tippe auf das Teilen-Symbol in Safari und wähle "Zum Home-Bildschirm hinzufügen"';
      case 'android':
        return 'Tippe auf das Menü-Symbol in Chrome und wähle "Zum Startbildschirm hinzufügen"';
      case 'desktop':
        return 'Klicke auf das Install-Symbol in der Adressleiste oder verwende das Browser-Menü';
      default:
        return 'Nutze die Browser-Optionen um diese App zu installieren';
    }
  }
}

// Network status hook
export function useNetworkStatus() {
  if (typeof window === 'undefined') {
    return { isOnline: true, isOffline: false };
  }

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline
  };
}

// React Hook imports (add these at the top if using in React components)
import { useState, useEffect } from 'react';
