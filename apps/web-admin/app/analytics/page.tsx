import AnalyticsPageClient, {
  type AnalyticsPageInitialData,
} from "./analytics-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialAnalyticsData(): Promise<AnalyticsPageInitialData | null> {
  const session = await requireServerSession();

  try {
    return await serverApiRequestWithSession<AnalyticsPageInitialData>(
      session,
      "/bootstrap/analytics",
    );
  } catch {
    return null;
  }
}

export default async function AnalyticsPage() {
  const initialData = await loadInitialAnalyticsData();
  return <AnalyticsPageClient initialData={initialData} />;
}
