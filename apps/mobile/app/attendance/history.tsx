import { Ionicons } from '@expo/vector-icons';
import type { AttendanceHistoryResponse } from '@smart/types';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { PressableScale } from '../../components/ui/pressable-scale';
import { Screen } from '../../components/ui/screen';
import { Text } from '../../components/ui/text';
import { loadMyAttendanceHistory } from '../../lib/api';
import { getDateLocale, getDirectionalIconStyle, useI18n } from '../../lib/i18n';

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const directionalIconStyle = getDirectionalIconStyle(language);
  const [monthOffset, setMonthOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [history, setHistory] = useState<AttendanceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const month = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month),
    [locale, month],
  );

  useEffect(() => {
    let cancelled = false;
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    async function loadHistory() {
      setLoading(true);
      setError(null);
      try {
        const result = await loadMyAttendanceHistory(dateKey(month), dateKey(end));
        if (!cancelled) setHistory(result);
      } catch (nextError) {
        if (!cancelled) {
          setHistory(null);
          setError(nextError instanceof Error ? nextError.message : t('attendanceHistory.loadError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadHistory();
    return () => { cancelled = true; };
  }, [month, refreshKey, t]);

  function changeMonth(delta: number) {
    setHistory(null);
    setMonthOffset((current) => Math.min(0, current + delta));
  }

  function formatTime(value: string) {
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  return (
    <>
      <StatusBar style="dark" />
      <Screen
        contentClassName="gap-5 pb-12"
        refreshControl={
          <RefreshControl
            onRefresh={() => setRefreshKey((current) => current + 1)}
            refreshing={loading && history !== null}
            tintColor="#315cf6"
          />
        }
      >
        <View className="flex-row items-center gap-3">
          <PressableScale
            accessibilityLabel={t('common.back')}
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
            onPress={() => router.back()}
          >
            <Ionicons color="#26334a" name="arrow-back" size={22} style={directionalIconStyle} />
          </PressableScale>
          <Text className="flex-1 font-display text-2xl font-bold text-foreground">
            {t('attendanceHistory.title')}
          </Text>
        </View>

        <View className="flex-row items-center justify-between rounded-2xl border border-white/70 bg-white/80 p-3">
          <PressableScale
            accessibilityLabel={t('attendanceHistory.previous')}
            className="h-10 w-10 items-center justify-center"
            onPress={() => changeMonth(-1)}
          >
            <Ionicons color="#315cf6" name="chevron-back" size={22} style={directionalIconStyle} />
          </PressableScale>
          <Text className="font-body text-base font-semibold text-foreground">
            {t('attendanceHistory.period', { period: monthLabel })}
          </Text>
          <PressableScale
            accessibilityLabel={t('attendanceHistory.next')}
            className="h-10 w-10 items-center justify-center"
            disabled={monthOffset >= 0}
            onPress={() => changeMonth(1)}
          >
            <Ionicons color={monthOffset >= 0 ? '#b5bfd0' : '#315cf6'} name="chevron-forward" size={22} style={directionalIconStyle} />
          </PressableScale>
        </View>

        {loading && !history ? (
          <View className="items-center py-12"><ActivityIndicator color="#315cf6" size="large" /></View>
        ) : null}

        {error ? (
          <View className="gap-3 rounded-2xl border border-danger/20 bg-danger/10 p-4">
            <Text className="font-body text-sm text-danger">{error}</Text>
            <PressableScale onPress={() => setRefreshKey((current) => current + 1)}>
              <Text className="font-body font-semibold text-primary">{t('common.retry')}</Text>
            </PressableScale>
          </View>
        ) : null}

        {!loading && history?.rows.length === 0 ? (
          <View className="rounded-2xl border border-white/70 bg-white/80 px-5 py-10">
            <Text className="text-center font-body text-sm text-muted-foreground">
              {t('attendanceHistory.empty')}
            </Text>
          </View>
        ) : null}

        {history?.rows.map((row) => {
          const status = row.status === 'checked_out'
            ? t('attendanceHistory.completed')
            : row.status === 'on_break'
              ? t('attendanceHistory.onBreak')
              : t('attendanceHistory.inProgress');
          const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', weekday: 'short' }).format(new Date(row.startedAt));
          return (
            <View className="gap-3 rounded-2xl border border-white/70 bg-white/80 p-4" key={row.sessionId}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="font-body text-base font-semibold text-foreground">{date}</Text>
                  <Text className="font-body text-sm text-muted-foreground">{row.location}</Text>
                </View>
                <Text className="font-body text-xs font-semibold text-primary">{status}</Text>
              </View>
              <View className="flex-row justify-between gap-4 border-t border-border pt-3">
                <Text className="font-body text-sm text-foreground">
                  {t('attendanceHistory.checkIn')}: {formatTime(row.startedAt)}
                </Text>
                <Text className="font-body text-sm text-foreground">
                  {t('attendanceHistory.checkOut')}: {row.endedAt ? formatTime(row.endedAt) : '—'}
                </Text>
              </View>
              {row.endedAt ? (
                <Text className="font-body text-xs text-muted-foreground">
                  {t('attendanceHistory.worked', {
                    hours: Math.floor(row.workedMinutes / 60),
                    minutes: row.workedMinutes % 60,
                  })}
                </Text>
              ) : null}
            </View>
          );
        })}
      </Screen>
    </>
  );
}
