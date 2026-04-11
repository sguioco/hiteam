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

  const [employee, history, anomalies, biometricHistory, managerAccess] =
    await Promise.all([
      serverApiRequestWithSession<EmployeeDetails>(
        session,
        `/employees/${employeeId}`,
      ).catch(() => null),
      serverApiRequestWithSession<AttendanceHistoryResponse>(
        session,
        `/attendance/employees/${employeeId}/history`,
      ).catch(() => null),
      serverApiRequestWithSession<AttendanceAnomalyResponse>(
        session,
        `/attendance/team/anomalies?employeeId=${employeeId}`,
      ).catch(() => null),
      serverApiRequestWithSession<EmployeeBiometricHistoryResponse>(
        session,
        `/biometric/employees/${employeeId}/history`,
      ).catch(() => null),
      canManageRoles
        ? serverApiRequestWithSession<EmployeeManagerAccess>(
            session,
            `/employees/${employeeId}/manager-access`,
          ).catch(() => null)
        : Promise.resolve(null),
    ]);

  const initialData: EmployeeDetailPageInitialData = {
    employeeId,
    employee,
    history,
    anomalies,
    biometricHistory,
    managerAccess,
  };

  return <EmployeeCardPageClient initialData={initialData} />;
}
