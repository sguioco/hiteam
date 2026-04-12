import type { MouseEvent } from "react";

export type RouteClickEvent = Pick<
  MouseEvent<HTMLElement>,
  | "altKey"
  | "button"
  | "ctrlKey"
  | "defaultPrevented"
  | "metaKey"
  | "shiftKey"
>;

export function isPlainLeftClick(event?: RouteClickEvent | null): boolean {
  if (!event) {
    return true;
  }

  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function shouldHandleRouteClick(event?: RouteClickEvent | null): boolean {
  return isPlainLeftClick(event);
}

export function navigateWithClickSupport(
  push: (href: string) => void,
  href: string,
  event?: RouteClickEvent | null,
): void {
  if (isPlainLeftClick(event)) {
    push(href);
    return;
  }

  if (typeof window !== "undefined" && event && (event.metaKey || event.ctrlKey)) {
    window.open(href, "_blank", "noopener,noreferrer");
  }
}
