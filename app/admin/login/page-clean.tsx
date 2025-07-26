"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Key, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  EyeOff
} from "lucide-react";
import { authUtils, isAuthenticated } from '@/lib/api-client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      console.log('✅ Bereits authentifiziert - Weiterleitung zum Dashboard');
      router.replace('/admin');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Bitte geben Sie einen API-Schlüssel ein');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔑 Versuche Anmeldung mit API-Schlüssel...');
      
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          apiKey: apiKey.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Login erfolgreich');
        
        // Store authentication token
        if (data.token) {
          localStorage.setItem('admin_token', data.token);
          localStorage.setItem('admin_token_expires', String(Date.now() + (24 * 60 * 60 * 1000))); // 24 hours
        }
        
        setSuccess(true);
        setError(null);
        
        // Redirect to admin dashboard
        setTimeout(() => {
          router.push('/admin');
        }, 1000);
      } else {
        console.error('❌ Login fehlgeschlagen:', data.error);
        setError(data.error || 'Ungültiger API-Schlüssel');
        setSuccess(false);
      }
    } catch (error) {
      console.error('❌ Login-Fehler:', error);
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white shadow-xl border-slate-200">
          <CardHeader className="text-center pb-6 border-b border-slate-100">
            <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg w-fit">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Admin-Anmeldung</CardTitle>
            <CardDescription className="text-slate-600 mt-2">
              Sicherer Zugang zum Turnier-Management
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {/* Success Message */}
            {success && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Anmeldung erfolgreich! Sie werden weitergeleitet...
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-sm font-medium text-slate-700">
                  API-Schlüssel
                </Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showPassword ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="bg-white border-slate-300 text-slate-700 focus:border-blue-400 focus:ring-blue-400/20 pr-10"
                    placeholder="Geben Sie Ihren API-Schlüssel ein"
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 transition-all duration-200"
                disabled={isLoading || !apiKey.trim()}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Anmeldung läuft...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Mit API-Schlüssel anmelden
                  </>
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-200 mt-6">
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>
                    Verwenden Sie Ihren persönlichen API-Schlüssel für den Zugang
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>
                    Alle Daten werden sicher verschlüsselt übertragen
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>
                    Bei Problemen wenden Sie sich an den System-Administrator
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            © 2025 SV Puschendorf • Turnier-Management-System
          </p>
        </div>
      </div>
    </div>
  );
}
