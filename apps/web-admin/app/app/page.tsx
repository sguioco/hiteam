import DashboardHome, { type DashboardInitialData } from "@/components/dashboard-home";
import { isEmployeeOnlyRole } from "@/lib/auth";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialDashboardData(
  session: Awaited<ReturnType<typeof requireServerSession>>,
): Promise<DashboardInitialData | null> {
  try {
    const response = await serverApiRequestWithSession<{
      initialData: DashboardInitialData;
      mode: "admin" | "employee";
    }>(session, "/bootstrap/dashboard");
    return response.initialData;
  } catch {
    return null;
  }
}

export default async function AdminHomePage() {
  const session = await requireServerSession();
  const mode = isEmployeeOnlyRole(session.user.roleCodes) ? "employee" : "admin";
  const initialData = await loadInitialDashboardData(session);

  return <DashboardHome initialData={initialData} initialSession={session} mode={mode} />;
}
