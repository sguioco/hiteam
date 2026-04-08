import type { TaskPriority } from "@smart/types";

export type WebAdminTaskPriority = Exclude<TaskPriority, "URGENT">;

export const WEB_ADMIN_TASK_PRIORITIES: WebAdminTaskPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
];

export function normalizeWebAdminTaskPriority(
  priority: TaskPriority,
): WebAdminTaskPriority {
  return priority === "URGENT" ? "HIGH" : priority;
}

export function getWebAdminTaskPriorityLabel(
  priority: TaskPriority,
  variant: "title" | "upper" = "title",
) {
  const normalized = normalizeWebAdminTaskPriority(priority);
  const label =
    normalized === "LOW"
      ? "Low"
      : normalized === "MEDIUM"
        ? "Medium"
        : "Hard";

  return variant === "upper" ? label.toUpperCase() : label;
}
