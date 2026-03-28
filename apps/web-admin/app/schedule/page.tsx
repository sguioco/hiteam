"use client";

import { Suspense, useEffect, useState } from "react";
import Schedule from "@/components/Schedule";
import { SessionLoader } from "@/components/session-loader";
import { getSession, isEmployeeOnlyRole, redirectToLogin } from "@/lib/auth";

export default function SchedulePage() {
  const [employeeMode, setEmployeeMode] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();

    if (!session) {
      redirectToLogin();
      return;
    }

    setEmployeeMode(isEmployeeOnlyRole(session.user.roleCodes));
    setReady(true);
  }, []);

  if (!ready) {
    return <SessionLoader label="Checking session" />;
  }

  return (
    <Suspense>
      <Schedule mode={employeeMode ? "employee" : "admin"} />
    </Suspense>
  );
}
