/** Exact IDs only: unlocated data belongs to the all-locations view. */
export function inDashboardLocation(item: { locationId?: string | null; location?: { id?: string } | string | null }, locationId: string) {
  if (!locationId) return true;
  return (item.locationId ?? (typeof item.location === 'object' ? item.location?.id : undefined)) === locationId;
}
