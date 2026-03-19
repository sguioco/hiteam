import Employees from "@/components/Employees";
import { AdminShell } from "@/components/admin-shell";

export default function EmployeesPage() {
  return (
    <AdminShell>
      <Employees />
    </AdminShell>
  );
}
