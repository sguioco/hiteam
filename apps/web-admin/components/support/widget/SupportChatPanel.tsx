import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type CSSProperties, type KeyboardEvent } from "react";
import {
  MAX_PENDING_ATTACHMENTS,
  attachmentsFromMetadata,
  readImageFiles,
  revokePendingAttachments,
  toMessageAttachments,
  type PendingAttachment,
} from "./attachments";
import { useSupportChatConfig } from "./SupportChatProvider";
import { useSupportChatSession } from "./SupportChatSessionContext";
import { SupportAttachIcon } from "./SupportAttachIcon";
import { SupportMessageAttachments } from "./SupportMessageAttachments";
import { SupportMessageContent } from "./SupportMessageContent";
import { SupportMessageReasoning } from "./SupportMessageReasoning";
import { SupportTrashIcon } from "./SupportTrashIcon";
import { SupportTurnProgressBlock } from "./SupportTurnProgressBlock";
import { submitSupportAnswerFeedback } from "./api";
import { computePanelAnchor, type LauncherAnchor } from "./launcherPosition";
import { useSupportWidgetLocale } from "./useSupportWidgetLocale";
import { supportErrorText } from "./errors";

type SupportChatPanelProps = {
  onClose: () => void;
  launcherAnchor?: LauncherAnchor | null;
};

const STATUS_LABELS = {
  ru: {
    signIn: "Войдите в систему, чтобы обратиться в поддержку.",
    connecting: "Подключение…",
    thinking: "Думаю…",
    queuedHeadingOne: "Следующее сообщение",
    queuedHeadingMany: (count: number) => `Следующие сообщения: ${count}`,
    removeQueued: "Убрать из очереди",
    clearChat: "Очистить чат",
    dropHint: "Перетащите скриншот сюда или вставьте из буфера",
    attachmentTooMany: "Можно прикрепить не более 3 изображений",
    removeAttachment: "Удалить",
    attachScreenshot: "Прикрепить скриншот",
    messagePlaceholder: "Опишите проблему…",
    empty: "Спросите о продукте, состоянии deploy, логах или ingest.",
    send: "Отправить",
    closeChat: "Закрыть чат поддержки",
    supportChat: "Чат поддержки",
    screenshot: "Скриншот",
    feedbackLabel: "Оценка ответа",
    helpful: "Полезно",
    notHelpful: "Не полезно",
    feedbackPrompt: "Что именно не понравилось?",
    feedbackPlaceholder: "Комментарий (необязательно)",
    sendFeedback: "Отправить",
    cancelFeedback: "Отмена",
    feedbackThanks: "Отправлено",
    reasoningTitle: "Ход работы",
    progressPlaceholder: "Готовлю шаги…",
  },
  en: {
    signIn: "Sign in to contact support.",
    connecting: "Connecting…",
    thinking: "Thinking…",
    queuedHeadingOne: "Next message",
    queuedHeadingMany: (count: number) => `Next messages: ${count}`,
    removeQueued: "Remove from queue",
    clearChat: "Clear chat",
    dropHint: "Drop a screenshot here or paste from clipboard",
    attachmentTooMany: "You can attach up to 3 images",
    removeAttachment: "Remove",
    attachScreenshot: "Attach screenshot",
    messagePlaceholder: "Describe the issue…",
    empty: "Ask about the product, deploy health, logs, or ingest status.",
    send: "Send",
    closeChat: "Close support chat",
    supportChat: "Support chat",
    screenshot: "Screenshot",
    feedbackLabel: "Rate this answer",
    helpful: "Helpful",
    notHelpful: "Not helpful",
    feedbackPrompt: "What did you dislike?",
    feedbackPlaceholder: "Comment (optional)",
    sendFeedback: "Send",
    cancelFeedback: "Cancel",
    feedbackThanks: "Submitted",
    reasoningTitle: "Working steps",
    progressPlaceholder: "Preparing steps…",
  },
  de: {
    signIn: "Melden Sie sich an, um den Support zu kontaktieren.",
    connecting: "Verbindung wird hergestellt…",
    thinking: "Denke nach…",
    queuedHeadingOne: "Nächste Nachricht",
    queuedHeadingMany: (count: number) => `Nächste Nachrichten: ${count}`,
    removeQueued: "Aus Warteschlange entfernen",
    clearChat: "Chat leeren",
    dropHint: "Screenshot hier ablegen oder aus der Zwischenablage einfügen",
    attachmentTooMany: "Es können höchstens 3 Bilder angehängt werden",
    removeAttachment: "Entfernen",
    attachScreenshot: "Screenshot anhängen",
    messagePlaceholder: "Problem beschreiben…",
    empty: "Fragen Sie zum Produkt, Deployment-Status, Logs oder Ingest.",
    send: "Senden",
    closeChat: "Support-Chat schließen",
    supportChat: "Support-Chat",
    screenshot: "Screenshot",
    feedbackLabel: "Antwort bewerten",
    helpful: "Hilfreich",
    notHelpful: "Nicht hilfreich",
    feedbackPrompt: "Was hat Ihnen nicht gefallen?",
    feedbackPlaceholder: "Kommentar (optional)",
    sendFeedback: "Senden",
    cancelFeedback: "Abbrechen",
    feedbackThanks: "Gesendet",
    reasoningTitle: "Arbeitsschritte",
    progressPlaceholder: "Schritte werden vorbereitet…",
  },
};

