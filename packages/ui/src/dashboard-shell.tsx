import { ReactElement, ReactNode } from 'react';

type DashboardShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  ribbon?: string;
};

export function DashboardShell({ eyebrow, title, subtitle, children, ribbon }: DashboardShellProps): ReactElement {
  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <div className="header-ribbon">
          <span />
          {ribbon ?? 'Premium workforce operations suite'}
        </div>
      </header>
      {children}
    </div>
  );
}
