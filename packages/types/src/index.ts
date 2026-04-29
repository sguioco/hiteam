export type AttendanceState = 'not_checked_in' | 'checked_in' | 'on_break' | 'checked_out';

export type ManagerKpi = {
  label: string;
  value: string;
  detail: string;
};

export type AttendanceStatusResponse = {
  employeeId: string;
  attendanceState: AttendanceState;
  allowedActions: Array<'check_in' | 'check_out' | 'start_break' | 'end_break'>;
  location: {
    id: string;
    name: string;
    radiusMeters: number;
    latitude: number;
    longitude: number;
  };
  shift: {
    id: string;
    label: string;
    startsAt: string;
    endsAt: string;
    locationName: string;
  } | null;
  nextShift: {
    id: string;
    label: string;
    startsAt: string;
    endsAt: string;
    locationName: string;
  } | null;
  verification: {
    locationRequired: boolean;
    selfieRequired: boolean;
    deviceMustBePrimary: boolean;
  };
  breakPolicy: {
    enabled: boolean;
    companyEnabled: boolean;
    employeeEnabled: boolean;
    defaultBreakIsPaid: boolean;
    maxBreakMinutes: number;
    mandatoryBreakThresholdMinutes: number;
    mandatoryBreakDurationMinutes: number;
    mandatoryBreakDue: boolean;
  };
  activeSession: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    breakMinutes: number;
    paidBreakMinutes: number;
    activeBreak: {
      id: string;
      startedAt: string;
      isPaid: boolean;
    } | null;
  } | null;
};

export type LeaderboardCelebration = {
  kind: 'ARRIVAL_STREAK_BONUS';
  streakDays: 5 | 10 | 20;
  bonusPoints: number;
  monthPoints: number;
};

export type AttendanceActionResponse = {
  eventId?: string;
  sessionId: string;
  result: 'accepted';
  recordedAt: string;
  distanceMeters: number;
  lateMinutes?: number;
  totalMinutes?: number;
  earlyLeaveMinutes?: number;
  breakMinutes?: number;
  paidBreakMinutes?: number;
  breakId?: string;
  isPaid?: boolean;
  leaderboardCelebration?: LeaderboardCelebration | null;
};

export type BiometricPolicyResponse = {
  employeeId: string;
  enrollmentStatus: 'NOT_STARTED' | 'PENDING' | 'ENROLLED' | 'FAILED';
  provider: string;
  rules: {
    enrollmentRequired: boolean;
    livenessRequired: boolean;
    faceMatchRequired: boolean;
    auditEnabled: boolean;
  };
};

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type RequestType =
  | 'LEAVE'
  | 'SICK_LEAVE'
  | 'VACATION_CHANGE'
  | 'UNPAID_LEAVE'
  | 'SHIFT_CHANGE'
  | 'ADVANCE'
  | 'SUPPLY'
  | 'GENERAL';

export type TimeOffBalanceKind = 'VACATION' | 'PERSONAL_DAY_OFF';

export type RequestAttachmentItem = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: string;
  url: string | null;
};

export type TimeOffBalanceSummary = {
  kind: TimeOffBalanceKind;
  allowanceDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
  updatedAt: string | null;
};

export type EmployeeRequestItem = {
  id: string;
  requestType: RequestType;
  status: RequestStatus;
  title: string;
  reason: string | null;
  startsOn: string;
  endsOn: string;
  requestedDays: number;
  relatedRequestId?: string | null;
  requestContextJson?: string | null;
  currentStep: number;
  relatedRequest?: {
    id: string;
    title: string;
    startsOn: string;
    endsOn: string;
    requestedDays: number;
  } | null;
  approvalSteps: Array<{
    id: string;
    sequence: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
    comment: string | null;
    actedAt?: string | null;
    approverEmployee: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  attachments: RequestAttachmentItem[];
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    authorEmployee: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
};

export type ApprovalInboxItem = {
  id: string;
  sequence: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  request: {
    id: string;
    requestType: RequestType;
    status: RequestStatus;
    title: string;
    reason: string | null;
    startsOn: string;
    endsOn: string;
    requestedDays: number;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
    };
  } & Pick<EmployeeRequestItem, 'requestType' | 'status' | 'title' | 'reason' | 'startsOn' | 'endsOn' | 'requestedDays' | 'approvalSteps' | 'comments' | 'attachments' | 'relatedRequest' | 'relatedRequestId'>;
};

export type MyTimeOffBalancesResponse = {
  employeeId: string;
  balances: TimeOffBalanceSummary[];
  sickLeave: {
    approvedRequests: number;
    approvedDays: number;
  };
};

export type RequestsCalendarResponse = {
  dateFrom: string;
  dateTo: string;
  requests: EmployeeRequestItem[];
};

export type EmployeeTimeOffBalanceListItem = {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: {
    id: string;
    name: string;
  } | null;
  position: {
    id: string;
    name: string;
  } | null;
  balances: TimeOffBalanceSummary[];
  sickLeave: {
    approvedRequests: number;
    approvedDays: number;
  };
};

