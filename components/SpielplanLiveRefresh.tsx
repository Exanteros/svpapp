"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface SpielplanLiveRefreshProps {
  enabled?: boolean;
}

export function useSpielplanLiveEvents(onUpdate: () => void, enabled = true) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    let pendingRefresh: number | undefined;
    let fallbackInterval: number | undefined;

    const triggerUpdate = () => {
      if (pendingRefresh) {
        window.clearTimeout(pendingRefresh);
      }

      pendingRefresh = window.setTimeout(() => {
        onUpdateRef.current();
        pendingRefresh = undefined;
      }, 200);
    };

    if (typeof EventSource === "undefined") {
      fallbackInterval = window.setInterval(triggerUpdate, 15000);
      return () => {
        window.clearInterval(fallbackInterval);
        if (pendingRefresh) window.clearTimeout(pendingRefresh);
      };
    }

    const source = new EventSource("/api/spielplan/events");

    source.addEventListener("spielplan:update", triggerUpdate);
    source.onopen = () => {
      if (fallbackInterval) {
        window.clearInterval(fallbackInterval);
        fallbackInterval = undefined;
      }
    };
    source.onerror = () => {
      fallbackInterval ??= window.setInterval(triggerUpdate, 15000);
    };

    return () => {
      source.removeEventListener("spielplan:update", triggerUpdate);
      source.close();

      if (fallbackInterval) {
        window.clearInterval(fallbackInterval);
      }

      if (pendingRefresh) {
        window.clearTimeout(pendingRefresh);
      }
    };
  }, [enabled]);
}

export function SpielplanLiveRefresh({ enabled = true }: SpielplanLiveRefreshProps) {
  const router = useRouter();

  useSpielplanLiveEvents(() => {
    router.refresh();
  }, enabled);

  return null;
}
