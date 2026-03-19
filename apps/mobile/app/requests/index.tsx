import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import {
  EmployeeRequestItem,
  MyTimeOffBalancesResponse,
  RequestType,
  RequestsCalendarResponse,
  TaskItem,
} from '@smart/types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Screen } from '../../components/ui/screen';
import {
  addRequestComment,
  createMyRequest,
  loadMyRequestCalendar,
  loadMyRequests,
  loadMyTasks,
  loadMyTimeOffBalances,
} from '../../lib/api';
import { getDateLocale, useI18n } from '../../lib/i18n';

const requestTypeOptions: RequestType[] = [
  'LEAVE',
  'VACATION_CHANGE',
  'SICK_LEAVE',
  'UNPAID_LEAVE',
  'GENERAL',
  'SHIFT_CHANGE',
  'ADVANCE',
  'SUPPLY',
];

type AttachmentDraft = {
  fileName: string;
  mimeType: string;
  dataUrl: string;
};

type CalendarEvent =
  | {
      kind: 'request';
      id: string;
      request: EmployeeRequestItem;
    }
  | {
      kind: 'task';
      id: string;
      task: TaskItem;
    };

function getMonthWindow(viewDate: Date) {
  const dateFrom = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const dateTo = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  return { dateFrom, dateTo };
}

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatRequestType(type: RequestType, t: ReturnType<typeof useI18n>['t']) {
  switch (type) {
    case 'LEAVE':
      return t('requests.type.leave');
    case 'VACATION_CHANGE':
      return t('requests.type.vacationChange');
    case 'SICK_LEAVE':
      return t('requests.type.sickLeave');
    case 'UNPAID_LEAVE':
      return t('requests.type.unpaidLeave');
    case 'SHIFT_CHANGE':
      return t('requests.type.shiftChange');
    case 'ADVANCE':
      return t('requests.type.advance');
    case 'SUPPLY':
      return t('requests.type.supply');
    default:
      return t('requests.type.general');
  }
}

function parseTaskDueKey(task: TaskItem) {
  return task.dueAt ? task.dueAt.slice(0, 10) : null;
}

