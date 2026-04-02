import type { BiometricReviewResponse } from "@smart/types";
import BiometricReviewPageClient, {
  type BiometricPageInitialData,
} from "./biometric-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

type EmployeeOption = BiometricPageInitialData["employees"][number];

async function loadInitialBiometricData(): Promise<BiometricPageInitialData | null> {
  const session = await requireServerSession();

  try {
    const [employees, reviews] = await Promise.all([
      serverApiRequestWithSession<EmployeeOption[]>(session, "/employees"),
      serverApiRequestWithSession<BiometricReviewResponse>(
        session,
        "/biometric/team/reviews",
      ),
    ]);

    return {
      employees,
      reviews,
      result: "__all",
    };
  } catch {
    return null;
  }
}

export default async function BiometricReviewPage() {
  const initialData = await loadInitialBiometricData();
  return <BiometricReviewPageClient initialData={initialData} />;
}
