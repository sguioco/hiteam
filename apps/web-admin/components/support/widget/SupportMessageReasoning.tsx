import { useMemo, useState } from "react";
import type { SupportProgressStep } from "./turnProgress";
import { progressStepsFromMetadata, progressStepsFromToolTrace } from "./turnProgress";

type SupportMessageReasoningProps = {
  metadata?: Record<string, unknown>;
  locale: string;
  title: string;
  emptyLabel?: string;
};

export function SupportMessageReasoning({
  metadata,
  locale,
  title,
}: SupportMessageReasoningProps) {
  const steps = useMemo(() => {
    const fromProgress = progressStepsFromMetadata(metadata);
    if (fromProgress.length > 0) {
      return fromProgress;
    }
    return progressStepsFromToolTrace(metadata, locale);
  }, [locale, metadata]);
  const [open, setOpen] = useState(false);

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="support-widget__reasoning">
      <button
        type="button"
        className="support-widget__reasoning-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true" className={`support-widget__reasoning-chevron${open ? " is-open" : ""}`}>
          ▾
        </span>
        <span>{title}</span>
        <span className="support-widget__reasoning-count">{steps.length}</span>
      </button>
      {open ? (
        <ol className="support-widget__reasoning-list">
          {steps.map((step: SupportProgressStep) => (
            <li key={step.key} className="support-widget__reasoning-step">
              <span
                aria-hidden="true"
                className={`support-widget__turn-progress-dot ${
                  !step.ok || step.status === "failed"
                    ? "support-widget__turn-progress-dot--failed"
                    : "support-widget__turn-progress-dot--done"
                }`}
              />
              <span>{step.message}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
