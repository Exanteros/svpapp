"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Info, CheckCircle, XCircle } from 'lucide-react';

interface DebugInfo {
  userAgent: string;
  browserInfo: {
    isSafari: boolean;
    isChrome: boolean;
    isFirefox: boolean;
    isEdge: boolean;
  };
  webAuthnSupport: {
    hasPublicKeyCredential: boolean;
    hasCredentialsAPI: boolean;
    hasCreateFunction: boolean;
    hasGetFunction: boolean;
  };
  platformAuthenticator: {
    available: boolean | null;
    error: string | null;
  };
  isSecureContext: boolean;
  protocol: string;
}

export default function PasskeyDebug() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const runDiagnostics = async () => {
    setIsLoading(true);
    
    try {
      const userAgent = navigator.userAgent;
      const userAgentLower = userAgent.toLowerCase();
      
      // Browser detection
      const browserInfo = {
        isSafari: userAgentLower.includes('safari') && !userAgentLower.includes('chrome'),
        isChrome: userAgentLower.includes('chrome'),
        isFirefox: userAgentLower.includes('firefox'),
        isEdge: userAgentLower.includes('edge')
      };

      // WebAuthn support
      const webAuthnSupport = {
        hasPublicKeyCredential: typeof window !== 'undefined' && !!window.PublicKeyCredential,
        hasCredentialsAPI: !!navigator.credentials,
        hasCreateFunction: !!navigator.credentials?.create,
        hasGetFunction: !!navigator.credentials?.get
      };

      // Platform authenticator check
      let platformAuthenticator = {
        available: null as boolean | null,
        error: null as string | null
      };

      if (webAuthnSupport.hasPublicKeyCredential) {
        try {
          const isAvailable = await Promise.race([
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000))
          ]);
          platformAuthenticator.available = isAvailable;
        } catch (error) {
          platformAuthenticator.error = error instanceof Error ? error.message : 'Unknown error';
          platformAuthenticator.available = false;
        }
      }

      const info: DebugInfo = {
        userAgent,
        browserInfo,
        webAuthnSupport,
        platformAuthenticator,
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol
      };

      setDebugInfo(info);
    } catch (error) {
      console.error('Debug info collection failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const StatusIcon = ({ status }: { status: boolean | null }) => {
    if (status === null) return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  if (!debugInfo && isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Browser-Diagnose läuft...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!debugInfo) return null;

  const overallSupport = debugInfo.webAuthnSupport.hasPublicKeyCredential && 
                        debugInfo.webAuthnSupport.hasCredentialsAPI &&
                        debugInfo.isSecureContext;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          Browser-Diagnose für Passkeys
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runDiagnostics}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center gap-2 p-3 rounded-lg border">
          <StatusIcon status={overallSupport} />
          <span className="font-medium">
            Passkey-Unterstützung: {overallSupport ? 'Verfügbar' : 'Nicht verfügbar'}
          </span>
        </div>

        {/* Browser Info */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">Browser-Information</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <StatusIcon status={debugInfo.browserInfo.isSafari} />
              Safari
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon status={debugInfo.browserInfo.isChrome} />
              Chrome
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon status={debugInfo.browserInfo.isFirefox} />
              Firefox
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon status={debugInfo.browserInfo.isEdge} />
              Edge
            </div>
          </div>
        </div>

        {/* WebAuthn Support */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">WebAuthn-Unterstützung</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <StatusIcon status={debugInfo.webAuthnSupport.hasPublicKeyCredential} />
              PublicKeyCredential API
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon status={debugInfo.webAuthnSupport.hasCredentialsAPI} />
              Credentials API
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon status={debugInfo.webAuthnSupport.hasCreateFunction} />
              credentials.create()
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon status={debugInfo.webAuthnSupport.hasGetFunction} />
              credentials.get()
            </div>
          </div>
        </div>

        {/* Platform Authenticator */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">Platform Authenticator (Touch ID/Face ID)</h4>
          <div className="flex items-center gap-2 text-sm">
            <StatusIcon status={debugInfo.platformAuthenticator.available} />
            {debugInfo.platformAuthenticator.available === null ? 'Wird geprüft...' :
             debugInfo.platformAuthenticator.available ? 'Verfügbar' : 'Nicht verfügbar'}
          </div>
          {debugInfo.platformAuthenticator.error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              Fehler: {debugInfo.platformAuthenticator.error}
            </div>
          )}
        </div>

        {/* Security Context */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">Sicherheitskontext</h4>
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <StatusIcon status={debugInfo.isSecureContext} />
              Secure Context (HTTPS): {debugInfo.isSecureContext ? 'Ja' : 'Nein'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Protokoll: {debugInfo.protocol}
            </div>
          </div>
        </div>

        {/* User Agent */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">User Agent</h4>
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono break-all">
            {debugInfo.userAgent}
          </div>
        </div>

        {/* Recommendations */}
        {!overallSupport && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-sm text-yellow-800 mb-2">Empfehlungen:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {!debugInfo.isSecureContext && (
                <li>• Verwenden Sie HTTPS für Passkey-Unterstützung</li>
              )}
              {!debugInfo.webAuthnSupport.hasPublicKeyCredential && (
                <li>• Aktualisieren Sie Ihren Browser auf eine neuere Version</li>
              )}
              {!debugInfo.platformAuthenticator.available && (
                <li>• Aktivieren Sie Touch ID/Face ID in Ihren Systemeinstellungen</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