export type WorkGroupItem = {
  id: string;
  name: string;
  description: string | null;
  managerEmployeeId: string;
  memberships: Array<{
    id: string;
    employeeId: string;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
    };
  }>;
  _count?: {
    tasks: number;
  };
};

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskActivityKind = 'CREATED' | 'COMMENT' | 'STATUS_CHANGED' | 'CHECKLIST_TOGGLED';

export type TaskPhotoProofItem = {
  id: string;
  fileName: string;
  storageKey: string;
  url: string | null;
  deletedAt: string | null;
  supersededByProofId: string | null;
  createdAt: string;
  uploadedByEmployee: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  requiresPhoto: boolean;
  isRecurring: boolean;
  taskTemplateId: string | null;
  occurrenceDate: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  groupId: string | null;
  assigneeEmployeeId: string | null;
  managerEmployee: {
    id: string;
    firstName: string;
    lastName: string;
  };
  assigneeEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    department?: {
      id: string;
      name: string;
    } | null;
    primaryLocation?: {
      id: string;
      name: string;
    } | null;
  } | null;
  group: {
    id: string;
    name: string;
  } | null;
  checklistItems: Array<{
    id: string;
    title: string;
    sortOrder: number;
    isCompleted: boolean;
    completedAt: string | null;
    completedByEmployee: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  }>;
  activities: Array<{
    id: string;
    kind: TaskActivityKind;
    body: string | null;
    createdAt: string;
    actorEmployee: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  photoProofs: TaskPhotoProofItem[];
};

export type CollaborationTaskBoardResponse = {
  totals: {
    total: number;
    overdue: number;
    active: number;
    done: number;
  };
  tasks: TaskItem[];
};

export type TaskTemplateFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type TaskTemplateItem = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  requiresPhoto: boolean;
  expandOnDemand: boolean;
  frequency: TaskTemplateFrequency;
  weekDaysJson: string | null;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  dueAfterDays: number;
  dueTimeLocal: string | null;
  checklistJson: string | null;
  lastGeneratedAt: string | null;
  isActive: boolean;
  group: {
    id: string;
    name: string;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  location: {
    id: string;
    name: string;
  } | null;
  assigneeEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  } | null;
};

export type TaskTemplateRunResponse = {
  success: boolean;
  generatedCount: number;
  generatedTemplateIds: string[];
};

export type TaskAutomationPolicy = {
  id: string;
  tenantId: string;
  reminderLeadDays: number;
  reminderRepeatHours: number;
  escalationDelayDays: number;
  escalateToManager: boolean;
  notifyAssignee: boolean;
  sendChatMessages: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaskAutomationRunResponse = {
  success: boolean;
  reminderCount: number;
  escalationCount: number;
  remindedTaskIds: string[];
  escalatedTaskIds: string[];
};

export type CollaborationOverviewResponse = {
  groups: WorkGroupItem[];
  recentTasks: TaskItem[];
  employeeStats: Array<{
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
    } | null;
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    cancelled: number;
  }>;
};

export type NamedEntityOption = {
  id: string;
  name: string;
};

export type EmployeeApiRecord = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  employeeNumber: string;
  hireDate: string;
  birthDate?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  avatar?: any;
  avatarUrl?: string | null;
  breaksEnabled?: boolean;
  status?: string | null;
  biometricProfile?: {
    enrollmentStatus?: 'NOT_STARTED' | 'PENDING' | 'ENROLLED' | 'FAILED' | null;
  } | null;
  user?: {
    id?: string;
    email?: string;
    roles?: Array<{
      role?: {
        code: string;
      } | null;
    }> | null;
  } | null;
  company?: NamedEntityOption | null;
  department?: NamedEntityOption | null;
  primaryLocation?: (NamedEntityOption & { timezone?: string | null }) | null;
  position?: NamedEntityOption | null;
};

export type EmployeeDetails = EmployeeApiRecord & {
  devices?: Array<{
    id: string;
    platform: string;
    deviceName: string | null;
    isPrimary: boolean;
  }>;
};

export type EmployeeDetailRecord = EmployeeApiRecord & {
  user: {
    email: string;
    id?: string;
    roles?: Array<{
      role?: {
        code: string;
      } | null;
    }> | null;
  };
  department: NamedEntityOption;
  company: NamedEntityOption;
  primaryLocation: NamedEntityOption;
  position: NamedEntityOption;
  devices: Array<{
    id: string;
    platform: string;
    deviceName: string | null;
    isPrimary: boolean;
  }>;
};

export type EmployeeProfileResponse = EmployeeApiRecord & {
  status: string;
  company: (NamedEntityOption & { code?: string | null }) | null;
  user: {
    id: string;
    email: string;
    bannerTheme: string | null;
  };
  devices: Array<{
    id: string;
    deviceName: string | null;
    platform: 'IOS' | 'ANDROID' | 'WEB';
    isPrimary: boolean;
  }>;
};

