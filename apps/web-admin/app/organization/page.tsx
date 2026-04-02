import OrganizationPageClient, {
  type OrganizationPageInitialData,
} from "./organization-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

type OrganizationSetupResponse = OrganizationPageInitialData["setup"];

async function loadInitialOrganizationData(): Promise<OrganizationPageInitialData | null> {
  const session = await requireServerSession();

  try {
    return await serverApiRequestWithSession<OrganizationPageInitialData>(
      session,
      "/bootstrap/organization",
    );
  } catch {
    return null;
  }
}

export default async function OrganizationPage() {
  const initialData = await loadInitialOrganizationData();
  return <OrganizationPageClient initialData={initialData} />;
}
