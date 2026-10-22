import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clearSupportSession, createSupportSession, getSupportSession, sendSupportMessage } from "./api";
import { useSupportChatConfig } from "./SupportChatProvider";
import {
  countUnreadMessages,
  loadPersistedSession,
  savePersistedSession,
} from "./sessionStorage";
import { playSoundForNewIncoming } from "./messageSound";
import { randomUUID } from "./randomId";
import { supportErrorText } from "./errors";
import { resolveSupportLocale } from "./locale";
import type { SupportHostContext, SupportMessage, SupportMessageAttachment } from "./types";
import type { SupportProgressStep } from "./turnProgress";

const DEFAULT_POLL_INTERVAL_MS = 5000;

type SupportChatSessionContextValue = {
  sessionId: string | null;
  messages: SupportMessage[];
  bootstrapping: boolean;
  awaitingReply: boolean;
  liveProgressSteps: SupportProgressStep[];
  queuedMessages: SupportQueuedMessage[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  setError: (value: string | null) => void;
  sendMessage: (
    text: string,
    context: SupportHostContext,
    attachments?: SupportMessageAttachment[],
  ) => Promise<void>;
  removeQueuedMessage: (id: string) => void;
  clearChat: (context: SupportHostContext) => Promise<void>;
  markMessagesRead: () => void;
};

type QueuedMessage = {
  id: string;
  text: string;
  context: SupportHostContext;
  attachments?: SupportMessageAttachment[];
};

export type SupportQueuedMessage = Pick<QueuedMessage, "id" | "text" | "attachments">;

const SupportChatSessionContext = createContext<SupportChatSessionContextValue | null>(null);

function resolveUserId(context: SupportHostContext): string {
  const actor = String(context.user_login || "anonymous").trim() || "anonymous";
  return JSON.stringify([actor, String(context.company_code || "").trim().toLowerCase()]);
}

export function SupportChatSessionProvider({
  panelOpen,
  children,
}: {
  panelOpen: boolean;
  children: ReactNode;
}) {
  const config = useSupportChatConfig();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [liveProgressSteps, setLiveProgressSteps] = useState<SupportProgressStep[]>([]);
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastReadCountRef = useRef(0);
  const hasBootstrappedRef = useRef(false);
  const pollInFlightRef = useRef(false);
  const queueDispatchInFlightRef = useRef(false);

  const hostContext = useMemo(() => config.getContext(), [config]);
  const userId = resolveUserId(hostContext);
  const supportAvailable = config.access?.status !== "sign_in_required";
  const pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const messageSoundEnabled = config.messageSoundEnabled !== false;
  const messageSoundUrl = config.messageSoundUrl;
  const configRef = useRef(config);
  configRef.current = config;
  const hostContextRef = useRef(hostContext);
  hostContextRef.current = hostContext;

  const soundOptions = useMemo(
    () => ({ enabled: messageSoundEnabled, soundUrl: messageSoundUrl }),
    [messageSoundEnabled, messageSoundUrl],
  );

  const persistReadState = useCallback(
    (nextSessionId: string, lastReadCount: number) => {
      savePersistedSession(config.projectId, userId, {
        sessionId: nextSessionId,
        lastReadCount,
      });
    },
    [config.projectId, userId],
  );

  const applySessionMessages = useCallback(
    (
      nextSessionId: string,
      nextMessages: SupportMessage[],
      options?: { panelOpen: boolean; playSound?: boolean },
    ) => {
      setMessages((previous) => {
        if (options?.playSound !== false && hasBootstrappedRef.current) {
          playSoundForNewIncoming(previous, nextMessages, soundOptions);
        }
        return nextMessages;
      });
      setSessionId(nextSessionId);
      const isOpen = options?.panelOpen ?? false;
      if (isOpen) {
        lastReadCountRef.current = nextMessages.length;
        setUnreadCount(0);
        persistReadState(nextSessionId, nextMessages.length);
        return;
      }
      const unread = countUnreadMessages(nextMessages, lastReadCountRef.current);
      setUnreadCount(unread);
      persistReadState(nextSessionId, lastReadCountRef.current);
    },
    [persistReadState, soundOptions],
  );

  const markMessagesRead = useCallback(() => {
    if (!sessionId) {
      return;
    }
    lastReadCountRef.current = messages.length;
    setUnreadCount(0);
    persistReadState(sessionId, messages.length);
  }, [messages.length, persistReadState, sessionId]);

  useEffect(() => {
    if (panelOpen) {
      markMessagesRead();
    }
  }, [panelOpen, markMessagesRead]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setBootstrapping(true);
      setError(null);
      if (!supportAvailable) {
        setSessionId(null);
        setMessages([]);
        setQueuedMessages([]);
        setUnreadCount(0);
        lastReadCountRef.current = 0;
        setBootstrapping(false);
        hasBootstrappedRef.current = true;
        return;
      }
      try {
        const persisted = loadPersistedSession(config.projectId, userId);
        if (persisted?.sessionId) {
          try {
            const session = await getSupportSession(configRef.current, persisted.sessionId);
            if (cancelled) {
              return;
            }
            lastReadCountRef.current = persisted.lastReadCount;
            applySessionMessages(session.session_id, session.messages ?? [], { panelOpen: false, playSound: false });
            return;
          } catch {
            // stale session id — create a new one below
          }
        }

        const session = await createSupportSession(configRef.current, hostContextRef.current);
        if (cancelled) {
          return;
        }
        lastReadCountRef.current = 0;
        applySessionMessages(session.session_id, session.messages ?? [], { panelOpen: false, playSound: false });
      } catch (exc) {
        if (!cancelled) {
          setError(supportErrorText(exc, resolveSupportLocale(config)));
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
          hasBootstrappedRef.current = true;
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applySessionMessages, config.projectId, supportAvailable, userId]);

  useEffect(() => {
    // Replies to user messages are returned synchronously. Polling is only
    // needed to surface an operator reply while the widget is closed.
    if (!supportAvailable || !sessionId || panelOpen || queuedMessages.length > 0 || pollIntervalMs <= 0) {
      return;
    }
    const activeSessionId = sessionId;

    let cancelled = false;

    async function poll() {
      if (pollInFlightRef.current) {
        return;
      }
      pollInFlightRef.current = true;
      try {
        const session = await getSupportSession(configRef.current, activeSessionId);
        if (cancelled) {
          return;
        }
        applySessionMessages(session.session_id, session.messages ?? [], { panelOpen });
      } catch {
        // keep last known state; polling should be resilient
      } finally {
        pollInFlightRef.current = false;
      }
    }

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applySessionMessages, config, panelOpen, pollIntervalMs, queuedMessages.length, sessionId, supportAvailable]);

  const sendMessage = useCallback(
    async (text: string, context: SupportHostContext, attachments?: SupportMessageAttachment[]) => {
      if (!supportAvailable || !sessionId) {
        return;
      }
      const trimmed = text.trim();
      const hasAttachments = Boolean(attachments?.length);
      if (!trimmed && !hasAttachments) {
        return;
      }
      setError(null);
      const queuedMessage: QueuedMessage = {
        id: `queued_${randomUUID()}`,
        text: trimmed,
        context,
        attachments,
      };
      setQueuedMessages((current) => [...current, queuedMessage]);
    },
    [sessionId, supportAvailable],
  );

  useEffect(() => {
    if (!supportAvailable || !sessionId || !queuedMessages.length || queueDispatchInFlightRef.current) {
      return;
    }
    const activeSessionId = sessionId;
    const queuedMessage = queuedMessages[0];
    queueDispatchInFlightRef.current = true;
    setAwaitingReply(true);
    setLiveProgressSteps([]);
    const optimisticMetadata = queuedMessage.attachments?.length ? { attachments: queuedMessage.attachments } : undefined;
    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: queuedMessage.text,
        metadata: optimisticMetadata,
      },
    ]);

    async function dispatchNextMessage() {
      try {
        const response = await sendSupportMessage(
          config,
          activeSessionId,
          queuedMessage.text,
          queuedMessage.context,
          queuedMessage.attachments,
          {
            onProgress: (steps) => setLiveProgressSteps(steps),
          },
        );
        setMessages((current) => {
          const next = [...current, response.message];
          if (hasBootstrappedRef.current) {
            playSoundForNewIncoming(current, next, soundOptions);
          }
          if (panelOpen) {
            lastReadCountRef.current = next.length;
            setUnreadCount(0);
          } else {
            setUnreadCount(countUnreadMessages(next, lastReadCountRef.current));
          }
          persistReadState(activeSessionId, lastReadCountRef.current);
          return next;
        });
      } catch (exc) {
        setError(supportErrorText(exc, resolveSupportLocale(config)));
      } finally {
        setQueuedMessages((current) => current.filter((item) => item.id !== queuedMessage.id));
        setAwaitingReply(false);
        setLiveProgressSteps([]);
        queueDispatchInFlightRef.current = false;
      }
    }

    void dispatchNextMessage();
  }, [config, panelOpen, persistReadState, queuedMessages, sessionId, soundOptions, supportAvailable]);

  const removeQueuedMessage = useCallback((id: string) => {
    setQueuedMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const clearChat = useCallback(
    async (context: SupportHostContext) => {
      if (!supportAvailable || !sessionId) {
        return;
      }
      setAwaitingReply(true);
      setError(null);
      try {
        await clearSupportSession(config, sessionId, context);
        setMessages([]);
        lastReadCountRef.current = 0;
        setUnreadCount(0);
        persistReadState(sessionId, 0);
      } catch (exc) {
        setError(supportErrorText(exc, resolveSupportLocale(config)));
      } finally {
        setAwaitingReply(false);
      }
    },
    [config, persistReadState, sessionId, supportAvailable],
  );

  const loading = bootstrapping || awaitingReply;
  const queuedMessagesForDisplay = awaitingReply ? queuedMessages.slice(1) : queuedMessages;

  const value = useMemo(
    () => ({
      sessionId,
      messages,
      bootstrapping,
      awaitingReply,
      liveProgressSteps,
      queuedMessages: queuedMessagesForDisplay,
      loading,
      error,
      unreadCount,
      setError,
      sendMessage,
      removeQueuedMessage,
      clearChat,
      markMessagesRead,
    }),
    [
      awaitingReply,
      bootstrapping,
      clearChat,
      error,
      liveProgressSteps,
      loading,
      markMessagesRead,
      messages,
      queuedMessagesForDisplay,
      removeQueuedMessage,
      sendMessage,
      sessionId,
      unreadCount,
    ],
  );

  return <SupportChatSessionContext.Provider value={value}>{children}</SupportChatSessionContext.Provider>;
}

export function useSupportChatSession(): SupportChatSessionContextValue {
  const value = useContext(SupportChatSessionContext);
  if (!value) {
    throw new Error("SupportChatSessionProvider is missing");
  }
  return value;
}
