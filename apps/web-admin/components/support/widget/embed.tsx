import { createRoot, type Root } from "react-dom/client";
import { SupportChatLauncher } from "./SupportChatLauncher";
import { SupportChatProvider } from "./SupportChatProvider";
import type { SupportChatConfig } from "./types";

/**
 * Browser contract owned by QuatroTech-Support.
 *
 * The product supplies only short-lived identity headers and an on-screen
 * context callback.  The rendered UI, API client and its release lifecycle
 * stay in this repository and are served independently from the product UI.
 */
export type SupportWidgetEmbedApi = {
  mount(target: HTMLElement, config: SupportChatConfig): { unmount(): void };
};

function mount(target: HTMLElement, config: SupportChatConfig): { unmount(): void } {
  let root: Root | null = createRoot(target);
  root.render(
    <SupportChatProvider config={config}>
      <SupportChatLauncher />
    </SupportChatProvider>,
  );
  return {
    unmount() {
      root?.unmount();
      root = null;
    },
  };
}

const api: SupportWidgetEmbedApi = { mount };

declare global {
  interface Window {
    QuatroTechSupportWidget?: SupportWidgetEmbedApi;
  }
}

window.QuatroTechSupportWidget = api;
