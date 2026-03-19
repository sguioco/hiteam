'use client';

import { NotificationsCenter } from '../../components/notifications-center';
import { AdminShell } from '../../components/admin-shell';

export default function NotificationsPage() {
  return (
    <AdminShell>
      <main className="page-shell">
        <NotificationsCenter />
      </main>
    </AdminShell>
  );
}