export type InvitationRecord = {
  id: string;
  companyId?: string | null;
  email: string | null;
  status: 'INVITED' | 'PENDING_APPROVAL' | 'REJECTED';
  expiresAt: string;
  submittedAt: string | null;
  resentCount: number;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  rejectedReason?: string | null;
  approvedShiftTemplateId?: string | null;
  approvedGroupId?: string | null;
};

export type OrganizationSetupResponse = {
  company: NamedEntityOption | null;
};

export type ManagerEmployeeItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  gender?: string | null;
  department: NamedEntityOption | null;
  position: NamedEntityOption | null;
  primaryLocation: (NamedEntityOption & { timezone?: string | null }) | null;
  avatar?: any;
  avatarUrl?: string | null;
};

export type ScheduleShiftTemplateRecord = {
  id: string;
  name: string;
  code: string;
  startsAtLocal: string;
  endsAtLocal: string;
  weekDaysJson?: string | null;
  gracePeriodMinutes: number;
  createdAt: string;
  updatedAt: string;
  location: NamedEntityOption;
  position: NamedEntityOption;
};

export type ManagerShiftTemplateItem = ScheduleShiftTemplateRecord & {
  code: string;
};

export type ScheduleShiftRecord = {
  id: string;
  shiftDate: string;
  startsAt: string;
  endsAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  employeeId?: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  location: NamedEntityOption;
  position: NamedEntityOption;
  template: ScheduleShiftTemplateRecord;
};

export type ManagerScheduleShiftItem = ScheduleShiftRecord & {
  employeeId: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  template: ManagerShiftTemplateItem;
};

export type EmployeeScheduleShiftItem = {
  id: string;
  shiftDate: string;
  startsAt: string;
  endsAt: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  employee?: {
    id: string;
    firstName?: string;
    lastName?: string;
    employeeNumber?: string;
  };
  location: NamedEntityOption;
  position: NamedEntityOption;
  template: NamedEntityOption & Partial<ScheduleShiftTemplateRecord>;
};

export type ScheduleBootstrapInitialData<TEmployee = EmployeeApiRecord> = {
  departments: NamedEntityOption[];
  employees: TEmployee[];
  groups: WorkGroupItem[];
  isMockMode: boolean;
  locations: NamedEntityOption[];
  mode: 'admin' | 'employee';
  positions: NamedEntityOption[];
  requests: ApprovalInboxItem[];
  shifts: ManagerScheduleShiftItem[];
  taskBoard: CollaborationTaskBoardResponse | null;
  templates: ManagerShiftTemplateItem[];
  visibleDateFrom: string;
  visibleDateTo: string;
};

export type ManagerScheduleBootstrapResponse<TEmployee = EmployeeApiRecord> = {
  mode: 'admin' | 'employee';
  initialData: ScheduleBootstrapInitialData<TEmployee> | null;
};

export type EmployeesBootstrapResponse = {
  employeeRecords: EmployeeApiRecord[];
  liveSessions: AttendanceLiveSession[];
  overview: CollaborationOverviewResponse | null;
  pendingInvitations: InvitationRecord[];
  scheduleShifts: EmployeeScheduleShiftItem[];
  scheduleTemplates: ScheduleShiftTemplateRecord[];
  organizationSetup: OrganizationSetupResponse | null;
  canCheckWorkdays: boolean;
  groups: WorkGroupItem[];
};

export type EmployeeManagerAccessResponse = {
  employeeId: string;
  roleCodes: string[];
  hasAdminRole: boolean;
  hasManagerAccess: boolean;
  canToggleManagerAccess: boolean;
};

export type EmployeeDetailBootstrapResponse = {
  anomalies: AttendanceAnomalyResponse | null;
  biometricHistory: EmployeeBiometricHistoryResponse | null;
  employee: EmployeeDetailRecord | null;
  employeeId: string;
  history: AttendanceHistoryResponse | null;
  managerAccess: EmployeeManagerAccessResponse | null;
};

export type AttendanceBootstrapResponse = {
  anomalies: AttendanceAnomalyResponse | null;
  audit: AttendanceAuditResponse | null;
  dateFrom: string;
  dateTo: string;
  employees: EmployeeApiRecord[];
  history: AttendanceHistoryResponse | null;
  liveSessions: AttendanceLiveSession[];
};

export type ManagerTasksBootstrapResponse<TEmployee = EmployeeApiRecord> = {
  tasks: TaskItem[];
  employees: TEmployee[];
  groups: WorkGroupItem[];
  liveSessions: AttendanceLiveSession[];
};

export type NewsBootstrapResponse<TEmployee = EmployeeApiRecord> = {
  mode: 'admin' | 'employee';
  initialData: {
    items: AnnouncementItem[];
    employees: TEmployee[];
    groups: WorkGroupItem[];
  };
};

export type LeaderboardBootstrapResponse = {
  mode: 'admin' | 'employee';
  initialData: LeaderboardOverviewResponse;
};

export type BiometricBootstrapResponse = {
  employees: EmployeeApiRecord[];
  result: string;
  reviews: BiometricReviewResponse | null;
};

