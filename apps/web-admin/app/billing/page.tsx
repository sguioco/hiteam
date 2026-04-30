import BillingPageClient, {
  type BillingPageInitialData,
} from "./billing-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialBillingData(): Promise<BillingPageInitialData | null> {
  const session = await requireServerSession();

  try {
    return await serverApiRequestWithSession<BillingPageInitialData>(
      session,
      "/billing/summary",
    );
  } catch {
    return null;
  }
}

export default async function BillingPage() {
  const initialData = await loadInitialBillingData();
  return <BillingPageClient initialData={initialData} />;
}
