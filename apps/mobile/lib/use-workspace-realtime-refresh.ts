import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { createCollaborationSocket } from "./collaboration-socket";

export function useWorkspaceRealtimeRefresh({
  debounceMs = 180,
  enabled = true,
  onRefresh,
}: {
  debounceMs?: number;
  enabled?: boolean;
  onRefresh: () => Promise<void> | void;
}) {
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;
    let socket: Socket | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) {
        return;
      }

      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void Promise.resolve(onRefreshRef.current()).catch(() => undefined);
      }, debounceMs);
    };

    void createCollaborationSocket()
      .then((instance) => {
        if (!active) {
          instance.disconnect();
          return;
        }

        socket = instance;
        socket.on("workspace:refresh", scheduleRefresh);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      socket?.disconnect();
    };
  }, [debounceMs, enabled]);
}
