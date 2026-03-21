import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hasManagerAccess, useAuthFlowState } from '../../lib/auth-flow';
import { useI18n } from '../../lib/i18n';
import BottomNav from '../components/BottomNav';
import AuthScreen from './AuthScreen';
import CalendarScreen from './CalendarScreen';
import ManagerScreen from './ManagerScreen';
import PendingAccessScreen from './PendingAccessScreen';
import ProfileScreen from './ProfileScreen';
import TodayScreen from './TodayScreen';

type Tab = 'calendar' | 'today' | 'manage' | 'profile';

export type OverdueTask = {
  id: string;
  title: string;
  description?: string;
  dateLabel: string;
  resolutionDateLabel?: string;
  resolutionNote?: string;
  resolutionTime?: string;
  status: 'active' | 'done' | 'rescheduled' | 'deleted';
};

const Index = () => {
  const { t } = useI18n();
  const { isAuthenticated, roleCodes, workspaceAccessAllowed } = useAuthFlowState();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const isManager = hasManagerAccess(roleCodes);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(new Date().getDate());
  const [overdueTask, setOverdueTask] = useState<OverdueTask>({
    id: 'overdue-1',
    title: 'Check supply cabinet photos',
    description: t('calendar.overdueDescription'),
    dateLabel: t('calendar.overdueYesterday'),
    status: 'active',
  });

  const overdueCount = overdueTask.status === 'active' ? 1 : 0;

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveTab('today');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isManager && activeTab === 'manage') {
      setActiveTab('today');
    }
  }, [activeTab, isManager]);

  useEffect(() => {
    const nextDateLabel = t('calendar.overdueYesterday');
    setOverdueTask((current) => ({
      ...current,
      description: t('calendar.overdueDescription'),
      dateLabel: nextDateLabel,
      resolutionDateLabel:
        current.resolutionDateLabel === current.dateLabel
          ? nextDateLabel
          : current.resolutionDateLabel,
    }));
  }, [t]);

  function openOverdueInCalendar() {
    setSelectedCalendarDay(yesterday.getDate());
    setActiveTab('calendar');
  }

  function markOverdueDone() {
    setOverdueTask((current) => ({
      ...current,
      resolutionDateLabel: current.dateLabel,
      resolutionNote: t('calendar.overdueDoneNote'),
      resolutionTime: undefined,
      status: 'done',
    }));
  }

  function rescheduleOverdue(resolutionDateLabel: string, resolutionTime: string, selectedDay: number) {
    setSelectedCalendarDay(selectedDay);
    setOverdueTask((current) => ({
      ...current,
      resolutionDateLabel,
      resolutionNote: t('calendar.overdueRescheduledNote'),
      resolutionTime,
      status: 'rescheduled',
    }));
  }

  function deleteOverdue() {
    setOverdueTask((current) => ({
      ...current,
      resolutionDateLabel: current.dateLabel,
      resolutionNote: t('calendar.overdueDeletedNote'),
      resolutionTime: undefined,
      status: 'deleted',
    }));
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
        {activeTab === 'today' ? (
          <TodayScreen hasWarning={overdueCount > 0} onOpenOverdue={openOverdueInCalendar} overdueCount={overdueCount} />
        ) : null}
        {activeTab === 'calendar' ? (
          <CalendarScreen
            onDeleteOverdue={deleteOverdue}
            onMarkOverdueDone={markOverdueDone}
            onRescheduleOverdue={rescheduleOverdue}
            onSelectDay={setSelectedCalendarDay}
            overdueTask={overdueTask}
            selectedDay={selectedCalendarDay}
          />
        ) : null}
        {activeTab === 'manage' && isManager ? <ManagerScreen /> : null}
        {activeTab === 'profile' ? <ProfileScreen /> : null}
        <BottomNav active={activeTab} hasBadge onNavigate={setActiveTab} showManage={isManager} />
      </View>
    </SafeAreaView>
  );
};

export default Index;
