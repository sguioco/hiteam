import type { AuthSession } from "@/lib/auth";
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
    return await serverApiRequestWithSession<ProfileEmployee | null>(
      session,
      "/employees/me",
    );
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
