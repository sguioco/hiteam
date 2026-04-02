import { AdminShell } from "@/components/admin-shell";
import { NewsCenter } from "@/components/news-center";
import { getServerSessionMode } from "@/lib/server-auth";

export default async function NewsPage() {
  const mode = await getServerSessionMode();

  return (
    <AdminShell mode={mode}>
      <main className="page-shell section-stack">
        <NewsCenter mode={mode === "employee" ? "employee" : "manager"} />
      </main>
    </AdminShell>
  );
}
