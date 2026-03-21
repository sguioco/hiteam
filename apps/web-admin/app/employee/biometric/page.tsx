'use client';

import { Smartphone } from 'lucide-react';
import { EmployeeShell } from '../../../components/employee-shell';

export default function EmployeeBiometricPage() {
  return (
    <EmployeeShell>
      <section className="section-stack">
        <section className="section-header">
          <span className="eyebrow">HiTeam Mobile</span>
          <h1>Biometric setup is mobile-only</h1>
          <p>
            Face enrollment and attendance verification are available only in the mobile app. Open HiTeam on your
            phone to continue setup, verify your face, and use Hi or Bye.
          </p>
        </section>

        <article className="panel feature-panel max-w-[640px]">
          <div className="panel-header">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <span className="section-kicker">Mobile required</span>
                <h2>Continue on phone</h2>
              </div>
            </div>
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Web admin can review biometric results, but employee face setup and attendance verification are disabled
            here by design.
          </p>
        </article>
      </section>
    </EmployeeShell>
  );
}
