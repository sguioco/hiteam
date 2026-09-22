export const INVITATIONS_PER_PAGE = 8;

export function filterInvitations<T extends { email?: string | null; phone?: string | null; status: string }>(
  invitations: T[],
  query: string,
  status: string,
) {
  const normalized = query.trim().toLocaleLowerCase();
  return invitations.filter((invitation) => {
    if (status !== "all" && invitation.status !== status) return false;
    if (!normalized) return true;
    return `${invitation.email ?? ""} ${invitation.phone ?? ""}`.toLocaleLowerCase().includes(normalized);
  });
}

export function invitationPage<T>(items: T[], page: number, pageSize = INVITATIONS_PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  return { currentPage, totalPages, items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize) };
}
