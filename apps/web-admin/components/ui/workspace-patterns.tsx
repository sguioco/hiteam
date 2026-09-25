import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function WorkspacePageHeader({ eyebrow, title, description, actions, className }: {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return <header className={cn("flex min-w-0 flex-wrap items-start justify-between gap-4", className)}>
    <div className="min-w-0 space-y-2">
      {eyebrow ? <p className="font-heading text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">{eyebrow}</p> : null}
      {title ? <h1 className="break-words font-heading text-3xl font-semibold leading-tight tracking-[-0.045em] text-foreground sm:text-[2.5rem]">{title}</h1> : null}
      {description ? <p className="max-w-2xl font-heading text-sm leading-6 text-muted-foreground">{description}</p> : null}
    </div>
    {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
  </header>;
}

export function WorkspacePanel({ children, className, ...props }: ComponentProps<"section">) {
  return <section className={cn("min-w-0 rounded-2xl border border-border bg-white shadow-[0_14px_38px_rgba(15,23,42,0.07)]", className)} {...props}>{children}</section>;
}

export function WorkspaceFilterBar({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return <div aria-label={label} className={cn("flex min-w-0 flex-wrap items-end gap-3", className)} role="group">{children}</div>;
}

export function WorkspaceFeedback({ title, description, tone = "empty", action, className }: {
  title: string;
  description?: string;
  tone?: "empty" | "error";
  action?: ReactNode;
  className?: string;
}) {
  return <div className={cn("rounded-2xl border p-6 text-center", tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-dashed border-border bg-white text-foreground", className)} role={tone === "error" ? "alert" : "status"}>
    <p className="font-heading text-sm font-semibold">{title}</p>
    {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
  </div>;
}

export function WorkspaceStatus({ children, tone }: { children: ReactNode; tone: "neutral" | "success" | "warning" | "danger" }) {
  return <span className={cn("inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold", {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-red-50 text-red-700",
  }[tone])}>{children}</span>;
}
