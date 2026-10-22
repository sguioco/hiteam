import type { CSSProperties } from "react";
import type { SupportChatTheme } from "./types";

const THEME_KEYS = [
  "fontFamily",
  "accentBg",
  "accentText",
  "accentBgHover",
  "panelBg",
  "panelHeaderBg",
  "panelBorder",
  "textPrimary",
  "textSecondary",
  "messageAssistantBg",
  "messageUserBg",
  "inputBg",
  "inputBorder",
  "inputFocusBorder",
  "secondaryButtonBg",
  "secondaryButtonText",
  "errorText",
  "shadow",
  "radiusPanel",
  "radiusButton",
  "radiusMessage",
] as const;

type ThemeKey = (typeof THEME_KEYS)[number];

const CSS_VAR_MAP: Record<ThemeKey, string> = {
  fontFamily: "--sw-font-family",
  accentBg: "--sw-accent-bg",
  accentText: "--sw-accent-text",
  accentBgHover: "--sw-accent-bg-hover",
  panelBg: "--sw-panel-bg",
  panelHeaderBg: "--sw-panel-header-bg",
  panelBorder: "--sw-panel-border",
  textPrimary: "--sw-text-primary",
  textSecondary: "--sw-text-secondary",
  messageAssistantBg: "--sw-message-assistant-bg",
  messageUserBg: "--sw-message-user-bg",
  inputBg: "--sw-input-bg",
  inputBorder: "--sw-input-border",
  inputFocusBorder: "--sw-input-focus-border",
  secondaryButtonBg: "--sw-secondary-button-bg",
  secondaryButtonText: "--sw-secondary-button-text",
  errorText: "--sw-error-text",
  shadow: "--sw-shadow",
  radiusPanel: "--sw-radius-panel",
  radiusButton: "--sw-radius-button",
  radiusMessage: "--sw-radius-message",
};

export function resolveSupportChatThemeStyle(theme?: SupportChatTheme): CSSProperties {
  if (!theme) return {};
  const style: Record<string, string> = {};
  for (const key of THEME_KEYS) {
    const value = theme[key];
    if (value) {
      style[CSS_VAR_MAP[key]] = value;
    }
  }
  return style;
}
