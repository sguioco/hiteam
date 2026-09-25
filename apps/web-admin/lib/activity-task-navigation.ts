import { toAdminHref } from "@/lib/admin-routes";

export function activityReturnHref(context: { dateFrom: string; dateTo: string; companyId: string; locationId: string }) {
  const params = new URLSearchParams(context);
  return toAdminHref(`/activity?${params.toString()}`);
}

export function taskHref(taskId: string, returnTo?: string) {
  const params = new URLSearchParams({ taskId });
  if (returnTo?.startsWith("/activity?")) params.set("returnTo", returnTo);
  return toAdminHref(`/tasks?${params.toString()}`);
}

export function employeeHref(employeeId: string, returnTo?: string) {
  const path = toAdminHref(`/employees/${encodeURIComponent(employeeId)}`);
  if (!returnTo?.startsWith("/activity?")) return path;
  return `${path}?${new URLSearchParams({ returnTo })}`;
}

export function safeActivityReturnHref(search: string) {
  const value = new URLSearchParams(search).get("returnTo");
  return value?.startsWith("/activity?") && !value.startsWith("//") ? value : null;
}
