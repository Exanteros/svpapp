"use client";

import { useState, useEffect } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Smartphone, 
  Trash2, 
  Plus, 
  AlertCircle, 
  CheckCircle,
  Fingerprint,
  RefreshCw
} from 'lucide-react';

interface PasskeyInfo {
  id: string;
  credential_id: string;
  device_name: string;
  created_at: string;
  last_used?: string;
  counter: number;
}

interface PasskeyManagerProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function PasskeyManager({ onSuccess, onError }: PasskeyManagerProps) {
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check passkey support
  useEffect(() => {
    checkPasskeySupport();
    loadPasskeys();
  }, []);

  const checkPasskeySupport = async () => {
    try {
      console.log('🔍 Starting passkey support check...');
      
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
    }
  };

  const loadPasskeys = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/passkey?action=list-passkeys');
      
      if (response.ok) {
        const data = await response.json();
        setPasskeys(data.passkeys || []);
      }
    } catch (error) {
      console.error('Error loading passkeys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const registerPasskey = async () => {
    if (!isSupported || !isPlatformAvailable) {
      const error = 'Touch ID/Face ID ist auf diesem Gerät nicht verfügbar';
      onError?.(error);
      return;
    }

    try {
      setIsRegistering(true);

      // 1. Get registration options from server
      const optionsResponse = await fetch('/api/auth/passkey?action=registration-options');
      if (!optionsResponse.ok) {
        throw new Error('Fehler beim Abrufen der Registrierungsoptionen');
      }

      const options = await optionsResponse.json();
      
      // 2. Create credential using WebAuthn API
      const credential = await startRegistration({ optionsJSON: options });

      // 3. Send credential to server for verification
      const registrationResponse = await fetch('/api/auth/passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          credential,
          challenge: options.challenge
        })
      });

      if (!registrationResponse.ok) {
        const errorData = await registrationResponse.json();
        throw new Error(errorData.error || 'Registrierung fehlgeschlagen');
      }

      const result = await registrationResponse.json();
      
      if (result.success) {
        onSuccess?.();
        await loadPasskeys();
        
        // Show success message
        alert('🎉 Touch ID/Face ID erfolgreich eingerichtet!\n\nSie können sich jetzt mit biometrischer Authentifizierung anmelden.');
      } else {
        throw new Error(result.error || 'Registrierung fehlgeschlagen');
      }

    } catch (error: any) {
      console.error('Passkey registration error:', error);
      
      let errorMessage = 'Fehler bei der Passkey-Registrierung';
      
      if (error.name === 'InvalidStateError') {
        errorMessage = 'Ein Passkey für dieses Gerät ist bereits registriert';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Touch ID/Face ID wird auf diesem Gerät nicht unterstützt';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Sicherheitsfehler: Bitte verwenden Sie HTTPS';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Registrierung wurde abgebrochen';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      onError?.(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  const deletePasskey = async (passkeyId: string) => {
    if (!confirm('Möchten Sie diesen Passkey wirklich löschen?')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          credentialId: passkeyId
        })
      });

      if (response.ok) {
        await loadPasskeys();
        alert('Passkey erfolgreich gelöscht');
      } else {
        throw new Error('Fehler beim Löschen des Passkeys');
      }
    } catch (error) {
      console.error('Error deleting passkey:', error);
      onError?.('Fehler beim Löschen des Passkeys');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unbekannt';
    }
  };

  const getDeviceIcon = (deviceName: string) => {
    if (deviceName?.includes('iPhone') || deviceName?.includes('iPad')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Shield className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-slate-600">Passkey-Einstellungen werden geladen...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Fingerprint className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xl text-slate-800">Touch ID / Face ID Verwaltung</CardTitle>
            <p className="text-slate-600 text-sm">
              Sichere biometrische Authentifizierung für den Admin-Bereich
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Support Status */}
        <div className="space-y-3">
          <Alert className={isSupported ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="flex items-center gap-2">
              {isSupported ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={isSupported ? 'text-green-800' : 'text-red-800'}>
                {isSupported ? (
                  isPlatformAvailable ? (
                    'Touch ID/Face ID ist verfügbar und kann verwendet werden'
                  ) : (
                    'WebAuthn wird unterstützt, aber Touch ID/Face ID ist nicht verfügbar'
                  )
                ) : (
                  'Passkeys werden von diesem Browser nicht unterstützt'
                )}
              </AlertDescription>
            </div>
          </Alert>
        </div>

        {/* Registration Section */}
        {isSupported && isPlatformAvailable && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-800">Neuen Passkey hinzufügen</h3>
                <p className="text-sm text-slate-600">
                  Richten Sie Touch ID oder Face ID für die Anmeldung ein
                </p>
              </div>
              <Button
                onClick={registerPasskey}
                disabled={isRegistering}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isRegistering ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Registrierung...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Passkey hinzufügen
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Existing Passkeys */}
        <div className="space-y-4">
          <h3 className="font-medium text-slate-800">Registrierte Passkeys</h3>
          
          {passkeys.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
              <Fingerprint className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">Noch keine Passkeys registriert</p>
              <p className="text-slate-500 text-sm">
                Fügen Sie einen Passkey hinzu für sichere biometrische Anmeldung
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {passkeys.map((passkey) => (
                <div
                  key={passkey.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(passkey.device_name)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">
                          {passkey.device_name || 'Unbekanntes Gerät'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {passkey.counter} mal verwendet
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-500">
                        Erstellt: {formatDate(passkey.created_at)}
                        {passkey.last_used && (
                          <> • Zuletzt verwendet: {formatDate(passkey.last_used)}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePasskey(passkey.id)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Sicherheitshinweis:</strong> Passkeys sind sicherer als Passwörter und können nicht 
            gestohlen oder erraten werden. Sie bleiben lokal auf Ihrem Gerät gespeichert.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
