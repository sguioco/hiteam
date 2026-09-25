import type { EmployeeDetailBootstrapResponse } from "@smart/types";
import EmployeeCardPageClient, {
  type EmployeeDetailPageInitialData,
} from "./employee-detail-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";
import { safeActivityReturnHref } from "@/lib/activity-task-navigation";

export default async function EmployeeCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { employeeId } = await params;
  const { returnTo } = await searchParams;
  const session = await requireServerSession();

  const initialData =
    await serverApiRequestWithSession<EmployeeDetailBootstrapResponse>(
      session,
      `/bootstrap/employees/${employeeId}`,
    ).catch<EmployeeDetailPageInitialData>(() => ({
      employeeId,
      employee: null,
      history: null,
      anomalies: null,
      biometricHistory: null,
      managerAccess: null,
      groups: [],
      locations: [],
    }));

  return <EmployeeCardPageClient initialData={initialData} activityReturn={safeActivityReturnHref(new URLSearchParams({ returnTo: returnTo ?? "" }).toString())} />;
}
