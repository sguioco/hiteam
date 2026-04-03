import { headers } from "next/headers";
import ManagerJoinPageClient from "./manager-join-page-client";
import type { PublicInvitationPayload } from "../../invitation-types";
import { serverApiRequest } from "@/lib/server-api";

type ManagerJoinPageProps = {
  params: Promise<{ token: string }>;
};

async function loadInitialInvitation(token: string, locale: "ru" | "en") {
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
        error instanceof Error
          ? error.message
          : locale === "ru"
            ? "Не удалось открыть приглашение."
            : "Failed to open the invitation.",
      initialInvitation: null,
    };
  }
}

export default async function ManagerJoinPage({
  params,
}: ManagerJoinPageProps) {
  const { token } = await params;
  const acceptLanguage = (await headers()).get("accept-language")?.toLowerCase() ?? "";
  const locale: "ru" | "en" = acceptLanguage.startsWith("ru") ? "ru" : "en";
  const { initialError, initialInvitation } = await loadInitialInvitation(token, locale);

  return (
    <ManagerJoinPageClient
      initialError={initialError}
      initialInvitation={initialInvitation}
      token={token}
    />
  );
}
