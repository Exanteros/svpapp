"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { AlertCircle, CheckCircle, Fingerprint, RefreshCw, Shield } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface InviteInfo {
  email: string;
  name: string;
  inviteExpiresAt: string;
}

export default function AdminPasskeyInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/auth/passkey?action=invite-info&token=${encodeURIComponent(token)}`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || "Einladung konnte nicht geladen werden");
        }

        setInvite(data.invite);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Einladung konnte nicht geladen werden");
      } finally {
        setIsLoading(false);
      }
    }

    loadInvite();
  }, [token]);

  async function registerPasskey() {
    if (!window.isSecureContext) {
      setError("Passkeys benötigen HTTPS oder localhost.");
      return;
    }

    if (!window.PublicKeyCredential || !navigator.credentials?.create) {
      setError("Dieser Browser unterstützt keine Passkeys.");
      return;
    }

    try {
      setIsRegistering(true);
      setError(null);

      const optionsResponse = await fetch(`/api/auth/passkey?action=invite-registration-options&token=${encodeURIComponent(token)}`);
      const options = await optionsResponse.json().catch(() => ({}));

      if (!optionsResponse.ok) {
        throw new Error(options.error || "Registrierung konnte nicht vorbereitet werden");
      }

      const credential = await startRegistration({ optionsJSON: options });
      const registrationResponse = await fetch("/api/auth/passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite-register",
          credential,
          challenge: options.challenge,
        }),
      });
      const result = await registrationResponse.json().catch(() => ({}));

      if (!registrationResponse.ok || !result.success) {
        throw new Error(result.error || "Passkey konnte nicht gespeichert werden");
      }

      setSuccess(true);
      setTimeout(() => router.push("/admin/login"), 1200);
    } catch (registerError: any) {
      if (registerError?.name === "AbortError") {
        setError("Passkey-Erstellung wurde abgebrochen.");
      } else if (registerError?.name === "InvalidStateError") {
        setError("Auf diesem Gerät existiert bereits ein Passkey für diesen Admin.");
      } else {
        setError(registerError instanceof Error ? registerError.message : "Passkey konnte nicht gespeichert werden");
      }
    } finally {
      setIsRegistering(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-lg items-center px-4 py-10 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <Badge variant="outline" className="mb-3 w-fit">
            Admin-Einladung
          </Badge>
          <Shield className="mb-2 size-5 text-muted-foreground" />
          <CardTitle>Passkey einrichten</CardTitle>
          <CardDescription>
            Richte deinen Passkey für die Turnier-Verwaltung ein.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading && (
            <div className="flex items-center gap-3 rounded-md border p-3 text-sm text-muted-foreground">
              <RefreshCw className="size-4 animate-spin" />
              Einladung wird geprüft...
            </div>
          )}

          {invite && !success && (
            <div className="rounded-md border bg-[#f6f7f1] p-3 text-sm">
              <p className="font-medium">{invite.name}</p>
              <p className="mt-1 text-muted-foreground">{invite.email}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Gültig bis {formatDate(invite.inviteExpiresAt)}
              </p>
            </div>
          )}

          {success && (
            <Alert>
              <CheckCircle className="size-4" />
              <AlertDescription>Passkey gespeichert. Weiterleitung zur Anmeldung läuft...</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            className="w-full"
            disabled={!invite || isRegistering || success}
            onClick={registerPasskey}
          >
            {isRegistering ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Passkey wird eingerichtet...
              </>
            ) : (
              <>
                <Fingerprint className="size-4" />
                Passkey festlegen
              </>
            )}
          </Button>

          <Button asChild variant="ghost" className="w-full">
            <Link href="/admin/login">Zur Anmeldung</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}
