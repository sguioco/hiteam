import DashboardHome from "@/components/dashboard-home";
import { isEmployeeOnlyRole } from "@/lib/auth";
import { requireServerSession } from "@/lib/server-auth";

export default async function AdminHomePage() {
  const session = await requireServerSession();
  const mode = isEmployeeOnlyRole(session.user.roleCodes) ? "employee" : "admin";
  return <DashboardHome initialSession={session} mode={mode} />;
}
