import ProfilePageClient, { type ProfileEmployee } from "./profile-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

export default async function ProfilePage() {
  const session = await requireServerSession();
  const initialEmployee = await serverApiRequestWithSession<ProfileEmployee | null>(
    session,
    "/employees/me",
  )
    .catch(() => undefined);

  return (
    <ProfilePageClient
      initialEmployee={initialEmployee}
      initialSession={session}
    />
  );
}
