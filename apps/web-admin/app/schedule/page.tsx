import { Suspense } from "react";
import Schedule from "@/components/Schedule";

export default function SchedulePage() {
  return (
    <Suspense>
      <Schedule />
    </Suspense>
  );
}
