"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, CheckSquare, MessageSquare, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DockLink = {
  href: string;
  label: string;
  icon: typeof MessageSquare;
  count?: number;
};

export function FloatingChatDock({
  primaryLabel,
  links,
}: {
  primaryLabel: string;
  links: DockLink[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="floating-dock">
      {open ? (
        <div className="floating-dock-panel">
          <div className="flex items-center justify-between gap-3">
            <div className="grid gap-1">
              <span className="row-kicker">Quick access</span>
              <strong>{primaryLabel}</strong>
            </div>
            <Button onClick={() => setOpen(false)} size="icon" variant="ghost">
              <X className="size-4" />
            </Button>
          </div>

          <div className="grid gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  className="flex items-center justify-between rounded-2xl bg-[color:var(--panel-muted)] px-4 py-3 transition hover:bg-white"
                  href={link.href}
                  key={link.href}
                  onClick={() => setOpen(false)}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-2xl bg-white">
                      <Icon className="size-4" />
                    </span>
                    {link.label}
                  </span>
                  {typeof link.count === "number" ? (
                    <Badge variant={link.count > 0 ? "default" : "neutral"}>
                      {link.count}
                    </Badge>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <Button
        className="shadow-[0_20px_60px_rgba(17,20,24,0.16)]"
        onClick={() => setOpen((current) => !current)}
        size="lg"
      >
        <MessageSquare className="size-4" />
        {primaryLabel}
      </Button>
    </div>
  );
}

export const dockIcons = {
  chats: MessageSquare,
  tasks: CheckSquare,
  alerts: Bell,
};
