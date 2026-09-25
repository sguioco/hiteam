import { Ionicons } from '@expo/vector-icons';
import type { AttendanceHistoryResponse, MyAttendanceCorrectionRequestItem } from '@smart/types';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, View } from 'react-native';
import { Input } from '../../components/ui/input';
import { PressableScale } from '../../components/ui/pressable-scale';
import { Screen } from '../../components/ui/screen';
import { Text } from '../../components/ui/text';
import { loadMyAttendanceCorrectionRequests, loadMyAttendanceHistory, requestMyAttendanceCorrection } from '../../lib/api';
import { getDateLocale, getDirectionalIconStyle, useI18n } from '../../lib/i18n';

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localDateTime(value: string) {
  const date = new Date(value);
  return `${dateKey(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function parseLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  return localDateTime(date.toISOString()) === value.trim() ? date : null;
}

export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const directionalIconStyle = getDirectionalIconStyle(language);
  const [monthOffset, setMonthOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [history, setHistory] = useState<AttendanceHistoryResponse | null>(null);
  const [requests, setRequests] = useState<MyAttendanceCorrectionRequestItem[]>([]);
  const [editing, setEditing] = useState<AttendanceHistoryResponse['rows'][number] | null>(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
        const [result, correctionRequests] = await Promise.all([
          loadMyAttendanceHistory(dateKey(month), dateKey(end)),
          loadMyAttendanceCorrectionRequests(dateKey(month), dateKey(end)),
        ]);
        if (!cancelled) {
          setHistory(result);
          setRequests(correctionRequests);
        }
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

  function openCorrection(row: AttendanceHistoryResponse['rows'][number]) {
    setEditing(row);
    setStartInput(localDateTime(row.startedAt));
    setEndInput(row.endedAt ? localDateTime(row.endedAt) : '');
    setReason('');
  }

  async function submitCorrection() {
    if (!editing || submitting) return;
    const start = parseLocalDateTime(startInput);
    const end = endInput.trim() ? parseLocalDateTime(endInput) : null;
    if (!start || (endInput.trim() && !end) || (end && end < start)) {
      Alert.alert(t('attendanceHistory.invalidTime'));
      return;
    }
    if (!reason.trim()) {
      Alert.alert(t('attendanceHistory.reasonRequired'));
      return;
    }
    const changedStart = localDateTime(editing.startedAt) !== localDateTime(start.toISOString());
    const changedEnd = end && (!editing.endedAt || localDateTime(editing.endedAt) !== localDateTime(end.toISOString()));
    if (!changedStart && !changedEnd) {
      Alert.alert(t('attendanceHistory.noChanges'));
      return;
    }
    setSubmitting(true);
    try {
      await requestMyAttendanceCorrection(editing.sessionId, {
        reason: reason.trim(),
        ...(changedStart ? { startedAt: start.toISOString() } : {}),
        ...(changedEnd && end ? { endedAt: end.toISOString() } : {}),
      });
      setEditing(null);
      setRefreshKey((current) => current + 1);
    } catch (nextError) {
      Alert.alert(t('attendanceHistory.requestError'), nextError instanceof Error ? nextError.message : undefined);
    } finally {
      setSubmitting(false);
    }
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
          const rowRequests = requests.filter((request) => request.sessionId === row.sessionId);
          const hasPending = rowRequests.some((request) => request.status === 'PENDING');
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
              {rowRequests.map((request) => (
                <View className="gap-1 rounded-xl bg-surface-strong p-3" key={request.id}>
                  <Text className="font-body text-sm font-semibold text-foreground">
                    {t(`attendanceHistory.status.${request.status}`)}
                  </Text>
                  <Text className="font-body text-xs text-muted-foreground">{request.reason}</Text>
                  {request.decisionComment ? (
                    <Text className="font-body text-xs text-foreground">{request.decisionComment}</Text>
                  ) : null}
                </View>
              ))}
              {!hasPending ? (
                <PressableScale onPress={() => openCorrection(row)}>
                  <Text className="font-body text-sm font-semibold text-primary">{t('attendanceHistory.requestCorrection')}</Text>
                </PressableScale>
              ) : null}
            </View>
          );
        })}
      </Screen>
      <Modal animationType="slide" visible={editing !== null} onRequestClose={() => setEditing(null)}>
        <ScrollView className="flex-1 bg-background px-5 pt-12" contentContainerClassName="gap-4 pb-12">
          <Text className="font-display text-2xl font-bold text-foreground">{t('attendanceHistory.requestCorrection')}</Text>
          <Text className="font-body text-sm text-muted-foreground">{t('attendanceHistory.timeHint')}</Text>
          <Text className="font-body font-semibold text-foreground">{t('attendanceHistory.checkIn')}</Text>
          <Input accessibilityLabel={t('attendanceHistory.checkIn')} autoCapitalize="none" onChangeText={setStartInput} value={startInput} />
          <Text className="font-body font-semibold text-foreground">{t('attendanceHistory.checkOut')}</Text>
          <Input accessibilityLabel={t('attendanceHistory.checkOut')} autoCapitalize="none" onChangeText={setEndInput} placeholder="YYYY-MM-DD HH:mm" value={endInput} />
          <Text className="font-body font-semibold text-foreground">{t('attendanceHistory.reason')}</Text>
          <Input accessibilityLabel={t('attendanceHistory.reason')} maxLength={500} multiline onChangeText={setReason} value={reason} />
          <PressableScale className="items-center rounded-2xl bg-primary p-4" disabled={submitting} onPress={() => void submitCorrection()}>
            <Text className="font-body font-semibold text-white">{submitting ? t('attendanceHistory.sending') : t('attendanceHistory.send')}</Text>
          </PressableScale>
          <PressableScale className="items-center p-3" disabled={submitting} onPress={() => setEditing(null)}>
            <Text className="font-body text-primary">{t('common.cancel')}</Text>
          </PressableScale>
        </ScrollView>
      </Modal>
    </>
  );
}
