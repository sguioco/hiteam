import ProfilePageClient from "./profile-page-client";
import { requireServerSession } from "@/lib/server-auth";

export default async function ProfilePage() {
  const session = await requireServerSession();

  return (
    <ProfilePageClient
      initialEmployee={null}
      initialSession={session}
    />
  );
}