export default function RequestsScreen() {
  const router = useRouter();
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const today = useMemo(() => new Date(), []);
  const [balances, setBalances] = useState<MyTimeOffBalancesResponse | null>(null);
  const [items, setItems] = useState<EmployeeRequestItem[]>([]);
  const [calendar, setCalendar] = useState<RequestsCalendarResponse | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(() => formatDateKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [draft, setDraft] = useState({
    requestType: 'LEAVE' as RequestType,
    title: '',
    startsOn: formatDateInput(today),
    endsOn: formatDateInput(today),
    reason: '',
    relatedRequestId: '',
  });

  async function loadData(viewDate = calendarMonth) {
    setLoading(true);
    setError(null);

    try {
      const { dateFrom, dateTo } = getMonthWindow(viewDate);
      const [nextBalances, nextItems, nextCalendar, nextTasks] = await Promise.all([
        loadMyTimeOffBalances(),
        loadMyRequests(),
        loadMyRequestCalendar(dateFrom.toISOString(), dateTo.toISOString()),
        loadMyTasks(),
      ]);
      setBalances(nextBalances);
      setItems(nextItems);
      setCalendar(nextCalendar);
      setTasks(nextTasks);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('requests.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [calendarMonth]);

  async function pickAttachments() {
    setError(null);

    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    });

    if (result.canceled) {
      return;
    }

    const nextAssets = result.assets.slice(0, 5 - attachments.length);
    if (nextAssets.length !== result.assets.length) {
      setError(t('requests.tooManyAttachments'));
    }

    try {
      const nextAttachments = await Promise.all(
        nextAssets.map(async (asset) => {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const mimeType = asset.mimeType ?? 'application/octet-stream';
          return {
            fileName: asset.name,
            mimeType,
            dataUrl: `data:${mimeType};base64,${base64}`,
          };
        }),
      );

      setAttachments((current) => [...current, ...nextAttachments].slice(0, 5));
    } catch {
      setError(t('requests.attachmentReadError'));
    }
  }

  async function handleSubmit() {
    if (!draft.title.trim()) {
      setError(t('requests.titleRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const relatedRequest = items.find((item) => item.id === draft.relatedRequestId);

      await createMyRequest({
        requestType: draft.requestType,
        title: draft.title.trim(),
        reason: draft.reason.trim() || undefined,
        startsOn: draft.startsOn,
        endsOn: draft.endsOn,
        relatedRequestId: draft.requestType === 'VACATION_CHANGE' ? draft.relatedRequestId : undefined,
        previousStartsOn: relatedRequest?.startsOn,
        previousEndsOn: relatedRequest?.endsOn,
        attachments: attachments.map((item) => ({ fileName: item.fileName, dataUrl: item.dataUrl })),
      });

      setDraft({
        requestType: 'LEAVE',
        title: '',
        startsOn: formatDateInput(today),
        endsOn: formatDateInput(today),
        reason: '',
        relatedRequestId: '',
      });
      setAttachments([]);
      setMessage(t('requests.created'));
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('requests.createError'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddComment(requestId: string) {
    const body = commentDrafts[requestId]?.trim();
    if (!body) return;

    try {
      await addRequestComment(requestId, body);
      setCommentDrafts((current) => ({ ...current, [requestId]: '' }));
      setMessage(t('requests.commentAdded'));
      await loadData();
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : t('requests.commentError'));
    }
  }

  const approvedVacations = items.filter((item) => item.requestType === 'LEAVE' && item.status === 'APPROVED');
  const vacationBalance = balances?.balances.find((item) => item.kind === 'VACATION');
  const personalBalance = balances?.balances.find((item) => item.kind === 'PERSONAL_DAY_OFF');

  const monthDays = useMemo(() => {
    const days: Date[] = [];
    const { dateFrom } = getMonthWindow(calendarMonth);
    const calendarStart = new Date(dateFrom);
    calendarStart.setDate(dateFrom.getDate() - ((dateFrom.getDay() + 6) % 7));

    for (let index = 0; index < 42; index += 1) {
      const day = new Date(calendarStart);
      day.setDate(calendarStart.getDate() + index);
      days.push(day);
    }

    return days;
  }, [calendarMonth]);

  const calendarEventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const request of calendar?.requests ?? []) {
      const startsOn = request.startsOn.slice(0, 10);
      const endsOn = request.endsOn.slice(0, 10);

      for (const day of monthDays) {
        const dayKey = formatDateKey(day);
        if (dayKey < startsOn || dayKey > endsOn) continue;

        const list = map.get(dayKey) ?? [];
        list.push({ kind: 'request', id: `request-${request.id}`, request });
        map.set(dayKey, list);
      }
    }

    for (const task of tasks) {
      const dueKey = parseTaskDueKey(task);
      if (!dueKey) continue;
      const list = map.get(dueKey) ?? [];
      list.push({ kind: 'task', id: `task-${task.id}`, task });
      map.set(dueKey, list);
    }

    return map;
  }, [calendar?.requests, monthDays, tasks]);

  const selectedDayEvents = calendarEventsByDay.get(selectedDayKey) ?? [];

  function shiftCalendarMonth(delta: number) {
    const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + delta, 1);
    setCalendarMonth(nextMonth);
    setSelectedDayKey(formatDateKey(nextMonth));
  }

  function removeAttachment(index: number) {
    setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <Screen contentClassName="pb-10">
      <StatusBar style="dark" />

      <Card className="gap-4">
        <View className="gap-2">
          <Badge label={t('requests.eyebrow')} variant="brand" />
          <Text className="text-[30px] font-extrabold text-foreground">{t('requests.title')}</Text>
          <Text className="text-[15px] leading-6 text-muted">{t('requests.attachmentsHint')}</Text>
        </View>

        <View className="flex-row gap-3">
          <Card className="flex-1 gap-1 bg-surface-muted" inset="compact">
            <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted">{t('requests.vacationAvailable')}</Text>
            <Text className="text-[28px] font-extrabold text-foreground">{vacationBalance?.availableDays ?? 0}</Text>
          </Card>
          <Card className="flex-1 gap-1 bg-surface-muted" inset="compact">
            <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted">{t('requests.personalDayAvailable')}</Text>
            <Text className="text-[28px] font-extrabold text-foreground">{personalBalance?.availableDays ?? 0}</Text>
          </Card>
        </View>

        <Button label={t('requests.backToAttendance')} onPress={() => router.push('/today' as never)} variant="ghost" />
      </Card>

      {message ? (
        <Card className="border-border bg-surface-muted">
          <Text className="text-[14px] leading-5 text-foreground">{message}</Text>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-danger bg-[#f6d9d2]">
          <Text className="text-[14px] leading-5 text-danger">{error}</Text>
        </Card>
      ) : null}

      <Card className="gap-4">
        <View className="gap-2">
          <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted">{t('requests.newRequest')}</Text>
          <Text className="text-[24px] font-extrabold text-foreground">{t('requests.createAbsenceRequest')}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {requestTypeOptions.map((option) => {
              const isActive = draft.requestType === option;
              return (
                <Pressable
                  key={option}
                  className={`rounded-2xl border-2 px-4 py-3 ${isActive ? 'border-border bg-brand' : 'border-border bg-surface-muted'}`}
                  onPress={() => setDraft((current) => ({ ...current, requestType: option }))}
                >
                  <Text className={`text-[13px] font-bold ${isActive ? 'text-brand-foreground' : 'text-foreground'}`}>
                    {formatRequestType(option, t)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {draft.requestType === 'VACATION_CHANGE' ? (
          <View className="gap-2">
            <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted">{t('requests.approvedVacationToMove')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {approvedVacations.map((item) => {
                  const isActive = draft.relatedRequestId === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      className={`rounded-2xl border-2 px-4 py-3 ${isActive ? 'border-border bg-brand' : 'border-border bg-surface-muted'}`}
                      onPress={() => setDraft((current) => ({ ...current, relatedRequestId: item.id }))}
                    >
                      <Text className={`text-[13px] font-bold ${isActive ? 'text-brand-foreground' : 'text-foreground'}`}>
                        {new Date(item.startsOn).toLocaleDateString(locale)} - {new Date(item.endsOn).toLocaleDateString(locale)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ) : null}

        <Input onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))} placeholder={t('requests.titlePlaceholder')} value={draft.title} />
        <Input autoCapitalize="none" onChangeText={(value) => setDraft((current) => ({ ...current, startsOn: value }))} placeholder={t('requests.startsOnPlaceholder')} value={draft.startsOn} />
        <Input autoCapitalize="none" onChangeText={(value) => setDraft((current) => ({ ...current, endsOn: value }))} placeholder={t('requests.endsOnPlaceholder')} value={draft.endsOn} />
        <Input
          multiline
          className="min-h-[120px] py-3"
          onChangeText={(value) => setDraft((current) => ({ ...current, reason: value }))}
          placeholder={t('requests.managerCommentPlaceholder')}
          textAlignVertical="top"
          value={draft.reason}
        />

        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted">{t('requests.attachments')}</Text>
            <Button disabled={attachments.length >= 5} label={t('requests.pickAttachments')} onPress={() => void pickAttachments()} variant="secondary" />
          </View>
          <Text className="text-[14px] leading-5 text-muted">{t('requests.attachmentTypesHint')}</Text>
          {attachments.length ? (
            attachments.map((item, index) => (
              <View key={`${item.fileName}-${index}`} className="flex-row items-center justify-between gap-3 rounded-2xl border-2 border-border bg-surface-muted p-3">
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-foreground">{item.fileName}</Text>
                  <Text className="text-[13px] text-muted">{item.mimeType}</Text>
                </View>
                <Button label={t('common.remove')} onPress={() => removeAttachment(index)} variant="ghost" />
              </View>
            ))
          ) : (
            <Text className="text-[14px] leading-5 text-muted">{t('requests.noAttachments')}</Text>
          )}
        </View>

        <Button disabled={submitting || loading} fullWidth label={submitting ? t('requests.submitting') : t('requests.submit')} onPress={() => void handleSubmit()} size="lg" />
      </Card>

      <Card className="gap-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted">{t('requests.unifiedCalendar')}</Text>
            <Text className="text-[24px] font-extrabold text-foreground">
              {calendarMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
            </Text>
            <Text className="text-[14px] leading-5 text-muted">{t('requests.unifiedCalendarHint')}</Text>
          </View>
          <View className="gap-2">
            <Button label={t('tasks.prev')} onPress={() => shiftCalendarMonth(-1)} variant="secondary" />
            <Button label={t('tasks.next')} onPress={() => shiftCalendarMonth(1)} variant="secondary" />
          </View>
        </View>

        <View className="flex-row justify-between gap-1">
          {Array.from({ length: 7 }, (_, index) => new Date(2026, 0, 5 + index).toLocaleDateString(locale, { weekday: 'short' })).map((label) => (
            <Text key={label} className="w-[13%] text-center text-[11px] font-bold uppercase tracking-[1px] text-muted">
              {label}
            </Text>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {monthDays.map((day) => {
            const dayKey = formatDateKey(day);
            const dayEvents = calendarEventsByDay.get(dayKey) ?? [];
            const requestCount = dayEvents.filter((event) => event.kind === 'request').length;
            const taskCount = dayEvents.filter((event) => event.kind === 'task').length;
            const isSelected = dayKey === selectedDayKey;
            const isOutsideMonth = day.getMonth() !== calendarMonth.getMonth();

            return (
              <View key={dayKey} className="w-[14.285%] p-[3px]">
                <Pressable
                  className={`min-h-[84px] rounded-2xl border-2 border-border px-2 py-2 ${isSelected ? 'bg-brand' : 'bg-surface-muted'} ${isOutsideMonth ? 'opacity-50' : ''}`}
                  onPress={() => setSelectedDayKey(dayKey)}
                >
                  <Text className={`text-[16px] font-extrabold ${isSelected ? 'text-brand-foreground' : 'text-foreground'}`}>{day.getDate()}</Text>
                  <Text className={`text-[10px] leading-3 ${isSelected ? 'text-brand-foreground' : 'text-muted'}`}>
                    {requestCount} {t('requests.absShort')}
                  </Text>
                  <Text className={`text-[10px] leading-3 ${isSelected ? 'text-brand-foreground' : 'text-muted'}`}>
                    {taskCount} {t('requests.tasksShort')}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </Card>

      <Card className="gap-4">
        <View className="gap-1">
          <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted">{t('requests.selectedDay')}</Text>
          <Text className="text-[24px] font-extrabold text-foreground">
            {new Date(`${selectedDayKey}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {selectedDayEvents.length ? (
          selectedDayEvents.map((event) =>
            event.kind === 'request' ? (
              <Card key={event.id} className="gap-2 bg-surface-muted" inset="compact">
                <Text className="text-[16px] font-extrabold text-foreground">{event.request.title}</Text>
                <Text className="text-[14px] leading-5 text-foreground">
                  {formatRequestType(event.request.requestType, t)} • {event.request.status}
                </Text>
                <Text className="text-[13px] leading-5 text-muted">
                  {new Date(event.request.startsOn).toLocaleDateString(locale)} - {new Date(event.request.endsOn).toLocaleDateString(locale)}
                </Text>
              </Card>
            ) : (
              <Card key={event.id} className="gap-2 bg-surface-muted" inset="compact">
                <Text className="text-[16px] font-extrabold text-foreground">{event.task.title}</Text>
                <Text className="text-[14px] leading-5 text-foreground">
                  {event.task.priority} • {event.task.status}
                </Text>
                <Text className="text-[13px] leading-5 text-muted">
                  {t('requests.due', { dueAt: event.task.dueAt ? new Date(event.task.dueAt).toLocaleString(locale) : '—' })}
                </Text>
              </Card>
            ),
          )
        ) : (
          <Text className="text-[15px] leading-6 text-muted">{t('requests.noDayEvents')}</Text>
        )}
      </Card>

      <Card className="gap-4">
        <View className="gap-1">
          <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted">{t('requests.history')}</Text>
          <Text className="text-[24px] font-extrabold text-foreground">{t('requests.myRequests')}</Text>
        </View>

        {items.length ? (
          items.map((item) => (
            <Card key={item.id} className="gap-3 bg-surface-muted" inset="compact">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-1">
                  <Text className="text-[16px] font-extrabold text-foreground">{item.title}</Text>
                  <Text className="text-[13px] text-muted">{formatRequestType(item.requestType, t)}</Text>
                </View>
                <Badge label={item.status} variant="muted" />
              </View>

              <Text className="text-[14px] leading-5 text-foreground">
                {new Date(item.startsOn).toLocaleDateString(locale)} - {new Date(item.endsOn).toLocaleDateString(locale)} • {t('requests.dayCount', { count: item.requestedDays })}
              </Text>

              {item.relatedRequest ? (
                <Text className="text-[13px] leading-5 text-muted">
                  {t('requests.originalVacation', {
                    range: `${new Date(item.relatedRequest.startsOn).toLocaleDateString(locale)} - ${new Date(item.relatedRequest.endsOn).toLocaleDateString(locale)}`,
                  })}
                </Text>
              ) : null}

              {item.attachments.length ? (
                <View className="gap-2">
                  <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted">{t('requests.attachments')}</Text>
                  {item.attachments.map((attachment) => (
                    <Button
                      key={attachment.id}
                      label={attachment.fileName}
                      onPress={() => attachment.url ? void Linking.openURL(attachment.url) : void 0}
                      variant="secondary"
                    />
                  ))}
                </View>
              ) : null}

              <View className="gap-2">
                <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-muted">{t('requests.approvalTimeline')}</Text>
                {item.approvalSteps.map((step) => (
                  <Text key={step.id} className="text-[14px] leading-5 text-foreground">
                    #{step.sequence} {step.approverEmployee.firstName} {step.approverEmployee.lastName} • {step.status}
                  </Text>
                ))}
                {item.comments.map((comment) => (
                  <Text key={comment.id} className="text-[13px] leading-5 text-muted">
                    {comment.authorEmployee.firstName} {comment.authorEmployee.lastName}: {comment.body}
                  </Text>
                ))}
              </View>

              <Input
                onChangeText={(value) => setCommentDrafts((current) => ({ ...current, [item.id]: value }))}
                placeholder={t('requests.addComment')}
                value={commentDrafts[item.id] ?? ''}
              />
              <Button label={t('requests.sendComment')} onPress={() => void handleAddComment(item.id)} variant="secondary" />
            </Card>
          ))
        ) : (
          <Text className="text-[15px] leading-6 text-muted">{loading ? t('requests.loading') : t('requests.empty')}</Text>
        )}
      </Card>
    </Screen>
  );
}
