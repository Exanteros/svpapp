"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImageUp, Loader2, QrCode, ScanLine, Save, Square, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};

interface DetectedBarcode {
  rawValue?: string;
  boundingBox?: RectLike;
}

interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Spiel {
  id: string;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  status: string;
  ergebnis?: string | null;
  tore_team1?: number | null;
  tore_team2?: number | null;
}

interface ScoreScanResult {
  team1: number;
  team2: number;
  confidence: number;
  team1Marked: number[];
  team2Marked: number[];
}

interface RefereeCardScannerProps {
  onSaved?: () => void;
}

const CARD_WIDTH_MM = 101;
const CARD_HEIGHT_MM = 144;
const CARD_PADDING_X_MM = 4;
const SCORE_GRID_WIDTH_MM = CARD_WIDTH_MM - CARD_PADDING_X_MM * 2;
const SCORE_GRID_GAP_MM = 2;
const SCORE_GRID_TEAM_WIDTH_MM = (SCORE_GRID_WIDTH_MM - SCORE_GRID_GAP_MM) / 2;
const SCORE_GRID_TEAM_1_X_MM = CARD_PADDING_X_MM;
const SCORE_GRID_TEAM_2_X_MM = SCORE_GRID_TEAM_1_X_MM + SCORE_GRID_TEAM_WIDTH_MM + SCORE_GRID_GAP_MM;
const SCORE_GRID_COLUMNS = 5;
const SCORE_GRID_CELL_HEIGHT_MM = 11.5;
const SCORE_GRID_Y_MM = 70;
const SCORE_GRID_CELL_WIDTH_MM = SCORE_GRID_TEAM_WIDTH_MM / SCORE_GRID_COLUMNS;
const QR_SIZE_MM = 22;
const QR_X_MM = CARD_WIDTH_MM - QR_SIZE_MM - CARD_PADDING_X_MM;
const QR_Y_MM = 14;

