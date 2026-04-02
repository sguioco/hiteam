import type {
  AnnouncementItem,
  AnnouncementTemplateItem,
  ChatThreadItem,
  CollaborationAnalyticsResponse,
  CollaborationOverviewResponse,
  CollaborationTaskBoardResponse,
  TaskAutomationPolicy,
  TaskTemplateItem,
} from "@smart/types";
import CollaborationPageClient, {
  type CollaborationPageInitialData,
} from "./collaboration-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

type EmployeeOption = CollaborationPageInitialData["employees"][number];

async function loadInitialCollaborationData(): Promise<CollaborationPageInitialData | null> {
  const session = await requireServerSession();
  const windowDays = 30;

  try {
    const [
      overview,
      analytics,
      taskBoard,
      automationPolicy,
      taskTemplates,
      announcementTemplates,
      employees,
      announcements,
      chats,
    ] = await Promise.all([
      serverApiRequestWithSession<CollaborationOverviewResponse>(
        session,
        "/collaboration/overview",
      ),
      serverApiRequestWithSession<CollaborationAnalyticsResponse>(
        session,
        `/collaboration/analytics?days=${windowDays}`,
      ),
      serverApiRequestWithSession<CollaborationTaskBoardResponse>(
        session,
        "/collaboration/tasks",
      ),
      serverApiRequestWithSession<TaskAutomationPolicy>(
        session,
        "/collaboration/automation/policy",
      ),
      serverApiRequestWithSession<TaskTemplateItem[]>(
        session,
        "/collaboration/task-templates",
      ),
      serverApiRequestWithSession<AnnouncementTemplateItem[]>(
        session,
        "/collaboration/announcement-templates",
      ),
      serverApiRequestWithSession<EmployeeOption[]>(session, "/employees"),
      serverApiRequestWithSession<AnnouncementItem[]>(
        session,
        "/collaboration/announcements",
      ),
      serverApiRequestWithSession<ChatThreadItem[]>(session, "/collaboration/chats"),
    ]);

    return {
      overview,
      analytics,
      taskBoard,
      automationPolicy,
      taskTemplates,
      announcementTemplates,
      employees,
      announcements,
      chats,
      windowDays,
    };
  } catch {
    return null;
  }
}

export default async function CollaborationPage() {
  const initialData = await loadInitialCollaborationData();
  return <CollaborationPageClient initialData={initialData} />;
}
