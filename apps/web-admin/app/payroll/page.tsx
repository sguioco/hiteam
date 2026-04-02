import type {
  ExportJobsResponse,
  HolidayCalendarDay,
  PayrollPolicy,
  PayrollSummaryResponse,
} from "@smart/types";
import PayrollPageClient, {
  type PayrollPageInitialData,
} from "./payroll-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialPayrollData(): Promise<PayrollPageInitialData | null> {
  const session = await requireServerSession();

  try {
    const [summary, policy, holidays, jobs] = await Promise.all([
      serverApiRequestWithSession<PayrollSummaryResponse>(session, "/payroll/summary"),
      serverApiRequestWithSession<PayrollPolicy>(session, "/payroll/policy"),
      serverApiRequestWithSession<HolidayCalendarDay[]>(session, "/payroll/holidays"),
      serverApiRequestWithSession<ExportJobsResponse>(
        session,
        "/exports/jobs?type=PAYROLL_SUMMARY",
      ),
    ]);

    return {
      summary,
      policy,
      holidays,
      exportJobs: jobs.items,
    };
  } catch {
    return null;
  }
}

export default async function PayrollPage() {
  const initialData = await loadInitialPayrollData();
  return <PayrollPageClient initialData={initialData} />;
}
