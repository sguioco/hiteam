import DashboardHome, { type DashboardInitialData } from "@/components/dashboard-home";
import { isEmployeeOnlyRole } from "@/lib/auth";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialDashboardData(
  session: Awaited<ReturnType<typeof requireServerSession>>,
): Promise<DashboardInitialData | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await serverApiRequestWithSession<{
        initialData: DashboardInitialData;
        mode: "admin" | "employee";
      }>(session, "/bootstrap/dashboard");
      return response.initialData;
    } catch {
      if (attempt === 1) {
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  return null;
}

export default async function AdminHomePage() {
  const session = await requireServerSession();
  const mode = isEmployeeOnlyRole(session.user.roleCodes) ? "employee" : "admin";
  const initialData = await loadInitialDashboardData(session);

  return <DashboardHome initialData={initialData} initialSession={session} mode={mode} />;
}
