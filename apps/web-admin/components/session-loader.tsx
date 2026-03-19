type SessionLoaderProps = {
  label: string;
};

export function SessionLoader({ label }: SessionLoaderProps) {
  return (
    <main className="auth-gate auth-gate-loading">
      <div aria-label={label} aria-live="polite" className="session-loader" role="status">
        <span aria-hidden="true" className="session-loader-glow" />
        <span aria-hidden="true" className="session-loader-ring session-loader-ring-primary" />
        <span aria-hidden="true" className="session-loader-ring session-loader-ring-secondary" />
        <span aria-hidden="true" className="session-loader-core" />
        <span className="sr-only">{label}</span>
      </div>
    </main>
  );
}
