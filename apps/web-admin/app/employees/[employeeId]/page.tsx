import type { EmployeeDetailBootstrapResponse } from "@smart/types";
import EmployeeCardPageClient, {
  type EmployeeDetailPageInitialData,
} from "./employee-detail-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

export default async function EmployeeCardPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
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
    }));

  return <EmployeeCardPageClient initialData={initialData} />;
}
