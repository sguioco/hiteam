import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/ui/text';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { Socket } from 'socket.io-client';
import type { AttendanceStatusResponse } from '@smart/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppGradientBackground } from '../../components/ui/screen';
import { hasManagerAccess, useAuthFlowState } from '../../lib/auth-flow';
import { loadAttendanceStatus, loadMyShifts } from '../../lib/api';
import { createCollaborationSocket } from '../../lib/collaboration-socket';
import { createNotificationsSocket } from '../../lib/notifications-socket';
import BottomNav from '../components/BottomNav';
import { PressableScale } from '../../components/ui/pressable-scale';
import AuthScreen from './AuthScreen';
import CalendarScreen from './CalendarScreen';
import ManagerScreen from './ManagerScreen';
import NewsScreen from './NewsScreen';
import PendingAccessScreen from './PendingAccessScreen';
import ProfileScreen from './ProfileScreen';
import TodayScreen from './TodayScreen';
import { useI18n } from '../../lib/i18n';
import { hydrateWorkspaceCaches, warmWorkspaceCaches, WORKSPACE_REFRESH_INTERVAL_MS } from '../../lib/workspace-cache';
import { TODAY_SCREEN_CACHE_KEY, TODAY_SCREEN_CACHE_TTL_MS, type TodayScreenCacheValue } from '../../lib/workspace-cache';
import { resolveAttendanceActionHref } from '../../lib/workspace-setup';
import { peekScreenCache, readScreenCache, subscribeScreenCache } from '../../lib/screen-cache';
import { getTodayNavBadgeState } from '../../lib/today-task-state';

type Tab = 'calendar' | 'today' | 'manage' | 'news' | 'profile';
type ShiftItem = Awaited<ReturnType<typeof loadMyShifts>>[number];
type StartShiftPromptState = {
  minutesUntilStart: number;
};

