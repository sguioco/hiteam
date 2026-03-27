import { AdminShell } from "@/components/admin-shell";
import { NewsArchive } from "@/components/news-archive";

export default function NewsArchivePage() {
  return (
    <AdminShell>
      <main className="page-shell section-stack">
        <NewsArchive />
      </main>
    </AdminShell>
  );
}
