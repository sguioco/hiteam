import type { AuthSession } from "@/lib/auth";
import type { DashboardBootstrapResponse } from "@smart/types";
import ProfilePageClient from "./profile-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

type ProfileEmployee = {
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

async function loadInitialProfileData(session: AuthSession) {
  try {
    const snapshot = await serverApiRequestWithSession<DashboardBootstrapResponse>(
      session,
      "/bootstrap/dashboard",
    );
    return snapshot.initialData.profile;
  } catch {
    return null;
  }
}

export default async function ProfilePage() {
  const session = await requireServerSession();
  const initialEmployee = await loadInitialProfileData(session);

  return (
    <ProfilePageClient
      initialEmployee={initialEmployee}
      initialSession={session}
    />
  );
}
