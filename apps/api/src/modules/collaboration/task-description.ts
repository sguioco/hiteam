const TASK_META_MARKER = "[smart-task-meta]";

export function replaceTaskDescriptionBody(current: string | null, nextBody: string) {
  if (nextBody.includes(TASK_META_MARKER)) {
    throw new Error("Task description cannot contain reserved metadata marker.");
  }
  const markerIndex = current?.lastIndexOf(TASK_META_MARKER) ?? -1;
  const metadata = markerIndex >= 0 ? current!.slice(markerIndex) : "";
  const body = nextBody.trim();
  return [body, metadata].filter(Boolean).join("\n\n") || null;
}
