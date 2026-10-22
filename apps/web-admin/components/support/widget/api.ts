import type { SupportChatConfig, SupportHostContext, SupportMessage, SupportMessageAttachment, SupportSession } from "./types";
import { SupportClientError, responseError } from "./errors";
import { normalizeWidgetLocale } from "./locale";
import {
  mergeProgressSteps,
  normalizeProgressEvent,
  type SupportProgressEvent,
  type SupportProgressStep,
} from "./turnProgress";

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
/** Wait for POST /messages to return 202 (identity check + enqueue), not the full agent turn. */
const DEFAULT_MESSAGE_ACCEPT_TIMEOUT_MS = 120_000;
/** Overall wait for an async research turn (short polls; not one long HTTP hold). */
const DEFAULT_AGENT_TURN_WAIT_MS = 600_000;
const TURN_POLL_INTERVAL_MS = 400;

async function buildHeaders(config: SupportChatConfig): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.getAuthHeaders) {
    Object.assign(headers, await config.getAuthHeaders());
  }
  return headers;
}

async function fetchSupport(
  config: SupportChatConfig,
  url: string,
  init: RequestInit,
  timeoutMsOverride?: number,
): Promise<Response> {
  const timeoutMs = timeoutMsOverride ?? config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (exc) {
    if (exc instanceof DOMException && exc.name === "AbortError") {
      throw new SupportClientError("timeout", exc);
    }
    throw new SupportClientError("unavailable", exc);
  } finally {
    window.clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function createSupportSession(
  config: SupportChatConfig,
  context: SupportHostContext,
): Promise<SupportSession> {
  const response = await fetchSupport(config, `${config.apiBaseUrl.replace(/\/$/, "")}/support/sessions`, {
    method: "POST",
    headers: await buildHeaders(config),
    body: JSON.stringify({
      title: config.title ?? { ru: "Чат поддержки", en: "Support chat", de: "Support-Chat" }[normalizeWidgetLocale(context.locale ?? config.locale)],
      user_id: context.user_login ?? "anonymous",
      context,
    }),
  });
  if (!response.ok) {
    throw await responseError(response);
  }
  return response.json();
}

type TurnStatusPayload = {
  session_id?: string;
  turn_id?: string;
  status?: string;
  events?: SupportProgressEvent[];
  error?: string | null;
  message?: SupportMessage | null;
  session?: SupportSession | null;
};

async function pollSupportTurn(
  config: SupportChatConfig,
  sessionId: string,
  turnId: string,
  options?: {
    onProgress?: (steps: SupportProgressStep[]) => void;
    waitMs?: number;
  },
): Promise<{ message: SupportMessage; session?: SupportSession }> {
  const base = config.apiBaseUrl.replace(/\/$/, "");
  const waitMs = options?.waitMs ?? DEFAULT_AGENT_TURN_WAIT_MS;
  const deadline = Date.now() + waitMs;
  let after = 0;
  let steps: SupportProgressStep[] = [];

  while (Date.now() < deadline) {
    const response = await fetchSupport(
      config,
      `${base}/support/sessions/${encodeURIComponent(sessionId)}/turns/${encodeURIComponent(turnId)}?after=${after}`,
      {
        method: "GET",
        headers: await buildHeaders(config),
      },
    );
    if (!response.ok) {
      throw await responseError(response);
    }
    const payload = (await response.json()) as TurnStatusPayload;
    const events = Array.isArray(payload.events) ? payload.events : [];
    for (const event of events) {
      const step = normalizeProgressEvent(event);
      if (step) {
        steps = mergeProgressSteps(steps, [step]);
        after = Math.max(after, Number(event.sequence || step.sequence || 0));
      }
    }
    if (events.length) {
      options?.onProgress?.(steps);
    }

    if (payload.status === "completed" || payload.status === "failed") {
      if (payload.message) {
        return {
          message: payload.message,
          session: payload.session ?? undefined,
        };
      }
      if (payload.status === "failed") {
        throw new SupportClientError("unavailable", payload.error);
      }
      throw new SupportClientError("unavailable", "missing assistant message");
    }

    await sleep(TURN_POLL_INTERVAL_MS);
  }

  throw new SupportClientError("timeout", { waitMs, turnId });
}

export async function sendSupportMessage(
  config: SupportChatConfig,
  sessionId: string,
  message: string,
  context: SupportHostContext,
  attachments?: SupportMessageAttachment[],
  options?: {
    onProgress?: (steps: SupportProgressStep[]) => void;
  },
): Promise<{ message: SupportMessage; session?: SupportSession }> {
  const hasAttachments = Boolean(attachments?.length);
  const acceptTimeoutMs = Math.max(
    config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    DEFAULT_MESSAGE_ACCEPT_TIMEOUT_MS,
  );
  const turnWaitMs = Math.max(
    config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    DEFAULT_AGENT_TURN_WAIT_MS,
  );
  const base = config.apiBaseUrl.replace(/\/$/, "");
  const response = await fetchSupport(
    config,
    `${base}/support/sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: "POST",
      headers: await buildHeaders(config),
      body: JSON.stringify({
        message,
        context,
        attachments: attachments?.length ? attachments : undefined,
      }),
    },
    acceptTimeoutMs,
  );

  // Async queue: accepted for background processing.
  if (response.status === 202) {
    const accepted = (await response.json()) as { turn_id?: string };
    const turnId = String(accepted.turn_id || "").trim();
    if (!turnId) {
      throw new SupportClientError("unavailable", "missing turn_id");
    }
    return pollSupportTurn(config, sessionId, turnId, {
      onProgress: options?.onProgress,
      waitMs: turnWaitMs,
    });
  }

  // Legacy sync backends that still return the completed assistant message.
  if (response.ok) {
    const payload = (await response.json()) as {
      message?: SupportMessage;
      session?: SupportSession;
      turn_id?: string;
    };
    if (payload.message) {
      return { message: payload.message, session: payload.session };
    }
    const turnId = String(payload.turn_id || "").trim();
    if (turnId) {
      return pollSupportTurn(config, sessionId, turnId, {
        onProgress: options?.onProgress,
        waitMs: turnWaitMs,
      });
    }
  }

  throw await responseError(response);
}

export async function submitSupportAnswerFeedback(
  config: SupportChatConfig,
  sessionId: string,
  turnId: string,
  rating: "up" | "down",
  context: SupportHostContext,
  comment?: string,
): Promise<void> {
  const response = await fetchSupport(
    config,
    `${config.apiBaseUrl.replace(/\/$/, "")}/support/sessions/${encodeURIComponent(sessionId)}/turns/${encodeURIComponent(turnId)}/feedback`,
    {
      method: "POST",
      headers: await buildHeaders(config),
      body: JSON.stringify({ rating, comment: comment?.trim() || undefined, context }),
    },
  );
  if (!response.ok) {
    throw await responseError(response);
  }
}

export async function getSupportSession(
  config: SupportChatConfig,
  sessionId: string,
): Promise<SupportSession> {
  const response = await fetchSupport(
    config,
    `${config.apiBaseUrl.replace(/\/$/, "")}/support/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "GET",
      headers: await buildHeaders(config),
    },
  );
  if (!response.ok) {
    throw await responseError(response);
  }
  return response.json();
}

export type ClearSupportSessionResult = {
  ok: boolean;
  session_id: string;
  memories_deleted: number;
  tickets_preserved: Array<{
    ticket_id: string;
    status: string;
    subject: string;
    created_at?: string;
  }>;
  session: SupportSession;
};

export async function clearSupportSession(
  config: SupportChatConfig,
  sessionId: string,
  context: SupportHostContext,
): Promise<ClearSupportSessionResult> {
  const response = await fetchSupport(
    config,
    `${config.apiBaseUrl.replace(/\/$/, "")}/support/sessions/${encodeURIComponent(sessionId)}/clear`,
    {
      method: "POST",
      headers: await buildHeaders(config),
      body: JSON.stringify({ context }),
    },
  );
  if (!response.ok) {
    throw await responseError(response);
  }
  return response.json();
}
