"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Mail, RefreshCw, Shield, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  authMethod: "password" | "passkey";
  active: boolean;
  createdAt: string;
  lastLogin?: string | null;
  passkeyCount: number;
  passkeyLastUsed?: string | null;
  inviteUrl?: string | null;
  inviteExpiresAt?: string | null;
  inviteAcceptedAt?: string | null;
}

export function AdminAccessPanel() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lastInviteUrl, setLastInviteUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  async function loadAdmins() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users", { credentials: "same-origin" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Admins konnten nicht geladen werden");
      }

      setAdmins(data.admins || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Admins konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  async function createAdmin(event: React.FormEvent) {
    event.preventDefault();

    if (!email.trim()) {
      toast.error("Bitte eine E-Mail-Adresse eingeben");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          email: email.trim(),
          name: name.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Admin konnte nicht erstellt werden");
      }

      setLastInviteUrl(data.admin.inviteUrl);
      setName("");
      setEmail("");
      await loadAdmins();
      toast.success("Admin-Einladung erstellt");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Admin konnte nicht erstellt werden");
    } finally {
      setSaving(false);
    }
  }

  async function regenerateInvite(adminId: string) {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate-invite", adminId }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Einladungslink konnte nicht erneuert werden");
      }

      setLastInviteUrl(data.admin.inviteUrl);
      await loadAdmins();
      toast.success("Einladungslink erneuert");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Einladungslink konnte nicht erneuert werden");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAdmin(admin: AdminUser) {
    if (!confirm(`Admin "${admin.email}" wirklich löschen? Alle Passkeys dieses Admins werden entfernt.`)) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", adminId: admin.id }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Admin konnte nicht gelöscht werden");
      }

      await loadAdmins();
      toast.success("Admin gelöscht");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Admin konnte nicht gelöscht werden");
    } finally {
      setSaving(false);
    }
  }

  async function sendInvite(admin: AdminUser) {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-invite", adminId: admin.id }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Einladung konnte nicht verschickt werden");
      }

      if (data.admin?.inviteUrl) {
        setLastInviteUrl(data.admin.inviteUrl);
      }

      await loadAdmins();
      toast.success("Einladung per Mail gesendet");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Einladung konnte nicht verschickt werden");
    } finally {
      setSaving(false);
    }
  }

  async function copyInvite(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Einladungslink kopiert");
  }

  return (
    <div className="grid gap-5 pb-10">
      <Card className="rounded-[8px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="size-5 text-[#5e6d35]" />
            Admin per Passkey einladen
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={createAdmin} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Name</Label>
              <Input id="admin-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Vorname Nachname" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">E-Mail</Label>
              <Input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.de" />
            </div>
            <Button type="submit" disabled={saving || !email.trim()} className="bg-[#5e6d35] text-white hover:bg-[#4f5d2f]">
              {saving ? <RefreshCw className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Einladen
            </Button>
          </form>

          {lastInviteUrl && (
            <div className="flex min-w-0 flex-col gap-2 rounded-md border border-[#d9dec8] bg-[#f6f7f1] p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-all text-sm text-muted-foreground">{lastInviteUrl}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => copyInvite(lastInviteUrl)}>
                <Copy className="size-4" />
                Kopieren
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[8px]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="size-5 text-[#5e6d35]" />
            Admin-Zugänge
          </CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={loadAdmins} disabled={loading}>
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            Aktualisieren
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          {admins.map((admin) => (
            <div key={admin.id} className="grid gap-3 rounded-[8px] border bg-white p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="!mt-0 font-medium">{admin.name}</p>
                  <Badge variant={admin.active ? "outline" : "secondary"}>
                    {admin.active ? "Aktiv" : "Inaktiv"}
                  </Badge>
                  <Badge variant="outline">
                    {admin.authMethod === "password" ? "Passwort" : "Passkey"}
                  </Badge>
                </div>
                <p className="!mt-1 break-all text-sm text-muted-foreground">{admin.email}</p>
                <p className="!mt-2 text-xs text-muted-foreground">
                  {admin.passkeyCount} Passkey(s)
                  {admin.lastLogin ? ` · Letzter Login: ${formatDate(admin.lastLogin)}` : ""}
                  {admin.inviteUrl ? ` · Einladung offen bis ${formatDate(admin.inviteExpiresAt || "")}` : ""}
                </p>
                {admin.inviteUrl && (
                  <div className="mt-3 flex min-w-0 flex-col gap-2 rounded-md bg-[#f6f7f1] p-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 break-all text-xs text-muted-foreground">{admin.inviteUrl}</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => copyInvite(admin.inviteUrl || "")}>
                      <Copy className="size-4" />
                      Kopieren
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {admin.authMethod === "passkey" && (
                  <Button type="button" variant="outline" size="sm" onClick={() => regenerateInvite(admin.id)} disabled={saving}>
                    <KeyRound className="size-4" />
                    Link neu
                  </Button>
                )}
                {admin.authMethod === "passkey" && admin.active && (
                  <Button type="button" variant="outline" size="sm" onClick={() => sendInvite(admin)} disabled={saving}>
                    <Mail className="size-4" />
                    Mail senden
                  </Button>
                )}
                {admin.authMethod === "passkey" && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => deleteAdmin(admin)} disabled={saving} className="text-destructive hover:text-destructive">
                    <Trash2 className="size-4" />
                    Löschen
                  </Button>
                )}
              </div>
            </div>
          ))}

          {!loading && admins.length === 0 && (
            <div className="rounded-[8px] border border-dashed p-8 text-center text-sm text-muted-foreground">
              Noch keine Admin-Zugänge vorhanden.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) {
    return "unbekannt";
  }

  try {
    return new Date(value).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}
