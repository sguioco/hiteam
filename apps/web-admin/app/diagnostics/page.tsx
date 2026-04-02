import type {
  DiagnosticsPolicy,
  DiagnosticsSummaryResponse,
  DiagnosticsTrendsResponse,
  ExportJobsResponse,
  PushDiagnosticsResponse,
  TeamBiometricJobsResponse,
} from "@smart/types";
import DiagnosticsPageClient, {
  type DiagnosticsPageInitialData,
} from "./diagnostics-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialDiagnosticsData(): Promise<DiagnosticsPageInitialData | null> {
  const session = await requireServerSession();

  try {
    const [
      summary,
      policy,
      trends,
      exportsResponse,
      biometricResponse,
      pushResponse,
    ] = await Promise.all([
      serverApiRequestWithSession<DiagnosticsSummaryResponse>(
        session,
        "/diagnostics/summary",
      ),
      serverApiRequestWithSession<DiagnosticsPolicy>(session, "/diagnostics/policy"),
      serverApiRequestWithSession<DiagnosticsTrendsResponse>(
        session,
        "/diagnostics/trends?hours=24",
      ),
      serverApiRequestWithSession<ExportJobsResponse>(session, "/exports/jobs?page=1"),
      serverApiRequestWithSession<TeamBiometricJobsResponse>(
        session,
        "/biometric/jobs/team?page=1",
      ),
      serverApiRequestWithSession<PushDiagnosticsResponse>(
        session,
        "/push/diagnostics?page=1",
      ),
    ]);

    return {
      summary,
      policy,
      trends,
      exportsData: exportsResponse.items,
      biometricJobs: biometricResponse.items,
      pushDeliveries: pushResponse.items,
      exportMeta: {
        total: exportsResponse.total,
        page: exportsResponse.page,
        totalPages: exportsResponse.totalPages,
      },
      biometricMeta: {
        total: biometricResponse.total,
        page: biometricResponse.page,
        totalPages: biometricResponse.totalPages,
      },
      pushMeta: {
        total: pushResponse.total,
        page: pushResponse.page,
        totalPages: pushResponse.totalPages,
      },
    };
  } catch {
    return null;
  }
}

export default async function DiagnosticsPage() {
  const initialData = await loadInitialDiagnosticsData();
  return <DiagnosticsPageClient initialData={initialData} />;
}
