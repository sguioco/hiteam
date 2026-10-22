"use client";

import { ReactNode } from "react";
import { ChunkLoadRecovery } from "@/components/chunk-load-recovery";
import { AdminShellStateProvider } from "@/components/admin-shell-state-provider";
import { LivePageTranslation } from "@/components/live-page-translation";
import { I18nProvider } from "../lib/i18n";
import { SupportAvailabilityContext } from "@/lib/support-availability";

export function Providers({
  children,
  initialLocale,
  supportEnabled = false,
}: {
  children: ReactNode;
  initialLocale: "en" | "ru";
  supportEnabled?: boolean;
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <SupportAvailabilityContext.Provider value={supportEnabled}>
      <AdminShellStateProvider>
        <ChunkLoadRecovery />
        {children}
        <LivePageTranslation scope="document" />
      </AdminShellStateProvider>
      </SupportAvailabilityContext.Provider>
    </I18nProvider>
  );
}
