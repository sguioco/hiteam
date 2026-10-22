"use client";

import { useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import type { AuthSession } from "@/lib/auth";
import { useSupportEnabled } from "@/lib/support-availability";
import { SupportChatLauncher, SupportChatProvider, type SupportChatConfig, type SupportHostContext } from "./widget";
import "./hiteam-support.css";

export function ProductSupportChatRoot({ session, locale }: { session: AuthSession; locale: string }) {
  const enabled = useSupportEnabled();
  const pathname = usePathname();
  const { id, tenantId } = session.user;
  const language = locale === "ru" ? "ru" : "en";
  const getContext = useCallback((): SupportHostContext => ({
    project_id: "hiteam", route: pathname, locale: language, user_login: id,
    company_code: tenantId.toLowerCase(), surface: { route: pathname, language },
  }), [pathname, language, id, tenantId]);
  const config = useMemo<SupportChatConfig>(() => ({
    apiBaseUrl: "/api", projectId: "hiteam", locale: language,
    title: language === "ru" ? "Поддержка HiTeam" : "HiTeam Support",
    access: { status: "authenticated" }, position: "bottom-right",
    getAuthHeaders: async () => ({ Authorization: `Bearer ${session.accessToken}` }), getContext,
    theme: { inheritHostTheme: false, accentBg: "#2563eb", accentBgHover: "#1d4ed8",
      accentText: "#ffffff", panelBg: "#ffffff", panelHeaderBg: "#f4f7ff",
      textPrimary: "#0f172a", textSecondary: "#64748b", messageAssistantBg: "#f8fafc",
      messageUserBg: "#eff6ff", inputBg: "#ffffff", radiusPanel: "24px" },
  }), [language, session.accessToken, getContext]);
  if (!enabled || typeof document === "undefined") return null;
  return createPortal(<div className="hiteam-support" translate="no">
    <SupportChatProvider key={`${id}:${tenantId}`} config={config}><SupportChatLauncher /></SupportChatProvider>
  </div>, document.body);
}
