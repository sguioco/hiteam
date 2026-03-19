import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { useI18n } from '../../lib/i18n';

const meetings = [
  { id: '2', title: 'Design Review', time: '14:00', durationMinutes: 30, isNow: false },
];

const sectionMetaStyle = {
  fontFamily: 'Manrope_600SemiBold',
  letterSpacing: 1,
} as const;

const meetingTitleStyle = {
  fontFamily: 'Manrope_700Bold',
  letterSpacing: -0.2,
} as const;

const MeetingsList = () => {
  const { language, t } = useI18n();
  const formatDuration = (minutes: number) =>
    language === 'ru' ? `${minutes} мин` : `${minutes} min`;

  return (
    <View className="space-y-3">
      <Text className="mb-3 text-[13px] uppercase text-foreground" style={sectionMetaStyle}>
        {t('today.meetingSection')}
      </Text>
      <View className="gap-2">
        {meetings.map((meeting) => (
          <Animated.View
            entering={FadeInUp.delay(meeting.isNow ? 40 : 80).duration(180).withInitialValues({
              opacity: 0,
              transform: [{ translateY: 8 }],
            })}
            key={meeting.id}
            layout={LinearTransition.duration(180)}
            className={`flex-row items-center gap-3 rounded-2xl border bg-white/70 px-4 py-4 shadow-sm shadow-[#1f2687]/10 ${
              meeting.isNow ? 'border-primary/30' : 'border-white/30'
            }`}
          >
            <View className={`h-10 w-10 items-center justify-center rounded-xl ${meeting.isNow ? 'bg-primary/10' : 'bg-muted'}`}>
              <Ionicons color={meeting.isNow ? '#6d73ff' : '#6b7a90'} name="videocam-outline" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-[16px] text-foreground" style={meetingTitleStyle}>{meeting.title}</Text>
              <View className="mt-1 flex-row items-center gap-1.5">
                <Ionicons color="#6b7a90" name="time-outline" size={12} />
                <Text className="font-body text-xs text-muted-foreground">
                  {meeting.time} · {formatDuration(meeting.durationMinutes)}
                </Text>
              </View>
            </View>
            {meeting.isNow ? (
              <View className="rounded-full bg-primary/10 px-2 py-1">
                <Text className="font-body text-xs font-medium text-primary">{t('common.now')}</Text>
              </View>
            ) : null}
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

export default MeetingsList;
