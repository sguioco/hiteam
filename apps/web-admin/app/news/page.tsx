import { AdminShell } from "@/components/admin-shell";
import { NewsCenter, type NewsCenterInitialData } from "@/components/news-center";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialNewsData(): Promise<{
  initialData: NewsCenterInitialData | null;
  mode: "admin" | "employee";
}> {
  const session = await requireServerSession();

  try {
    const response = await serverApiRequestWithSession<{
      initialData: NewsCenterInitialData | null;
      mode: "admin" | "employee";
    }>(session, "/bootstrap/news");

    return response;
  } catch {
    return {
      mode: "admin",
      initialData: null,
    };
  }
}

export default async function NewsPage() {
  const { initialData, mode } = await loadInitialNewsData();

  return (
    <AdminShell mode={mode}>
      <main className="page-shell section-stack">
        <NewsCenter
          initialData={initialData}
          mode={mode === "employee" ? "employee" : "manager"}
        />
      </main>
    </AdminShell>
  );
}
