const TASK_META_MARKER = '[smart-task-meta]';

export type SmartMeetingMeta = {
  kind: 'meeting';
  meetingMode: 'online' | 'offline';
  scheduledAt?: string;
  endAt?: string;
  reminderMinutes?: number;
  meetingLink?: string;
  meetingLocation?: string;
  invitedEmployeeIds?: string[];
  invitedGroupIds?: string[];
};

export function appendTaskMeta(
  description: string | null | undefined,
  meta: SmartMeetingMeta | null,
) {
  const cleanDescription = description?.trim() ?? '';
  if (!meta) return cleanDescription || undefined;

  const payload = JSON.stringify(meta);
  const separator = cleanDescription ? '\n\n' : '';
  return `${cleanDescription}${separator}${TASK_META_MARKER}${payload}`;
}

export function parseTaskMeta(description: string | null | undefined): {
  body: string;
  meeting: SmartMeetingMeta | null;
} {
  const source = description?.trim() ?? '';
  if (!source) {
    return { body: '', meeting: null };
  }

  const markerIndex = source.lastIndexOf(TASK_META_MARKER);
  if (markerIndex === -1) {
    return { body: source, meeting: null };
  }

  const body = source.slice(0, markerIndex).trim();
  const rawMeta = source.slice(markerIndex + TASK_META_MARKER.length).trim();

  try {
    const parsed = JSON.parse(rawMeta) as Partial<SmartMeetingMeta>;
    if (parsed.kind !== 'meeting') {
      return { body: source, meeting: null };
    }

    return {
      body,
      meeting: {
        kind: 'meeting',
        meetingMode: parsed.meetingMode === 'offline' ? 'offline' : 'online',
        scheduledAt: parsed.scheduledAt?.trim() || undefined,
        endAt: parsed.endAt?.trim() || undefined,
        reminderMinutes: typeof parsed.reminderMinutes === 'number' ? parsed.reminderMinutes : undefined,
        meetingLink: parsed.meetingLink?.trim() || undefined,
        meetingLocation: parsed.meetingLocation?.trim() || undefined,
        invitedEmployeeIds: Array.isArray(parsed.invitedEmployeeIds)
          ? parsed.invitedEmployeeIds.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : undefined,
        invitedGroupIds: Array.isArray(parsed.invitedGroupIds)
          ? parsed.invitedGroupIds.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : undefined,
      },
    };
  } catch {
    return { body: source, meeting: null };
  }
}
