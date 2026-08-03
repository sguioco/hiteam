"use client";

import { ReactNode } from "react";
import { ChunkLoadRecovery } from "@/components/chunk-load-recovery";
import { AdminShellStateProvider } from "@/components/admin-shell-state-provider";
import { LivePageTranslation } from "@/components/live-page-translation";
import { I18nProvider } from "../lib/i18n";

export function Providers({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: "en" | "ru";
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <AdminShellStateProvider>
        <ChunkLoadRecovery />
        {children}
        <LivePageTranslation scope="document" />
      </AdminShellStateProvider>
    </I18nProvider>
  );
}
