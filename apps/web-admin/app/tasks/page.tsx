import { redirect } from "next/navigation";
import {
  ManagerTasksPage,
  type ManagerTasksPageInitialData,
} from "@/components/manager-tasks-page";
import { hasManagerAccess } from "@/lib/auth";
import { toAdminHref } from "@/lib/admin-routes";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialTasksData(): Promise<ManagerTasksPageInitialData | null> {
  const session = await requireServerSession();

  if (!hasManagerAccess(session.user.roleCodes)) {
    redirect(toAdminHref("/"));
  }

  try {
    return await serverApiRequestWithSession<ManagerTasksPageInitialData>(
      session,
      "/bootstrap/tasks",
    );
  } catch {
    return null;
  }
}

export default async function TasksPage() {
  const initialData = await loadInitialTasksData();
  return <ManagerTasksPage initialData={initialData} />;
}
