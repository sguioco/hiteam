import DashboardHome from "@/components/dashboard-home";
import { getServerSessionMode } from "@/lib/server-auth";

export default async function AdminHomePage() {
  const mode = await getServerSessionMode();
  return <DashboardHome mode={mode} />;
}
