import { AdminShellLoadingSidebar } from "./admin-shell-loading-sidebar";
import { WorkspaceLoading } from "./workspace-loading";

export default function AdminShellLoadingFrame({
  label = "Loading",
  locale = "ru",
}: {
  label?: string;
  locale?: "en" | "ru";
}) {
  return (
    <div className="admin-frame admin-frame-checking-session">
      <AdminShellLoadingSidebar locale={locale} />

      <section className="admin-content admin-content-session-check">
        <div className="shell-stage session-check-stage">
          <WorkspaceLoading
            className="admin-session-check-status"
            label={label}
          />
        </div>
      </section>
    </div>
  );
}
