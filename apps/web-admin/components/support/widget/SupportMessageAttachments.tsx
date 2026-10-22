import { useEffect, useState } from "react";

import type { SupportMessageAttachment } from "./types";
import { useSupportWidgetLocale } from "./useSupportWidgetLocale";

type SupportMessageAttachmentsProps = {
  attachments: SupportMessageAttachment[];
};

export function SupportMessageAttachments({ attachments }: SupportMessageAttachmentsProps) {
  const locale = useSupportWidgetLocale();
  const labels = {
    ru: { open: "Открыть", attachment: "Вложение", preview: "Просмотр вложения", close: "Закрыть просмотр", screenshot: "Скриншот" },
    en: { open: "Open", attachment: "Attachment", preview: "Attachment preview", close: "Close preview", screenshot: "Screenshot" },
    de: { open: "Öffnen", attachment: "Anhang", preview: "Anhangvorschau", close: "Vorschau schließen", screenshot: "Screenshot" },
  }[locale];
  const [selected, setSelected] = useState<SupportMessageAttachment | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  if (!attachments.length) {
    return null;
  }

  return (
    <>
      <div className="support-widget__attachments">
        {attachments.map((attachment) => {
          const url = `data:${attachment.mime};base64,${attachment.data_base64}`;
          const isImage = attachment.mime.startsWith("image/");
          return (
            <button
              key={attachment.id}
              type="button"
              className="support-widget__attachment"
              onClick={() => setSelected(attachment)}
              aria-label={`${labels.open}: ${attachment.name ?? labels.attachment}`}
            >
              {isImage ? (
                <img src={url} alt={attachment.name ?? labels.screenshot} loading="lazy" />
              ) : (
                <span className="support-widget__attachment-name">{attachment.name ?? labels.attachment}</span>
              )}
            </button>
          );
        })}
      </div>
      {selected ? (
        <div className="support-widget__attachment-modal" role="presentation" onClick={() => setSelected(null)}>
          <section
            className="support-widget__attachment-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={selected.name ?? labels.preview}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="support-widget__attachment-close"
              onClick={() => setSelected(null)}
              aria-label={labels.close}
            >
              ×
            </button>
            {selected.mime.startsWith("image/") ? (
              <img
                className="support-widget__attachment-full"
                src={`data:${selected.mime};base64,${selected.data_base64}`}
                alt={selected.name ?? labels.screenshot}
              />
            ) : (
              <iframe
                className="support-widget__attachment-file"
                src={`data:${selected.mime};base64,${selected.data_base64}`}
                title={selected.name ?? labels.attachment}
              />
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
