import { Ionicons } from '@expo/vector-icons';
import { Linking, Text, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import type { TaskItem } from '@smart/types';
import { PressableScale } from '../../components/ui/pressable-scale';
import { useI18n } from '../../lib/i18n';
import { parseTaskMeta } from '../../lib/task-meta';
import { taskTimeLabel } from '../../lib/task-utils';

type MeetingsListProps = {
  loading?: boolean;
  tasks: TaskItem[];
};

const sectionMetaStyle = {
  fontFamily: 'Manrope_600SemiBold',
  letterSpacing: 1,
} as const;

const meetingTitleStyle = {
  fontFamily: 'Manrope_700Bold',
  letterSpacing: -0.2,
} as const;

function normalizeMeetingTitle(title: string) {
  const normalized = title.replace(/^(Meeting|Встреча):\s*/i, '').trim();

  if (!normalized) {
    return normalized;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function MeetingsList({ loading = false, tasks }: MeetingsListProps) {
  const { t, tp, tc } = useI18n();

  const formatDuration = (startAt?: string, endAt?: string) => {
    if (!startAt || !endAt) {
      return null;
    }

    const start = new Date(startAt);
    const end = new Date(endAt);
    const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

    return tp(durationMinutes, ['мин', 'мин', 'мин'], ['min', 'mins']);
  };

  return (
    <View className="mt-5 space-y-3">
      <Text className="mb-3 text-[13px] uppercase text-foreground" style={sectionMetaStyle}>
        {t('today.meetingSection')}
      </Text>

      {loading ? (
        <View className="overflow-hidden rounded-[28px] bg-white/72 px-5 py-5">
          <Text className="font-body text-sm text-muted-foreground">{t('common.loading')}</Text>
        </View>
      ) : tasks.length > 0 ? (
        <View className="gap-2">
          {tasks.map((task, index) => {
            const meta = parseTaskMeta(task.description);
            const scheduledAt = meta.meeting?.scheduledAt ?? task.dueAt ?? undefined;
            const timeLabel = scheduledAt
              ? new Date(scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : taskTimeLabel(task);
            const durationLabel = formatDuration(meta.meeting?.scheduledAt, meta.meeting?.endAt);
            const secondary = meta.meeting?.meetingLocation || meta.meeting?.meetingLink || meta.body || t('calendar.statusMeeting');
            const isOnlineMeeting = meta.meeting?.meetingMode === 'online' && Boolean(meta.meeting?.meetingLink);
            const normalizedTitle = tc(normalizeMeetingTitle(task.title));

            return (
              <Animated.View
                entering={FadeInUp.delay(index * 28).duration(180).withInitialValues({
                  opacity: 0,
                  transform: [{ translateY: 8 }],
                })}
                key={task.id}
                layout={LinearTransition.duration(180)}
              >
                <PressableScale
                  className="flex-row items-center gap-3 rounded-2xl border border-white/30 bg-white/70 px-4 py-4 shadow-sm shadow-[#1f2687]/10"
                  containerClassName="w-full"
                  haptic={isOnlineMeeting ? 'selection' : 'none'}
                  onPress={() => {
                    if (isOnlineMeeting && meta.meeting?.meetingLink) {
                      void Linking.openURL(meta.meeting.meetingLink);
                    }
                  }}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Ionicons color="#6d73ff" name="videocam-outline" size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[16px] text-foreground" style={meetingTitleStyle}>
                      {normalizedTitle}
                    </Text>
                    <Text className="mt-1 font-body text-xs text-muted-foreground" numberOfLines={2}>
                      {secondary}
                    </Text>
                    {timeLabel ? (
                      <View className="mt-1 flex-row items-center gap-1.5">
                        <Ionicons color="#6b7a90" name="time-outline" size={12} />
                        <Text className="font-body text-xs text-muted-foreground">
                          {timeLabel}
                          {durationLabel ? ` · ${durationLabel}` : ''}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>
      ) : (
        <View className="overflow-hidden rounded-[28px] bg-white/72 px-5 py-5">
          <Text className="font-body text-sm text-muted-foreground">{t('calendar.noItemsForDay')}</Text>
        </View>
      )}
    </View>
  );
}
