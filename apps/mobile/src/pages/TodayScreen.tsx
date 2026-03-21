import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { AttendanceStatusResponse } from '@smart/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheetModal from '../components/BottomSheetModal';
import { useI18n } from '../../lib/i18n';
import { hapticSelection } from '../../lib/haptics';
import MeetingsList from '../components/MeetingsList';
import ShiftStatusCard from '../components/ShiftStatusCard';
import TaskList from '../components/TaskList';
import { loadAttendanceStatus } from '../../lib/api';
import { Button } from '../../components/ui/button';

type TodayScreenProps = {
  hasWarning: boolean;
  overdueCount: number;
  onOpenOverdue: () => void;
};

const TodayScreen = ({ hasWarning, onOpenOverdue, overdueCount }: TodayScreenProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatusResponse | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [startPromptDismissed, setStartPromptDismissed] = useState(false);

  async function refreshAttendance() {
    setAttendanceLoading(true);
    setAttendanceError(null);

    try {
      const nextStatus = await loadAttendanceStatus();
      setAttendanceStatus(nextStatus);
      if (nextStatus.attendanceState !== 'not_checked_in') {
        setStartPromptDismissed(true);
      }
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : t('today.loadError'));
    } finally {
      setAttendanceLoading(false);
    }
  }

  useEffect(() => {
    void refreshAttendance();
  }, []);

  const showStartPrompt = useMemo(() => {
    if (attendanceLoading || startPromptDismissed) {
      return false;
    }

    if (!attendanceStatus?.shift) {
      return false;
    }

    return attendanceStatus.attendanceState === 'not_checked_in' && attendanceStatus.allowedActions.includes('check_in');
  }, [attendanceLoading, attendanceStatus, startPromptDismissed]);

  const verificationNote = useMemo(() => {
    if (!attendanceStatus) {
      return t('today.verificationHint');
    }

    const requirements = [];

    if (attendanceStatus.verification.selfieRequired) {
      requirements.push(t('today.requirementFace'));
    }

    if (attendanceStatus.verification.locationRequired) {
      requirements.push(t('today.requirementLocation'));
    }

    if (attendanceStatus.verification.deviceMustBePrimary) {
      requirements.push(t('today.requirementDevice'));
    }

    if (requirements.length === 0) {
      return t('today.verificationHint');
    }

    return t('today.verificationRequirements', { requirements: requirements.join(', ') });
  }, [attendanceStatus, t]);

  function openAttendanceAction() {
    if (!attendanceStatus?.shift) {
      return;
    }

    if (attendanceStatus.attendanceState === 'not_checked_in') {
      setStartPromptDismissed(true);
      router.push('/say-hi' as never);
      return;
    }

    if (attendanceStatus.attendanceState === 'checked_in' || attendanceStatus.attendanceState === 'on_break') {
      router.push('/say-bye' as never);
    }
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-transparent"
        contentContainerStyle={{ paddingBottom: 112, paddingTop: 0 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-5">
          <View style={{ marginHorizontal: -16 }}>
            <ShiftStatusCard loading={attendanceLoading} onPrimaryAction={openAttendanceAction} status={attendanceStatus} topInset={insets.top} />
          </View>

          <View className="px-4">
            {attendanceError ? (
              <View className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
                <Text className="text-sm leading-6 text-danger">{attendanceError}</Text>
              </View>
            ) : null}

            <View className="mb-4 rounded-2xl border border-[#dae4f5] bg-white/82 px-4 py-3 shadow-sm shadow-[#1f2687]/5">
              <View className="flex-row items-start gap-3">
                <Ionicons color="#546cf2" name="shield-checkmark-outline" size={18} />
                <Text className="flex-1 text-sm leading-6 text-foreground">{verificationNote}</Text>
              </View>
            </View>

            {hasWarning ? (
              <Animated.View
                entering={FadeInDown.duration(180).withInitialValues({
                  opacity: 0,
                  transform: [{ translateY: 8 }],
                })}
              >
                <Pressable
                  className="mb-4 flex-row items-center gap-3 rounded-2xl border border-warning/30 bg-white/70 px-4 py-3 shadow-sm shadow-[#1f2687]/10"
                  onPress={() => {
                    hapticSelection();
                    onOpenOverdue();
                  }}
                >
                  <Ionicons color="#f59e0b" name="warning-outline" size={20} />
                  <Text className="flex-1 font-body text-sm text-foreground">
                    {t('today.overdueBanner', { count: overdueCount })}
                  </Text>
                  <Ionicons color="#f59e0b" name="chevron-forward" size={16} />
                </Pressable>
              </Animated.View>
            ) : null}

            <TaskList />
            <MeetingsList />
          </View>
        </View>
      </ScrollView>

      <BottomSheetModal onClose={() => setStartPromptDismissed(true)} sheetClassName="rounded-t-[32px]" visible={showStartPrompt}>
        <View className="gap-4 px-5 pt-8" style={{ paddingBottom: insets.bottom + 20 }}>
          <Text className="text-center text-[26px] font-extrabold text-foreground">{t('today.startPromptTitle')}</Text>
          <Text className="text-center text-[15px] leading-6 text-muted">{t('today.startPromptBody')}</Text>
          {attendanceStatus?.shift ? (
            <View className="rounded-[24px] border border-[#dbe5f6] bg-white/78 px-4 py-4">
              <Text className="text-center text-[14px] font-semibold text-muted">{attendanceStatus.shift.label}</Text>
              <Text className="mt-1 text-center text-[18px] font-extrabold text-foreground">
                {new Date(attendanceStatus.shift.startsAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - {new Date(attendanceStatus.shift.endsAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text className="mt-1 text-center text-[14px] text-muted">{attendanceStatus.location.name}</Text>
            </View>
          ) : null}
          <View className="gap-3 pt-2">
            <Button fullWidth label={t('today.startPromptConfirm')} onPress={openAttendanceAction} size="lg" />
            <Button fullWidth label={t('today.startPromptLater')} onPress={() => setStartPromptDismissed(true)} size="lg" variant="secondary" />
          </View>
        </View>
      </BottomSheetModal>
    </>
  );
};

export default TodayScreen;
