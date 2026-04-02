import type { ApprovalInboxItem } from "@smart/types";
import Requests from "@/components/Requests";
import { AdminShell } from "@/components/admin-shell";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialRequests() {
  const session = await requireServerSession();

  try {
    return await serverApiRequestWithSession<ApprovalInboxItem[]>(
      session,
      "/requests/inbox",
    );
  } catch {
    return null;
  }
}

export default async function RequestsPage() {
  const initialItems = await loadInitialRequests();

  return (
    <AdminShell>
      <Requests initialItems={initialItems} />
    </AdminShell>
  );
}
