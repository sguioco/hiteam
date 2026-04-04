'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnnouncementItem,
  AnnouncementTemplateItem,
  AnnouncementTemplateRunResponse,
  CollaborationAnalyticsResponse,
  CollaborationTaskBoardResponse,
  ChatThreadItem,
  CollaborationOverviewResponse,
  TaskItem,
  TaskAutomationPolicy,
  TaskAutomationRunResponse,
  TaskTemplateItem,
  TaskTemplateRunResponse,
  WorkGroupItem,
} from '@smart/types';
import { AdminShell } from '../../components/admin-shell';
import { AppSelectField } from '../../components/ui/select';
import { getSession } from '../../lib/auth';
import { apiRequest } from '../../lib/api';
import { createCollaborationSocket } from '../../lib/collaboration-socket';
import { useI18n } from '../../lib/i18n';
import { useTranslatedTaskCopy } from '../../lib/use-translated-task-copy';

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  department?: {
    id: string;
    name: string;
  } | null;
  primaryLocation?: {
    id: string;
    name: string;
  } | null;
};

const DEFAULT_TASK_BOARD_FILTERS = {
  search: '',
  status: '',
  priority: '',
  groupId: '',
  assigneeEmployeeId: '',
  departmentId: '',
  locationId: '',
  onlyOverdue: false,
};

export type CollaborationPageInitialData = {
  analytics: CollaborationAnalyticsResponse | null;
  announcementTemplates: AnnouncementTemplateItem[];
  announcements: AnnouncementItem[];
  automationPolicy: TaskAutomationPolicy | null;
  chats: ChatThreadItem[];
  employees: EmployeeOption[];
  overview: CollaborationOverviewResponse | null;
  taskBoard: CollaborationTaskBoardResponse | null;
  taskTemplates: TaskTemplateItem[];
  windowDays: number;
};

