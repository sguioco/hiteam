import type { DashboardBootstrapResponse } from "@smart/types";
import type { DashboardActivityItem } from "@/components/dashboard/DailyActivityPanel";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";
import ActivityPageClient, {
  type ActivityPageInitialData,
} from "./activity-page-client";

async function loadInitialActivityData(): Promise<ActivityPageInitialData | null> {
  const session = await requireServerSession();

  try {
    return await serverApiRequestWithSession<ActivityPageInitialData>(
      session,
      "/bootstrap/activity",
    );
  } catch {
    try {
      const snapshot = await serverApiRequestWithSession<DashboardBootstrapResponse>(
        session,
        "/bootstrap/dashboard",
      );

      return {
        items:
          (snapshot.initialData.dailyActivity as
            | DashboardActivityItem[]
            | undefined) ?? [],
      };
    } catch {
      return null;
    }
  }
}

export default async function ActivityPage() {
  const initialData = await loadInitialActivityData();
  return <ActivityPageClient initialData={initialData} />;
}
