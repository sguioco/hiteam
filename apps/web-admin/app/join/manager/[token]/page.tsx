import ManagerJoinPageClient from "./manager-join-page-client";
import type { PublicInvitationPayload } from "../../invitation-types";
import { serverApiRequest } from "@/lib/server-api";

type ManagerJoinPageProps = {
  params: Promise<{ token: string }>;
};

async function loadInitialInvitation(token: string) {
  try {
    const invitation = await serverApiRequest<PublicInvitationPayload>(
      `/employees/invitations/public/${token}`,
    );
    return {
      initialError: null,
      initialInvitation: invitation,
    };
  } catch (error) {
    return {
      initialError:
        error instanceof Error ? error.message : "Не удалось открыть приглашение.",
      initialInvitation: null,
    };
  }
}

export default async function ManagerJoinPage({
  params,
}: ManagerJoinPageProps) {
  const { token } = await params;
  const { initialError, initialInvitation } = await loadInitialInvitation(token);

  return (
    <ManagerJoinPageClient
      initialError={initialError}
      initialInvitation={initialInvitation}
      token={token}
    />
  );
}
