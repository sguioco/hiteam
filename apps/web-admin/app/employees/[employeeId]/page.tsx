import type {
  AttendanceAnomalyResponse,
  AttendanceHistoryResponse,
  EmployeeBiometricHistoryResponse,
} from "@smart/types";
import EmployeeCardPageClient, {
  type EmployeeDetailPageInitialData,
} from "./employee-detail-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

type EmployeeDetails = EmployeeDetailPageInitialData["employee"];
type EmployeeManagerAccess = EmployeeDetailPageInitialData["managerAccess"];

export default async function EmployeeCardPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const session = await requireServerSession();
  const canManageRoles = session.user.roleCodes.some((roleCode) =>
    ["tenant_owner", "hr_admin", "operations_admin"].includes(roleCode),
  );

  let initialData: EmployeeDetailPageInitialData | null = null;

  try {
    const [employee, history, anomalies, biometricHistory, managerAccess] =
      await Promise.all([
        serverApiRequestWithSession<EmployeeDetails>(session, `/employees/${employeeId}`),
        serverApiRequestWithSession<AttendanceHistoryResponse>(
          session,
          `/attendance/employees/${employeeId}/history`,
        ),
        serverApiRequestWithSession<AttendanceAnomalyResponse>(
          session,
          `/attendance/team/anomalies?employeeId=${employeeId}`,
        ),
        serverApiRequestWithSession<EmployeeBiometricHistoryResponse>(
          session,
          `/biometric/employees/${employeeId}/history`,
        ),
        canManageRoles
          ? serverApiRequestWithSession<EmployeeManagerAccess>(
              session,
              `/employees/${employeeId}/manager-access`,
            )
          : Promise.resolve(null),
      ]);

    initialData = {
      employeeId,
      employee,
      history,
      anomalies,
      biometricHistory,
      managerAccess,
    };
  } catch {
    initialData = {
      employeeId,
      employee: null,
      history: null,
      anomalies: null,
      biometricHistory: null,
      managerAccess: null,
    };
  }

  return <EmployeeCardPageClient initialData={initialData} />;
}