export type DashboardBootstrapInitialData<
  TEmployee = EmployeeApiRecord,
  TProfile = EmployeeProfileResponse | null,
> = {
  anomalies: AttendanceAnomalyResponse | null;
  attendanceStatus: AttendanceStatusResponse | null;
  canCheckWorkdays: boolean;
  dailyActivity?: unknown[];
  employees: TEmployee[];
  groups: WorkGroupItem[];
  liveSessions: AttendanceLiveSession[];
  personalHistory: AttendanceHistoryResponse | null;
  personalTaskBoard?: CollaborationTaskBoardResponse | null;
  profile: TProfile;
  requests: ApprovalInboxItem[];
  scheduleShifts: EmployeeScheduleShiftItem[];
  taskBoard: CollaborationTaskBoardResponse | null;
};

export type DashboardBootstrapResponse<
  TEmployee = EmployeeApiRecord,
  TProfile = EmployeeProfileResponse | null,
> = {
  mode: 'admin' | 'employee';
  initialData: DashboardBootstrapInitialData<TEmployee, TProfile>;
};

export type RequestsBootstrapResponse = {
  mode: 'admin' | 'employee';
  initialData: {
    inbox: ApprovalInboxItem[];
    balances: MyTimeOffBalancesResponse | null;
    items: EmployeeRequestItem[];
    calendar: RequestsCalendarResponse | null;
    tasks: TaskItem[];
    dateFrom: string;
    dateTo: string;
  };
};

export type CollaborationAnalyticsResponse = {
  windowDays: number;
  rangeStart: string;
  summary: {
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    overdueTasks: number;
    urgentOpenTasks: number;
    completionRate: number;
    averageCompletionHours: number | null;
    averageChecklistCompletionRate: number;
    groupsCount: number;
    activeChats: number;
    announcementsPublished: number;
    slaRiskTasks: number;
    slaBreachedTasks: number;
  };
  sla: {
    dueSoonThresholdDays: number;
    riskTasks: number;
    breachedTasks: number;
  };
  employeePerformance: Array<{
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
    } | null;
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    overdueTasks: number;
    completionRate: number;
    averageCompletionHours: number | null;
    checklistCompletionRate: number;
  }>;
  groupPerformance: Array<{
    group: {
      id: string;
      name: string;
      description: string | null;
    };
    membersCount: number;
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    overdueTasks: number;
    completionRate: number;
    averageCompletionHours: number | null;
    members: Array<{
      employee: {
        id: string;
        firstName: string;
        lastName: string;
        employeeNumber: string;
      };
      totalTasks: number;
      completedTasks: number;
      activeTasks: number;
      overdueTasks: number;
      completionRate: number;
    }>;
  }>;
  departmentPerformance: Array<{
    department: {
      id: string;
      name: string;
    };
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    overdueTasks: number;
    completionRate: number;
    averageCompletionHours: number | null;
  }>;
  deadlineBoard: {
    overdue: TaskItem[];
    dueSoon: TaskItem[];
    urgentOpen: TaskItem[];
  };
};

export type LeaderboardProgressMetricKey =
  | 'on_time_arrival'
  | 'on_time_departure'
  | 'tasks_and_checklists';

export type LeaderboardProgressMetric = {
  key: LeaderboardProgressMetricKey;
  earnedPoints: number;
  maxPoints: number;
  completed: boolean;
  details: {
    checkedAt: string | null;
    shiftBoundaryAt: string | null;
    dueTaskCount: number;
    completedDueTaskCount: number;
    dueChecklistItemCount: number;
    completedDueChecklistItemCount: number;
    overdueCount: number;
  };
};

export type LeaderboardDailyActivity = {
  dayKey: string;
  earnedPoints: number;
  maxPoints: number;
  completed: boolean;
  onTimeArrival: boolean;
  hadShift: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  isPrivate?: boolean;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    avatarUrl: string | null;
    department: {
      id: string;
      name: string;
    } | null;
    position: {
      id: string;
      name: string;
    } | null;
  };
  points: number;
  todayPoints: number;
  streak: number;
};

export type LeaderboardOverviewResponse = {
  month: {
    key: string;
    startsAt: string;
    endsAt: string;
    todayKey: string;
  };
  summary: {
    participants: number;
    maxDailyPoints: number;
  };
  me: {
    employeeId: string;
    rank: number;
    points: number;
    todayPoints: number;
    todayMaxPoints: number;
    streak: number;
    progress: LeaderboardProgressMetric[];
    dailyActivity: LeaderboardDailyActivity[];
  };
  leaderboard: LeaderboardEntry[];
  visibility: {
    hidePeersFromEmployees: boolean;
    canManage: boolean;
    peersHiddenForViewer: boolean;
  };
};

export type AnnouncementAudience = 'ALL' | 'GROUP' | 'EMPLOYEE' | 'DEPARTMENT' | 'LOCATION';
export type AnnouncementTemplateFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type AnnouncementImageAspectRatio = '1:1' | '16:9' | '4:3';

export type AnnouncementAttachmentItem = {
  id: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number | null;
  url: string;
};

