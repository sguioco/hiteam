import { useMemo } from "react";
import { useSupportChatConfig } from "./SupportChatProvider";
import { resolveSupportLocale, type SupportWidgetLocale } from "./locale";

export function useSupportWidgetLocale(): SupportWidgetLocale {
  const config = useSupportChatConfig();
  return useMemo(() => resolveSupportLocale(config), [config]);
}
