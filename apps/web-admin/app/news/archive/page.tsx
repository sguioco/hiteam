import type { AnnouncementArchiveEntry } from "@smart/types";
import { AdminShell } from "@/components/admin-shell";
import { NewsArchive } from "@/components/news-archive";
import { requireServerSession } from "@/lib/server-auth";
import { serverApiRequestWithSession } from "@/lib/server-api";

async function loadInitialArchiveItems(): Promise<AnnouncementArchiveEntry[] | null> {
  const session = await requireServerSession();

  try {
    return await serverApiRequestWithSession<AnnouncementArchiveEntry[]>(
      session,
      "/collaboration/announcements/archive",
    );
  } catch {
    return null;
  }
}

export default async function NewsArchivePage() {
  const initialItems = await loadInitialArchiveItems();

  return (
    <AdminShell>
      <main className="page-shell section-stack">
        <NewsArchive initialItems={initialItems} />
      </main>
    </AdminShell>
  );
}
