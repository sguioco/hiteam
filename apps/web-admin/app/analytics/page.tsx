import type { AttendanceAnomalyResponse, AttendanceHistoryResponse } from "@smart/types";
import AnalyticsPageClient, {
  type AnalyticsPageInitialData,
} from "./analytics-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

function buildDateRange(days: number) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

async function loadInitialAnalyticsData(): Promise<AnalyticsPageInitialData | null> {
  const session = await requireServerSession();
  const period = "14d" as const;
  const { start, end } = buildDateRange(14);
  const query = new URLSearchParams({
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
  });

  try {
    const [history, anomalies, employees] = await Promise.all([
      serverApiRequestWithSession<AttendanceHistoryResponse>(
        session,
        `/attendance/team/history?${query.toString()}`,
      ),
      serverApiRequestWithSession<AttendanceAnomalyResponse>(
        session,
        `/attendance/team/anomalies?${query.toString()}`,
      ),
      serverApiRequestWithSession<Array<{ id: string }>>(session, "/employees"),
    ]);

    return {
      history,
      anomalies,
      employeeCount: employees.length,
      period,
    };
  } catch {
    return null;
  }
}

export default async function AnalyticsPage() {
  const initialData = await loadInitialAnalyticsData();
  return <AnalyticsPageClient initialData={initialData} />;
}
