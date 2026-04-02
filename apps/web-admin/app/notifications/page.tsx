import { NotificationsCenter } from '../../components/notifications-center';
import { AdminShell } from '../../components/admin-shell';
import type { NotificationItem } from '@smart/types';
import { requireServerSession } from '@/lib/server-auth';
import { serverApiRequestWithSession } from '@/lib/server-api';

async function loadInitialNotifications(): Promise<NotificationItem[] | null> {
  const session = await requireServerSession();

  try {
    return await serverApiRequestWithSession<NotificationItem[]>(
      session,
      '/notifications/me',
    );
  } catch {
    return null;
  }
}

export default async function NotificationsPage() {
  const initialItems = await loadInitialNotifications();

  return (
    <AdminShell>
      <main className="page-shell">
        <NotificationsCenter initialItems={initialItems} />
      </main>
    </AdminShell>
  );
}
