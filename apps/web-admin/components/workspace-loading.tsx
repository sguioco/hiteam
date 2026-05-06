"use client";

import { cn } from "@/lib/utils";
import { Swirling } from "@/components/ui/swirling";

type WorkspaceLoadingProps = {
  className?: string;
  iconClassName?: string;
  label?: string;
};

export function WorkspaceLoading({
  className,
  iconClassName,
  label = "Loading",
}: WorkspaceLoadingProps) {
  return (
    <div
      aria-label={label}
      aria-live="polite"
      className={cn("workspace-loading", className)}
      role="status"
    >
      <Swirling
        aria-hidden="true"
        className={cn("workspace-loading-icon", iconClassName)}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
