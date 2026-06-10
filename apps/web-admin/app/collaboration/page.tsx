import type { CollaborationBootstrapResponse } from "@smart/types";
import CollaborationPageClient, {
  type CollaborationPageInitialData,
} from "./collaboration-page-client";
import { DEMO_ADMIN_EMAIL, isDemoAccessToken } from "@/lib/demo-mode";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialCollaborationData(): Promise<CollaborationPageInitialData | null> {
  const session = await requireServerSession();
  const windowDays = 30;
  const isOwnerDemoAccount =
    session.user.email.trim().toLowerCase() === DEMO_ADMIN_EMAIL;

  if (isDemoAccessToken(session.accessToken) || isOwnerDemoAccount) {
    return null;
  }

  try {
    return await serverApiRequestWithSession<CollaborationBootstrapResponse>(
      session,
      `/bootstrap/collaboration?days=${windowDays}`,
    );
  } catch {
    return null;
  }
}

export default async function CollaborationPage() {
  const initialData = await loadInitialCollaborationData();
  return <CollaborationPageClient initialData={initialData} />;
}