export default function RefereeCardScanner({ onSaved }: RefereeCardScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [spiel, setSpiel] = useState<Spiel | null>(null);
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [toreTeam1, setToreTeam1] = useState("");
  const [toreTeam2, setToreTeam2] = useState("");
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [qrSupported, setQrSupported] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cameraPreviewReady, setCameraPreviewReady] = useState(false);

  const selectedSpielLabel = useMemo(() => {
    if (!spiel) return "Kein Spiel";
    return `${spiel.zeit} · ${spiel.feld}`;
  }, [spiel]);
  const selectedGameLabel = spiel ? getSpielLabel(spiel) : "";

  useEffect(() => {
    setQrSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
    loadSpiele();

    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!cameraActive || !streamRef.current || !videoRef.current) {
      return;
    }

    let cancelled = false;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.muted = true;
    video.playsInline = true;

    async function playPreview() {
      try {
        await waitForVideoMetadata(video);

        if (cancelled) {
          return;
        }

        await video.play();

        if (!cancelled) {
          setCameraPreviewReady(true);
        }
      } catch (error) {
        console.error("Kamera-Vorschau konnte nicht gestartet werden:", error);
        toast.error("Kamera-Vorschau konnte nicht gestartet werden");
      }
    }

    void playPreview();

    return () => {
      cancelled = true;
    };
  }, [cameraActive]);

  async function loadSpiele() {
    try {
      const response = await fetch("/api/spielplan/get?includeDraft=1", { cache: "no-store" });
      const data = await response.json();
      const nextSpiele = [
        ...(data.samstag?.spiele || []),
        ...(data.sonntag?.spiele || []),
      ] as Spiel[];

      setSpiele(nextSpiele);
    } catch (error) {
      console.error("Spiele für Scanner konnten nicht geladen werden:", error);
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Kamera ist in diesem Browser nicht verfügbar");
      return;
    }

    try {
      setCameraStarting(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1600 },
          height: { ideal: 1200 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setLastImage(null);
      setCameraPreviewReady(false);
      setCameraActive(true);

      startQrLoop();
    } catch (error) {
      console.error(error);
      toast.error("Kamera konnte nicht gestartet werden");
    } finally {
      setCameraStarting(false);
    }
  }

  function stopCamera() {
    if (scanLoopRef.current) {
      window.clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setCameraPreviewReady(false);
    setCameraActive(false);
  }

  function startQrLoop() {
    if (!("BarcodeDetector" in window)) {
      return;
    }

    if (scanLoopRef.current) {
      window.clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    const detector = new (window as Window & { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector({
      formats: ["qr_code"],
    });

    scanLoopRef.current = window.setInterval(async () => {
      const canvas = drawVideoToCanvas();

      if (!canvas) {
        return;
      }

      try {
        const qrCode = await detectQrCode(canvas, detector);

        if (qrCode?.rawValue) {
          await applyQrValue(qrCode.rawValue);
          stopCamera();
        }
      } catch (error) {
        console.error("QR-Scan fehlgeschlagen:", error);
      }
    }, 900);
  }

  async function captureFromCamera() {
    const canvas = drawVideoToCanvas();

    if (!canvas) {
      toast.error("Kein Kamerabild verfügbar");
      return;
    }

    await processCanvas(canvas);
  }

  function drawVideoToCanvas() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas;
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const canvas = await imageFileToCanvas(file);
      await processCanvas(canvas);
    } catch (error) {
      console.error(error);
      toast.error("Bild konnte nicht gelesen werden");
    }
  }

  async function processCanvas(canvas: HTMLCanvasElement) {
    setProcessing(true);

    try {
      setLastImage(canvas.toDataURL("image/jpeg", 0.86));
      let qrCode: DetectedBarcode | null = null;

      if ("BarcodeDetector" in window) {
        const detector = new (window as Window & { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector({
          formats: ["qr_code"],
        });
        qrCode = await detectQrCode(canvas, detector);

        if (qrCode?.rawValue) {
          await applyQrValue(qrCode.rawValue);
        }
      } else {
        toast.error("Dieser Browser unterstützt die QR-Erkennung nicht. Bitte Karten-Code manuell eingeben.");
        return;
      }

      if (!qrCode?.rawValue) {
        toast.error("Kein Karten-Code im Bild erkannt");
        return;
      }

      toast.success("Karten-Code erkannt");
    } catch (error) {
      console.error(error);
      toast.error("Schiri-Karte konnte nicht analysiert werden");
    } finally {
      setProcessing(false);
    }
  }

  async function detectQrCode(
    canvas: HTMLCanvasElement,
    detector: InstanceType<BarcodeDetectorConstructor>
  ) {
    const codes = await detector.detect(canvas);
    return codes.find((code) => code.rawValue) || null;
  }

  async function applyQrValue(rawValue: string) {
    const parsed = parseRefereeCardCode(rawValue);

    if (!parsed) {
      return;
    }

    if (parsed.token) {
      if (parsed.token === token && spiel) {
        openScoreDialog(spiel, parsed.token);
        return;
      }

      setToken(parsed.token);
      setTokenInput(parsed.token);
      await loadSpielByToken(parsed.token, true);
      return;
    }

    if (parsed.spielId) {
      const selected = spiele.find((candidate) => String(candidate.id) === String(parsed.spielId));

      if (selected) {
        openScoreDialog(selected, "");
      }
    }
  }

  async function loadSpielByToken(nextToken = tokenInput.trim(), openDialog = false) {
    if (!nextToken) {
      toast.error("Karten-Code fehlt");
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch(`/api/schiedsrichterkarten/token?token=${encodeURIComponent(nextToken)}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Spiel konnte nicht geladen werden");
      }

      setToken(nextToken);
      setTokenInput(nextToken);
      setSpiel(data.spiel);
      setToreTeam1(data.spiel.tore_team1 === null || data.spiel.tore_team1 === undefined ? "" : String(data.spiel.tore_team1));
      setToreTeam2(data.spiel.tore_team2 === null || data.spiel.tore_team2 === undefined ? "" : String(data.spiel.tore_team2));
      if (openDialog) {
        setDialogOpen(true);
      }
      toast.success("Spiel erkannt");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Karte konnte nicht geladen werden");
    } finally {
      setProcessing(false);
    }
  }

  function openScoreDialog(nextSpiel: Spiel, nextToken = token) {
    setSpiel(nextSpiel);
    setToken(nextToken);
    setToreTeam1(nextSpiel.tore_team1 === null || nextSpiel.tore_team1 === undefined ? "" : String(nextSpiel.tore_team1));
    setToreTeam2(nextSpiel.tore_team2 === null || nextSpiel.tore_team2 === undefined ? "" : String(nextSpiel.tore_team2));
    setDialogOpen(true);
  }

  async function saveResult() {
    if (!spiel && !token) {
      toast.error("Bitte zuerst eine Karte scannen oder ein Spiel auswählen");
      return;
    }

    const scoreTeam1 = Number(toreTeam1);
    const scoreTeam2 = Number(toreTeam2);

    if (!Number.isInteger(scoreTeam1) || !Number.isInteger(scoreTeam2) || scoreTeam1 < 0 || scoreTeam2 < 0) {
      toast.error("Tore müssen ganze Zahlen ab 0 sein");
      return;
    }

    try {
      setSaving(true);
      const response = token
        ? await fetch("/api/schiedsrichterkarten/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, toreTeam1: scoreTeam1, toreTeam2: scoreTeam2 }),
          })
        : await fetch("/api/admin/ergebnisse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              spielId: spiel?.id,
              toreTeam1: scoreTeam1,
              toreTeam2: scoreTeam2,
              status: "beendet",
            }),
          });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Ergebnis konnte nicht gespeichert werden");
      }

      setSpiel(data.spiel || spiel);
      window.dispatchEvent(new CustomEvent("svp:score-saved", { detail: data.spiel || spiel }));
      onSaved?.();
      setDialogOpen(false);
      toast.success("Ergebnis aus Schiri-Karte übernommen");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Ergebnis konnte nicht gespeichert werden");
    } finally {
      setSaving(false);
    }
  }

  function resetScan() {
    setSpiel(null);
    setToken("");
    setTokenInput("");
    setToreTeam1("");
    setToreTeam2("");
    setLastImage(null);
    setDialogOpen(false);
  }

  return (
    <Card className="min-w-0 max-w-full overflow-hidden rounded-[8px] border-[#d9dec8] bg-white">
      <CardHeader className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex min-w-0 items-center gap-2 text-lg">
            <ScanLine className="size-5 text-[#5e6d35]" />
            <span className="min-w-0 truncate">Schiedsrichterkarte scannen</span>
          </CardTitle>
          <p className="!mt-1 text-sm text-muted-foreground">
            Karten-Code in der App scannen, Tore im Popup eintragen.
          </p>
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap gap-2 xl:justify-end">
          <Badge variant="outline" className="max-w-full truncate border-[#d9dec8] text-[#4f5d2f]">
            {selectedSpielLabel}
          </Badge>
          {!qrSupported && (
            <Badge variant="secondary">Karten-Code manuell</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid min-w-0 max-w-full gap-4 overflow-hidden">
        <div className="grid min-w-0 max-w-full gap-3 overflow-hidden">
          <div className="overflow-hidden rounded-[8px] border bg-[#f6f7f1]">
            <div className="relative aspect-[4/3] bg-[#eef1e5]">
              {cameraActive ? (
                <>
                  <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
                  {!cameraPreviewReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#eef1e5]/90 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Kamera startet
                    </div>
                  )}
                </>
              ) : lastImage ? (
                <img src={lastImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  <QrCode className="mr-2 size-4" />
                  Bereit
                </div>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {!cameraActive ? (
              <Button type="button" variant="outline" onClick={startCamera} disabled={cameraStarting}>
                {cameraStarting ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                Kamera
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={stopCamera}>
                <Square className="size-4" />
                Stop
              </Button>
            )}
            <Button type="button" className="bg-[#5e6d35] text-white hover:bg-[#4f5d2f]" onClick={captureFromCamera} disabled={!cameraActive || !cameraPreviewReady || processing}>
              {processing ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
              QR scannen
            </Button>
          </div>
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent">
            <ImageUp className="size-4" />
            QR-Bild hochladen
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleImageUpload} />
          </label>
        </div>

        <div className="grid min-w-0 max-w-full gap-4 overflow-hidden">
          <div className="grid min-w-0 gap-3 overflow-hidden rounded-[8px] border bg-[#f6f7f1] p-3">
            <div className="grid min-w-0 max-w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="Karten-Code"
                className="min-w-0 bg-white"
              />
              <Button type="button" variant="outline" onClick={() => loadSpielByToken(tokenInput.trim(), true)} disabled={processing || !tokenInput.trim()} className="w-full sm:w-auto">
                Laden
              </Button>
            </div>
            <Select
              value={spiel?.id ? String(spiel.id) : ""}
              onValueChange={(spielId) => {
                const selected = spiele.find((candidate) => String(candidate.id) === spielId);
                if (selected) {
                  openScoreDialog(selected, "");
                }
              }}
            >
              <SelectTrigger
                aria-label="Spiel manuell auswählen"
                className="w-full min-w-0 max-w-full overflow-hidden bg-white text-left *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate [&>span]:min-w-0 [&>span]:truncate"
                title={selectedGameLabel}
              >
                <SelectValue placeholder="Spiel manuell auswählen" />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-2rem)]">
                {spiele.map((candidate) => (
                  <SelectItem key={candidate.id} value={String(candidate.id)} className="max-w-[calc(100vw-2rem)] pr-8">
                    <span className="block min-w-0 truncate" title={getSpielLabel(candidate)}>
                      {getSpielLabel(candidate)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {spiel && (
            <div className="min-w-0 rounded-[8px] border p-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge variant="outline" className="max-w-full truncate">{spiel.feld}</Badge>
                <Badge variant="secondary">{spiel.zeit}</Badge>
                <Badge variant="outline" className="max-w-full truncate">{spiel.kategorie}</Badge>
              </div>
              <p className="!mt-3 break-words text-sm font-medium">
                {spiel.team1} <span className="text-muted-foreground">vs</span> {spiel.team2}
              </p>
              <Button
                type="button"
                onClick={() => openScoreDialog(spiel, token)}
                className="mt-3 w-full bg-[#5e6d35] text-white hover:bg-[#4f5d2f] sm:w-auto"
              >
                <Save className="size-4" />
                Punkte eintragen
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={resetScan}>
              <X className="size-4" />
              Zurücksetzen
            </Button>
          </div>
        </div>
      </CardContent>
      <canvas ref={canvasRef} className="hidden" />
      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent side="right" className="!w-full !max-w-[560px] min-w-0 overflow-hidden gap-0 p-0 sm:!w-[560px] sm:!max-w-[560px]">
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className="min-w-0 border-b px-5 py-4">
              <SheetTitle>Ergebnis eintragen</SheetTitle>
              <SheetDescription className="min-w-0 break-words">
                {spiel
                  ? `${spiel.zeit} · ${spiel.feld} · ${spiel.kategorie}`
                  : "Karte scannen oder Spiel auswählen."}
              </SheetDescription>
            </SheetHeader>
          {spiel && (
            <div className="grid min-h-0 min-w-0 flex-1 gap-4 overflow-y-auto px-5 py-4">
              <div className="min-w-0 rounded-[8px] border bg-[#f6f7f1] p-3">
                <p className="!mt-0 break-words text-sm font-semibold">{spiel.team1}</p>
                <p className="!my-1 text-xs text-muted-foreground">gegen</p>
                <p className="!mb-0 break-words text-sm font-semibold">{spiel.team2}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="scanner-dialog-tore-team1">Team 1</Label>
                  <Input
                    id="scanner-dialog-tore-team1"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={toreTeam1}
                    onChange={(event) => setToreTeam1(event.target.value)}
                    className="bg-white text-center text-2xl font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="scanner-dialog-tore-team2">Team 2</Label>
                  <Input
                    id="scanner-dialog-tore-team2"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={toreTeam2}
                    onChange={(event) => setToreTeam2(event.target.value)}
                    className="bg-white text-center text-2xl font-semibold"
                  />
                </div>
              </div>
            </div>
          )}
          <SheetFooter className="border-t bg-white px-5 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={saveResult}
              disabled={saving || !spiel || toreTeam1.trim() === "" || toreTeam2.trim() === ""}
              className="bg-[#5e6d35] text-white hover:bg-[#4f5d2f]"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Ergebnis speichern
            </Button>
          </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function getSpielLabel(spiel: Pick<Spiel, "zeit" | "feld" | "team1" | "team2">) {
  return `${spiel.zeit} · ${spiel.feld} · ${spiel.team1} vs ${spiel.team2}`;
}

function parseRefereeCardCode(rawValue: string) {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("SVP-SCORE:")) {
    return { spielId: "", token: trimmed.slice("SVP-SCORE:".length).trim() };
  }

  try {
    const parsedJson = JSON.parse(trimmed);

    if (parsedJson?.token) {
      return { spielId: "", token: String(parsedJson.token) };
    }

    if (parsedJson?.id) {
      return { spielId: String(parsedJson.id), token: "" };
    }
  } catch {
    // kein JSON
  }

  try {
    const url = new URL(trimmed, window.location.origin);
    const tokenFromPath = url.pathname.match(/\/schiedsrichterkarte\/([^/?#]+)/)?.[1];
    const tokenFromQuery = url.searchParams.get("token");

    return {
      spielId: url.searchParams.get("spielId") || "",
      token: tokenFromPath || tokenFromQuery || "",
    };
  } catch {
    return { spielId: "", token: trimmed };
  }
}

function waitForVideoMetadata(video: HTMLVideoElement) {
  if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    let onReady: () => void;
    let onError: () => void;
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onError);
    };
    onReady = () => {
      cleanup();
      resolve();
    };
    onError = () => {
      cleanup();
      reject(new Error("Kamera-Vorschau konnte nicht geladen werden"));
    };

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("error", onError);
  });
}

function imageFileToCanvas(file: File) {
  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));

      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Bild konnte nicht geladen werden"));
    };

    image.src = objectUrl;
  });
}

function analyzeScoreFromCanvas(canvas: HTMLCanvasElement, qrBox?: RectLike): ScoreScanResult {
  const candidates = [normalizeCardOrientation(canvas)];
  const cardFromQr = qrBox ? cropCardFromQr(canvas, qrBox) : null;

  if (cardFromQr) {
    candidates.unshift(normalizeCardOrientation(cardFromQr));
  }

  return candidates
    .map(analyzePreparedCardCanvas)
    .sort((first, second) => second.confidence - first.confidence)[0] || {
      team1: 0,
      team2: 0,
      confidence: 0,
      team1Marked: [],
      team2Marked: [],
    };
}

function analyzePreparedCardCanvas(normalizedCanvas: HTMLCanvasElement): ScoreScanResult {
  const normalizedContext = normalizedCanvas.getContext("2d", { willReadFrequently: true });

  if (!normalizedContext) {
    return { team1: 0, team2: 0, confidence: 0, team1Marked: [], team2Marked: [] };
  }

  const team1 = analyzeGoalGrid(
    normalizedContext,
    normalizedCanvas.width,
    normalizedCanvas.height,
    SCORE_GRID_TEAM_1_X_MM,
    SCORE_GRID_Y_MM
  );
  const team2 = analyzeGoalGrid(
    normalizedContext,
    normalizedCanvas.width,
    normalizedCanvas.height,
    SCORE_GRID_TEAM_2_X_MM,
    SCORE_GRID_Y_MM
  );
  const confidence = clamp((team1.confidence + team2.confidence) / 2, 0, 1);

  return {
    team1: team1.markedCells.length,
    team2: team2.markedCells.length,
    confidence,
    team1Marked: team1.markedCells,
    team2Marked: team2.markedCells,
  };
}

function cropCardFromQr(canvas: HTMLCanvasElement, qrBox: RectLike) {
  if (qrBox.width <= 0 || qrBox.height <= 0) {
    return null;
  }

  const scale = ((qrBox.width / QR_SIZE_MM) + (qrBox.height / QR_SIZE_MM)) / 2;
  const sourceX = qrBox.x - QR_X_MM * scale;
  const sourceY = qrBox.y - QR_Y_MM * scale;
  const sourceWidth = CARD_WIDTH_MM * scale;
  const sourceHeight = CARD_HEIGHT_MM * scale;

  if (
    !Number.isFinite(scale) ||
    scale <= 0 ||
    sourceX < 0 ||
    sourceY < 0 ||
    sourceX + sourceWidth > canvas.width ||
    sourceY + sourceHeight > canvas.height
  ) {
    return null;
  }

  const cropped = document.createElement("canvas");
  cropped.width = Math.max(1, Math.round(sourceWidth));
  cropped.height = Math.max(1, Math.round(sourceHeight));
  cropped
    .getContext("2d")
    ?.drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, cropped.width, cropped.height);

  return cropped;
}

function normalizeCardOrientation(canvas: HTMLCanvasElement) {
  if (canvas.height >= canvas.width) {
    return canvas;
  }

  const rotated = document.createElement("canvas");
  rotated.width = canvas.height;
  rotated.height = canvas.width;
  const context = rotated.getContext("2d");

  if (!context) {
    return canvas;
  }

  context.translate(rotated.width / 2, rotated.height / 2);
  context.rotate(-Math.PI / 2);
  context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return rotated;
}

function analyzeGoalGrid(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  gridXMm: number,
  gridYMm: number
) {
  const ratios = Array.from({ length: 30 }, (_, index) => {
    const goal = index + 1;
    const column = index % SCORE_GRID_COLUMNS;
    const row = Math.floor(index / SCORE_GRID_COLUMNS);
    const cellX = mmToPx(gridXMm + column * SCORE_GRID_CELL_WIDTH_MM, canvasWidth, CARD_WIDTH_MM);
    const cellY = mmToPx(gridYMm + row * SCORE_GRID_CELL_HEIGHT_MM, canvasHeight, CARD_HEIGHT_MM);
    const cellWidth = mmToPx(SCORE_GRID_CELL_WIDTH_MM, canvasWidth, CARD_WIDTH_MM);
    const cellHeight = mmToPx(SCORE_GRID_CELL_HEIGHT_MM, canvasHeight, CARD_HEIGHT_MM);

    return {
      goal,
      ratio: darkPixelRatio(context, cellX, cellY, cellWidth, cellHeight),
    };
  });
  const values = ratios.map((entry) => entry.ratio).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)] || 0;
  const threshold = Math.max(0.08, median + 0.045);
  const marked = ratios.filter((entry) => entry.ratio >= threshold);
  const markedAvg = average(marked.map((entry) => entry.ratio));
  const unmarkedAvg = average(ratios.filter((entry) => entry.ratio < threshold).map((entry) => entry.ratio));

  return {
    markedCells: marked.map((entry) => entry.goal),
    confidence: clamp((markedAvg - unmarkedAvg) / 0.16, 0, 1),
  };
}

function darkPixelRatio(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const insetX = width * 0.18;
  const insetY = height * 0.16;
  const sampleX = Math.max(0, Math.round(x + insetX));
  const sampleY = Math.max(0, Math.round(y + insetY));
  const sampleWidth = Math.max(1, Math.round(width - insetX * 2));
  const sampleHeight = Math.max(1, Math.round(height - insetY * 2));
  const image = context.getImageData(sampleX, sampleY, sampleWidth, sampleHeight);
  let darkPixels = 0;

  for (let index = 0; index < image.data.length; index += 4) {
    const red = image.data[index];
    const green = image.data[index + 1];
    const blue = image.data[index + 2];
    const alpha = image.data[index + 3];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;

    if (alpha > 30 && luminance < 135) {
      darkPixels += 1;
    }
  }

  return darkPixels / (sampleWidth * sampleHeight);
}

function mmToPx(value: number, pixels: number, mm: number) {
  return (value / mm) * pixels;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
