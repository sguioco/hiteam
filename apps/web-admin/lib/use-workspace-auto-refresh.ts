"use client";

import { useEffect, useRef } from "react";
import type { AuthSession } from "./auth";
import { createCollaborationSocket } from "./collaboration-socket";

export const WORKSPACE_AUTO_REFRESH_INTERVAL_MS = 10_000;

export type WorkspaceAutoRefreshReason =
  | "interval"
  | "focus"
  | "visibility"
  | "online"
  | "socket";

export function useWorkspaceAutoRefresh({
  enabled = true,
  intervalMs = WORKSPACE_AUTO_REFRESH_INTERVAL_MS,
  minGapMs = 1_200,
  onRefresh,
  session,
}: {
  enabled?: boolean;
  intervalMs?: number;
  minGapMs?: number;
  onRefresh: (reason: WorkspaceAutoRefreshReason) => Promise<void> | void;
  session: AuthSession | null;
}) {
  const onRefreshRef = useRef(onRefresh);
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);
  const lastRefreshStartedAtRef = useRef(0);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || !session || typeof window === "undefined") {
      return;
    }

    let active = true;
    const socket = createCollaborationSocket(session.accessToken);

    const runRefresh = (reason: WorkspaceAutoRefreshReason) => {
      if (!active) {
        return;
      }

      if (reason === "interval" && document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();
      if (inFlightRefreshRef.current || now - lastRefreshStartedAtRef.current < minGapMs) {
        return;
      }

      lastRefreshStartedAtRef.current = now;

      const refreshPromise = Promise.resolve(onRefreshRef.current(reason))
        .catch(() => undefined)
        .finally(() => {
          if (inFlightRefreshRef.current === refreshPromise) {
            inFlightRefreshRef.current = null;
          }
        });

      inFlightRefreshRef.current = refreshPromise;
    };

    const handleFocus = () => runRefresh("focus");
    const handleOnline = () => runRefresh("online");
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runRefresh("visibility");
      }
    };

    const intervalId = window.setInterval(() => {
      runRefresh("interval");
    }, intervalMs);

    socket.on("workspace:refresh", () => {
      runRefresh("socket");
    });
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      socket.disconnect();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs, minGapMs, session?.accessToken, session?.user.id]);
}