export function SupportChatPanel({ onClose, launcherAnchor = null }: SupportChatPanelProps) {
  const config = useSupportChatConfig();
  const signInRequired = config.access?.status === "sign_in_required";
  const widgetLocale = useSupportWidgetLocale();
  const {
    sessionId,
    messages,
    bootstrapping,
    awaitingReply,
    liveProgressSteps,
    queuedMessages,
    loading,
    error,
    sendMessage,
    removeQueuedMessage,
    clearChat,
    setError,
  } =
    useSupportChatSession();
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [feedbackTurnId, setFeedbackTurnId] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<Record<string, "up" | "down">>({});
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  }));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const positionClass = launcherAnchor ? "support-widget__panel--anchored" : `support-widget__panel--${config.position ?? "bottom-right"}`;
  const panelStyle = useMemo((): CSSProperties | undefined => {
    if (!launcherAnchor) {
      return undefined;
    }
    const width = Math.min(420, viewportSize.width - 24);
    const height = Math.min(640, viewportSize.height - 96);
    const anchor = computePanelAnchor(launcherAnchor, width, height);
    return {
      left: `${anchor.left}px`,
      top: `${anchor.top}px`,
      right: "auto",
      bottom: "auto",
    };
  }, [launcherAnchor, viewportSize]);
  const statusLabels = STATUS_LABELS[widgetLocale];
  const pendingAttachmentsRef = useRef(pendingAttachments);
  pendingAttachmentsRef.current = pendingAttachments;

  function currentHostContext() {
    return config.getContext();
  }

  useEffect(() => {
    if (!launcherAnchor) {
      return;
    }
    function handleResize() {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [launcherAnchor]);

  useEffect(() => {
    if (!awaitingReply) {
      setThinkingStep(0);
      return;
    }
    const timer = window.setInterval(() => {
      setThinkingStep((current) => current + 1);
    }, 450);
    return () => window.clearInterval(timer);
  }, [awaitingReply]);

  useEffect(() => {
    return () => {
      revokePendingAttachments(pendingAttachmentsRef.current);
    };
  }, []);

  async function addFiles(files: FileList | File[]) {
    const incoming = await readImageFiles(files);
    if (!incoming.length) {
      return;
    }
    setPendingAttachments((current) => {
      const merged = [...current, ...incoming].slice(0, MAX_PENDING_ATTACHMENTS);
      if (current.length + incoming.length > MAX_PENDING_ATTACHMENTS) {
        setError(statusLabels.attachmentTooMany);
      }
      return merged;
    });
  }

  function removePendingAttachment(id: string) {
    setPendingAttachments((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        revokePendingAttachments([target]);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  async function submitMessage() {
    const text = draft.trim();
    if ((!text && pendingAttachments.length === 0) || !sessionId || bootstrapping) {
      return;
    }
    const attachments = toMessageAttachments(pendingAttachments);
    setDraft("");
    setPendingAttachments([]);
    await sendMessage(text, currentHostContext(), attachments.length ? attachments : undefined);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitMessage();
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    void submitMessage();
  }

  async function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const items = event.clipboardData?.items;
    if (!items?.length) {
      return;
    }
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }
    if (!files.length) {
      return;
    }
    event.preventDefault();
    try {
      await addFiles(files);
    } catch (exc) {
      setError(supportErrorText(exc, widgetLocale));
    }
  }

  function handleDragOver(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setDragActive(false);
  }

  async function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    event.target.value = "";
    if (!files?.length || bootstrapping || !sessionId) {
      return;
    }
    try {
      await addFiles(files);
    } catch (exc) {
      setError(supportErrorText(exc, widgetLocale));
    }
  }

  function openFilePicker() {
    if (bootstrapping || !sessionId || pendingAttachments.length >= MAX_PENDING_ATTACHMENTS) {
      if (pendingAttachments.length >= MAX_PENDING_ATTACHMENTS) {
        setError(statusLabels.attachmentTooMany);
      }
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleDrop(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    setDragActive(false);
    if (bootstrapping || !sessionId) {
      return;
    }
    try {
      await addFiles(event.dataTransfer.files);
    } catch (exc) {
      setError(supportErrorText(exc, widgetLocale));
    }
  }

  async function handleClearChat() {
    if (!sessionId || loading) {
      return;
    }
    revokePendingAttachments(pendingAttachments);
    setPendingAttachments([]);
    await clearChat(currentHostContext());
  }

  async function submitFeedback(turnId: string, rating: "up" | "down", comment?: string) {
    if (!sessionId || feedbackSubmitting) {
      return;
    }
    setFeedbackSubmitting(true);
    setError(null);
    try {
      await submitSupportAnswerFeedback(config, sessionId, turnId, rating, currentHostContext(), comment);
      setSubmittedFeedback((current) => ({ ...current, [turnId]: rating }));
      setFeedbackTurnId(null);
      setFeedbackComment("");
    } catch (exc) {
      setError(supportErrorText(exc, widgetLocale));
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  const canSend = Boolean(draft.trim() || pendingAttachments.length);
  const canAttach = !signInRequired && !bootstrapping && Boolean(sessionId) && pendingAttachments.length < MAX_PENDING_ATTACHMENTS;

  return (
    <section
      id="support-chat-panel"
      className={`support-widget__panel ${positionClass}`}
      style={panelStyle}
      aria-label={statusLabels.supportChat}
    >
      <header className="support-widget__panel-header">
        <div>
          <strong>{config.title ?? statusLabels.supportChat}</strong>
        </div>
        <div className="support-widget__panel-actions">
          <button
            type="button"
            className="support-widget__icon-button"
            aria-label={statusLabels.clearChat}
            title={statusLabels.clearChat}
            onClick={() => void handleClearChat()}
            disabled={signInRequired || loading || !sessionId}
          >
            <SupportTrashIcon className="support-widget__icon-button-svg" />
          </button>
          <button type="button" className="support-widget__close" aria-label={statusLabels.closeChat} onClick={onClose}>
            ×
          </button>
        </div>
      </header>
      <div className="support-widget__messages">
        {signInRequired ? (
          <p className="support-widget__empty">{config.access?.message ?? statusLabels.signIn}</p>
        ) : null}
        {!signInRequired && messages.length === 0 && !bootstrapping && !awaitingReply ? (
          <p className="support-widget__empty">{statusLabels.empty}</p>
        ) : null}
        {messages.map((message, index) => {
          const attachments = attachmentsFromMetadata(message.metadata);
          const turnId = typeof message.metadata?.turn_id === "string" ? message.metadata.turn_id : null;
          const canRate = message.role === "assistant" && Boolean(turnId);
          const submittedRating = turnId ? submittedFeedback[turnId] : undefined;
          return (
            <article
              key={`${message.role}-${index}`}
              className={message.role === "user" ? "support-widget__message support-widget__message--user" : "support-widget__message"}
            >
              {message.role === "user" ? (
                <>
                  {message.content ? <span>{message.content}</span> : null}
                  <SupportMessageAttachments attachments={attachments} />
                </>
              ) : (
                <>
                  <SupportMessageContent content={message.content} />
                  <SupportMessageReasoning
                    metadata={message.metadata}
                    locale={widgetLocale}
                    title={statusLabels.reasoningTitle}
                  />
                  {canRate ? (
                    <div className="support-widget__feedback" aria-label={statusLabels.feedbackLabel}>
                      <button
                        type="button"
                        className={`support-widget__feedback-button${submittedRating === "up" ? " support-widget__feedback-button--active support-widget__feedback-button--sent" : ""}`}
                        aria-label={statusLabels.helpful}
                        aria-pressed={submittedRating === "up"}
                        title={statusLabels.helpful}
                        onClick={() => void submitFeedback(turnId!, "up")}
                        disabled={feedbackSubmitting || Boolean(submittedRating)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9 11v10H5V11h4Zm4-2 1-5c0-.55.45-1 1-1 .22 0 .41.08.56.22l.44.44c.18.18.29.43.29.71V5l-1 6h5c.55 0 1 .45 1 1v1c0 .12-.02.23-.06.33l-2.38 7c-.14.4-.51.67-.93.67H10V10l3-1Z" />
                        </svg>
                        <span>{submittedRating === "up" ? statusLabels.feedbackThanks : statusLabels.helpful}</span>
                      </button>
                      <button
                        type="button"
                        className={`support-widget__feedback-button${submittedRating === "down" ? " support-widget__feedback-button--active support-widget__feedback-button--sent" : ""}`}
                        aria-label={statusLabels.notHelpful}
                        aria-pressed={submittedRating === "down"}
                        title={statusLabels.notHelpful}
                        onClick={() => {
                          setFeedbackTurnId(turnId);
                          setFeedbackComment("");
                        }}
                        disabled={feedbackSubmitting || Boolean(submittedRating)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M15 13V3h4v10h-4Zm-4 2-1 5c0 .55-.45 1-1 1-.22 0-.41-.08-.56-.22L8 20.34a1 1 0 0 1-.29-.71V19l1-6H4c-.55 0-1-.45-1-1v-1c0-.12.02-.23.06-.33l2.38-7c.14-.4.51-.67.93-.67H14v11l-3 1Z" />
                        </svg>
                        <span>{submittedRating === "down" ? statusLabels.feedbackThanks : statusLabels.notHelpful}</span>
                      </button>
                      {feedbackTurnId === turnId ? (
                        <div className="support-widget__feedback-dialog" role="dialog" aria-label={statusLabels.feedbackPrompt}>
                          <strong className="support-widget__feedback-title">{statusLabels.feedbackPrompt}</strong>
                          <textarea
                            value={feedbackComment}
                            onChange={(event) => setFeedbackComment(event.target.value)}
                            placeholder={statusLabels.feedbackPlaceholder}
                            maxLength={4000}
                            rows={3}
                            disabled={feedbackSubmitting}
                          />
                          <div className="support-widget__feedback-actions">
                            <button
                              type="button"
                              onClick={() => void submitFeedback(turnId!, "down", feedbackComment)}
                              disabled={feedbackSubmitting}
                            >
                              {statusLabels.sendFeedback}
                            </button>
                            <button
                              type="button"
                              onClick={() => setFeedbackTurnId(null)}
                              disabled={feedbackSubmitting}
                            >
                              {statusLabels.cancelFeedback}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </article>
          );
        })}
        {bootstrapping ? <p className="support-widget__typing">{statusLabels.connecting}</p> : null}
        {awaitingReply ? (
          <SupportTurnProgressBlock
            statusLabel={statusLabels.thinking}
            thinkingStep={thinkingStep}
            steps={liveProgressSteps}
            placeholder={statusLabels.progressPlaceholder}
          />
        ) : null}
      </div>
      {error ? <p className="support-widget__error">{error}</p> : null}
      <form
        className={`support-widget__composer${dragActive ? " support-widget__composer--drag-active" : ""}`}
        onSubmit={handleSubmit}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {queuedMessages.length ? (
          <div
            className="support-widget__composer-queue"
            role="region"
            aria-live="polite"
            aria-label={queuedMessages.length === 1 ? statusLabels.queuedHeadingOne : statusLabels.queuedHeadingMany(queuedMessages.length)}
          >
            <p className="support-widget__composer-queue-heading">
              <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
                <path d="M3.5 4.5h9M3.5 8h9M3.5 11.5H8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.25" />
              </svg>
              {queuedMessages.length === 1 ? statusLabels.queuedHeadingOne : statusLabels.queuedHeadingMany(queuedMessages.length)}
            </p>
            <ol className="support-widget__composer-queue-list">
              {queuedMessages.map((message, index) => {
                const preview = message.text.replace(/\s+/g, " ").trim() || statusLabels.screenshot;
                const label = preview.length > 120 ? `${preview.slice(0, 119)}…` : preview;
                return (
                  <li className="support-widget__composer-queue-item" key={message.id}>
                    <span className="support-widget__composer-queue-index" aria-hidden="true">{index + 1}</span>
                    <span className="support-widget__composer-queue-text" title={preview}>{label}</span>
                    {message.attachments?.length ? (
                      <span className="support-widget__composer-queue-attachments" title={`${message.attachments.length}`}>
                        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                          <path d="M16.5 6.75v8.25a4.5 4.5 0 1 1-9 0V6a3 3 0 1 1 6 0v7.5a1.5 1.5 0 1 1-3 0V6.75" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                        </svg>
                        {message.attachments.length > 1 ? <span>{message.attachments.length}</span> : null}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="support-widget__composer-queue-remove"
                      aria-label={`${statusLabels.removeQueued}: ${label}`}
                      title={statusLabels.removeQueued}
                      onClick={() => removeQueuedMessage(message.id)}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
        {pendingAttachments.length ? (
          <div className="support-widget__attachment-preview">
            {pendingAttachments.map((attachment) => (
              <div key={attachment.id} className="support-widget__attachment-preview-item">
                <img src={attachment.previewUrl} alt={attachment.name ?? statusLabels.screenshot} />
                <button
                  type="button"
                  className="support-widget__attachment-remove"
                  aria-label={statusLabels.removeAttachment}
                  onClick={() => removePendingAttachment(attachment.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="support-widget__drop-hint">{statusLabels.dropHint}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="support-widget__file-input"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => void handleFileInputChange(event)}
          disabled={signInRequired}
        />
        <div className="support-widget__composer-input-row">
          <button
            type="button"
            className="support-widget__attach-button"
            aria-label={statusLabels.attachScreenshot}
            title={statusLabels.attachScreenshot}
            onClick={openFilePicker}
            disabled={!canAttach}
          >
            <SupportAttachIcon className="support-widget__attach-button-icon" />
          </button>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleDraftKeyDown}
            onPaste={handlePaste}
            placeholder={statusLabels.messagePlaceholder}
            rows={3}
            disabled={signInRequired || bootstrapping || !sessionId}
          />
        </div>
        <div className="support-widget__actions">
          <button type="submit" disabled={signInRequired || bootstrapping || !sessionId || !canSend}>
            {statusLabels.send}
          </button>
        </div>
      </form>
    </section>
  );
}
