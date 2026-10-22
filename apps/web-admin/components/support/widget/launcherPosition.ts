import type { SupportChatConfig } from "./types";

export type LauncherAnchor = {
  left: number;
  top: number;
};

export const LAUNCHER_SIZE_PX = 52;
const STORAGE_PREFIX = "quatrotech-support-launcher";
const VIEWPORT_MARGIN = 12;
const LAUNCHER_GAP = 12;

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}:${projectId}`;
}

export function loadLauncherAnchor(projectId: string): LauncherAnchor | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as LauncherAnchor;
    if (!Number.isFinite(parsed?.left) || !Number.isFinite(parsed?.top)) {
      return null;
    }
    return clampLauncherAnchor(parsed);
  } catch {
    return null;
  }
}

export function saveLauncherAnchor(projectId: string, anchor: LauncherAnchor): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(clampLauncherAnchor(anchor)));
  } catch {
    // ignore quota / private mode
  }
}

export function defaultAnchorForPosition(position: SupportChatConfig["position"] = "bottom-right"): LauncherAnchor {
  const size = LAUNCHER_SIZE_PX;
  const margin = 20;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  switch (position) {
    case "bottom-left":
      return clampLauncherAnchor({ left: margin, top: vh - size - margin });
    case "top-right":
      return clampLauncherAnchor({ left: vw - size - margin, top: margin });
    case "bottom-right":
    default:
      return clampLauncherAnchor({ left: vw - size - margin, top: vh - size - margin });
  }
}

export function clampLauncherAnchor(
  anchor: LauncherAnchor,
  size = LAUNCHER_SIZE_PX,
  margin = VIEWPORT_MARGIN,
): LauncherAnchor {
  if (typeof window === "undefined") {
    return anchor;
  }
  const maxLeft = Math.max(margin, window.innerWidth - size - margin);
  const maxTop = Math.max(margin, window.innerHeight - size - margin);
  return {
    left: Math.min(Math.max(margin, anchor.left), maxLeft),
    top: Math.min(Math.max(margin, anchor.top), maxTop),
  };
}

export function readLauncherAnchor(element: HTMLElement): LauncherAnchor {
  const rect = element.getBoundingClientRect();
  return clampLauncherAnchor({ left: rect.left, top: rect.top });
}

export function computePanelAnchor(
  launcher: LauncherAnchor,
  panelWidth: number,
  panelHeight: number,
): LauncherAnchor {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const openAbove = launcher.top + LAUNCHER_SIZE_PX > vh * 0.45;
  let top = openAbove
    ? launcher.top - panelHeight - LAUNCHER_GAP
    : launcher.top + LAUNCHER_SIZE_PX + LAUNCHER_GAP;
  let left = launcher.left + LAUNCHER_SIZE_PX - panelWidth;
  left = Math.min(Math.max(VIEWPORT_MARGIN, left), vw - panelWidth - VIEWPORT_MARGIN);
  top = Math.min(Math.max(VIEWPORT_MARGIN, top), vh - panelHeight - VIEWPORT_MARGIN);
  return { left, top };
}
