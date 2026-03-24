import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { AttendanceStatusResponse } from '@smart/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppGradientBackground } from '../../components/ui/screen';
import { hasManagerAccess, useAuthFlowState } from '../../lib/auth-flow';
import { loadAttendanceStatus, loadMyShifts } from '../../lib/api';
import BottomNav from '../components/BottomNav';
import { PressableScale } from '../../components/ui/pressable-scale';
import AuthScreen from './AuthScreen';
import CalendarScreen from './CalendarScreen';
import ManagerScreen from './ManagerScreen';
import PendingAccessScreen from './PendingAccessScreen';
import ProfileScreen from './ProfileScreen';
import TodayScreen from './TodayScreen';
import { useI18n } from '../../lib/i18n';

type Tab = 'calendar' | 'today' | 'manage' | 'profile';
type ShiftItem = Awaited<ReturnType<typeof loadMyShifts>>[number];
type StartShiftPromptState = {
  minutesUntilStart: number;
};

function normalizeTab(value: string | string[] | undefined): Tab {
  const nextValue = Array.isArray(value) ? value[0] : value;

  if (nextValue === 'calendar' || nextValue === 'today' || nextValue === 'manage' || nextValue === 'profile') {
    return nextValue;
  }

  return 'today';
}

function buildWorkspaceHref(tab: Tab, options?: { overdue?: number }) {
  const params = new URLSearchParams({ tab });

  if (options?.overdue) {
    params.set('overdue', String(options.overdue));
  }

  return `/?${params.toString()}`;
}

function toAttendanceShift(shift: ShiftItem) {
  return {
    id: shift.id,
    label: shift.template.name,
    startsAt: shift.startsAt,
    endsAt: shift.endsAt,
    locationName: shift.location.name,
  };
}

function buildStartShiftPrompt(status: AttendanceStatusResponse, shifts: ShiftItem[]): StartShiftPromptState | null {
  if (status.attendanceState !== 'not_checked_in' || !status.allowedActions.includes('check_in')) {
    return null;
  }

  const now = Date.now();
  const sortedShifts = shifts
    .slice()
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const futureScheduledShift =
    sortedShifts.find((shift) => new Date(shift.startsAt).getTime() > now) ?? null;

  const candidates = [status.shift, status.nextShift, futureScheduledShift ? toAttendanceShift(futureScheduledShift) : null]
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .filter((candidate) => new Date(candidate.startsAt).getTime() > now)
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());

  const nextShift = candidates[0];

  if (!nextShift) {
    return null;
  }

  const minutesUntilStart = Math.ceil((new Date(nextShift.startsAt).getTime() - now) / 60000);

  if (minutesUntilStart < 0 || minutesUntilStart > 60) {
    return null;
  }

  return {
    minutesUntilStart,
  };
}

function formatPromptLead(minutesUntilStart: number) {
  if (minutesUntilStart < 60) {
    return `${minutesUntilStart} min`;
  }

  const hours = Math.floor(minutesUntilStart / 60);
  const minutes = minutesUntilStart % 60;
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}

