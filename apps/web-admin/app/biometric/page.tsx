import BiometricReviewPageClient, {
  type BiometricPageInitialData,
} from "./biometric-page-client";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialBiometricData(): Promise<BiometricPageInitialData | null> {
  const session = await requireServerSession();

  try {
    return await serverApiRequestWithSession<BiometricPageInitialData>(
      session,
      "/bootstrap/biometric",
    );
  } catch {
    return null;
  }
}

export default async function BiometricReviewPage() {
  const initialData = await loadInitialBiometricData();
  return <BiometricReviewPageClient initialData={initialData} />;
}