function normalizeTab(value: string | string[] | undefined): Tab {
  const nextValue = Array.isArray(value) ? value[0] : value;

  if (nextValue === 'calendar' || nextValue === 'today' || nextValue === 'manage' || nextValue === 'news' || nextValue === 'profile') {
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
  const { language, t } = useI18n();
  const { isAuthenticated, roleCodes, workspaceAccessAllowed, workspaceSetupStep } = useAuthFlowState();
  const initialTodaySnapshot = useMemo(
    () =>
      peekScreenCache<TodayScreenCacheValue>(
        TODAY_SCREEN_CACHE_KEY,
        TODAY_SCREEN_CACHE_TTL_MS,
      ),
    [],
  );
  const routeTab = normalizeTab(params.tab);
  const overdueParam = Array.isArray(params.overdue) ? params.overdue[0] : params.overdue;
  const overdueSheetSignal = Number(overdueParam ?? '0') || 0;
  const [activeTab, setActiveTab] = useState<Tab>(routeTab);
  const [todayHasBadge, setTodayHasBadge] = useState(() =>
    getTodayNavBadgeState(
      initialTodaySnapshot?.value.tasks ?? [],
      initialTodaySnapshot?.value.profile?.primaryLocation?.timezone,
    ).hasBadge,
  );
  const [mountedTabs, setMountedTabs] = useState<Record<Tab, boolean>>(() => ({
    today: routeTab === 'today',
    calendar: routeTab === 'calendar',
    manage: routeTab === 'manage',
    news: routeTab === 'news',
    profile: routeTab === 'profile',
  }));
  const [appEntrySignal, setAppEntrySignal] = useState(0);
  const [startShiftPrompt, setStartShiftPrompt] = useState<StartShiftPromptState | null>(null);
  const [startShiftPromptVisible, setStartShiftPromptVisible] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const handWaveRotation = useSharedValue(0);
  const isManager = hasManagerAccess(roleCodes);
  const hasWorkspaceEntry = isAuthenticated && workspaceAccessAllowed && workspaceSetupStep === null;
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

  function markTabMounted(tab: Tab) {
    setMountedTabs((current) => {
      if (current[tab]) {
        return current;
      }

      return {
        ...current,
        [tab]: true,
      };
    });
  }

  useEffect(() => {
    if (!hasWorkspaceEntry) {
      setActiveTab('today');
      setMountedTabs({
        today: true,
        calendar: false,
        manage: false,
        news: false,
        profile: false,
      });
      return;
    }

    setActiveTab(resolvedTab);
    markTabMounted(resolvedTab);
  }, [hasWorkspaceEntry, resolvedTab]);

  useEffect(() => {
    if (hasWorkspaceEntry && routeTab === 'manage' && !isManager) {
      router.replace(buildWorkspaceHref('today') as never);
    }
  }, [hasWorkspaceEntry, isManager, routeTab, router]);

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
    if (!hasWorkspaceEntry) {
      return;
    }

    void hydrateWorkspaceCaches(roleCodes, language);
    void warmWorkspaceCaches(roleCodes, { force: true, language });

    const interval = setInterval(() => {
      if (appStateRef.current !== 'active') {
        return;
      }

      void warmWorkspaceCaches(roleCodes, { force: true, language });
    }, WORKSPACE_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [hasWorkspaceEntry, language, roleCodes]);

  useEffect(() => {
    if (!hasWorkspaceEntry) {
      setTodayHasBadge(false);
      return;
    }

    const applyTodayBadgeState = (entry: TodayScreenCacheValue | null) => {
      setTodayHasBadge(
        getTodayNavBadgeState(
          entry?.tasks ?? [],
          entry?.profile?.primaryLocation?.timezone,
        ).hasBadge,
      );
    };

    const unsubscribe = subscribeScreenCache<TodayScreenCacheValue>(
      TODAY_SCREEN_CACHE_KEY,
      (entry) => applyTodayBadgeState(entry?.value ?? null),
    );

    void readScreenCache<TodayScreenCacheValue>(
      TODAY_SCREEN_CACHE_KEY,
      TODAY_SCREEN_CACHE_TTL_MS,
    ).then((entry) => {
      applyTodayBadgeState(entry?.value ?? null);
    });

    return unsubscribe;
  }, [hasWorkspaceEntry]);

  useEffect(() => {
    if (!hasWorkspaceEntry) {
      setStartShiftPrompt(null);
      setStartShiftPromptVisible(false);
      return;
    }

    const triggerAppEntry = () => {
      setAppEntrySignal((current) => current + 1);
    };

    triggerAppEntry();

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if ((previousState === 'background' || previousState === 'inactive') && nextState === 'active') {
        void hydrateWorkspaceCaches(roleCodes, language);
        void warmWorkspaceCaches(roleCodes, { force: true, language });
        triggerAppEntry();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hasWorkspaceEntry, language, roleCodes]);

  useEffect(() => {
    if (!hasWorkspaceEntry) {
      return;
    }

    let active = true;
    let notificationsSocket: Socket | null = null;
    let collaborationSocket: Socket | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleWorkspaceRefresh = () => {
      if (refreshTimer) {
        return;
      }

      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void hydrateWorkspaceCaches(roleCodes, language);
        void warmWorkspaceCaches(roleCodes, { force: true, language });
      }, 180);
    };

    void Promise.allSettled([
      createNotificationsSocket(),
      createCollaborationSocket(),
    ]).then(([notificationsResult, collaborationResult]) => {
      if (!active) {
        if (notificationsResult.status === 'fulfilled') {
          notificationsResult.value.disconnect();
        }
        if (collaborationResult.status === 'fulfilled') {
          collaborationResult.value.disconnect();
        }
        return;
      }

      if (notificationsResult.status === 'fulfilled') {
        notificationsSocket = notificationsResult.value;
        notificationsSocket.on('notifications:new', scheduleWorkspaceRefresh);
        notificationsSocket.on('notifications:unread-count', scheduleWorkspaceRefresh);
      }

      if (collaborationResult.status === 'fulfilled') {
        collaborationSocket = collaborationResult.value;
        collaborationSocket.on('workspace:refresh', scheduleWorkspaceRefresh);
      }
    });

    return () => {
      active = false;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      notificationsSocket?.disconnect();
      collaborationSocket?.disconnect();
    };
  }, [hasWorkspaceEntry, language, roleCodes]);

  useEffect(() => {
    if (!appEntrySignal || !hasWorkspaceEntry) {
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
    void warmWorkspaceCaches(roleCodes, { language });

    return () => {
      cancelled = true;
    };
  }, [appEntrySignal, hasWorkspaceEntry, language, roleCodes]);

  function navigateToTab(tab: Tab, options?: { overdue?: number }) {
    const nextTab = tab === 'manage' && !isManager ? 'today' : tab;
    markTabMounted(nextTab);
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

  if (workspaceSetupStep !== null) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[16px] font-semibold text-[#24314b]">{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  function renderTabScene(tab: Tab) {
    if (!mountedTabs[tab]) {
      return null;
    }

    const isActive = activeTab === tab;

    let content: ReactNode = null;

    if (tab === 'today') {
      content = <TodayScreen onOpenOverdue={openOverdueInCalendar} />;
    } else if (tab === 'calendar') {
      content = <CalendarScreen active={isActive} overdueSheetSignal={overdueSheetSignal} />;
    } else if (tab === 'manage') {
      content = isManager ? <ManagerScreen active={isActive} /> : null;
    } else if (tab === 'news') {
      content = <NewsScreen />;
    } else {
      content = <ProfileScreen active={isActive} />;
    }

    if (!content) {
      return null;
    }

    return (
      <View
        key={tab}
        pointerEvents={isActive ? 'auto' : 'none'}
        style={[styles.tabScene, isActive ? styles.activeTabScene : styles.hiddenTabScene]}
      >
        {content}
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['left', 'right']}>
      <StatusBar backgroundColor="transparent" style={activeTab === 'today' ? 'light' : 'dark'} translucent />
      <View className="flex-1">
        <AppGradientBackground />
        <View style={{ flex: 1 }}>
          {renderTabScene('today')}
          {renderTabScene('calendar')}
          {isManager ? renderTabScene('manage') : null}
          {renderTabScene('news')}
          {renderTabScene('profile')}
        </View>
        <BottomNav active={activeTab} hasBadge={todayHasBadge} onNavigate={navigateToTab} showManage={isManager} />
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
                router.push(resolveAttendanceActionHref('check-in'));
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
  tabScene: {
    ...StyleSheet.absoluteFillObject,
  },
  activeTabScene: {
    display: 'flex',
  },
  hiddenTabScene: {
    display: 'none',
  },
});

export default Index;

