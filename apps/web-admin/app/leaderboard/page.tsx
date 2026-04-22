import { AdminShell } from "@/components/admin-shell";
import {
  LeaderboardCenter,
  type LeaderboardCenterInitialData,
} from "@/components/leaderboard-center";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialLeaderboardData(): Promise<{
  initialData: LeaderboardCenterInitialData | null;
  mode: "admin" | "employee";
}> {
  const session = await requireServerSession();

  try {
    return await serverApiRequestWithSession<{
      initialData: LeaderboardCenterInitialData | null;
      mode: "admin" | "employee";
    }>(session, "/bootstrap/leaderboard");
  } catch {
    return {
      mode: "admin",
      initialData: null,
    };
  }
}

export default async function LeaderboardPage() {
  const { initialData, mode } = await loadInitialLeaderboardData();

  return (
    <AdminShell mode={mode}>
      <main className="page-shell section-stack">
        <LeaderboardCenter initialData={initialData} />
      </main>
    </AdminShell>
  );
}
