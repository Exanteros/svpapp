"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export default function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let mounted = true;

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        if (!mounted) {
          return;
        }

        if (registration.waiting && navigator.serviceWorker.controller) {
          setUpdateRegistration(registration);
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;

          if (!worker) {
            return;
          }

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateRegistration(registration);
            }
          });
        });
      } catch (error) {
        console.error("Service Worker konnte nicht registriert werden:", error);
      }
    }

    function reloadAfterControllerChange() {
      window.location.reload();
    }

    registerServiceWorker();
    navigator.serviceWorker.addEventListener("controllerchange", reloadAfterControllerChange);

    return () => {
      mounted = false;
      navigator.serviceWorker.removeEventListener("controllerchange", reloadAfterControllerChange);
    };
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();

      if (!isStandalone()) {
        setInstallPrompt(event as BeforeInstallPromptEvent);
      }
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
      setInstallDismissed(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome !== "dismissed") {
      setInstallPrompt(null);
    }
  }

  function applyUpdate() {
    updateRegistration?.waiting?.postMessage({ type: "SKIP_WAITING" });
  }

  if (updateRegistration) {
    return (
      <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm rounded-[8px] border bg-white/95 p-3 shadow-lg backdrop-blur pwa-floating-panel">
        <div className="flex items-center gap-3">
          <RefreshCw className="size-4 shrink-0 text-[#5e6d35]" />
          <p className="!mt-0 min-w-0 flex-1 text-sm text-muted-foreground">Neue Version bereit.</p>
          <Button type="button" size="sm" onClick={applyUpdate} className="bg-[#5e6d35] text-white hover:bg-[#4f5d2f]">
            Aktualisieren
          </Button>
        </div>
      </div>
    );
  }

  if (!installPrompt || installDismissed) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm rounded-[8px] border bg-white/95 p-3 shadow-lg backdrop-blur pwa-floating-panel">
      <div className="flex items-center gap-3">
        <Download className="size-4 shrink-0 text-[#5e6d35]" />
        <p className="!mt-0 min-w-0 flex-1 text-sm text-muted-foreground">App installieren.</p>
        <Button type="button" size="sm" onClick={installApp} className="bg-[#5e6d35] text-white hover:bg-[#4f5d2f]">
          Installieren
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Installationshinweis ausblenden" onClick={() => setInstallDismissed(true)}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