export type AnnouncementAttachmentLocation = {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string | null;
};

export type AnnouncementItem = {
  id: string;
  audience: AnnouncementAudience;
  title: string;
  body: string;
  isPinned: boolean;
  groupIds?: string[];
  targetEmployeeIds?: string[];
  linkUrl?: string | null;
  attachmentLocation?: AnnouncementAttachmentLocation | null;
  attachments?: AnnouncementAttachmentItem[];
  imageUrl?: string | null;
  imageAspectRatio?: AnnouncementImageAspectRatio | null;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  notificationId?: string | null;
  isRead?: boolean;
  readAt?: string | null;
  totalRecipients?: number;
  readRecipients?: number;
  unreadRecipients?: number;
  authorEmployee: {
    id: string;
    firstName: string;
    lastName: string;
  };
  group: {
    id: string;
    name: string;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  location: {
    id: string;
    name: string;
  } | null;
  targetEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  } | null;
};

export type AnnouncementReadReceipt = {
  notificationId: string;
  userId: string;
  employeeId: string | null;
  firstName: string;
  lastName: string;
  employeeNumber: string | null;
  avatarUrl: string | null;
  isRead: boolean;
  readAt: string | null;
};

export type AnnouncementArchiveEntry = {
  id: string;
  announcementId: string;
  action: 'announcement.created' | 'announcement.updated' | 'announcement.deleted' | 'announcement.generated';
  createdAt: string;
  title: string | null;
  isPinned: boolean | null;
  actorEmployee: {
    id: string | null;
    firstName: string;
    lastName: string;
  } | null;
};

export type AnnouncementTemplateItem = {
  id: string;
  audience: AnnouncementAudience;
  title: string;
  body: string;
  isPinned: boolean;
  frequency: AnnouncementTemplateFrequency;
  weekDaysJson: string | null;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  publishTimeLocal: string | null;
  lastPublishedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  group: {
    id: string;
    name: string;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  location: {
    id: string;
    name: string;
  } | null;
  targetEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  } | null;
};

export type AnnouncementTemplateRunResponse = {
  success: boolean;
  generatedCount: number;
  generatedTemplateIds: string[];
};

export type ChatThreadKind = 'DIRECT' | 'GROUP';

export type ChatMessageItem = {
  id: string;
  body: string;
  createdAt: string;
  authorEmployeeId: string;
  authorEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
};

export type ChatThreadItem = {
  id: string;
  kind: ChatThreadKind;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  lastReadAt?: string | null;
  group: {
    id: string;
    name: string;
  } | null;
  createdByEmployee: {
    id: string;
    firstName: string;
    lastName: string;
  };
  participants: Array<{
    id: string;
    employeeId: string;
    lastReadAt: string | null;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
      user: {
        id: string;
        email: string;
      };
    };
  }>;
  messages: ChatMessageItem[];
};

export type CollaborationBootstrapResponse<TEmployee = EmployeeApiRecord> = {
  analytics: CollaborationAnalyticsResponse | null;
  announcementTemplates: AnnouncementTemplateItem[];
  announcements: AnnouncementItem[];
  automationPolicy: TaskAutomationPolicy | null;
  chats: ChatThreadItem[];
  employees: TEmployee[];
  overview: CollaborationOverviewResponse | null;
  taskBoard: CollaborationTaskBoardResponse | null;
  taskTemplates: TaskTemplateItem[];
  windowDays: number;
};

export type EmployeeInboxKind = 'TASK' | 'CHAT' | 'NOTIFICATION' | 'ANNOUNCEMENT';

export type EmployeeInboxSummary = {
  unreadNotifications: number;
  unreadChats: number;
  pendingTasks: number;
  pinnedAnnouncements: number;
  totalAttention: number;
};

