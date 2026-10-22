export type SupportChatTheme = {
  /** When true (default), map host design tokens via CSS var() fallbacks. */
  inheritHostTheme?: boolean;
  fontFamily?: string;
  accentBg?: string;
  accentText?: string;
  accentBgHover?: string;
  panelBg?: string;
  panelHeaderBg?: string;
  panelBorder?: string;
  textPrimary?: string;
  textSecondary?: string;
  messageAssistantBg?: string;
  messageUserBg?: string;
  inputBg?: string;
  inputBorder?: string;
  inputFocusBorder?: string;
  secondaryButtonBg?: string;
  secondaryButtonText?: string;
  errorText?: string;
  shadow?: string;
  radiusPanel?: string;
  radiusButton?: string;
  radiusMessage?: string;
};

/** Product-specific visible UI state; keys come from host manifest.ts. */
export type SupportSurfaceSnapshot = Record<string, unknown>;

export type SupportMessageAttachment = {
  id: string;
  mime: string;
  name?: string;
  data_base64: string;
};

export type SupportHostContext = {
  project_id: string;
  route?: string;
  locale?: string;
  user_role?: string;
  company_code?: string;
  plant_id?: string;
  user_login?: string;
  /** Visible UI state from the host app (same values the user sees on screen). */
  surface?: SupportSurfaceSnapshot;
};

export type SupportChatConfig = {
  apiBaseUrl: string;
  projectId: string;
  getAuthHeaders?: () => Promise<Record<string, string>>;
  getContext: () => SupportHostContext;
  locale?: "ru" | "en" | "de";
  position?: "bottom-right" | "bottom-left" | "top-right";
  title?: string;
  /** Host auth state. When sign-in is required, the widget stays visible but makes no Support API calls. */
  access?: {
    status: "authenticated" | "sign_in_required";
    message?: string;
  };
  theme?: SupportChatTheme;
  /** Poll session for new replies while chat panel is closed (default 5000 ms). Set 0 to disable. */
  pollIntervalMs?: number;
  /** HTTP timeout for poll/session calls (default 15000 ms). POST /messages uses at least 120000 ms. */
  requestTimeoutMs?: number;
  /** Play a short sound when assistant/operator messages arrive (default true). */
  messageSoundEnabled?: boolean;
  /** Optional custom notification sound URL (defaults to built-in tone). */
  messageSoundUrl?: string;
};

export type SupportMessage = {
  role: "user" | "assistant" | "operator";
  content: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
};

export type SupportSession = {
  session_id: string;
  project_id: string;
  user_id: string;
  title: string;
  messages: SupportMessage[];
  context?: Record<string, unknown>;
};
