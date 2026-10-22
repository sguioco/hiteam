import type { SupportProgressStep } from "./turnProgress";

type SupportTurnProgressBlockProps = {
  statusLabel: string;
  thinkingStep: number;
  steps: SupportProgressStep[];
  placeholder?: string;
};

function ThinkingDots({ step }: { step: number }) {
  return <span className="support-widget__turn-progress-dots">{".".repeat((step % 3) + 1)}</span>;
}

export function SupportTurnProgressBlock({
  statusLabel,
  thinkingStep,
  steps,
  placeholder,
}: SupportTurnProgressBlockProps) {
  return (
    <div className="support-widget__turn-progress" aria-live="polite">
      <p className="support-widget__turn-progress-title">
        {statusLabel}
        <ThinkingDots step={thinkingStep} />
      </p>
      {steps.length === 0 ? (
        placeholder ? <p className="support-widget__turn-progress-placeholder">{placeholder}</p> : null
      ) : (
        <ol className="support-widget__turn-progress-list">
          {steps.map((step) => {
            const isActive = step.status === "started";
            const isFailed = !step.ok || step.status === "failed";
            return (
              <li className="support-widget__turn-progress-step" key={step.key}>
                <span
                  aria-hidden="true"
                  className={`support-widget__turn-progress-dot ${
                    isFailed
                      ? "support-widget__turn-progress-dot--failed"
                      : isActive
                        ? "support-widget__turn-progress-dot--active"
                        : "support-widget__turn-progress-dot--done"
                  }`}
                />
                <span>{step.message}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
