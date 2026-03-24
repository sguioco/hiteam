import * as FileSystem from 'expo-file-system/legacy';

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
