import type { LeaderboardBootstrapResponse } from "@smart/types";
import { AdminShell } from "@/components/admin-shell";
import {
  LeaderboardCenter,
  type LeaderboardCenterInitialData,
} from "@/components/leaderboard-center";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialLeaderboardData(month?: string): Promise<{
  initialData: LeaderboardCenterInitialData | null;
  mode: "admin" | "employee";
}> {
  const session = await requireServerSession();
  const query = month?.trim() ? `?month=${encodeURIComponent(month.trim())}` : "";

  try {
    return await serverApiRequestWithSession<LeaderboardBootstrapResponse>(
      session,
      `/bootstrap/leaderboard${query}`,
    );
  } catch {
    return {
      mode: "admin",
      initialData: null,
    };
  }
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const monthParam = resolvedSearchParams?.month;
  const month =
    typeof monthParam === "string" ? monthParam : monthParam?.[0];
  const { initialData, mode } = await loadInitialLeaderboardData(month);

  return (
    <AdminShell mode={mode}>
      <main className="page-shell section-stack">
        <LeaderboardCenter initialData={initialData} />
      </main>
    </AdminShell>
  );
}
