import { redirect } from "next/navigation";
import {
  ManagerTasksPage,
  type ManagerTasksPageInitialData,
} from "@/components/manager-tasks-page";
import { hasManagerAccess } from "@/lib/auth";
import { toAdminHref } from "@/lib/admin-routes";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function loadInitialTasksData(): Promise<ManagerTasksPageInitialData | null> {
  const session = await requireServerSession();

  if (!hasManagerAccess(session.user.roleCodes)) {
    redirect(toAdminHref("/"));
  }

  const today = formatDateInput(new Date());

  try {
    return await serverApiRequestWithSession<ManagerTasksPageInitialData>(
      session,
      `/bootstrap/tasks?dateFrom=${today}&dateTo=${today}`,
    );
  } catch {
    return null;
  }
}

export default async function TasksPage() {
  const initialData = await loadInitialTasksData();
  return <ManagerTasksPage initialData={initialData} />;
}
