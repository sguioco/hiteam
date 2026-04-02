import Employees, { type EmployeesInitialData } from "@/components/Employees";
import { AdminShell } from "@/components/admin-shell";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialEmployeesData(): Promise<EmployeesInitialData | null> {
  const session = await requireServerSession();

  try {
    return await serverApiRequestWithSession<EmployeesInitialData>(
      session,
      "/bootstrap/employees",
    );
  } catch {
    return null;
  }
}

export default async function EmployeesPage() {
  const initialData = await loadInitialEmployeesData();

  return (
    <AdminShell>
      <Employees initialData={initialData} />
    </AdminShell>
  );
}
