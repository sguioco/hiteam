import * as FileSystem from 'expo-file-system/legacy';
import type { EmployeeProfileResponse } from '@smart/types';

export type NotificationPreferences = {
  assignmentAlertsEnabled: boolean;
  meetingRemindersEnabled: boolean;
  meetingReminderMinutes: 15 | 30 | 60;
  taskDeadlineRemindersEnabled: boolean;
  taskDeadlineReminderMinutes: 15 | 30 | 60;
  shiftRemindersEnabled: boolean;
};

const NOTIFICATION_PREFERENCES_PATH = `${FileSystem.documentDirectory ?? ''}smart-notification-preferences.json`;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  assignmentAlertsEnabled: true,
  meetingRemindersEnabled: true,
  meetingReminderMinutes: 15,
  taskDeadlineRemindersEnabled: true,
  taskDeadlineReminderMinutes: 30,
  shiftRemindersEnabled: true,
};

export function notificationPreferencesFromProfile(
  profile: EmployeeProfileResponse | null | undefined,
): NotificationPreferences {
  const user = profile?.user;

  return {
    assignmentAlertsEnabled:
      user?.notificationAssignmentAlertsEnabled ??
      DEFAULT_NOTIFICATION_PREFERENCES.assignmentAlertsEnabled,
    meetingRemindersEnabled:
      user?.notificationMeetingRemindersEnabled ??
      DEFAULT_NOTIFICATION_PREFERENCES.meetingRemindersEnabled,
    meetingReminderMinutes:
      normalizeReminderMinutes(
        user?.notificationMeetingReminderMinutes,
        DEFAULT_NOTIFICATION_PREFERENCES.meetingReminderMinutes,
      ),
    taskDeadlineRemindersEnabled:
      user?.notificationTaskDeadlineRemindersEnabled ??
      DEFAULT_NOTIFICATION_PREFERENCES.taskDeadlineRemindersEnabled,
    taskDeadlineReminderMinutes:
      normalizeReminderMinutes(
        user?.notificationTaskDeadlineReminderMinutes,
        DEFAULT_NOTIFICATION_PREFERENCES.taskDeadlineReminderMinutes,
      ),
    shiftRemindersEnabled:
      user?.notificationShiftRemindersEnabled ??
      DEFAULT_NOTIFICATION_PREFERENCES.shiftRemindersEnabled,
  };
}

function normalizeReminderMinutes(
  value: number | null | undefined,
  fallback: 15 | 30 | 60,
): 15 | 30 | 60 {
  return value === 15 || value === 30 || value === 60 ? value : fallback;
}

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  if (!FileSystem.documentDirectory) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  try {
    const info = await FileSystem.getInfoAsync(NOTIFICATION_PREFERENCES_PATH);
    if (!info.exists) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    const raw = await FileSystem.readAsStringAsync(NOTIFICATION_PREFERENCES_PATH);
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;

    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  if (!FileSystem.documentDirectory) {
    return;
  }

  await FileSystem.writeAsStringAsync(NOTIFICATION_PREFERENCES_PATH, JSON.stringify(preferences));
}
