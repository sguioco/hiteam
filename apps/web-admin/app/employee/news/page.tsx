import { EmployeeShell } from "@/components/employee-shell";
import { NewsCenter } from "@/components/news-center";

export default function EmployeeNewsPage() {
  return (
    <EmployeeShell>
      <main className="page-shell section-stack">
        <NewsCenter mode="employee" />
      </main>
    </EmployeeShell>
  );
}
