export function getAvatarInitials(value?: string | null) {
  const parts = value
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  const initials = parts
    ?.map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "?";
}