const Index = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string | string[]; overdue?: string | string[] }>();
  const { t } = useI18n();
  const { isAuthenticated, roleCodes, workspaceAccessAllowed } = useAuthFlowState();
  const routeTab = normalizeTab(params.tab);
  const overdueParam = Array.isArray(params.overdue) ? params.overdue[0] : params.overdue;
  const overdueSheetSignal = Number(overdueParam ?? '0') || 0;
  const [activeTab, setActiveTab] = useState<Tab>(routeTab);
  const [appEntrySignal, setAppEntrySignal] = useState(0);
  const [startShiftPrompt, setStartShiftPrompt] = useState<StartShiftPromptState | null>(null);
  const [startShiftPromptVisible, setStartShiftPromptVisible] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const handWaveRotation = useSharedValue(0);
  const isManager = hasManagerAccess(roleCodes);
  const resolvedTab = routeTab === 'manage' && !isManager ? 'today' : routeTab;

  const handWaveStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${handWaveRotation.value}deg` }],
  }));

  const promptLead = useMemo(() => {
    if (!startShiftPrompt) {
      return '';
    }

    return t('today.startPromptLead', { duration: formatPromptLead(startShiftPrompt.minutesUntilStart) });
  }, [startShiftPrompt, t]);

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveTab('today');
      return;
    }

    setActiveTab(resolvedTab);
  }, [isAuthenticated, resolvedTab]);

  useEffect(() => {
    if (isAuthenticated && workspaceAccessAllowed && routeTab === 'manage' && !isManager) {
      router.replace(buildWorkspaceHref('today') as never);
    }
  }, [isAuthenticated, isManager, routeTab, router, workspaceAccessAllowed]);

  useEffect(() => {
    const wave = () => {
      handWaveRotation.value = withSequence(
        withTiming(-16, { duration: 140 }),
        withTiming(12, { duration: 160 }),
        withTiming(-10, { duration: 140 }),
        withTiming(8, { duration: 140 }),
        withTiming(0, { duration: 180 }),
      );
    };

    wave();
    const interval = setInterval(wave, 5000);

    return () => clearInterval(interval);
  }, [handWaveRotation]);

  useEffect(() => {
    const triggerAppEntry = () => {
      if (!isAuthenticated || !workspaceAccessAllowed) {
        return;
      }

      setAppEntrySignal((current) => current + 1);
    };

    if (isAuthenticated && workspaceAccessAllowed) {
      triggerAppEntry();
    } else {
      setStartShiftPrompt(null);
      setStartShiftPromptVisible(false);
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if ((previousState === 'background' || previousState === 'inactive') && nextState === 'active') {
        triggerAppEntry();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, workspaceAccessAllowed]);

  useEffect(() => {
    if (!appEntrySignal || !isAuthenticated || !workspaceAccessAllowed) {
      return;
    }

    let cancelled = false;

    const refreshStartShiftPrompt = async () => {
      try {
        const [attendanceStatus, shifts] = await Promise.all([loadAttendanceStatus(), loadMyShifts()]);
        if (cancelled) {
          return;
        }

        const nextPrompt = buildStartShiftPrompt(attendanceStatus, shifts);
        setStartShiftPrompt(nextPrompt);
        setStartShiftPromptVisible(Boolean(nextPrompt));
      } catch {
        if (!cancelled) {
          setStartShiftPrompt(null);
          setStartShiftPromptVisible(false);
        }
      }
    };

    void refreshStartShiftPrompt();

    return () => {
      cancelled = true;
    };
  }, [appEntrySignal, isAuthenticated, workspaceAccessAllowed]);

  function navigateToTab(tab: Tab, options?: { overdue?: number }) {
    const nextTab = tab === 'manage' && !isManager ? 'today' : tab;
    setActiveTab(nextTab);
    router.replace(buildWorkspaceHref(nextTab, options) as never);
  }

  function openOverdueInCalendar() {
    navigateToTab('calendar', { overdue: overdueSheetSignal + 1 });
  }

  function closeStartShiftPrompt() {
    setStartShiftPromptVisible(false);
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  if (!workspaceAccessAllowed) {
    return <PendingAccessScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['left', 'right']}>
      <StatusBar backgroundColor="transparent" style={activeTab === 'today' ? 'light' : 'dark'} translucent />
      <View className="flex-1">
        <AppGradientBackground />
        {activeTab === 'today' ? (
          <TodayScreen onOpenOverdue={openOverdueInCalendar} />
        ) : null}
        {activeTab === 'calendar' ? <CalendarScreen overdueSheetSignal={overdueSheetSignal} /> : null}
        {activeTab === 'manage' && isManager ? <ManagerScreen /> : null}
        {activeTab === 'profile' ? <ProfileScreen /> : null}
        <BottomNav active={activeTab} hasBadge onNavigate={navigateToTab} showManage={isManager} />
      </View>
      <Modal
        animationType="fade"
        onRequestClose={closeStartShiftPrompt}
        transparent
        visible={startShiftPromptVisible}
      >
        <Pressable onPress={closeStartShiftPrompt} style={styles.modalOverlay}>
          <Pressable onPress={() => undefined} style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('today.startPromptTitle')}</Text>
            <Text style={styles.modalBody}>{promptLead}</Text>
            <Animated.Text style={[styles.waveEmoji, handWaveStyle]}>{"\u{1F44B}"}</Animated.Text>
            <PressableScale
              className="min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2]"
              haptic="success"
              onPress={() => {
                closeStartShiftPrompt();
                navigateToTab('today');
                router.push('/say-hi' as never);
              }}
            >
              <Text style={styles.primaryButtonLabel}>{t('today.startPromptConfirm')}</Text>
            </PressableScale>
            <PressableScale
              className="min-h-[54px] items-center justify-center rounded-[18px] border border-[#d8deea] bg-white"
              haptic="selection"
              onPress={closeStartShiftPrompt}
            >
              <Text style={styles.secondaryButtonLabel}>{t('today.startPromptLater')}</Text>
            </PressableScale>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(15, 24, 44, 0.34)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    gap: 14,
    shadowColor: '#0f1830',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  modalTitle: {
    color: '#26334a',
    textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
    fontSize: 28,
    lineHeight: 34,
    includeFontPadding: false,
  },
  modalBody: {
    color: '#6f7892',
    textAlign: 'center',
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    lineHeight: 24,
    includeFontPadding: false,
  },
  waveEmoji: {
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 2,
    fontSize: 54,
  },
  primaryButtonLabel: {
    color: '#f7f1e6',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    includeFontPadding: false,
  },
  secondaryButtonLabel: {
    color: '#26334a',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    includeFontPadding: false,
  },
});

export default Index;
