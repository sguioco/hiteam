import type { NewsBootstrapResponse } from "@smart/types";
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
    const response = await serverApiRequestWithSession<NewsBootstrapResponse>(
      session,
      "/bootstrap/news",
    );

    return response;
  } catch {
    return {
      mode: "admin",
      initialData: null,
    };
  }
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const createParam = resolvedSearchParams?.create;
  const autoOpenCreate = Array.isArray(createParam)
    ? createParam.includes("1")
    : createParam === "1";
  const { initialData, mode } = await loadInitialNewsData();

  return (
    <AdminShell mode={mode}>
      <main className="page-shell section-stack">
        <NewsCenter
          autoOpenCreate={autoOpenCreate}
          initialData={initialData}
          mode={mode === "employee" ? "employee" : "manager"}
        />
      </main>
    </AdminShell>
  );
}
