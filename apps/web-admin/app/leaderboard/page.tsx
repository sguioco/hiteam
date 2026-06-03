import type { LeaderboardBootstrapResponse } from "@smart/types";
import { AdminShell } from "@/components/admin-shell";
import {
  LeaderboardCenter,
  type LeaderboardCenterInitialData,
} from "@/components/leaderboard-center";
import { hasManagerAccess } from "@/lib/auth";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

const LEADERBOARD_SERVER_BOOTSTRAP_TIMEOUT_MS = 1800;

async function loadInitialLeaderboardData(
  session: Awaited<ReturnType<typeof requireServerSession>>,
  month?: string,
): Promise<LeaderboardCenterInitialData | null> {
  const query = month?.trim() ? `?month=${encodeURIComponent(month.trim())}` : "";

  try {
    const snapshot = await serverApiRequestWithSession<LeaderboardBootstrapResponse>(
      session,
      `/bootstrap/leaderboard${query}`,
      {
        timeoutMs: LEADERBOARD_SERVER_BOOTSTRAP_TIMEOUT_MS,
      },
    );

    return snapshot.initialData;
  } catch {
    return null;
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
  const session = await requireServerSession();
  const initialData = await loadInitialLeaderboardData(session, month);
  const mode = hasManagerAccess(session.user.roleCodes) ? "admin" : "employee";

  return (
    <AdminShell mode={mode}>
      <main className="page-shell section-stack">
        <LeaderboardCenter initialData={initialData} requestedMonthKey={month} />
      </main>
    </AdminShell>
  );
}
