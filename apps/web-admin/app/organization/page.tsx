import OrganizationPageClient, {
  type OrganizationPageInitialData,
} from "./organization-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

type Company = {
  id: string;
};

type EmployeeSummary = {
  company?: Company | null;
  id: string;
};

type OrganizationSetupResponse = OrganizationPageInitialData["setup"];

async function loadInitialOrganizationData(): Promise<OrganizationPageInitialData | null> {
  const session = await requireServerSession();

  try {
    const [setup, employees] = await Promise.all([
      serverApiRequestWithSession<OrganizationSetupResponse>(session, "/org/setup"),
      serverApiRequestWithSession<EmployeeSummary[]>(session, "/employees"),
    ]);

    return {
      setup,
      employeeCount: setup.company?.id
        ? employees.filter((employee) => employee.company?.id === setup.company?.id).length
        : 0,
    };
  } catch {
    return null;
  }
}

export default async function OrganizationPage() {
  const initialData = await loadInitialOrganizationData();
  return <OrganizationPageClient initialData={initialData} />;
}
