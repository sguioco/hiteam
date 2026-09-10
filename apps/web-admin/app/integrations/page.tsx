import IntegrationsPageClient, {
  type IntegrationsPageInitialData,
} from "./integrations-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialData(): Promise<IntegrationsPageInitialData | null> {
  const session = await requireServerSession();

  try {
    return await serverApiRequestWithSession<IntegrationsPageInitialData>(
      session,
      "/billing/summary",
    );
  } catch {
    return null;
  }
}

export default async function IntegrationsPage() {
  const initialData = await loadInitialData();
  return <IntegrationsPageClient initialData={initialData} />;
}
