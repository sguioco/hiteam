import { BrandWordmark } from "@/components/brand-wordmark";
import { WorkspaceLoading } from "@/components/workspace-loading";

export default function AppLoading() {
  return (
    <div className="admin-frame admin-frame-checking-session">
      <aside className="sidebar sidebar-untitled sidebar-checking-session">
        <div className="sidebar-brand sidebar-untitled-brand">
          <div className="sidebar-untitled-brand-row">
            <BrandWordmark className="text-[1.8rem]" />
          </div>
        </div>
      </aside>

      <section className="admin-content admin-content-session-check">
        <div className="shell-stage session-check-stage">
          <WorkspaceLoading
            className="admin-session-check-status"
            label="Loading"
          />
        </div>
      </section>
    </div>
  );
}
