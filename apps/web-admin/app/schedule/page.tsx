import { Suspense } from "react";
import Schedule from "@/components/Schedule";
import { getServerSessionMode } from "@/lib/server-auth";

export default async function SchedulePage() {
  const mode = await getServerSessionMode();

  return (
    <Suspense>
      <Schedule mode={mode} />
    </Suspense>
  );
}
