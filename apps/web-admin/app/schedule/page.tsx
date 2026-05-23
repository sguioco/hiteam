import type { ManagerScheduleBootstrapResponse } from "@smart/types";
import Schedule, { type ScheduleInitialData } from "@/components/Schedule";
import { getDemoScheduleBootstrap } from "@/lib/demo-api";
import { DEMO_ADMIN_EMAIL, isDemoAccessToken } from "@/lib/demo-mode";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialScheduleData(): Promise<{
  initialData: ScheduleInitialData | null;
  mode: "admin" | "employee";
}> {
  const session = await requireServerSession();
  const isOwnerDemoAccount =
    session.user.email.trim().toLowerCase() === DEMO_ADMIN_EMAIL;

  if (isDemoAccessToken(session.accessToken) || isOwnerDemoAccount) {
    return getDemoScheduleBootstrap(session.accessToken) as {
      initialData: ScheduleInitialData | null;
      mode: "admin" | "employee";
    };
  }

  try {
    return await serverApiRequestWithSession<ManagerScheduleBootstrapResponse>(
      session,
      "/bootstrap/schedule",
    );
  } catch {
    return {
      mode: "admin",
      initialData: null,
    };
  }
}

export default async function SchedulePage() {
  const { initialData, mode } = await loadInitialScheduleData();

  return <Schedule initialData={initialData} mode={mode} />;
}
