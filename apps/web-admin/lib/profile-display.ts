export function buildUserDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = "",
) {
  const fullName = [firstName, lastName]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(" ");

  return fullName || fallback;
}

export function getDisplayInitials(label: string) {
  const trimmed = label.trim();
  if (!trimmed) {
    return "";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return trimmed.replace(/\s+/g, "").slice(0, 2).toUpperCase();
}
