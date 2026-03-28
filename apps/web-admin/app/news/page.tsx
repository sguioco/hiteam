"use client";

import { AdminShell } from "@/components/admin-shell";
import { NewsCenter } from "@/components/news-center";
import { SessionLoader } from "@/components/session-loader";
import { getSession, isEmployeeOnlyRole, redirectToLogin } from "@/lib/auth";
import { useEffect, useState } from "react";

export default function NewsPage() {
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
    <AdminShell mode={employeeMode ? "employee" : "admin"}>
      <main className="page-shell section-stack">
        <NewsCenter mode={employeeMode ? "employee" : "manager"} />
      </main>
    </AdminShell>
  );
}