export type EmployeeInboxItem = {
  id: string;
  kind: EmployeeInboxKind;
  entityId: string;
  title: string;
  preview: string | null;
  createdAt: string;
  actionUrl: string;
  isUnread: boolean;
  isActionRequired: boolean;
  badge: string | null;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

export type EmployeeInboxResponse = {
  summary: EmployeeInboxSummary;
  items: EmployeeInboxItem[];
};

export type PayrollSummaryResponse = {
  policy: PayrollPolicy;
  holidays: HolidayCalendarDay[];
  range: {
    dateFrom: string;
    dateTo: string;
  };
  totals: {
    employees: number;
    scheduledMinutes: number;
    workedMinutes: number;
    rawWorkedMinutes: number;
    breakMinutes: number;
    weekendMinutes: number;
    holidayMinutes: number;
    overtimeMinutes: number;
    weekendOvertimeMinutes: number;
    holidayOvertimeMinutes: number;
    nightMinutes: number;
    leaveDays: number;
    sickDays: number;
    estimatedGrossPay: number;
  };
  rows: Array<{
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    department: string;
    position: string;
    scheduledMinutes: number;
    workedMinutes: number;
    rawWorkedMinutes: number;
    breakMinutes: number;
    regularMinutes: number;
    weekendMinutes: number;
    holidayMinutes: number;
    overtimeMinutes: number;
    weekendOvertimeMinutes: number;
    holidayOvertimeMinutes: number;
    nightMinutes: number;
    lateMinutes: number;
    earlyLeaveMinutes: number;
    leaveDays: number;
    sickDays: number;
    attendanceSessions: number;
    assignedShifts: number;
    basePay: number;
    weekendPay: number;
    holidayPay: number;
    overtimePay: number;
    weekendOvertimePay: number;
    holidayOvertimePay: number;
    nightPremiumPay: number;
    latenessPenalty: number;
    earlyLeavePenalty: number;
    leavePay: number;
    sickPay: number;
    estimatedGrossPay: number;
  }>;
};

export type PayrollPolicy = {
  id: string;
  tenantId: string;
  baseHourlyRate: number;
  overtimeMultiplier: number;
  weekendMultiplier: number;
  weekendOvertimeMultiplier: number;
  holidayMultiplier: number;
  holidayOvertimeMultiplier: number;
  nightPremiumMultiplier: number;
  nightShiftStartLocal: string;
  nightShiftEndLocal: string;
  latenessPenaltyPerMinute: number;
  earlyLeavePenaltyPerMinute: number;
  leavePaidRatio: number;
  sickLeavePaidRatio: number;
  standardShiftMinutes: number;
  breaksEnabled: boolean;
  defaultBreakIsPaid: boolean;
  maxBreakMinutes: number;
  mandatoryBreakThresholdMinutes: number;
  mandatoryBreakDurationMinutes: number;
};

export type AttendanceLiveSession = {
  sessionId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  location: string;
  shiftLabel: string | null;
  status: 'on_shift' | 'on_break' | 'checked_out';
  startedAt: string;
  endedAt: string | null;
  totalMinutes: number;
  breakMinutes: number;
  paidBreakMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
};

export type AttendanceRealtimeEvents = {
  'attendance:team-live': AttendanceLiveSession[];
};

export type AttendanceHistoryResponse = {
  range: {
    dateFrom: string;
    dateTo: string;
  };
  totals: {
    sessions: number;
    workedMinutes: number;
    breakMinutes: number;
    paidBreakMinutes: number;
    lateMinutes: number;
    earlyLeaveMinutes: number;
  };
  rows: Array<{
    sessionId: string;
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    department: string;
    location: string;
    shiftLabel: string | null;
    status: 'on_shift' | 'on_break' | 'checked_out';
    startedAt: string;
    endedAt: string | null;
    totalMinutes: number;
    workedMinutes: number;
    breakMinutes: number;
    paidBreakMinutes: number;
    lateMinutes: number;
    earlyLeaveMinutes: number;
    checkInEvent: {
      eventId: string;
      occurredAt: string;
      distanceMeters: number;
      notes: string | null;
    };
    checkOutEvent: {
      eventId: string;
      occurredAt: string;
      distanceMeters: number;
      notes: string | null;
    } | null;
    breaks: Array<{
      id: string;
      startedAt: string;
      endedAt: string | null;
      totalMinutes: number;
      isPaid: boolean;
      startEvent: {
        occurredAt: string;
        distanceMeters: number;
      };
      endEvent: {
        occurredAt: string;
        distanceMeters: number;
      } | null;
    }>;
  }>;
};

export type AttendanceAnomalyResponse = {
  date: string;
  totals: {
    critical: number;
    warning: number;
  };
  items: Array<{
    anomalyId: string;
    type: 'MISSED_CHECK_IN' | 'MISSED_CHECK_OUT' | 'LONG_BREAK' | 'EARLY_LEAVE' | 'REPEATED_LATENESS';
    severity: 'critical' | 'warning';
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    department: string;
    location: string;
    shiftLabel: string | null;
    detectedAt: string;
    summary: string;
    details: string;
    actionUrl: string;
  }>;
};

export type AttendanceAuditResponse = {
  range: {
    dateFrom: string;
    dateTo: string;
  };
  totals: {
    total: number;
    accepted: number;
    rejected: number;
    reviewRequired: number;
  };
  items: Array<{
    eventId: string;
    source: 'ATTENDANCE_EVENT' | 'AUDIT_LOG';
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    department: string;
    eventType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
    result: 'ACCEPTED' | 'REJECTED';
    occurredAt: string;
    serverRecordedAt: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    distanceMeters: number;
    notes: string | null;
    failureReason: string | null;
    location: {
      id: string;
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      geofenceRadiusMeters: number;
    };
    device: {
      id: string | null;
      name: string | null;
      platform: 'IOS' | 'ANDROID' | 'WEB' | null;
      isPrimary: boolean | null;
    };
    biometricVerification: {
      id: string;
      result: 'PASSED' | 'FAILED' | 'REVIEW';
      manualReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
      capturedAt: string;
      livenessScore: number | null;
      matchScore: number | null;
      reviewReason: string | null;
      reviewedAt: string | null;
      reviewerComment: string | null;
      reviewerEmployee: {
        id: string;
        firstName: string;
        lastName: string;
      } | null;
    } | null;
  }>;
};

export type AttendanceCorrectionRequestItem = {
  id: string;
  sessionId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  proposedStartedAt: string | null;
  proposedEndedAt: string | null;
  proposedBreakMinutes: number | null;
  proposedPaidBreakMinutes: number | null;
  decisionComment: string | null;
  createdAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    department: {
      id: string;
      name: string;
    };
    primaryLocation: {
      id: string;
      name: string;
    };
  };
  requestedByEmployee: {
    id: string;
    firstName: string;
    lastName: string;
  };
  session: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    totalMinutes: number;
    breakMinutes: number;
    paidBreakMinutes: number;
    shift: {
      id: string;
      template: {
        name: string;
      };
    } | null;
  };
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    authorEmployee: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
};

