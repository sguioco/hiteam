import { AdminShell } from "@/components/admin-shell";
import { NewsCenter } from "@/components/news-center";

export default function NewsPage() {
  return (
    <AdminShell>
      <main className="page-shell section-stack">
        <NewsCenter mode="manager" />
      </main>
    </AdminShell>
  );
}
