"use client";

import { type Locale, useI18n } from "@/lib/i18n";
import { AdminShellLoadingSidebar } from "./admin-shell-loading-sidebar";
import { WorkspaceLoading } from "./workspace-loading";

type LoadingLabel = string | Record<Locale, string>;

const DEFAULT_LOADING_LABEL: Record<Locale, string> = {
  en: "Loading",
  ru: "Загрузка",
};

function resolveLoadingLabel(label: LoadingLabel, locale: Locale) {
  return typeof label === "string" ? label : label[locale];
}

export default function AdminShellLoadingFrame({
  activeHref = "/app",
  label = DEFAULT_LOADING_LABEL,
  locale,
}: {
  activeHref?: string;
  label?: LoadingLabel;
  locale?: Locale;
}) {
  const { locale: contextLocale } = useI18n();
  const resolvedLocale = locale ?? contextLocale;
  const resolvedLabel = resolveLoadingLabel(label, resolvedLocale);

  return (
    <div className="admin-frame admin-frame-checking-session">
      <AdminShellLoadingSidebar
        activeHref={activeHref}
        locale={resolvedLocale}
      />

      <section className="admin-content admin-content-session-check">
        <div className="shell-stage session-check-stage">
          <WorkspaceLoading
            className="admin-session-check-status"
            label={resolvedLabel}
          />
        </div>
      </section>
    </div>
  );
}
