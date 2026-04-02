import type { ObservabilitySummaryResponse } from "@smart/types";
import ObservabilityPageClient from "./observability-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialObservabilitySummary() {
  const session = await requireServerSession();

  try {
    return await serverApiRequestWithSession<ObservabilitySummaryResponse>(
      session,
      "/observability/summary",
    );
  } catch {
    return null;
  }
}

export default async function ObservabilityPage() {
  const initialSummary = await loadInitialObservabilitySummary();
  return <ObservabilityPageClient initialSummary={initialSummary} />;
}