export type HolidayCalendarDay = {
  id: string;
  name: string;
  date: string;
  isPaid: boolean;
};

export type ApprovalPolicyChainItem = {
  chainKey: string;
  requestType: RequestType | null;
  department: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
  steps: Array<{
    id: string;
    priority: number;
    approverEmployee: { id: string; firstName: string; lastName: string };
  }>;
};

export type NotificationItem = {
  id: string;
  type:
    | 'REQUEST_ACTION_REQUIRED'
    | 'REQUEST_APPROVED'
    | 'REQUEST_REJECTED'
    | 'BIOMETRIC_REVIEW_ACTION_REQUIRED'
    | 'BIOMETRIC_REVIEW_APPROVED'
    | 'BIOMETRIC_REVIEW_REJECTED'
    | 'ATTENDANCE_CORRECTION_ACTION_REQUIRED'
    | 'ATTENDANCE_CORRECTION_APPROVED'
    | 'ATTENDANCE_CORRECTION_REJECTED'
    | 'ATTENDANCE_ANOMALY_CRITICAL'
    | 'OPERATIONS_ALERT'
    | 'DAILY_DIGEST';
  title: string;
  body: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationUnreadResponse = {
  unreadCount: number;
};

export type NotificationSocketEvents = {
  'notifications:new': NotificationItem;
  'notifications:unread-count': NotificationUnreadResponse;
};

export type BiometricReviewResponse = {
  totals: {
    employees: number;
    enrolled: number;
    reviewRequired: number;
    notEnrolled: number;
  };
  items: Array<{
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    department: string;
    location: string;
    enrollmentStatus: 'NOT_STARTED' | 'PENDING' | 'ENROLLED' | 'FAILED';
    provider: string;
    enrolledAt: string | null;
    lastVerifiedAt: string | null;
    pendingReview: boolean;
    latestVerification: {
      id: string;
      result: 'PASSED' | 'FAILED' | 'REVIEW';
      manualReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
      reviewedAt: string | null;
      reviewerComment: string | null;
      reviewerEmployee: {
        id: string;
        firstName: string;
        lastName: string;
      } | null;
      livenessScore: number | null;
      matchScore: number | null;
      reviewReason: string | null;
      capturedAt: string;
      artifactCount: number;
      artifactPreviewUrls: string[];
    } | null;
  }>;
};

export type EmployeeBiometricHistoryResponse = {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    department: {
      id: string;
      name: string;
    };
    location: {
      id: string;
      name: string;
    };
  };
  profile: {
    id: string;
    enrollmentStatus: 'NOT_STARTED' | 'PENDING' | 'ENROLLED' | 'FAILED';
    consentVersion: string | null;
    enrolledAt: string | null;
    lastVerifiedAt: string | null;
    provider: string;
    templateRef: string | null;
    templateUrl: string | null;
  } | null;
  verifications: Array<{
    id: string;
    result: 'PASSED' | 'FAILED' | 'REVIEW';
    manualReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    reviewedAt: string | null;
    reviewerComment: string | null;
    reviewerEmployee: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    livenessScore: number | null;
    matchScore: number | null;
    reviewReason: string | null;
    capturedAt: string;
    attendanceEvent: {
      id: string;
      eventType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
      occurredAt: string;
    } | null;
    artifacts: Array<{
      id: string;
      kind: 'ENROLLMENT' | 'VERIFICATION';
      stepId: string | null;
      contentType: string;
      createdAt: string;
      storageKey: string;
      url: string | null;
    }>;
  }>;
};

export type BiometricReviewInboxResponse = {
  items: Array<{
    verificationId: string;
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    department: string;
    location: string;
    provider: string;
    result: 'PASSED' | 'FAILED' | 'REVIEW';
    manualReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    livenessScore: number | null;
    matchScore: number | null;
    reviewReason: string | null;
    capturedAt: string;
    attendanceEvent: {
      id: string;
      eventType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
      occurredAt: string;
    } | null;
    artifacts: Array<{
      id: string;
      kind: 'ENROLLMENT' | 'VERIFICATION';
      stepId: string | null;
      url: string | null;
    }>;
  }>;
};

