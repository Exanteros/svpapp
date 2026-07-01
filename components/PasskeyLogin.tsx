"use client";

import { useState, useEffect } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Fingerprint, 
  Shield, 
  RefreshCw, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface PasskeyLoginProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  className?: string;
}

export default function PasskeyLogin({ onSuccess, onError, className = "" }: PasskeyLoginProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasPasskeys, setHasPasskeys] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkPasskeySupport();
    checkForPasskeys();
  }, []);

  const checkPasskeySupport = async () => {
    try {
      console.log('🔍 Starting passkey support check for login...');
      
      // Detect browser and WebAuthn support
      const userAgent = navigator.userAgent.toLowerCase();
      const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
      const isChrome = userAgent.includes('chrome');
      const isFirefox = userAgent.includes('firefox');
      const isEdge = userAgent.includes('edge');

      console.log('🌐 Browser detection:', { 
        userAgent: navigator.userAgent,
        isSafari, 
        isChrome, 
        isFirefox, 
        isEdge 
      });

      // Check basic requirements first
      const isSecureContext = window.isSecureContext;
      const hasWindow = typeof window !== 'undefined';
      
      console.log('🔒 Security context:', { isSecureContext, hasWindow, protocol: window.location.protocol });

      // Enhanced WebAuthn detection
      const hasPublicKeyCredential = hasWindow && !!window.PublicKeyCredential;
      const hasCredentialsAPI = !!navigator.credentials;
      const hasCreateFunction = hasCredentialsAPI && typeof navigator.credentials.create === 'function';
      const hasGetFunction = hasCredentialsAPI && typeof navigator.credentials.get === 'function';

      console.log('🔑 WebAuthn API check:', {
        hasPublicKeyCredential,
        hasCredentialsAPI,
        hasCreateFunction,
        hasGetFunction
      });

      // Basic WebAuthn support requires all of these
      const hasBasicWebAuthn = hasPublicKeyCredential && hasCredentialsAPI && hasCreateFunction && hasGetFunction;
      
      // Additional security context requirement
      const supported = hasBasicWebAuthn && isSecureContext;
      
      console.log('✅ Final support determination:', { 
        hasBasicWebAuthn, 
        isSecureContext, 
        supported 
      });

      setIsSupported(supported);

      if (supported && hasPublicKeyCredential) {
        try {
          console.log('📱 Checking platform authenticator availability...');
          
          // Test platform authenticator availability with timeout
          const platformCheckPromise = PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          const timeoutPromise = new Promise<boolean>(resolve => 
            setTimeout(() => {
              console.log('⏰ Platform authenticator check timed out, assuming available for modern browsers');
              resolve(true);
            }, 3000)
          );
          
          const platformAvailable = await Promise.race([
            platformCheckPromise,
            timeoutPromise
          ]);
          
          console.log('📱 Platform Authenticator result:', platformAvailable);
          setIsPlatformAvailable(platformAvailable);
          
        } catch (error) {
          console.warn('⚠️ Platform authenticator check failed:', error);
          // For modern browsers, assume platform authenticator is available
          // Touch ID/Face ID are very common on Safari/Chrome
          const assumeAvailable = (isSafari || isChrome || isEdge) && isSecureContext;
          setIsPlatformAvailable(assumeAvailable);
          console.log('📱 Assuming platform authenticator available for modern browser:', assumeAvailable);
        }
      } else {
        setIsPlatformAvailable(false);
      }
    } catch (error) {
      console.error('❌ Error checking passkey support:', error);
      setIsSupported(false);
      setIsPlatformAvailable(false);
    } finally {
      setIsLoading(false);
    }
  };

  const checkForPasskeys = async () => {
    try {
      const response = await fetch('/api/auth/passkey?action=has-passkeys');
      if (response.ok) {
        const data = await response.json();
        setHasPasskeys(data.hasPasskeys);
      }
    } catch (error) {
      console.error('Error checking for passkeys:', error);
    }
  };

  const authenticateWithPasskey = async () => {
    if (!isSupported || !isPlatformAvailable) {
      onError('Touch ID/Face ID ist auf diesem Gerät nicht verfügbar');
      return;
    }

    try {
      setIsAuthenticating(true);

      // 1. Get authentication options
      const optionsResponse = await fetch('/api/auth/passkey?action=authentication-options');
      if (!optionsResponse.ok) {
        throw new Error('Fehler beim Abrufen der Authentifizierungsoptionen');
      }

      const options = await optionsResponse.json();

      // 2. Get credential from authenticator
      const credential = await startAuthentication({ optionsJSON: options });

      // 3. Send credential to server for verification
      const authResponse = await fetch('/api/auth/passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authenticate',
          credential,
          challenge: options.challenge
        })
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(errorData.error || 'Authentifizierung fehlgeschlagen');
      }

      const result = await authResponse.json();
      
      if (result.success) {
        onSuccess();
      } else {
        throw new Error(result.error || 'Authentifizierung fehlgeschlagen');
      }

    } catch (error: any) {
      console.error('Passkey authentication error:', error);
      
      let errorMessage = 'Fehler bei der Passkey-Authentifizierung';
      
      if (error.name === 'NotSupportedError') {
        errorMessage = 'Touch ID/Face ID wird auf diesem Gerät nicht unterstützt';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Sicherheitsfehler: Bitte verwenden Sie HTTPS';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Authentifizierung wurde abgebrochen';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Zugriff auf Touch ID/Face ID wurde verweigert';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      onError(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
        <p className="text-slate-600 text-sm">Passkey-Status wird überprüft...</p>
      </div>
    );
  }

  if (!isSupported || !isPlatformAvailable) {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          Touch ID/Face ID ist auf diesem Gerät nicht verfügbar. 
          Bitte verwenden Sie die herkömmliche Anmeldung.
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasPasskeys) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Noch keine Passkeys registriert. 
          Richten Sie in den Admin-Einstellungen Touch ID/Face ID ein.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`w-full rounded-md border p-4 ${className}`}>
      <div className="pb-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Fingerprint className="h-5 w-5 text-blue-600" />
          Touch ID / Face ID Anmeldung
        </h3>
      </div>
      <div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">
              Touch ID/Face ID ist verfügbar und einsatzbereit
            </span>
          </div>

          <Button
            onClick={authenticateWithPasskey}
            disabled={isAuthenticating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            size="lg"
          >
            {isAuthenticating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Authentifizierung läuft...
              </>
            ) : (
              <>
                <Fingerprint className="h-4 w-4 mr-2" />
                Mit Touch ID / Face ID anmelden
              </>
            )}
          </Button>

          <p className="text-xs text-slate-500 text-center">
            Nutzen Sie Ihren Fingerabdruck oder Ihr Gesicht für eine sichere Anmeldung
          </p>
        </div>
      </div>
    </div>
  );
}
