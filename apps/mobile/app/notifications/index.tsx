import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Switch, View } from 'react-native';
import { Text } from '../../components/ui/text';
import { Screen } from '../../components/ui/screen';
import { PressableScale } from '../../components/ui/pressable-scale';
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '../../lib/notification-preferences';
import { getDirectionalIconStyle, useI18n } from '../../lib/i18n';

type ReminderOption = 15 | 30 | 60;

function SettingsSwitch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (nextValue: boolean) => void;
}) {
  return (
    <Switch
      ios_backgroundColor="#dbe3f1"
      onValueChange={onChange}
      thumbColor="#ffffff"
      trackColor={{ false: '#dbe3f1', true: '#546cf2' }}
      value={value}
    />
  );
}

const sectionTitleStyle = {
  color: '#26334a',
  fontFamily: 'Manrope_700Bold',
  fontSize: 18,
  includeFontPadding: false,
  lineHeight: 24,
} as const;

const sectionBodyStyle = {
  color: '#6f7892',
  fontFamily: 'Manrope_500Medium',
  fontSize: 15,
  includeFontPadding: false,
  lineHeight: 22,
} as const;

export default function NotificationsScreen() {
  const router = useRouter();
  const { language, t } = useI18n();
  const directionalIconStyle = useMemo(() => getDirectionalIconStyle(language), [language]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  const copy = useMemo(
    () =>
      ({
        title: t('notifications.title'),
        assignmentsTitle: t('notifications.assignmentsTitle'),
        assignmentsBody: t('notifications.assignmentsBody'),
        taskTitle: t('notifications.taskTitle'),
        taskBody: t('notifications.taskBody'),
        meetingTitle: t('notifications.meetingTitle'),
        meetingBody: t('notifications.meetingBody'),
        shiftTitle: t('notifications.shiftTitle'),
        shiftBody: t('notifications.shiftBody'),
        minutes15: t('notifications.minutes15'),
        minutes30: t('notifications.minutes30'),
        minutes60: t('notifications.minutes60'),
      }),
    [t],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      const nextPreferences = await loadNotificationPreferences();
      if (!cancelled) {
        setPreferences(nextPreferences);
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!preferences) {
      return;
    }

    void saveNotificationPreferences(preferences);
  }, [preferences]);

  function updatePreferences(patch: Partial<NotificationPreferences>) {
    setPreferences((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        ...patch,
      };
    });
  }

  function formatReminder(minutes: ReminderOption) {
    if (minutes === 60) {
      return copy.minutes60;
    }

    if (minutes === 30) {
      return copy.minutes30;
    }

    return copy.minutes15;
  }

  const reminderOptions: ReminderOption[] = [15, 30, 60];

  return (
    <Screen contentClassName="pb-12 pt-4 px-6" safeAreaClassName="bg-[#f4f5f9]" withGradient>
      <StatusBar style="dark" />

      <View className="mb-2">
        <View className="flex-row items-center">
          <PressableScale haptic="selection" onPress={() => router.back()}>
            <Ionicons color="#26334a" name="arrow-back" size={22} style={directionalIconStyle} />
          </PressableScale>
          <Text
            style={{
              color: '#26334a',
              fontFamily: 'Manrope_700Bold',
              fontSize: 26,
              includeFontPadding: false,
              lineHeight: 32,
              textAlign: 'center',
              flex: 1,
              paddingRight: 40,
            }}
          >
            {copy.title}
          </Text>
        </View>
      </View>

      {preferences ? (
        <View className="mt-4">
          <View className="border-b border-[#e6ecf6] py-5">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1 gap-2 pr-2">
                <Text style={sectionTitleStyle}>{copy.assignmentsTitle}</Text>
                <Text style={sectionBodyStyle}>{copy.assignmentsBody}</Text>
              </View>
              <SettingsSwitch
                onChange={(nextValue) => updatePreferences({ assignmentAlertsEnabled: nextValue })}
                value={preferences.assignmentAlertsEnabled}
              />
            </View>
          </View>

          <View className="border-b border-[#e6ecf6] py-5">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1 gap-2 pr-2">
                <Text style={sectionTitleStyle}>{copy.taskTitle}</Text>
                <Text style={sectionBodyStyle}>{copy.taskBody}</Text>
              </View>
              <SettingsSwitch
                onChange={(nextValue) => updatePreferences({ taskDeadlineRemindersEnabled: nextValue })}
                value={preferences.taskDeadlineRemindersEnabled}
              />
            </View>
            {preferences.taskDeadlineRemindersEnabled ? (
              <View className="mt-4">
                <ToggleGroup
                  onValueChange={(nextValue) => updatePreferences({ taskDeadlineReminderMinutes: Number(nextValue) as ReminderOption })}
                  value={String(preferences.taskDeadlineReminderMinutes)}
                >
                  {reminderOptions.map((option) => (
                    <ToggleGroupItem key={`task-${option}`} value={String(option)}>
                      {formatReminder(option)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </View>
            ) : null}
          </View>

          <View className="border-b border-[#e6ecf6] py-5">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1 gap-2 pr-2">
                <Text style={sectionTitleStyle}>{copy.meetingTitle}</Text>
                <Text style={sectionBodyStyle}>{copy.meetingBody}</Text>
              </View>
              <SettingsSwitch
                onChange={(nextValue) => updatePreferences({ meetingRemindersEnabled: nextValue })}
                value={preferences.meetingRemindersEnabled}
              />
            </View>
            {preferences.meetingRemindersEnabled ? (
              <View className="mt-4">
                <ToggleGroup
                  onValueChange={(nextValue) => updatePreferences({ meetingReminderMinutes: Number(nextValue) as ReminderOption })}
                  value={String(preferences.meetingReminderMinutes)}
                >
                  {reminderOptions.map((option) => (
                    <ToggleGroupItem key={`meeting-${option}`} value={String(option)}>
                      {formatReminder(option)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </View>
            ) : null}
          </View>

          <View className="py-5">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1 gap-2 pr-2">
                <Text style={sectionTitleStyle}>{copy.shiftTitle}</Text>
                <Text style={sectionBodyStyle}>{copy.shiftBody}</Text>
              </View>
              <SettingsSwitch
                onChange={(nextValue) => updatePreferences({ shiftRemindersEnabled: nextValue })}
                value={preferences.shiftRemindersEnabled}
              />
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

