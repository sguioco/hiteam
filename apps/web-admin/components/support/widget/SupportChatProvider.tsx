import { createContext, useContext, type ReactNode } from "react";
import type { SupportChatConfig } from "./types";
import { resolveSupportChatThemeStyle } from "./theme";
import "./support-widget.css";

const SupportChatConfigContext = createContext<SupportChatConfig | null>(null);

export function SupportChatProvider({
  config,
  children,
}: {
  config: SupportChatConfig;
  children: ReactNode;
}) {
  const inheritHostTheme = config.theme?.inheritHostTheme !== false;
  const themeStyle = resolveSupportChatThemeStyle(config.theme);

  return (
    <SupportChatConfigContext.Provider value={config}>
      <div
        className={[
          "support-widget",
          inheritHostTheme ? "support-widget--inherit-host" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={themeStyle}
      >
        {children}
      </div>
    </SupportChatConfigContext.Provider>
  );
}

export function useSupportChatConfig(): SupportChatConfig {
  const value = useContext(SupportChatConfigContext);
  if (!value) {
    throw new Error("SupportChatProvider is missing");
  }
  return value;
}