export default function CollaborationPageClient({
  initialData,
}: {
  initialData?: CollaborationPageInitialData | null;
}) {
  const { locale, t } = useI18n();
  const [overview, setOverview] = useState<CollaborationOverviewResponse | null>(initialData?.overview ?? null);
  const [analytics, setAnalytics] = useState<CollaborationAnalyticsResponse | null>(initialData?.analytics ?? null);
  const [taskBoard, setTaskBoard] = useState<CollaborationTaskBoardResponse | null>(initialData?.taskBoard ?? null);
  const [automationPolicy, setAutomationPolicy] = useState<TaskAutomationPolicy | null>(initialData?.automationPolicy ?? null);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplateItem[]>(initialData?.taskTemplates ?? []);
  const [announcementTemplates, setAnnouncementTemplates] = useState<AnnouncementTemplateItem[]>(initialData?.announcementTemplates ?? []);
  const [employees, setEmployees] = useState<EmployeeOption[]>(initialData?.employees ?? []);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialData?.announcements ?? []);
  const [chats, setChats] = useState<ChatThreadItem[]>(initialData?.chats ?? []);
  const [selectedChatId, setSelectedChatId] = useState<string>(initialData?.chats[0]?.id ?? '');
  const [windowDays, setWindowDays] = useState(initialData?.windowDays ?? 30);
  const translatedTasks = useMemo(
    () => [
      ...(taskBoard?.tasks ?? []),
      ...(overview?.recentTasks ?? []),
      ...(analytics?.deadlineBoard.overdue ?? []),
      ...(analytics?.deadlineBoard.dueSoon ?? []),
      ...(analytics?.deadlineBoard.urgentOpen ?? []),
    ],
    [
      analytics?.deadlineBoard.dueSoon,
      analytics?.deadlineBoard.overdue,
      analytics?.deadlineBoard.urgentOpen,
      overview?.recentTasks,
      taskBoard?.tasks,
    ],
  );
  const { getTaskTitle } = useTranslatedTaskCopy(translatedTasks, locale);
  const [message, setMessage] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState({
    name: '',
    description: '',
    memberEmployeeIds: [] as string[],
  });
  const [groupMembersDraft, setGroupMembersDraft] = useState<Record<string, string[]>>(
    initialData?.overview
      ? Object.fromEntries(
          initialData.overview.groups.map((group) => [
            group.id,
            group.memberships.map((membership) => membership.employeeId),
          ]),
        )
      : {},
  );
  const [taskDraft, setTaskDraft] = useState({
    title: '',
    description: '',
    targetMode: 'group' as 'group' | 'employee' | 'department' | 'location',
    groupId: '',
    assigneeEmployeeId: '',
    departmentId: '',
    locationId: '',
    priority: 'MEDIUM',
    dueAt: '',
    requiresPhoto: false,
    checklist: [''],
  });
  const [announcementDraft, setAnnouncementDraft] = useState({
    audience: 'ALL',
    groupId: '',
    targetEmployeeId: '',
    departmentId: '',
    locationId: '',
    title: '',
    body: '',
  });
  const [announcementTemplateDraft, setAnnouncementTemplateDraft] = useState({
    audience: 'ALL',
    groupId: '',
    targetEmployeeId: '',
    departmentId: '',
    locationId: '',
    title: '',
    body: '',
    frequency: 'DAILY',
    weekDays: [1, 2, 3, 4, 5] as number[],
    dayOfMonth: '1',
    startDate: '',
    endDate: '',
    publishTimeLocal: '',
    isPinned: false,
  });
  const [chatDraft, setChatDraft] = useState({
    mode: 'direct' as 'direct' | 'group',
    employeeId: '',
    groupId: '',
    title: '',
  });
  const [chatMessageDraft, setChatMessageDraft] = useState('');
  const [templateDraft, setTemplateDraft] = useState({
    title: '',
    description: '',
    targetMode: 'group' as 'group' | 'employee' | 'department' | 'location',
    groupId: '',
    assigneeEmployeeId: '',
    departmentId: '',
    locationId: '',
    priority: 'MEDIUM',
    requiresPhoto: false,
    expandOnDemand: false,
    frequency: 'DAILY',
    weekDays: [1, 2, 3, 4, 5] as number[],
    dayOfMonth: '1',
    startDate: '',
    endDate: '',
    dueAfterDays: '0',
    dueTimeLocal: '',
    checklist: [''],
  });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingAnnouncementTemplateId, setEditingAnnouncementTemplateId] = useState<string | null>(null);
  const [taskBoardFilters, setTaskBoardFilters] = useState(DEFAULT_TASK_BOARD_FILTERS);
  const didUseInitialData = useRef(Boolean(initialData));

  function buildTaskBoardQuery() {
    const searchParams = new URLSearchParams();

    if (taskBoardFilters.search.trim()) searchParams.set('search', taskBoardFilters.search.trim());
    if (taskBoardFilters.status) searchParams.set('status', taskBoardFilters.status);
    if (taskBoardFilters.priority) searchParams.set('priority', taskBoardFilters.priority);
    if (taskBoardFilters.groupId) searchParams.set('groupId', taskBoardFilters.groupId);
    if (taskBoardFilters.assigneeEmployeeId) searchParams.set('assigneeEmployeeId', taskBoardFilters.assigneeEmployeeId);
    if (taskBoardFilters.departmentId) searchParams.set('departmentId', taskBoardFilters.departmentId);
    if (taskBoardFilters.locationId) searchParams.set('locationId', taskBoardFilters.locationId);
    if (taskBoardFilters.onlyOverdue) searchParams.set('onlyOverdue', 'true');

    const query = searchParams.toString();
    return query ? `/collaboration/tasks?${query}` : '/collaboration/tasks';
  }

  async function loadData() {
    const session = getSession();
    if (!session) return;

    const [overviewData, analyticsData, taskBoardData, automationPolicyData, taskTemplatesData, announcementTemplatesData, employeesData, announcementsData, chatsData] = await Promise.all([
      apiRequest<CollaborationOverviewResponse>('/collaboration/overview', { token: session.accessToken }),
      apiRequest<CollaborationAnalyticsResponse>(`/collaboration/analytics?days=${windowDays}`, {
        token: session.accessToken,
      }),
      apiRequest<CollaborationTaskBoardResponse>(buildTaskBoardQuery(), { token: session.accessToken }),
      apiRequest<TaskAutomationPolicy>('/collaboration/automation/policy', { token: session.accessToken }),
      apiRequest<TaskTemplateItem[]>('/collaboration/task-templates', { token: session.accessToken }),
      apiRequest<AnnouncementTemplateItem[]>('/collaboration/announcement-templates', { token: session.accessToken }),
      apiRequest<EmployeeOption[]>('/employees', { token: session.accessToken }),
      apiRequest<AnnouncementItem[]>('/collaboration/announcements', { token: session.accessToken }),
      apiRequest<ChatThreadItem[]>('/collaboration/chats', { token: session.accessToken }),
    ]);

    setOverview(overviewData);
    setAnalytics(analyticsData);
    setTaskBoard(taskBoardData);
    setAutomationPolicy(automationPolicyData);
    setTaskTemplates(taskTemplatesData);
    setAnnouncementTemplates(announcementTemplatesData);
    setEmployees(employeesData);
    setAnnouncements(announcementsData);
    setChats(chatsData);
    setSelectedChatId((current) => current || chatsData[0]?.id || '');
    setGroupMembersDraft(
      Object.fromEntries(
        overviewData.groups.map((group) => [group.id, group.memberships.map((membership) => membership.employeeId)]),
      ),
    );
  }

  useEffect(() => {
    const shouldSkipInitialLoad =
      didUseInitialData.current &&
      initialData &&
      windowDays === initialData.windowDays &&
      JSON.stringify(taskBoardFilters) === JSON.stringify(DEFAULT_TASK_BOARD_FILTERS);

    if (shouldSkipInitialLoad) {
      didUseInitialData.current = false;
    } else {
      void loadData();
    }

    const session = getSession();
    if (!session) return;
    const socket = createCollaborationSocket(session.accessToken);

    socket.on('chat:message', () => {
      void loadData();
    });
    socket.on('chat:thread-updated', () => {
      void loadData();
    });

    return () => {
      socket.disconnect();
    };
  }, [windowDays, taskBoardFilters]);

  function formatPercent(value: number) {
    return `${value.toFixed(1)}%`;
  }

  function formatHours(value: number | null) {
    return value === null ? '—' : `${value.toFixed(1)}h`;
  }

  function renderTaskSummary(items: TaskItem[], emptyLabel: string) {
    if (!items.length) {
      return <div className="empty-state">{emptyLabel}</div>;
    }

    return (
      <div className="section-stack compact-stack">
        {items.map((task) => (
          <article className="mini-panel" key={task.id}>
            <div className="panel-header">
              <div>
                <span className="section-kicker">{task.priority}</span>
                <h3>{getTaskTitle(task)}</h3>
              </div>
              <span className="status-chip">{task.status}</span>
            </div>
            <div className="detail-list">
              <div className="detail-row">
                <span>{t('collaboration.assignToEmployee')}</span>
                <strong>{task.assigneeEmployee ? `${task.assigneeEmployee.firstName} ${task.assigneeEmployee.lastName}` : '—'}</strong>
              </div>
              <div className="detail-row">
                <span>{t('collaboration.dueAt')}</span>
                <strong>{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : '—'}</strong>
              </div>
            </div>
            {task.photoProofs.length ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {task.photoProofs.map((proof) => {
                  const isActive = !proof.deletedAt && !proof.supersededByProofId;
                  return (
                    <a
                      className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]"
                      href={proof.url ?? '#'}
                      key={proof.id}
                      rel="noreferrer"
                      style={{ opacity: isActive ? 1 : 0.56 }}
                      target="_blank"
                    >
                      {proof.url ? (
                        <img
                          alt={proof.fileName}
                          className="block h-20 w-20 object-cover"
                          src={proof.url}
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center text-xs text-[color:var(--muted-foreground)]">
                          No preview
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    );
  }

  const departments = Array.from(
    new Map(
      employees
        .filter((employee) => employee.department)
        .map((employee) => [employee.department!.id, employee.department!] as const),
    ).values(),
  );
  const locations = Array.from(
    new Map(
      employees
        .filter((employee) => employee.primaryLocation)
        .map((employee) => [employee.primaryLocation!.id, employee.primaryLocation!] as const),
    ).values(),
  );

  function toggleEmployeeSelection(current: string[], employeeId: string) {
    return current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId];
  }

  function toggleWeekday(current: number[], day: number) {
    return current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((left, right) => left - right);
  }

  function resetTemplateDraft() {
    setEditingTemplateId(null);
    setTemplateDraft({
      title: '',
      description: '',
      targetMode: 'group',
      groupId: '',
      assigneeEmployeeId: '',
      departmentId: '',
      locationId: '',
      priority: 'MEDIUM',
      requiresPhoto: false,
      expandOnDemand: false,
      frequency: 'DAILY',
      weekDays: [1, 2, 3, 4, 5],
      dayOfMonth: '1',
      startDate: '',
      endDate: '',
      dueAfterDays: '0',
      dueTimeLocal: '',
      checklist: [''],
    });
  }

  function startEditingTemplate(template: TaskTemplateItem) {
    setEditingTemplateId(template.id);
    setTemplateDraft({
      title: template.title,
      description: template.description ?? '',
      targetMode: template.group
        ? 'group'
        : template.assigneeEmployee
          ? 'employee'
          : template.department
            ? 'department'
            : 'location',
      groupId: template.group?.id ?? '',
      assigneeEmployeeId: template.assigneeEmployee?.id ?? '',
      departmentId: template.department?.id ?? '',
      locationId: template.location?.id ?? '',
      priority: template.priority,
      requiresPhoto: template.requiresPhoto,
      expandOnDemand: template.expandOnDemand,
      frequency: template.frequency,
      weekDays: template.weekDaysJson ? (JSON.parse(template.weekDaysJson) as number[]) : [1, 2, 3, 4, 5],
      dayOfMonth: String(template.dayOfMonth ?? 1),
      startDate: template.startDate.slice(0, 10),
      endDate: template.endDate ? template.endDate.slice(0, 10) : '',
      dueAfterDays: String(template.dueAfterDays),
      dueTimeLocal: template.dueTimeLocal ?? '',
      checklist: template.checklistJson ? (JSON.parse(template.checklistJson) as string[]) : [''],
    });
  }

  function resetAnnouncementTemplateDraft() {
    setEditingAnnouncementTemplateId(null);
    setAnnouncementTemplateDraft({
      audience: 'ALL',
      groupId: '',
      targetEmployeeId: '',
      departmentId: '',
      locationId: '',
      title: '',
      body: '',
      frequency: 'DAILY',
      weekDays: [1, 2, 3, 4, 5],
      dayOfMonth: '1',
      startDate: '',
      endDate: '',
      publishTimeLocal: '',
      isPinned: false,
    });
  }

  function startEditingAnnouncementTemplate(template: AnnouncementTemplateItem) {
    setEditingAnnouncementTemplateId(template.id);
    setAnnouncementTemplateDraft({
      audience: template.audience,
      groupId: template.group?.id ?? '',
      targetEmployeeId: template.targetEmployee?.id ?? '',
      departmentId: template.department?.id ?? '',
      locationId: template.location?.id ?? '',
      title: template.title,
      body: template.body,
      frequency: template.frequency,
      weekDays: template.weekDaysJson ? (JSON.parse(template.weekDaysJson) as number[]) : [1, 2, 3, 4, 5],
      dayOfMonth: String(template.dayOfMonth ?? 1),
      startDate: template.startDate.slice(0, 10),
      endDate: template.endDate ? template.endDate.slice(0, 10) : '',
      publishTimeLocal: template.publishTimeLocal ?? '',
      isPinned: template.isPinned,
    });
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    await apiRequest('/collaboration/groups', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify(groupDraft),
    });

    setGroupDraft({ name: '', description: '', memberEmployeeIds: [] });
    setMessage(t('collaboration.groupCreated'));
    await loadData();
  }

  async function saveGroupMembers(groupId: string) {
    const session = getSession();
    if (!session) return;

    await apiRequest(`/collaboration/groups/${groupId}/members`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ employeeIds: groupMembersDraft[groupId] ?? [] }),
    });

    setMessage(t('collaboration.membersUpdated'));
    await loadData();
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    await apiRequest<TaskItem[]>('/collaboration/tasks', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        title: taskDraft.title,
        description: taskDraft.description || undefined,
        groupId: taskDraft.targetMode === 'group' ? taskDraft.groupId || undefined : undefined,
        assigneeEmployeeId: taskDraft.targetMode === 'employee' ? taskDraft.assigneeEmployeeId || undefined : undefined,
        departmentId: taskDraft.targetMode === 'department' ? taskDraft.departmentId || undefined : undefined,
        locationId: taskDraft.targetMode === 'location' ? taskDraft.locationId || undefined : undefined,
        priority: taskDraft.priority,
        requiresPhoto: taskDraft.requiresPhoto || undefined,
        dueAt: taskDraft.dueAt || undefined,
        checklist: taskDraft.checklist.map((item) => item.trim()).filter((item) => item.length > 0),
      }),
    });

    setTaskDraft({
      title: '',
      description: '',
      targetMode: 'group',
      groupId: '',
      assigneeEmployeeId: '',
      departmentId: '',
      locationId: '',
      priority: 'MEDIUM',
      dueAt: '',
      requiresPhoto: false,
      checklist: [''],
    });
    setMessage(t('collaboration.taskCreated'));
    await loadData();
  }

  async function createTaskTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    const path = editingTemplateId
      ? `/collaboration/task-templates/${editingTemplateId}`
      : '/collaboration/task-templates';

    await apiRequest<TaskTemplateItem>(path, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        title: templateDraft.title,
        description: templateDraft.description || undefined,
        priority: templateDraft.priority,
        requiresPhoto: templateDraft.requiresPhoto || undefined,
        expandOnDemand: templateDraft.expandOnDemand || undefined,
        frequency: templateDraft.frequency,
        weekDays: templateDraft.frequency === 'WEEKLY' ? templateDraft.weekDays : undefined,
        dayOfMonth: templateDraft.frequency === 'MONTHLY' ? Number(templateDraft.dayOfMonth) : undefined,
        startDate: templateDraft.startDate,
        endDate: templateDraft.endDate || undefined,
        dueAfterDays: Number(templateDraft.dueAfterDays || '0'),
        dueTimeLocal: templateDraft.dueTimeLocal || undefined,
        groupId: templateDraft.targetMode === 'group' ? templateDraft.groupId || undefined : undefined,
        assigneeEmployeeId:
          templateDraft.targetMode === 'employee' ? templateDraft.assigneeEmployeeId || undefined : undefined,
        departmentId:
          templateDraft.targetMode === 'department' ? templateDraft.departmentId || undefined : undefined,
        locationId:
          templateDraft.targetMode === 'location' ? templateDraft.locationId || undefined : undefined,
        checklist: templateDraft.checklist.map((item) => item.trim()).filter((item) => item.length > 0),
      }),
    });

    resetTemplateDraft();
    setMessage(editingTemplateId ? t('collaboration.templateUpdated') : t('collaboration.templateCreated'));
    await loadData();
  }

  async function createAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    await apiRequest('/collaboration/announcements', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        audience: announcementDraft.audience,
        groupId: announcementDraft.audience === 'GROUP' ? announcementDraft.groupId || undefined : undefined,
        targetEmployeeId:
          announcementDraft.audience === 'EMPLOYEE' ? announcementDraft.targetEmployeeId || undefined : undefined,
        departmentId:
          announcementDraft.audience === 'DEPARTMENT' ? announcementDraft.departmentId || undefined : undefined,
        locationId:
          announcementDraft.audience === 'LOCATION' ? announcementDraft.locationId || undefined : undefined,
        title: announcementDraft.title,
        body: announcementDraft.body,
      }),
    });

    setAnnouncementDraft({
      audience: 'ALL',
      groupId: '',
      targetEmployeeId: '',
      departmentId: '',
      locationId: '',
      title: '',
      body: '',
    });
    setMessage(t('collaboration.announcementPublished'));
    await loadData();
  }

  async function createAnnouncementTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    const path = editingAnnouncementTemplateId
      ? `/collaboration/announcement-templates/${editingAnnouncementTemplateId}`
      : '/collaboration/announcement-templates';

    await apiRequest<AnnouncementTemplateItem>(path, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        audience: announcementTemplateDraft.audience,
        groupId: announcementTemplateDraft.audience === 'GROUP' ? announcementTemplateDraft.groupId || undefined : undefined,
        targetEmployeeId:
          announcementTemplateDraft.audience === 'EMPLOYEE'
            ? announcementTemplateDraft.targetEmployeeId || undefined
            : undefined,
        departmentId:
          announcementTemplateDraft.audience === 'DEPARTMENT'
            ? announcementTemplateDraft.departmentId || undefined
            : undefined,
        locationId:
          announcementTemplateDraft.audience === 'LOCATION'
            ? announcementTemplateDraft.locationId || undefined
            : undefined,
        title: announcementTemplateDraft.title,
        body: announcementTemplateDraft.body,
        frequency: announcementTemplateDraft.frequency,
        weekDays:
          announcementTemplateDraft.frequency === 'WEEKLY' ? announcementTemplateDraft.weekDays : undefined,
        dayOfMonth:
          announcementTemplateDraft.frequency === 'MONTHLY'
            ? Number(announcementTemplateDraft.dayOfMonth)
            : undefined,
        startDate: announcementTemplateDraft.startDate,
        endDate: announcementTemplateDraft.endDate || undefined,
        publishTimeLocal: announcementTemplateDraft.publishTimeLocal || undefined,
        isPinned: announcementTemplateDraft.isPinned,
      }),
    });

    resetAnnouncementTemplateDraft();
    setMessage(
      editingAnnouncementTemplateId
        ? t('collaboration.announcementTemplateUpdated')
        : t('collaboration.announcementTemplateCreated'),
    );
    await loadData();
  }

  async function runDueAnnouncementTemplatesNow() {
    const session = getSession();
    if (!session) return;

    const result = await apiRequest<AnnouncementTemplateRunResponse>('/collaboration/announcement-templates/run-due', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({}),
    });

    setMessage(`${t('collaboration.announcementTemplateUpdated')} ${result.generatedCount}`);
    await loadData();
  }

  async function toggleAnnouncementTemplate(templateId: string, isActive: boolean) {
    const session = getSession();
    if (!session) return;

    await apiRequest<AnnouncementTemplateItem>(`/collaboration/announcement-templates/${templateId}/toggle`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ isActive }),
    });

    setMessage(t('collaboration.announcementTemplateUpdated'));
    await loadData();
  }

  async function deleteAnnouncementTemplate(templateId: string) {
    const session = getSession();
    if (!session) return;

    await apiRequest(`/collaboration/announcement-templates/${templateId}/delete`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({}),
    });

    if (editingAnnouncementTemplateId === templateId) {
      resetAnnouncementTemplateDraft();
    }

    setMessage(t('collaboration.announcementTemplateDeleted'));
    await loadData();
  }

  async function createChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    const chat = await apiRequest<ChatThreadItem>('/collaboration/chats', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        employeeId: chatDraft.mode === 'direct' ? chatDraft.employeeId || undefined : undefined,
        groupId: chatDraft.mode === 'group' ? chatDraft.groupId || undefined : undefined,
        title: chatDraft.title || undefined,
      }),
    });

    setSelectedChatId(chat.id);
    setChatDraft({
      mode: 'direct',
      employeeId: '',
      groupId: '',
      title: '',
    });
    setMessage(t('collaboration.chatOpened'));
    await loadData();
  }

  async function sendChatMessage() {
    const session = getSession();
    if (!session || !selectedChatId || !chatMessageDraft.trim()) return;

    await apiRequest(`/collaboration/chats/${selectedChatId}/messages`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ body: chatMessageDraft.trim() }),
    });

    setChatMessageDraft('');
    await loadData();
  }

  async function remindTask(taskId: string) {
    const session = getSession();
    if (!session) return;

    await apiRequest(`/collaboration/tasks/${taskId}/remind`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({}),
    });

    setMessage(t('collaboration.remindersSent'));
    await loadData();
  }

  async function remindOverdueTasks() {
    const session = getSession();
    if (!session) return;

    await apiRequest('/collaboration/tasks/remind-overdue', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        groupId: taskBoardFilters.groupId || undefined,
        departmentId: taskBoardFilters.departmentId || undefined,
        locationId: taskBoardFilters.locationId || undefined,
      }),
    });

    setMessage(t('collaboration.remindersSent'));
    await loadData();
  }

  async function runDueTemplatesNow() {
    const session = getSession();
    if (!session) return;

    const result = await apiRequest<TaskTemplateRunResponse>('/collaboration/task-templates/run-due', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({}),
    });

    setMessage(`${t('collaboration.templateUpdated')} ${result.generatedCount}`);
    await loadData();
  }

  async function toggleTemplate(templateId: string, isActive: boolean) {
    const session = getSession();
    if (!session) return;

    await apiRequest<TaskTemplateItem>(`/collaboration/task-templates/${templateId}/toggle`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({ isActive }),
    });

    setMessage(t('collaboration.templateUpdated'));
    await loadData();
  }

  async function deleteTemplate(templateId: string) {
    const session = getSession();
    if (!session) return;

    await apiRequest(`/collaboration/task-templates/${templateId}/delete`, {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({}),
    });

    if (editingTemplateId === templateId) {
      resetTemplateDraft();
    }

    setMessage(t('collaboration.templateUpdated'));
    await loadData();
  }

  async function saveAutomationPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    const formData = new FormData(event.currentTarget);
    const nextPolicy = await apiRequest<TaskAutomationPolicy>('/collaboration/automation/policy', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({
        reminderLeadDays: Number(formData.get('reminderLeadDays')),
        reminderRepeatHours: Number(formData.get('reminderRepeatHours')),
        escalationDelayDays: Number(formData.get('escalationDelayDays')),
        escalateToManager: formData.get('escalateToManager') === 'on',
        notifyAssignee: formData.get('notifyAssignee') === 'on',
        sendChatMessages: formData.get('sendChatMessages') === 'on',
      }),
    });

    setAutomationPolicy(nextPolicy);
    setMessage(t('collaboration.automationSaved'));
  }

  async function runAutomationNow() {
    const session = getSession();
    if (!session) return;

    const result = await apiRequest<TaskAutomationRunResponse>('/collaboration/automation/run', {
      method: 'POST',
      token: session.accessToken,
      body: JSON.stringify({}),
    });

    setMessage(
      `${t('collaboration.automationRun')} reminders: ${result.reminderCount}, escalations: ${result.escalationCount}.`,
    );
    await loadData();
  }

  const selectedChat = chats.find((chat) => chat.id === selectedChatId) ?? null;

  return (
    <AdminShell>
      <main className="page-shell section-stack">
        <section className="section-header">
          <span className="eyebrow">{t('nav.collaboration')}</span>
          <h1>{t('collaboration.title')}</h1>
          <p>{t('collaboration.subtitle')}</p>
        </section>

        {message ? <div className="inline-note">{message}</div> : null}

        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="section-kicker">{t('collaboration.analyticsTitle')}</span>
              <h2>{t('collaboration.analyticsTitle')}</h2>
            </div>
            <div className="segmented-actions">
              <span>{t('collaboration.analyticsWindow')}</span>
              <button className={windowDays === 7 ? 'solid-button' : 'ghost-button'} onClick={() => setWindowDays(7)} type="button">
                {t('collaboration.last7Days')}
              </button>
              <button className={windowDays === 30 ? 'solid-button' : 'ghost-button'} onClick={() => setWindowDays(30)} type="button">
                {t('collaboration.last30Days')}
              </button>
              <button className={windowDays === 90 ? 'solid-button' : 'ghost-button'} onClick={() => setWindowDays(90)} type="button">
                {t('collaboration.last90Days')}
              </button>
            </div>
          </div>
          <div className="hero-grid">
            <article className="metric-card metric-card--accent">
              <span className="metric-label">{t('collaboration.completionRate')}</span>
              <strong className="metric-value">{analytics ? formatPercent(analytics.summary.completionRate) : '—'}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">{t('collaboration.overdueTasks')}</span>
              <strong className="metric-value">{analytics?.summary.overdueTasks ?? 0}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">{t('collaboration.averageCompletionHours')}</span>
              <strong className="metric-value">{analytics ? formatHours(analytics.summary.averageCompletionHours) : '—'}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">{t('collaboration.checklistRate')}</span>
              <strong className="metric-value">{analytics ? formatPercent(analytics.summary.averageChecklistCompletionRate) : '—'}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">{t('collaboration.urgentOpenTasks')}</span>
              <strong className="metric-value">{analytics?.summary.urgentOpenTasks ?? 0}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">{t('collaboration.slaRiskTasks')}</span>
              <strong className="metric-value">{analytics?.summary.slaRiskTasks ?? 0}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">{t('collaboration.slaBreachedTasks')}</span>
              <strong className="metric-value">{analytics?.summary.slaBreachedTasks ?? 0}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">{t('collaboration.groupsCount')}</span>
              <strong className="metric-value">{analytics?.summary.groupsCount ?? 0}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">{t('collaboration.activeChats')}</span>
              <strong className="metric-value">{analytics?.summary.activeChats ?? 0}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">{t('collaboration.publishedAnnouncements')}</span>
              <strong className="metric-value">{analytics?.summary.announcementsPublished ?? 0}</strong>
            </article>
          </div>
        </section>

        <section className="content-grid employees-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.employeeLeaderboard')}</span>
                <h2>{t('collaboration.employeeLeaderboard')}</h2>
              </div>
            </div>
            {analytics?.employeePerformance.length ? (
              <div className="table-list">
                {analytics.employeePerformance.map((item) => (
                  <div className="table-row table-row-collaboration-leaderboard" key={item.employee?.id ?? `${item.totalTasks}`}>
                    <div>
                      <strong>{item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : '—'}</strong>
                      <p>{item.employee?.employeeNumber ?? '—'}</p>
                    </div>
                    <div>
                      <strong>{formatPercent(item.completionRate)}</strong>
                      <p>{t('collaboration.completionRate')}</p>
                    </div>
                    <div>
                      <strong>{item.completedTasks}/{item.totalTasks}</strong>
                      <p>{t('collaboration.doneTasks')}</p>
                    </div>
                    <div>
                      <strong>{item.overdueTasks}</strong>
                      <p>{t('collaboration.overdueTasks')}</p>
                    </div>
                    <div>
                      <strong>{formatHours(item.averageCompletionHours)}</strong>
                      <p>{t('collaboration.averageCompletionHours')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="empty-state">{t('collaboration.noTasks')}</div>}
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.departmentPerformance')}</span>
                <h2>{t('collaboration.departmentPerformance')}</h2>
              </div>
            </div>
            {analytics?.departmentPerformance.length ? (
              <div className="table-list">
                {analytics.departmentPerformance.map((item) => (
                  <div className="table-row table-row-collaboration-department" key={item.department.id}>
                    <div>
                      <strong>{item.department.name}</strong>
                      <p>{item.completedTasks}/{item.totalTasks}</p>
                    </div>
                    <div>
                      <strong>{formatPercent(item.completionRate)}</strong>
                      <p>{t('collaboration.completionRate')}</p>
                    </div>
                    <div>
                      <strong>{item.overdueTasks}</strong>
                      <p>{t('collaboration.overdueTasks')}</p>
                    </div>
                    <div>
                      <strong>{formatHours(item.averageCompletionHours)}</strong>
                      <p>{t('collaboration.averageCompletionHours')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="empty-state">{t('collaboration.noTasks')}</div>}
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.overdueBoard')}</span>
                <h2>{t('collaboration.overdueBoard')}</h2>
              </div>
            </div>
            {analytics ? (
              <div className="section-stack">
                <div>
                  <span className="section-kicker">{t('collaboration.overdueBoard')}</span>
                  {renderTaskSummary(analytics.deadlineBoard.overdue, t('collaboration.noDeadlineTasks'))}
                </div>
                <div>
                  <span className="section-kicker">{t('collaboration.dueSoon')}</span>
                  {renderTaskSummary(analytics.deadlineBoard.dueSoon, t('collaboration.noDeadlineTasks'))}
                </div>
                <div>
                  <span className="section-kicker">{t('collaboration.urgentBoard')}</span>
                  {renderTaskSummary(analytics.deadlineBoard.urgentOpen, t('collaboration.noDeadlineTasks'))}
                </div>
              </div>
            ) : <div className="empty-state">{t('collaboration.noTasks')}</div>}
          </article>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="section-kicker">{t('collaboration.automationTitle')}</span>
              <h2>{t('collaboration.automationTitle')}</h2>
              <p>{t('collaboration.automationSubtitle')}</p>
            </div>
            <button className="solid-button" onClick={() => void runAutomationNow()} type="button">
              {t('collaboration.runAutomationNow')}
            </button>
          </div>
          {automationPolicy ? (
            <form className="form-grid" key={automationPolicy.updatedAt} onSubmit={(event) => void saveAutomationPolicy(event)}>
              <label>
                <span className="section-kicker">{t('collaboration.reminderLeadDays')}</span>
                <input defaultValue={automationPolicy.reminderLeadDays} min={0} name="reminderLeadDays" type="number" />
              </label>
              <label>
                <span className="section-kicker">{t('collaboration.reminderRepeatHours')}</span>
                <input defaultValue={automationPolicy.reminderRepeatHours} min={1} name="reminderRepeatHours" type="number" />
              </label>
              <label>
                <span className="section-kicker">{t('collaboration.escalationDelayDays')}</span>
                <input defaultValue={automationPolicy.escalationDelayDays} min={0} name="escalationDelayDays" type="number" />
              </label>
              <label className="action-row">
                <input defaultChecked={automationPolicy.escalateToManager} name="escalateToManager" type="checkbox" />
                <span>{t('collaboration.escalateToManager')}</span>
              </label>
              <label className="action-row">
                <input defaultChecked={automationPolicy.notifyAssignee} name="notifyAssignee" type="checkbox" />
                <span>{t('collaboration.notifyAssignee')}</span>
              </label>
              <label className="action-row">
                <input defaultChecked={automationPolicy.sendChatMessages} name="sendChatMessages" type="checkbox" />
                <span>{t('collaboration.sendChatMessages')}</span>
              </label>
              <button className="ghost-button" type="submit">{t('collaboration.saveAutomationPolicy')}</button>
            </form>
          ) : <div className="empty-state">{t('common.noData')}</div>}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="section-kicker">{t('collaboration.taskBoardTitle')}</span>
              <h2>{t('collaboration.taskBoardTitle')}</h2>
              <p>{t('collaboration.taskBoardSubtitle')}</p>
            </div>
            <button className="solid-button" onClick={() => void remindOverdueTasks()} type="button">
              {t('collaboration.bulkRemindOverdue')}
            </button>
          </div>
          <div className="form-grid">
            <input
              onChange={(event) => setTaskBoardFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder={t('collaboration.taskSearch')}
              value={taskBoardFilters.search}
            />
            <AppSelectField
              value={taskBoardFilters.status}
              emptyLabel={t('collaboration.allStatuses')}
              onValueChange={(value) => setTaskBoardFilters((current) => ({ ...current, status: value }))}
              options={[
                { value: 'TODO', label: 'TODO' },
                { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
                { value: 'DONE', label: 'DONE' },
                { value: 'CANCELLED', label: 'CANCELLED' },
              ]}
            />
            <AppSelectField
              value={taskBoardFilters.priority}
              emptyLabel={t('collaboration.allPriorities')}
              onValueChange={(value) => setTaskBoardFilters((current) => ({ ...current, priority: value }))}
              options={[
                { value: 'LOW', label: 'LOW' },
                { value: 'MEDIUM', label: 'MEDIUM' },
                { value: 'HIGH', label: 'HIGH' },
                { value: 'URGENT', label: 'URGENT' },
              ]}
            />
            <AppSelectField
              value={taskBoardFilters.groupId}
              emptyLabel={t('collaboration.assignToGroup')}
              onValueChange={(value) => setTaskBoardFilters((current) => ({ ...current, groupId: value }))}
              options={(overview?.groups ?? []).map((group) => ({ value: group.id, label: group.name }))}
            />
            <AppSelectField
              value={taskBoardFilters.assigneeEmployeeId}
              emptyLabel={t('collaboration.assignToEmployee')}
              onValueChange={(value) => setTaskBoardFilters((current) => ({ ...current, assigneeEmployeeId: value }))}
              options={employees.map((employee) => ({ value: employee.id, label: `${employee.firstName} ${employee.lastName}` }))}
            />
            <AppSelectField
              value={taskBoardFilters.departmentId}
              emptyLabel={t('organization.departments')}
              onValueChange={(value) => setTaskBoardFilters((current) => ({ ...current, departmentId: value }))}
              options={departments.map((department) => ({ value: department.id, label: department.name }))}
            />
            <AppSelectField
              value={taskBoardFilters.locationId}
              emptyLabel={t('organization.locations')}
              onValueChange={(value) => setTaskBoardFilters((current) => ({ ...current, locationId: value }))}
              options={locations.map((location) => ({ value: location.id, label: location.name }))}
            />
            <label className="action-row">
              <input
                checked={taskBoardFilters.onlyOverdue}
                onChange={(event) => setTaskBoardFilters((current) => ({ ...current, onlyOverdue: event.target.checked }))}
                type="checkbox"
              />
              <span>{t('collaboration.onlyOverdue')}</span>
            </label>
          </div>
          <div className="hero-grid">
            <article className="metric-card">
              <span className="metric-label">{t('collaboration.totalTasks')}</span>
              <strong className="metric-value">{taskBoard?.totals.total ?? 0}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">{t('collaboration.overdueTasks')}</span>
              <strong className="metric-value">{taskBoard?.totals.overdue ?? 0}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">{t('collaboration.inProgressTasks')}</span>
              <strong className="metric-value">{taskBoard?.totals.active ?? 0}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">{t('collaboration.doneTasks')}</span>
              <strong className="metric-value">{taskBoard?.totals.done ?? 0}</strong>
            </article>
          </div>
          {taskBoard?.tasks.length ? (
            <div className="section-stack">
              {taskBoard.tasks.map((task) => (
                <article className="mini-panel" key={task.id}>
                  <div className="panel-header">
                    <div>
                      <span className="section-kicker">{task.priority}</span>
                      <h3>{getTaskTitle(task)}</h3>
                    </div>
                    <span className="status-chip">{task.status}</span>
                  </div>
                  <div className="detail-list">
                    <div className="detail-row">
                      <span>{t('collaboration.assignToEmployee')}</span>
                      <strong>{task.assigneeEmployee ? `${task.assigneeEmployee.firstName} ${task.assigneeEmployee.lastName}` : '—'}</strong>
                    </div>
                    <div className="detail-row">
                      <span>{t('organization.departments')}</span>
                      <strong>{task.assigneeEmployee?.department?.name ?? '—'}</strong>
                    </div>
                    <div className="detail-row">
                      <span>{t('organization.locations')}</span>
                      <strong>{task.assigneeEmployee?.primaryLocation?.name ?? '—'}</strong>
                    </div>
                    <div className="detail-row">
                      <span>{t('collaboration.dueAt')}</span>
                      <strong>{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : '—'}</strong>
                    </div>
                  </div>
                  <div className="action-stack action-stack-inline">
                    <button className="ghost-button" onClick={() => void remindTask(task.id)} type="button">
                      {t('collaboration.remindAssignee')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="empty-state">{t('collaboration.noTasks')}</div>}
        </section>

        <section className="content-grid employees-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.groupsTitle')}</span>
                <h2>{t('collaboration.createGroup')}</h2>
              </div>
            </div>
            <form className="form-grid" onSubmit={(event) => void createGroup(event)}>
              <input onChange={(event) => setGroupDraft((current) => ({ ...current, name: event.target.value }))} placeholder={t('collaboration.groupName')} required value={groupDraft.name} />
              <input onChange={(event) => setGroupDraft((current) => ({ ...current, description: event.target.value }))} placeholder={t('collaboration.groupDescription')} value={groupDraft.description} />
              <div className="section-stack compact-stack">
                <span className="section-kicker">{t('collaboration.members')}</span>
                {employees.map((employee) => (
                  <label className="action-row" key={employee.id}>
                    <input
                      checked={groupDraft.memberEmployeeIds.includes(employee.id)}
                      onChange={() => setGroupDraft((current) => ({ ...current, memberEmployeeIds: toggleEmployeeSelection(current.memberEmployeeIds, employee.id) }))}
                      type="checkbox"
                    />
                    <span>{employee.firstName} {employee.lastName}</span>
                  </label>
                ))}
              </div>
              <button className="solid-button" type="submit">{t('collaboration.saveGroup')}</button>
            </form>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.taskTitle')}</span>
                <h2>{t('collaboration.createTask')}</h2>
              </div>
            </div>
            <form className="form-grid" onSubmit={(event) => void createTask(event)}>
              <input onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))} placeholder={t('requests.titleField')} required value={taskDraft.title} />
              <input onChange={(event) => setTaskDraft((current) => ({ ...current, description: event.target.value }))} placeholder={t('collaboration.taskTitle')} value={taskDraft.description} />
              <div className="segmented-actions">
                <button className={taskDraft.targetMode === 'group' ? 'solid-button' : 'ghost-button'} onClick={() => setTaskDraft((current) => ({ ...current, targetMode: 'group' }))} type="button">{t('collaboration.assignToGroup')}</button>
                <button className={taskDraft.targetMode === 'employee' ? 'solid-button' : 'ghost-button'} onClick={() => setTaskDraft((current) => ({ ...current, targetMode: 'employee' }))} type="button">{t('collaboration.assignToEmployee')}</button>
              </div>
              {taskDraft.targetMode === 'group' ? (
                <AppSelectField
                  value={taskDraft.groupId}
                  emptyLabel={t('collaboration.assignToGroup')}
                  onValueChange={(value) => setTaskDraft((current) => ({ ...current, groupId: value }))}
                  options={(overview?.groups ?? []).map((group) => ({ value: group.id, label: group.name }))}
                />
              ) : (
                <AppSelectField
                  value={taskDraft.assigneeEmployeeId}
                  emptyLabel={t('collaboration.assignToEmployee')}
                  onValueChange={(value) => setTaskDraft((current) => ({ ...current, assigneeEmployeeId: value }))}
                  options={employees.map((employee) => ({ value: employee.id, label: `${employee.firstName} ${employee.lastName}` }))}
                />
              )}
              <AppSelectField
                value={taskDraft.priority}
                onValueChange={(value) => setTaskDraft((current) => ({ ...current, priority: value }))}
                options={[
                  { value: 'LOW', label: 'LOW' },
                  { value: 'MEDIUM', label: 'MEDIUM' },
                  { value: 'HIGH', label: 'HIGH' },
                  { value: 'URGENT', label: 'URGENT' },
                ]}
              />
              <input onChange={(event) => setTaskDraft((current) => ({ ...current, dueAt: event.target.value }))} placeholder={t('collaboration.dueAt')} type="date" value={taskDraft.dueAt} />
              <label className="inline-flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
                <input
                  checked={taskDraft.requiresPhoto}
                  onChange={(event) => setTaskDraft((current) => ({ ...current, requiresPhoto: event.target.checked }))}
                  type="checkbox"
                />
                <span>Требуется фото-подтверждение</span>
              </label>
              <div className="section-stack compact-stack">
                <span className="section-kicker">{t('collaboration.checklist')}</span>
                {taskDraft.checklist.map((item, index) => (
                  <input key={`${index}-${item}`} onChange={(event) => setTaskDraft((current) => ({ ...current, checklist: current.checklist.map((value, itemIndex) => itemIndex === index ? event.target.value : value) }))} placeholder={`${t('collaboration.checklist')} #${index + 1}`} value={item} />
                ))}
                <button className="ghost-button" onClick={() => setTaskDraft((current) => ({ ...current, checklist: [...current.checklist, ''] }))} type="button">{t('collaboration.addChecklistItem')}</button>
              </div>
              <button className="solid-button" type="submit">{t('collaboration.createTask')}</button>
            </form>
          </article>
        </section>

        <section className="content-grid employees-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.recurringTitle')}</span>
                <h2>{editingTemplateId ? t('collaboration.editTemplate') : t('collaboration.createTemplate')}</h2>
                <p>{t('collaboration.recurringSubtitle')}</p>
              </div>
              <button className="solid-button" onClick={() => void runDueTemplatesNow()} type="button">
                {t('collaboration.runTemplatesNow')}
              </button>
            </div>
            <form className="form-grid" onSubmit={(event) => void createTaskTemplate(event)}>
              <input
                onChange={(event) => setTemplateDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder={t('requests.titleField')}
                required
                value={templateDraft.title}
              />
              <input
                onChange={(event) => setTemplateDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder={t('collaboration.taskTitle')}
                value={templateDraft.description}
              />
              <div className="segmented-actions">
                <button
                  className={templateDraft.targetMode === 'group' ? 'solid-button' : 'ghost-button'}
                  onClick={() => setTemplateDraft((current) => ({ ...current, targetMode: 'group' }))}
                  type="button"
                >
                  {t('collaboration.assignToGroup')}
                </button>
                <button
                  className={templateDraft.targetMode === 'employee' ? 'solid-button' : 'ghost-button'}
                  onClick={() => setTemplateDraft((current) => ({ ...current, targetMode: 'employee' }))}
                  type="button"
                >
                  {t('collaboration.assignToEmployee')}
                </button>
                <button
                  className={templateDraft.targetMode === 'department' ? 'solid-button' : 'ghost-button'}
                  onClick={() => setTemplateDraft((current) => ({ ...current, targetMode: 'department' }))}
                  type="button"
                >
                  {t('collaboration.assignToDepartment')}
                </button>
                <button
                  className={templateDraft.targetMode === 'location' ? 'solid-button' : 'ghost-button'}
                  onClick={() => setTemplateDraft((current) => ({ ...current, targetMode: 'location' }))}
                  type="button"
                >
                  {t('collaboration.assignToLocation')}
                </button>
              </div>
              {templateDraft.targetMode === 'group' ? (
                <AppSelectField
                  value={templateDraft.groupId}
                  emptyLabel={t('collaboration.assignToGroup')}
                  onValueChange={(value) => setTemplateDraft((current) => ({ ...current, groupId: value }))}
                  options={(overview?.groups ?? []).map((group) => ({ value: group.id, label: group.name }))}
                />
              ) : templateDraft.targetMode === 'employee' ? (
                <AppSelectField
                  value={templateDraft.assigneeEmployeeId}
                  emptyLabel={t('collaboration.assignToEmployee')}
                  onValueChange={(value) => setTemplateDraft((current) => ({ ...current, assigneeEmployeeId: value }))}
                  options={employees.map((employee) => ({ value: employee.id, label: `${employee.firstName} ${employee.lastName}` }))}
                />
              ) : templateDraft.targetMode === 'department' ? (
                <AppSelectField
                  value={templateDraft.departmentId}
                  emptyLabel={t('collaboration.assignToDepartment')}
                  onValueChange={(value) => setTemplateDraft((current) => ({ ...current, departmentId: value }))}
                  options={departments.map((department) => ({ value: department.id, label: department.name }))}
                />
              ) : (
                <AppSelectField
                  value={templateDraft.locationId}
                  emptyLabel={t('collaboration.assignToLocation')}
                  onValueChange={(value) => setTemplateDraft((current) => ({ ...current, locationId: value }))}
                  options={locations.map((location) => ({ value: location.id, label: location.name }))}
                />
              )}
              <AppSelectField
                value={templateDraft.priority}
                onValueChange={(value) => setTemplateDraft((current) => ({ ...current, priority: value }))}
                options={[
                  { value: 'LOW', label: 'LOW' },
                  { value: 'MEDIUM', label: 'MEDIUM' },
                  { value: 'HIGH', label: 'HIGH' },
                  { value: 'URGENT', label: 'URGENT' },
                ]}
              />
              <label className="inline-flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
                <input
                  checked={templateDraft.requiresPhoto}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({ ...current, requiresPhoto: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>Требуется фото-подтверждение</span>
              </label>
              <label className="inline-flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
                <input
                  checked={templateDraft.expandOnDemand}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({ ...current, expandOnDemand: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>Разворачивать по дням без создания копий</span>
              </label>
              <AppSelectField
                value={templateDraft.frequency}
                onValueChange={(value) => setTemplateDraft((current) => ({ ...current, frequency: value }))}
                options={[
                  { value: 'DAILY', label: t('collaboration.daily') },
                  { value: 'WEEKLY', label: t('collaboration.weekly') },
                  { value: 'MONTHLY', label: t('collaboration.monthly') },
                ]}
              />
              {templateDraft.frequency === 'WEEKLY' ? (
                <div className="section-stack compact-stack">
                  <span className="section-kicker">{t('collaboration.weekdays')}</span>
                  <div className="action-stack action-stack-inline">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => (
                      <button
                        className={templateDraft.weekDays.includes(index) ? 'solid-button' : 'ghost-button'}
                        key={label}
                        onClick={() => setTemplateDraft((current) => ({ ...current, weekDays: toggleWeekday(current.weekDays, index) }))}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {templateDraft.frequency === 'MONTHLY' ? (
                <input
                  min={1}
                  max={31}
                  onChange={(event) => setTemplateDraft((current) => ({ ...current, dayOfMonth: event.target.value }))}
                  placeholder={t('collaboration.dayOfMonth')}
                  type="number"
                  value={templateDraft.dayOfMonth}
                />
              ) : null}
              <input
                onChange={(event) => setTemplateDraft((current) => ({ ...current, startDate: event.target.value }))}
                required
                type="date"
                value={templateDraft.startDate}
              />
              <input
                onChange={(event) => setTemplateDraft((current) => ({ ...current, endDate: event.target.value }))}
                type="date"
                value={templateDraft.endDate}
              />
              <input
                min={0}
                onChange={(event) => setTemplateDraft((current) => ({ ...current, dueAfterDays: event.target.value }))}
                placeholder={t('collaboration.dueAfterDays')}
                type="number"
                value={templateDraft.dueAfterDays}
              />
              <input
                onChange={(event) => setTemplateDraft((current) => ({ ...current, dueTimeLocal: event.target.value }))}
                placeholder={t('collaboration.dueTimeLocal')}
                type="time"
                value={templateDraft.dueTimeLocal}
              />
              <div className="section-stack compact-stack">
                <span className="section-kicker">{t('collaboration.checklist')}</span>
                {templateDraft.checklist.map((item, index) => (
                  <input
                    key={`template-${index}-${item}`}
                    onChange={(event) =>
                      setTemplateDraft((current) => ({
                        ...current,
                        checklist: current.checklist.map((value, itemIndex) => itemIndex === index ? event.target.value : value),
                      }))
                    }
                    placeholder={`${t('collaboration.checklist')} #${index + 1}`}
                    value={item}
                  />
                ))}
                <button
                  className="ghost-button"
                  onClick={() => setTemplateDraft((current) => ({ ...current, checklist: [...current.checklist, ''] }))}
                  type="button"
                >
                  {t('collaboration.addChecklistItem')}
                </button>
              </div>
              <div className="action-stack action-stack-inline">
                <button className="solid-button" type="submit">
                  {editingTemplateId ? t('collaboration.editTemplate') : t('collaboration.createTemplate')}
                </button>
                {editingTemplateId ? (
                  <button className="ghost-button" onClick={() => resetTemplateDraft()} type="button">
                    {t('collaboration.cancelEdit')}
                  </button>
                ) : null}
              </div>
            </form>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.recurringTitle')}</span>
                <h2>{t('collaboration.recurringTitle')}</h2>
              </div>
            </div>
            {taskTemplates.length ? (
              <div className="section-stack">
                {taskTemplates.map((template) => (
                  <article className="mini-panel" key={template.id}>
                    <div className="panel-header">
                      <div>
                        <span className="section-kicker">{template.frequency}</span>
                        <h3>{template.title}</h3>
                      </div>
                      <span className={`status-chip ${template.isActive ? '' : 'is-alert'}`}>
                        {template.isActive ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>
                    <div className="detail-list">
                      <div className="detail-row">
                        <span>{t('collaboration.assignToGroup')}</span>
                        <strong>{template.group?.name ?? '—'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>{t('collaboration.assignToEmployee')}</span>
                        <strong>{template.assigneeEmployee ? `${template.assigneeEmployee.firstName} ${template.assigneeEmployee.lastName}` : '—'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>{t('collaboration.dueAfterDays')}</span>
                        <strong>{template.dueAfterDays}</strong>
                      </div>
                      <div className="detail-row">
                        <span>{t('collaboration.created')}</span>
                        <strong>{template.lastGeneratedAt ? new Date(template.lastGeneratedAt).toLocaleString() : '—'}</strong>
                      </div>
                    </div>
                    <div className="action-stack action-stack-inline">
                      <button
                        className="ghost-button"
                        onClick={() => startEditingTemplate(template)}
                        type="button"
                      >
                        {t('collaboration.editTemplate')}
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => void toggleTemplate(template.id, !template.isActive)}
                        type="button"
                      >
                        {template.isActive ? t('collaboration.pauseTemplate') : t('collaboration.activateTemplate')}
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => void deleteTemplate(template.id)}
                        type="button"
                      >
                        {t('collaboration.deleteTemplate')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="empty-state">{t('collaboration.noTasks')}</div>}
          </article>
        </section>

        <section className="content-grid employees-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.announcementsTitle')}</span>
                <h2>{t('collaboration.createAnnouncement')}</h2>
              </div>
            </div>
            <form className="form-grid" onSubmit={(event) => void createAnnouncement(event)}>
              <AppSelectField
                value={announcementDraft.audience}
                onValueChange={(value) => setAnnouncementDraft((current) => ({ ...current, audience: value }))}
                options={[
                  { value: 'ALL', label: t('collaboration.allEmployees') },
                  { value: 'GROUP', label: t('collaboration.assignToGroup') },
                  { value: 'EMPLOYEE', label: t('collaboration.targetEmployee') },
                  { value: 'DEPARTMENT', label: t('collaboration.targetDepartment') },
                  { value: 'LOCATION', label: t('collaboration.targetLocation') },
                ]}
              />
              {announcementDraft.audience === 'GROUP' ? (
                <AppSelectField
                  value={announcementDraft.groupId}
                  emptyLabel={t('collaboration.assignToGroup')}
                  onValueChange={(value) => setAnnouncementDraft((current) => ({ ...current, groupId: value }))}
                  options={(overview?.groups ?? []).map((group) => ({ value: group.id, label: group.name }))}
                />
              ) : null}
              {announcementDraft.audience === 'EMPLOYEE' ? (
                <AppSelectField
                  value={announcementDraft.targetEmployeeId}
                  emptyLabel={t('collaboration.targetEmployee')}
                  onValueChange={(value) => setAnnouncementDraft((current) => ({ ...current, targetEmployeeId: value }))}
                  options={employees.map((employee) => ({ value: employee.id, label: `${employee.firstName} ${employee.lastName}` }))}
                />
              ) : null}
              {announcementDraft.audience === 'DEPARTMENT' ? (
                <AppSelectField
                  value={announcementDraft.departmentId}
                  emptyLabel={t('collaboration.targetDepartment')}
                  onValueChange={(value) => setAnnouncementDraft((current) => ({ ...current, departmentId: value }))}
                  options={departments.map((department) => ({ value: department.id, label: department.name }))}
                />
              ) : null}
              {announcementDraft.audience === 'LOCATION' ? (
                <AppSelectField
                  value={announcementDraft.locationId}
                  emptyLabel={t('collaboration.targetLocation')}
                  onValueChange={(value) => setAnnouncementDraft((current) => ({ ...current, locationId: value }))}
                  options={locations.map((location) => ({ value: location.id, label: location.name }))}
                />
              ) : null}
              <input onChange={(event) => setAnnouncementDraft((current) => ({ ...current, title: event.target.value }))} placeholder={t('requests.titleField')} required value={announcementDraft.title} />
              <textarea onChange={(event) => setAnnouncementDraft((current) => ({ ...current, body: event.target.value }))} placeholder={t('collaboration.announcementsTitle')} rows={5} value={announcementDraft.body} />
              <button className="solid-button" type="submit">{t('collaboration.publishAnnouncement')}</button>
            </form>
          </article>

          <article className="panel panel-large">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.recurringAnnouncementsTitle')}</span>
                <h2>
                  {editingAnnouncementTemplateId
                    ? t('collaboration.editAnnouncementTemplate')
                    : t('collaboration.createAnnouncementTemplate')}
                </h2>
                <p>{t('collaboration.recurringAnnouncementsSubtitle')}</p>
              </div>
              <div className="action-stack action-stack-inline">
                <button className="solid-button" onClick={() => void runDueAnnouncementTemplatesNow()} type="button">
                  {t('collaboration.runAnnouncementTemplatesNow')}
                </button>
                {editingAnnouncementTemplateId ? (
                  <button className="ghost-button" onClick={() => resetAnnouncementTemplateDraft()} type="button">
                    {t('collaboration.cancelEdit')}
                  </button>
                ) : null}
              </div>
            </div>
            <form className="form-grid" onSubmit={(event) => void createAnnouncementTemplate(event)}>
              <AppSelectField
                value={announcementTemplateDraft.audience}
                onValueChange={(value) =>
                  setAnnouncementTemplateDraft((current) => ({ ...current, audience: value }))
                }
                options={[
                  { value: 'ALL', label: t('collaboration.allEmployees') },
                  { value: 'GROUP', label: t('collaboration.assignToGroup') },
                  { value: 'EMPLOYEE', label: t('collaboration.targetEmployee') },
                  { value: 'DEPARTMENT', label: t('collaboration.targetDepartment') },
                  { value: 'LOCATION', label: t('collaboration.targetLocation') },
                ]}
              />
              {announcementTemplateDraft.audience === 'GROUP' ? (
                <AppSelectField
                  value={announcementTemplateDraft.groupId}
                  emptyLabel={t('collaboration.assignToGroup')}
                  onValueChange={(value) =>
                    setAnnouncementTemplateDraft((current) => ({ ...current, groupId: value }))
                  }
                  options={(overview?.groups ?? []).map((group) => ({ value: group.id, label: group.name }))}
                />
              ) : null}
              {announcementTemplateDraft.audience === 'EMPLOYEE' ? (
                <AppSelectField
                  value={announcementTemplateDraft.targetEmployeeId}
                  emptyLabel={t('collaboration.targetEmployee')}
                  onValueChange={(value) =>
                    setAnnouncementTemplateDraft((current) => ({ ...current, targetEmployeeId: value }))
                  }
                  options={employees.map((employee) => ({ value: employee.id, label: `${employee.firstName} ${employee.lastName}` }))}
                />
              ) : null}
              {announcementTemplateDraft.audience === 'DEPARTMENT' ? (
                <AppSelectField
                  value={announcementTemplateDraft.departmentId}
                  emptyLabel={t('collaboration.targetDepartment')}
                  onValueChange={(value) =>
                    setAnnouncementTemplateDraft((current) => ({ ...current, departmentId: value }))
                  }
                  options={departments.map((department) => ({ value: department.id, label: department.name }))}
                />
              ) : null}
              {announcementTemplateDraft.audience === 'LOCATION' ? (
                <AppSelectField
                  value={announcementTemplateDraft.locationId}
                  emptyLabel={t('collaboration.targetLocation')}
                  onValueChange={(value) =>
                    setAnnouncementTemplateDraft((current) => ({ ...current, locationId: value }))
                  }
                  options={locations.map((location) => ({ value: location.id, label: location.name }))}
                />
              ) : null}
              <input
                onChange={(event) =>
                  setAnnouncementTemplateDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder={t('requests.titleField')}
                required
                value={announcementTemplateDraft.title}
              />
              <textarea
                onChange={(event) =>
                  setAnnouncementTemplateDraft((current) => ({ ...current, body: event.target.value }))
                }
                placeholder={t('collaboration.announcementsTitle')}
                rows={4}
                value={announcementTemplateDraft.body}
              />
              <AppSelectField
                value={announcementTemplateDraft.frequency}
                onValueChange={(value) =>
                  setAnnouncementTemplateDraft((current) => ({ ...current, frequency: value }))
                }
                options={[
                  { value: 'DAILY', label: t('collaboration.daily') },
                  { value: 'WEEKLY', label: t('collaboration.weekly') },
                  { value: 'MONTHLY', label: t('collaboration.monthly') },
                ]}
              />
              {announcementTemplateDraft.frequency === 'WEEKLY' ? (
                <div className="section-stack compact-stack">
                  <span className="section-kicker">{t('collaboration.weekdays')}</span>
                  <div className="action-stack action-stack-inline">
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                      <button
                        className={
                          announcementTemplateDraft.weekDays.includes(day) ? 'solid-button' : 'ghost-button'
                        }
                        key={day}
                        onClick={() =>
                          setAnnouncementTemplateDraft((current) => ({
                            ...current,
                            weekDays: toggleWeekday(current.weekDays, day),
                          }))
                        }
                        type="button"
                      >
                        {day === 0 ? 'Sun' : day === 6 ? 'Sat' : `D${day}`}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {announcementTemplateDraft.frequency === 'MONTHLY' ? (
                <input
                  min="1"
                  max="31"
                  onChange={(event) =>
                    setAnnouncementTemplateDraft((current) => ({ ...current, dayOfMonth: event.target.value }))
                  }
                  placeholder={t('collaboration.dayOfMonth')}
                  type="number"
                  value={announcementTemplateDraft.dayOfMonth}
                />
              ) : null}
              <input
                onChange={(event) =>
                  setAnnouncementTemplateDraft((current) => ({ ...current, startDate: event.target.value }))
                }
                required
                type="date"
                value={announcementTemplateDraft.startDate}
              />
              <input
                onChange={(event) =>
                  setAnnouncementTemplateDraft((current) => ({ ...current, endDate: event.target.value }))
                }
                type="date"
                value={announcementTemplateDraft.endDate}
              />
              <input
                onChange={(event) =>
                  setAnnouncementTemplateDraft((current) => ({ ...current, publishTimeLocal: event.target.value }))
                }
                placeholder={t('collaboration.publishTimeLocal')}
                type="time"
                value={announcementTemplateDraft.publishTimeLocal}
              />
              <label className="action-row">
                <input
                  checked={announcementTemplateDraft.isPinned}
                  onChange={(event) =>
                    setAnnouncementTemplateDraft((current) => ({ ...current, isPinned: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>PINNED</span>
              </label>
              <button className="solid-button" type="submit">
                {editingAnnouncementTemplateId
                  ? t('collaboration.editAnnouncementTemplate')
                  : t('collaboration.createAnnouncementTemplate')}
              </button>
            </form>

            {announcementTemplates.length ? (
              <div className="section-stack">
                {announcementTemplates.map((template) => (
                  <article className="mini-panel" key={template.id}>
                    <div className="panel-header">
                      <div>
                        <span className="section-kicker">
                          {template.audience} · {template.frequency}
                        </span>
                        <h3>{template.title}</h3>
                      </div>
                      <span className="status-chip">{template.isActive ? 'ACTIVE' : 'PAUSED'}</span>
                    </div>
                    <p>{template.body}</p>
                    <div className="detail-list">
                      <div className="detail-row">
                        <span>{t('collaboration.publishTimeLocal')}</span>
                        <strong>{template.publishTimeLocal ?? '—'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>{t('collaboration.created')}</span>
                        <strong>{new Date(template.startDate).toLocaleDateString()}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Last run</span>
                        <strong>
                          {template.lastPublishedAt
                            ? new Date(template.lastPublishedAt).toLocaleString()
                            : '—'}
                        </strong>
                      </div>
                    </div>
                    <div className="action-stack action-stack-inline">
                      <button
                        className="ghost-button"
                        onClick={() => startEditingAnnouncementTemplate(template)}
                        type="button"
                      >
                        {t('collaboration.editAnnouncementTemplate')}
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => void toggleAnnouncementTemplate(template.id, !template.isActive)}
                        type="button"
                      >
                        {template.isActive ? t('collaboration.pauseTemplate') : t('collaboration.activateTemplate')}
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => void deleteAnnouncementTemplate(template.id)}
                        type="button"
                      >
                        {t('collaboration.deleteAnnouncementTemplate')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">{t('collaboration.noAnnouncements')}</div>
            )}
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.chatTitle')}</span>
                <h2>{t('collaboration.createChat')}</h2>
              </div>
            </div>
            <form className="form-grid" onSubmit={(event) => void createChat(event)}>
              <div className="segmented-actions">
                <button className={chatDraft.mode === 'direct' ? 'solid-button' : 'ghost-button'} onClick={() => setChatDraft((current) => ({ ...current, mode: 'direct' }))} type="button">{t('collaboration.directChat')}</button>
                <button className={chatDraft.mode === 'group' ? 'solid-button' : 'ghost-button'} onClick={() => setChatDraft((current) => ({ ...current, mode: 'group' }))} type="button">{t('collaboration.groupChat')}</button>
              </div>
              {chatDraft.mode === 'direct' ? (
                <AppSelectField
                  value={chatDraft.employeeId}
                  emptyLabel={t('collaboration.assignToEmployee')}
                  onValueChange={(value) => setChatDraft((current) => ({ ...current, employeeId: value }))}
                  options={employees.map((employee) => ({ value: employee.id, label: `${employee.firstName} ${employee.lastName}` }))}
                />
              ) : (
                <AppSelectField
                  value={chatDraft.groupId}
                  emptyLabel={t('collaboration.assignToGroup')}
                  onValueChange={(value) => setChatDraft((current) => ({ ...current, groupId: value }))}
                  options={(overview?.groups ?? []).map((group) => ({ value: group.id, label: group.name }))}
                />
              )}
              <input onChange={(event) => setChatDraft((current) => ({ ...current, title: event.target.value }))} placeholder={t('requests.titleField')} value={chatDraft.title} />
              <button className="solid-button" type="submit">{t('collaboration.createChat')}</button>
            </form>
          </article>
        </section>

        <section className="content-grid employees-grid">
          <article className="panel panel-large">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.groupsTitle')}</span>
                <h2>{t('collaboration.groupsTitle')}</h2>
              </div>
            </div>
            {overview?.groups.length ? (
              <div className="section-stack">
                {overview.groups.map((group: WorkGroupItem) => (
                  <article className="mini-panel" key={group.id}>
                    {(() => {
                      const groupAnalytics = analytics?.groupPerformance.find((item) => item.group.id === group.id);

                      return (
                        <>
                    <div className="panel-header">
                      <div>
                        <span className="section-kicker">{group._count?.tasks ?? 0} {t('collaboration.totalTasks')}</span>
                        <h3>{group.name}</h3>
                      </div>
                    </div>
                    {groupAnalytics ? (
                      <div className="detail-list">
                        <div className="detail-row">
                          <span>{t('collaboration.completionRate')}</span>
                          <strong>{formatPercent(groupAnalytics.completionRate)}</strong>
                        </div>
                        <div className="detail-row">
                          <span>{t('collaboration.overdueTasks')}</span>
                          <strong>{groupAnalytics.overdueTasks}</strong>
                        </div>
                        <div className="detail-row">
                          <span>{t('collaboration.averageCompletionHours')}</span>
                          <strong>{formatHours(groupAnalytics.averageCompletionHours)}</strong>
                        </div>
                      </div>
                    ) : null}
                    {group.description ? <p>{group.description}</p> : null}
                    <div className="section-stack compact-stack">
                      {employees.map((employee) => (
                        <label className="action-row" key={`${group.id}-${employee.id}`}>
                          <input checked={(groupMembersDraft[group.id] ?? []).includes(employee.id)} onChange={() => setGroupMembersDraft((current) => ({ ...current, [group.id]: toggleEmployeeSelection(current[group.id] ?? [], employee.id) }))} type="checkbox" />
                          <span>{employee.firstName} {employee.lastName}</span>
                        </label>
                      ))}
                    </div>
                    {groupAnalytics?.members.length ? (
                      <div className="table-list">
                        <span className="section-kicker">{t('collaboration.memberBreakdown')}</span>
                        {groupAnalytics.members.map((member) => (
                          <div className="table-row table-row-collaboration-member" key={member.employee.id}>
                            <div>
                              <strong>{member.employee.firstName} {member.employee.lastName}</strong>
                              <p>{member.employee.employeeNumber}</p>
                            </div>
                            <div>
                              <strong>{member.completedTasks}/{member.totalTasks}</strong>
                              <p>{t('collaboration.doneTasks')}</p>
                            </div>
                            <div>
                              <strong>{formatPercent(member.completionRate)}</strong>
                              <p>{t('collaboration.completionRate')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <button className="ghost-button" onClick={() => void saveGroupMembers(group.id)} type="button">{t('collaboration.saveGroup')}</button>
                        </>
                      );
                    })()}
                  </article>
                ))}
              </div>
            ) : <div className="empty-state">{t('collaboration.noGroups')}</div>}
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.groupPerformance')}</span>
                <h2>{t('collaboration.groupPerformance')}</h2>
              </div>
            </div>
            {analytics?.groupPerformance.length ? (
              <div className="table-list">
                {analytics.groupPerformance.map((item) => (
                  <div className="table-row table-row-collaboration-group" key={item.group.id}>
                    <div>
                      <strong>{item.group.name}</strong>
                      <p>{item.membersCount} {t('collaboration.members')}</p>
                    </div>
                    <div>
                      <strong>{formatPercent(item.completionRate)}</strong>
                      <p>{t('collaboration.completionRate')}</p>
                    </div>
                    <div>
                      <strong>{item.completedTasks}/{item.totalTasks}</strong>
                      <p>{t('collaboration.doneTasks')}</p>
                    </div>
                    <div>
                      <strong>{item.overdueTasks}</strong>
                      <p>{t('collaboration.overdueTasks')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="empty-state">{t('collaboration.noTasks')}</div>}
          </article>
        </section>

        <section className="content-grid employees-grid">
          <article className="panel panel-large">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.recentTasks')}</span>
                <h2>{t('collaboration.recentTasks')}</h2>
              </div>
            </div>
            {overview?.recentTasks.length ? (
              <div className="section-stack">
                {overview.recentTasks.map((task) => (
                  <article className="mini-panel" key={task.id}>
                    <div className="panel-header">
                      <div><span className="section-kicker">{task.priority}</span><h3>{getTaskTitle(task)}</h3></div>
                      <span className="status-chip">{task.status}</span>
                    </div>
                    <div className="detail-list">
                      <div className="detail-row"><span>{t('collaboration.assignToEmployee')}</span><strong>{task.assigneeEmployee?.firstName} {task.assigneeEmployee?.lastName}</strong></div>
                      <div className="detail-row"><span>{t('collaboration.assignToGroup')}</span><strong>{task.group?.name ?? '—'}</strong></div>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="empty-state">{t('collaboration.noTasks')}</div>}
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="section-kicker">{t('collaboration.announcementsTitle')}</span>
                <h2>{t('collaboration.announcementsTitle')}</h2>
              </div>
            </div>
            {announcements.length ? (
              <div className="section-stack">
                {announcements.map((item) => (
                  <article className="mini-panel" key={item.id}>
                    <div className="panel-header">
                      <div><span className="section-kicker">{item.audience}</span><h3>{item.title}</h3></div>
                      {item.isPinned ? <span className="status-chip">PINNED</span> : null}
                    </div>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            ) : <div className="empty-state">{t('collaboration.noAnnouncements')}</div>}
          </article>
        </section>

        <section className="content-grid employees-grid">
          <article className="panel">
            <div className="panel-header">
              <div><span className="section-kicker">{t('collaboration.chatTitle')}</span><h2>{t('collaboration.chatTitle')}</h2></div>
            </div>
            {chats.length ? (
              <div className="section-stack">
                {chats.map((chat) => (
                  <button className="ghost-button" key={chat.id} onClick={() => setSelectedChatId(chat.id)} type="button">
                    {chat.title ?? chat.participants.map((participant) => `${participant.employee.firstName} ${participant.employee.lastName}`).join(', ')}
                    {chat.unreadCount ? ` (${chat.unreadCount})` : ''}
                  </button>
                ))}
              </div>
            ) : <div className="empty-state">{t('collaboration.noChats')}</div>}
          </article>

          <article className="panel panel-large">
            <div className="panel-header">
              <div><span className="section-kicker">{t('collaboration.chatTitle')}</span><h2>{selectedChat?.title ?? selectedChat?.group?.name ?? t('collaboration.noChats')}</h2></div>
            </div>
            {selectedChat ? (
              <div className="section-stack">
                <div className="section-stack compact-stack">
                  {selectedChat.messages.map((item) => (
                    <div className="timeline-item" key={item.id}>
                      <strong>{item.authorEmployee.firstName} {item.authorEmployee.lastName}</strong>
                      <span>{item.body}</span>
                    </div>
                  ))}
                </div>
                <div className="form-grid">
                  <input onChange={(event) => setChatMessageDraft(event.target.value)} placeholder={t('collaboration.messagePlaceholder')} value={chatMessageDraft} />
                  <button className="solid-button" onClick={() => void sendChatMessage()} type="button">{t('collaboration.sendMessage')}</button>
                </div>
              </div>
            ) : <div className="empty-state">{t('collaboration.noChats')}</div>}
          </article>
        </section>
      </main>
    </AdminShell>
  );
}
