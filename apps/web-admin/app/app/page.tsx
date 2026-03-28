"use client";

import DashboardHome from "@/components/dashboard-home";
import { SessionLoader } from "@/components/session-loader";
import { getSession, isEmployeeOnlyRole, redirectToLogin } from "@/lib/auth";
import { useEffect, useState } from "react";

export default function AdminHomePage() {
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

  return <DashboardHome mode={employeeMode ? "employee" : "admin"} />;
}
