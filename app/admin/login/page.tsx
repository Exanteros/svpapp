"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  EyeOff,
  Settings,
  Calendar,
  Trophy,
  UserPlus,
  Menu,
  X
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if already authenticated will be handled by middleware
  useEffect(() => {
    // The middleware will automatically redirect authenticated users
    console.log('Login-Seite geladen');
    
    // Clear any old session data that might cause issues
    const clearOldSessions = () => {
      try {
        // Clear localStorage data from old system
        localStorage.removeItem('svp-admin-key');
        localStorage.removeItem('svp-session-token');
        localStorage.removeItem('svp-session-token-expires');
      } catch (error) {
        // Ignore errors if localStorage is not available
      }
    };
    
    clearOldSessions();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Bitte geben Sie E-Mail und Passwort ein');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔑 Versuche Anmeldung...');
      
      // Parse email:password format or require full credentials
      if (!apiKey.includes(':')) {
        throw new Error('Bitte geben Sie E-Mail und Passwort im Format email:passwort ein');
      }
      
      const [email, password] = apiKey.split(':');
      
      if (!email || !password) {
        throw new Error('E-Mail und Passwort sind erforderlich');
      }
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Login erfolgreich');
        
        setSuccess(true);
        setError(null);
        
        // Redirect to admin dashboard
        setTimeout(() => {
          router.push('/admin');
        }, 1000);
      } else {
        console.error('❌ Login fehlgeschlagen:', data.error);
        setError(data.error || 'Ungültige Anmeldedaten');
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {/* Handball Ball Icon */}
              <div className="relative w-8 h-8">
                <div className="w-8 h-8 bg-orange-500 rounded-full"></div>
                <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full opacity-30"></div>
              </div>
              <h1 className="text-xl font-bold text-gray-900">SV Puschendorf</h1>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/spielplan" className="text-gray-700 hover:text-orange-600 font-medium transition-colors">
                Spielplan
              </Link>
              <Link href="/ergebnisse" className="text-gray-700 hover:text-orange-600 font-medium transition-colors">
                Ergebnisse
              </Link>
              <Link href="/anmeldung">
                <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2">
                  Anmeldung
                </Button>
              </Link>
              <Link href="/admin" className="text-orange-600 hover:text-orange-700 transition-colors" title="Admin">
                <Settings className="h-6 w-6" />
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Menü öffnen"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
            <nav className="container mx-auto px-4 py-4 space-y-3">
              <Link 
                href="/spielplan" 
                className="block py-3 px-4 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5" />
                  Spielplan
                </div>
              </Link>
              <Link 
                href="/ergebnisse" 
                className="block py-3 px-4 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5" />
                  Ergebnisse
                </div>
              </Link>
              <Link 
                href="/anmeldung" 
                className="block"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg">
                  <div className="flex items-center gap-3 justify-center">
                    <UserPlus className="h-5 w-5" />
                    Anmeldung
                  </div>
                </Button>
              </Link>
              <Link 
                href="/admin" 
                className="block py-3 px-4 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5" />
                  Admin
                </div>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md mx-auto">
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
                  Anmeldedaten
                </Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showPassword ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="bg-white border-slate-300 text-slate-700 focus:border-blue-400 focus:ring-blue-400/20 pr-10"
                    placeholder="E-Mail:Passwort"
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
                    Anmelden
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
      </main>
    </div>
  );
}
