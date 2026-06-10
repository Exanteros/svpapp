import type {
  AdminData,
  FeldEinstellungen,
  HelferBedarf,
  HelferData,
  RegistrationImportOptions,
  RegistrationImportResult,
  Spiel,
  TurnierEinstellungen,
} from "./types";

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

async function jsonRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AdminApiError(data.error || data.message || `HTTP ${response.status}`, response.status);
  }

  return data as T;
}

export async function getAdminData() {
  return jsonRequest<AdminData>("/api/admin");
}

export async function getFeldEinstellungen() {
  const data = await jsonRequest<{ success: boolean; feldEinstellungen: FeldEinstellungen[] }>(
    "/api/admin/feld-settings"
  );

  return data.feldEinstellungen || [];
}

export async function saveFeldEinstellungen(feldEinstellungen: FeldEinstellungen[]) {
  return jsonRequest<{ success: boolean; feldEinstellungen: FeldEinstellungen[] }>("/api/admin/feld-settings", {
    method: "POST",
    body: JSON.stringify({ feldEinstellungen }),
  });
}

export async function updateRegistrationStatus(anmeldungId: string, status: string) {
  return jsonRequest("/api/admin", {
    method: "POST",
    body: JSON.stringify({
      action: "update_status",
      anmeldungId,
      status,
    }),
  });
}

export async function updateRegistrationInfo(
  anmeldungId: string,
  anmeldung: {
    verein: string;
    kontakt: string;
    email: string;
    mobil: string;
    kosten: number;
  }
) {
  return jsonRequest("/api/admin", {
    method: "POST",
    body: JSON.stringify({
      action: "update_anmeldung_info",
      anmeldungId,
      anmeldung,
    }),
  });
}

export async function deleteRegistration(anmeldungId: string) {
  return jsonRequest("/api/admin", {
    method: "POST",
    body: JSON.stringify({
      action: "delete_anmeldung",
      anmeldungId,
    }),
  });
}

export async function createRegistrationDemoData() {
  return jsonRequest("/api/admin", {
    method: "POST",
    body: JSON.stringify({ action: "create_demo_data" }),
  });
}

export async function flushRegistrationDatabase() {
  return jsonRequest("/api/admin", {
    method: "POST",
    body: JSON.stringify({ action: "flush_database" }),
  });
}

export async function uploadRegistrationImport(file: File, options: RegistrationImportOptions) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", options.mode);
  formData.append("replaceTeams", String(options.replaceTeams));

  const response = await fetch("/api/admin/import-registrations", {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AdminApiError(data.error || data.message || `HTTP ${response.status}`, response.status);
  }

  return data as RegistrationImportResult;
}

export async function saveSettings(settings: TurnierEinstellungen) {
  return jsonRequest<{ settings: TurnierEinstellungen }>("/api/admin", {
    method: "POST",
    body: JSON.stringify({
      action: "save_settings",
      settings,
    }),
  });
}

export async function getSpielplan() {
  const data = await jsonRequest<{ spiele: Spiel[] }>("/api/spielplan");

  return data.spiele || [];
}

export async function generateSpielplan(
  settings: TurnierEinstellungen,
  feldEinstellungen: FeldEinstellungen[]
) {
  const data = await jsonRequest<{ spiele: Spiel[] }>("/api/spielplan", {
    method: "POST",
    body: JSON.stringify({
      action: "generate",
      settings,
      feldEinstellungen,
      replaceExisting: true,
    }),
  });

  return data.spiele || [];
}

export async function updateSpiel(spielId: string, spiel: Partial<Spiel>) {
  return jsonRequest("/api/spielplan", {
    method: "POST",
    body: JSON.stringify({
      action: "update",
      spielId,
      spiel,
    }),
  });
}

export async function deleteSpiel(spielId: string) {
  return jsonRequest("/api/spielplan", {
    method: "POST",
    body: JSON.stringify({
      action: "delete",
      spielId,
    }),
  });
}

export async function deleteAllSpiele() {
  return jsonRequest("/api/spielplan", {
    method: "POST",
    body: JSON.stringify({ action: "deleteAll" }),
  });
}

export async function publishSpielplan() {
  return jsonRequest<{ spielplanStatus: "published"; spielplanPublishedAt: string }>("/api/spielplan", {
    method: "POST",
    body: JSON.stringify({ action: "publish" }),
  });
}

export async function unpublishSpielplan() {
  return jsonRequest<{ spielplanStatus: "draft"; spielplanPublishedAt: null }>("/api/spielplan", {
    method: "POST",
    body: JSON.stringify({ action: "unpublish" }),
  });
}

export async function getHelferData() {
  return jsonRequest<HelferData>("/api/helfer");
}

export async function saveHelferBedarf(bedarf: Omit<HelferBedarf, "id" | "created_at">) {
  return jsonRequest("/api/helfer", {
    method: "POST",
    body: JSON.stringify({
      action: "save_bedarf",
      bedarf,
    }),
  });
}

export async function updateHelferBedarf(id: string, bedarf: Partial<HelferBedarf>) {
  return jsonRequest("/api/helfer", {
    method: "POST",
    body: JSON.stringify({
      action: "update_bedarf",
      id,
      bedarf,
    }),
  });
}

export async function deleteHelferBedarf(id: string) {
  return jsonRequest("/api/helfer", {
    method: "POST",
    body: JSON.stringify({
      action: "delete_bedarf",
      id,
    }),
  });
}

export async function generateHelferLink() {
  return jsonRequest<{ helferLink: string }>("/api/helfer", {
    method: "POST",
    body: JSON.stringify({ action: "generate_link" }),
  });
}

export async function updateHelferStatus(anmeldungId: string, status: string) {
  return jsonRequest("/api/helfer", {
    method: "POST",
    body: JSON.stringify({
      action: "update_status",
      anmeldungId,
      status,
    }),
  });
}

export async function deleteHelferAnmeldung(anmeldungId: string) {
  return jsonRequest("/api/helfer", {
    method: "POST",
    body: JSON.stringify({
      action: "delete_anmeldung",
      anmeldungId,
    }),
  });
}

export async function createHelferDemoData() {
  return jsonRequest("/api/helfer", {
    method: "POST",
    body: JSON.stringify({ action: "create_demo_data" }),
  });
}

export async function flushHelferDatabase() {
  return jsonRequest("/api/helfer", {
    method: "POST",
    body: JSON.stringify({ action: "flush_database" }),
  });
}

export async function logout() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });
}