export type ExportJobItem = {
  id: string;
  type: 'ATTENDANCE_HISTORY' | 'PAYROLL_SUMMARY';
  format: 'csv' | 'xlsx' | 'pdf';
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileName: string | null;
  contentType: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
  attempts: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type ExportJobsResponse = {
  items: ExportJobItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type BiometricJobItem = {
  id: string;
  type: 'VERIFY';
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage: string | null;
  result: {
    verificationId: string;
    result: 'PASSED' | 'FAILED' | 'REVIEW';
    livenessScore: number | null;
    matchScore: number | null;
  } | null;
  attempts: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type BiometricJobsResponse = {
  items: BiometricJobItem[];
};

export type TeamBiometricJobsResponse = {
  items: Array<
    BiometricJobItem & {
      employee: {
        id: string;
        firstName: string;
        lastName: string;
        employeeNumber: string;
      };
    }
  >;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PushDeliveryItem = {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'DELIVERED' | 'FAILED';
  receiptStatus: 'PENDING' | 'OK' | 'ERROR' | null;
  provider: 'EXPO';
  title: string;
  body: string | null;
  errorMessage: string | null;
  attempts: number;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
  };
};

export type PushDiagnosticsResponse = {
  items: PushDeliveryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type DiagnosticsSummaryResponse = {
  asOf: string;
  queues: {
    exports: {
      queued: number;
      processing: number;
      failed: number;
      completed: number;
      oldestQueuedMinutes: number;
    };
    biometric: {
      queued: number;
      processing: number;
      failed: number;
      completed: number;
      oldestQueuedMinutes: number;
    };
    push: {
      queued: number;
      processing: number;
      failed: number;
      delivered: number;
      pendingReceipts: number;
      receiptErrors: number;
    };
  };
  signals: {
    criticalAnomaliesToday: number;
    pendingBiometricReviews: number;
    exportFailures24h: number;
    biometricFailures24h: number;
    pushFailures24h: number;
  };
  alerts: Array<{
    id: string;
    severity: 'critical' | 'warning';
    title: string;
    detail: string;
  }>;
};

export type DiagnosticsPolicy = {
  id: string;
  tenantId: string;
  exportQueueWarningMinutes: number;
  exportQueueCriticalMinutes: number;
  biometricQueueWarningMinutes: number;
  biometricQueueCriticalMinutes: number;
  exportFailureWarningCount24h: number;
  biometricFailureWarningCount24h: number;
  pushFailureCriticalCount24h: number;
  pushReceiptErrorCriticalCount: number;
  criticalAnomaliesCriticalCount: number;
  pendingBiometricReviewWarningCount: number;
  repeatIntervalMinutes: number;
  notifyTenantOwner: boolean;
  notifyHrAdmin: boolean;
  notifyOperationsAdmin: boolean;
  notifyManagers: boolean;
};

export type DiagnosticsTrendsResponse = {
  rangeHours: number;
  totals: {
    snapshots: number;
    maxExportQueueAge: number;
    maxBiometricQueueAge: number;
    maxPushReceiptErrors: number;
    maxCriticalAlerts: number;
    slaBreaches: number;
  };
  snapshots: Array<{
    capturedAt: string;
    exportOldestQueuedMinutes: number;
    biometricOldestQueuedMinutes: number;
    pushReceiptErrors: number;
    criticalAlerts: number;
    warningAlerts: number;
    exportFailures24h: number;
    biometricFailures24h: number;
    pushFailures24h: number;
  }>;
};

export type ObservabilitySummaryResponse = {
  asOf: string;
  runtime: {
    apiUptimeSeconds: number;
    notificationsRealtime: {
      redisEnabled: boolean;
      publisherStatus: string;
      subscriberStatus: string;
      transport: 'redis' | 'in_process';
    };
    attendanceRealtime: {
      redisEnabled: boolean;
      publisherStatus: string;
      subscriberStatus: string;
      transport: 'redis' | 'in_process';
    };
    notificationSocket: {
      namespace: string;
      connectedClients: number;
    };
    attendanceSocket: {
      namespace: string;
      connectedClients: number;
    };
  };
  deliveries: {
    pushTotal24h: number;
    pushFailed24h: number;
    pushReceiptErrors24h: number;
    pushFailureRate24h: number;
  };
  jobs: {
    exportTotal24h: number;
    exportFailed24h: number;
    exportFailureRate24h: number;
    biometricTotal24h: number;
    biometricFailed24h: number;
    biometricFailureRate24h: number;
  };
  snapshots: {
    lastCapturedAt: string | null;
    last24HoursCount: number;
  };
  liveQueues: DiagnosticsSummaryResponse['queues'];
  queueControls: {
    exports: {
      available: boolean;
      paused: boolean;
      mode: 'bullmq' | 'inline';
    };
    biometric: {
      available: boolean;
      paused: boolean;
      mode: 'bullmq' | 'inline';
    };
    push: {
      available: boolean;
      paused: boolean;
      mode: 'bullmq' | 'inline';
    };
  };
  alerts: Array<{
    id: string;
    severity: 'critical' | 'warning';
    title: string;
    detail: string;
  }>;
};
