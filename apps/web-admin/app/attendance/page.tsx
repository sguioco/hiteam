import Attendance, { type AttendanceInitialData } from "@/components/Attendance";
import { AdminShell } from "@/components/admin-shell";
import { DEMO_ADMIN_EMAIL, isDemoAccessToken } from "@/lib/demo-mode";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialAttendanceData(): Promise<AttendanceInitialData | null> {
  const session = await requireServerSession();
  const isOwnerDemoAccount =
    session.user.email.trim().toLowerCase() === DEMO_ADMIN_EMAIL;

  if (isDemoAccessToken(session.accessToken) || isOwnerDemoAccount) {
    return null;
  }

  try {
    return await serverApiRequestWithSession<AttendanceInitialData>(
      session,
      "/bootstrap/attendance",
    );
  } catch {
    return null;
  }
}

export default async function AttendancePage() {
  const initialData = await loadInitialAttendanceData();

  return (
    <AdminShell>
      <Attendance initialData={initialData} />
    </AdminShell>
  );
}
