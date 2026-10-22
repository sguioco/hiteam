import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useSupportChatConfig } from "./SupportChatProvider";
import {
  clampLauncherAnchor,
  defaultAnchorForPosition,
  loadLauncherAnchor,
  readLauncherAnchor,
  saveLauncherAnchor,
  type LauncherAnchor,
} from "./launcherPosition";

const DRAG_THRESHOLD_PX = 6;

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  origin: LauncherAnchor;
  moved: boolean;
};

export function useDraggableLauncher() {
  const config = useSupportChatConfig();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);
  const [anchor, setAnchor] = useState<LauncherAnchor | null>(() => loadLauncherAnchor(config.projectId));
  const [isDragging, setIsDragging] = useState(false);
  const [usesCustomAnchor, setUsesCustomAnchor] = useState(() => loadLauncherAnchor(config.projectId) !== null);

  useEffect(() => {
    setAnchor(loadLauncherAnchor(config.projectId));
    setUsesCustomAnchor(loadLauncherAnchor(config.projectId) !== null);
  }, [config.projectId]);

  useEffect(() => {
    if (!usesCustomAnchor || !anchor) {
      return;
    }
    function handleResize() {
      setAnchor((current) => {
        if (!current) {
          return current;
        }
        const next = clampLauncherAnchor(current);
        saveLauncherAnchor(config.projectId, next);
        return next;
      });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [anchor, config.projectId, usesCustomAnchor]);

  const finishDrag = useCallback(
    (session: DragSession) => {
      dragSessionRef.current = null;
      setIsDragging(false);
      if (session.moved) {
        suppressClickRef.current = true;
        setUsesCustomAnchor(true);
        setAnchor((current) => {
          if (!current) {
            return current;
          }
          const next = clampLauncherAnchor(current);
          saveLauncherAnchor(config.projectId, next);
          return next;
        });
      }
    },
    [config.projectId],
  );

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const session = dragSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }
      const deltaX = event.clientX - session.startX;
      const deltaY = event.clientY - session.startY;
      if (!session.moved) {
        if (Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) {
          return;
        }
        session.moved = true;
        setIsDragging(true);
      }
      event.preventDefault();
      setUsesCustomAnchor(true);
      setAnchor(
        clampLauncherAnchor({
          left: session.origin.left + deltaX,
          top: session.origin.top + deltaY,
        }),
      );
    }

    function handlePointerUp(event: PointerEvent) {
      const session = dragSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }
      finishDrag(session);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [finishDrag]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }
    const element = buttonRef.current;
    if (!element) {
      return;
    }
    const origin = usesCustomAnchor && anchor ? anchor : readLauncherAnchor(element);
    dragSessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin,
      moved: false,
    };
    if (!usesCustomAnchor) {
      setUsesCustomAnchor(true);
      setAnchor(origin);
    }
  }, [anchor, usesCustomAnchor]);

  const consumeSuppressedClick = useCallback(() => {
    if (!suppressClickRef.current) {
      return false;
    }
    suppressClickRef.current = false;
    return true;
  }, []);

  const resolvedAnchor =
    anchor ??
    (typeof window !== "undefined" ? defaultAnchorForPosition(config.position) : null);

  return {
    buttonRef,
    anchor: resolvedAnchor,
    usesCustomAnchor,
    isDragging,
    onPointerDown,
    consumeSuppressedClick,
  };
}
