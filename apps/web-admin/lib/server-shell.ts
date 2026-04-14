import type { AuthSession } from "./auth";
import { isEmployeeOnlyRole } from "./auth";
import { isDemoAccessToken } from "./demo-mode";
import { getMockAvatarDataUrl } from "./mock-avatar";
import type {
  InitialShellBootstrap,
  ShellBootstrapResponse,
} from "./shell-bootstrap";
import { serverApiRequestWithSession } from "./server-api";

const DEMO_COMPANY_NAME_EN = "Beauty Saloon";
const DEMO_HEADER_EMPLOYEE_COUNT = 16;
const DEMO_ADMIN_AVATAR_URL =
  "https://www.untitledui.com/images/avatars/transparent/nicolas-trevino?bg=%23E0E0E0";

function buildDemoInitialShellBootstrap(
  session: AuthSession,
  mode: "admin" | "employee",
): InitialShellBootstrap {
  const isEmployee = mode === "employee";

  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    mode,
    header: {
      employeeCount: DEMO_HEADER_EMPLOYEE_COUNT,
      organization: {
        company: {
          logoUrl: null,
          name: DEMO_COMPANY_NAME_EN,
        },
        configured: true,
      },
      accountProfile: {
        firstName: isEmployee ? "Alex" : "Alex",
        lastName: isEmployee ? "Mironov" : "Petrov",
        avatarUrl: isEmployee
          ? getMockAvatarDataUrl("Alex Mironov", "male")
          : DEMO_ADMIN_AVATAR_URL,
        company: {
          logoUrl: null,
          name: DEMO_COMPANY_NAME_EN,
        },
      },
    },
    notifications: null,
  };
}

export async function loadInitialShellBootstrap(
  session: AuthSession,
): Promise<InitialShellBootstrap | null> {
  const mode = isEmployeeOnlyRole(session.user.roleCodes) ? "employee" : "admin";

  if (isDemoAccessToken(session.accessToken)) {
    return buildDemoInitialShellBootstrap(session, mode);
  }

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
