"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Eye, EyeOff, KeyRound, Shield } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasskeyLogin from "@/components/PasskeyLogin";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem("svp-admin-key");
      localStorage.removeItem("svp-session-token");
      localStorage.removeItem("svp-session-token-expires");
    } catch (error) {
      // localStorage can be unavailable in hardened browser contexts.
    }
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError("Bitte geben Sie Benutzername/E-Mail und Passwort ein.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Ungültige Anmeldedaten");
        setSuccess(false);
        return;
      }

      setSuccess(true);
      setError(null);
      setTimeout(() => router.push("/admin"), 600);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Verbindungsfehler. Bitte versuchen Sie es erneut.");
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-md items-center px-4 py-10 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <Badge variant="outline" className="mb-3 w-fit">
            Admin
          </Badge>
          <Shield className="mb-2 size-5 text-muted-foreground" />
          <CardTitle>Admin-Anmeldung</CardTitle>
          <CardDescription>Zugang zum Turnier-Management.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {success && (
            <Alert>
              <CheckCircle className="size-4" />
              <AlertDescription>Anmeldung erfolgreich. Weiterleitung läuft...</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Benutzername/E-Mail</Label>
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin"
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Passwort"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !email.trim() || !password}>
              {isLoading ? (
                "Anmeldung läuft..."
              ) : (
                <>
                  <KeyRound className="size-4" />
                  Anmelden
                </>
              )}
            </Button>
          </form>

          <PasskeyLogin
            onSuccess={() => router.push("/admin")}
            onError={(message) => {
              setError(message);
              setSuccess(false);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
