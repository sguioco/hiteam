import type { AuthSession } from "./auth";
import { isEmployeeOnlyRole } from "./auth";
import type {
  InitialShellBootstrap,
  ShellBootstrapResponse,
} from "./shell-bootstrap";
import { serverApiRequestWithSession } from "./server-api";

export async function loadInitialShellBootstrap(
  session: AuthSession,
): Promise<InitialShellBootstrap | null> {
  const mode = isEmployeeOnlyRole(session.user.roleCodes) ? "employee" : "admin";

  try {
    const bootstrap = await serverApiRequestWithSession<ShellBootstrapResponse>(
      session,
      "/auth/bootstrap",
    );

    return {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      mode,
      header: bootstrap.header,
      notifications: bootstrap.notifications,
    };
  } catch {
    return null;
  }
}
