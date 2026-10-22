import { useMemo, useState } from "react";
import { useSupportChatConfig } from "./SupportChatProvider";
import { SupportChatPanel } from "./SupportChatPanel";
import { SupportChatSessionProvider, useSupportChatSession } from "./SupportChatSessionContext";
import { SupportIcon } from "./SupportIcon";
import { warmUpMessageSound } from "./messageSound";
import { formatUnreadBadge } from "./sessionStorage";
import { useDraggableLauncher } from "./useDraggableLauncher";
import { useSupportWidgetLocale } from "./useSupportWidgetLocale";
import type { LauncherAnchor } from "./launcherPosition";

const LABELS = {
  ru: "Техническая поддержка",
  en: "Technical support",
  de: "Technischer Support",
};

const DRAG_HINTS = {
  ru: "Перетащите, чтобы переместить",
  en: "Drag to reposition",
  de: "Ziehen zum Verschieben",
};

const UNREAD_LABELS = {
  ru: "новых сообщений",
  en: "new messages",
  de: "neue Nachrichten",
};

type LauncherButtonProps = {
  open: boolean;
  onToggle: () => void;
  buttonRef: ReturnType<typeof useDraggableLauncher>["buttonRef"];
  anchor: LauncherAnchor | null;
  usesCustomAnchor: boolean;
  isDragging: boolean;
  onPointerDown: ReturnType<typeof useDraggableLauncher>["onPointerDown"];
  consumeSuppressedClick: ReturnType<typeof useDraggableLauncher>["consumeSuppressedClick"];
};

function LauncherDragHint() {
  return (
    <span className="support-widget__launcher-drag-hint" aria-hidden="true">
      {(["n", "e", "s", "w"] as const).map((direction) => (
        <span
          key={direction}
          className={`support-widget__launcher-drag-arrow support-widget__launcher-drag-arrow--${direction}`}
        >
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden focusable={false}>
            <path
              d="M2 8 L6 4 L10 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ))}
    </span>
  );
}

function SupportChatLauncherButton({
  open,
  onToggle,
  buttonRef,
  anchor,
  usesCustomAnchor,
  isDragging,
  onPointerDown,
  consumeSuppressedClick,
}: LauncherButtonProps) {
  const config = useSupportChatConfig();
  const { unreadCount } = useSupportChatSession();
  const widgetLocale = useSupportWidgetLocale();
  const ariaLabel = useMemo(() => LABELS[widgetLocale], [widgetLocale]);
  const dragHint = DRAG_HINTS[widgetLocale];
  const positionClass = usesCustomAnchor ? "" : `support-widget__launcher--${config.position ?? "bottom-right"}`;
  const badgeLabel = formatUnreadBadge(unreadCount);
  const showBadge = !open && unreadCount > 0;

  return (
    <button
      ref={buttonRef}
      type="button"
      className={[
        "support-widget__launcher",
        positionClass,
        open ? "support-widget__launcher--open" : "",
        isDragging ? "support-widget__launcher--dragging" : "",
        usesCustomAnchor ? "support-widget__launcher--custom" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        usesCustomAnchor && anchor
          ? { left: `${anchor.left}px`, top: `${anchor.top}px` }
          : undefined
      }
      aria-expanded={open}
      aria-controls="support-chat-panel"
      aria-grabbed={isDragging}
      aria-label={
        showBadge
          ? `${ariaLabel}, ${unreadCount} ${UNREAD_LABELS[widgetLocale]}`
          : ariaLabel
      }
      title={`${ariaLabel}. ${dragHint}.`}
      onPointerDown={onPointerDown}
      onClick={() => {
        if (consumeSuppressedClick()) {
          return;
        }
        warmUpMessageSound();
        onToggle();
      }}
    >
      {!isDragging ? <LauncherDragHint /> : null}
      <SupportIcon className="support-widget__launcher-icon" />
      {showBadge ? (
        <span className="support-widget__launcher-badge" aria-hidden="true">
          {badgeLabel}
        </span>
      ) : null}
    </button>
  );
}

export function SupportChatLauncher() {
  const [open, setOpen] = useState(false);
  const drag = useDraggableLauncher();

  return (
    <SupportChatSessionProvider panelOpen={open}>
      <SupportChatLauncherButton
        open={open}
        onToggle={() => setOpen((value) => !value)}
        buttonRef={drag.buttonRef}
        anchor={drag.anchor}
        usesCustomAnchor={drag.usesCustomAnchor}
        isDragging={drag.isDragging}
        onPointerDown={drag.onPointerDown}
        consumeSuppressedClick={drag.consumeSuppressedClick}
      />
      {open ? (
        <SupportChatPanel
          onClose={() => setOpen(false)}
          launcherAnchor={drag.usesCustomAnchor ? drag.anchor : null}
        />
      ) : null}
    </SupportChatSessionProvider>
  );
}
