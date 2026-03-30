import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import {
  AttendanceStatusResponse,
  AttendanceHistoryResponse,
  ApprovalInboxItem,
  AnnouncementAudience,
  AnnouncementImageAspectRatio,
  BiometricJobItem,
  BiometricPolicyResponse,
  EmployeeInboxResponse,
  EmployeeInboxSummary,
  EmployeeRequestItem,
  RequestsCalendarResponse,
  AnnouncementItem,
  MyTimeOffBalancesResponse,
  AttendanceLiveSession,
  ChatThreadItem,
  TaskItem,
  TaskTemplateItem,
  WorkGroupItem,
} from '@smart/types';
import { getCurrentDeviceFingerprint, getCurrentDeviceName, getCurrentDevicePlatform } from './device';
import { resolveEmployeeAvatarSource } from './employee-avatar';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

type AppSession = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
    roleCodes: string[];
    workspaceAccessAllowed: boolean;
  };
};

let cachedSession: AppSession | null = null;
const SESSION_STORAGE_PATH = `${FileSystem.documentDirectory ?? ''}smart-auth-session.json`;
let unauthorizedHandler: (() => void) | null = null;

async function readPersistedSession(): Promise<AppSession | null> {
  if (!FileSystem.documentDirectory) {
    return null;
  }

  try {
    const info = await FileSystem.getInfoAsync(SESSION_STORAGE_PATH);
    if (!info.exists) {
      return null;
    }

    const raw = await FileSystem.readAsStringAsync(SESSION_STORAGE_PATH);
    if (!raw.trim()) {
      return null;
    }

    return JSON.parse(raw) as AppSession;
  } catch {
    return null;
  }
}

async function persistSession(session: AppSession) {
  if (!FileSystem.documentDirectory) {
    return;
  }

  await FileSystem.writeAsStringAsync(SESSION_STORAGE_PATH, JSON.stringify(session));
}

async function clearPersistedSession() {
  if (!FileSystem.documentDirectory) {
    return;
  }

  try {
    await FileSystem.deleteAsync(SESSION_STORAGE_PATH, { idempotent: true });
  } catch {
    // Ignore cleanup errors.
  }
}

function handleUnauthorized() {
  cachedSession = null;
  void clearPersistedSession();
  unauthorizedHandler?.();
}

export function getCachedDemoSession() {
  return cachedSession;
}

async function readErrorMessage(response: Response, fallbackMessage: string) {
  const text = await response.text();

  if (!text) {
    return fallbackMessage;
  }

  try {
    const parsed = JSON.parse(text) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(parsed.message) && parsed.message.length > 0) {
      return parsed.message.join(', ');
    }

    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }

    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // Fall back to raw response text when the server does not return JSON.
  }

  return text;
}

async function authenticateSession(payload: { tenantSlug?: string; email: string; password: string }) {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      ...(payload.tenantSlug ? { tenantSlug: payload.tenantSlug } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Unable to sign in.'));
  }

  cachedSession = (await response.json()) as AppSession;
  await persistSession(cachedSession);
  return cachedSession;
}

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const session = await getDemoSession();
  const headers = new Headers(options?.headers ?? {});

  if (!(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Authorization', `Bearer ${session.accessToken}`);

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Request failed with status ${response.status}`));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getDemoSession(): Promise<AppSession> {
  if (cachedSession) {
    return cachedSession;
  }

  const restoredSession = await readPersistedSession();
  if (restoredSession) {
    cachedSession = restoredSession;
    return restoredSession;
  }

  throw new Error('Not authenticated. Sign in again.');
}

export function resetDemoSession() {
  cachedSession = null;
  void clearPersistedSession();
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function hasCachedDemoSession() {
  return cachedSession !== null;
}

export async function restorePersistedSession() {
  if (cachedSession) {
    return cachedSession;
  }

  cachedSession = await readPersistedSession();
  return cachedSession;
}

export async function getDemoAccessToken(): Promise<string> {
  const session = await getDemoSession();
  return session.accessToken;
}

export async function signInWithEmail(email: string, password: string, tenantSlug?: string) {
  return authenticateSession({
    tenantSlug,
    email,
    password,
  });
}

export async function loadMyProfile(): Promise<{
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  employeeNumber: string;
  status: string;
  avatarUrl: string | null;
  company: {
    id: string;
    name: string;
    code: string;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  primaryLocation: {
    id: string;
    name: string;
    timezone?: string | null;
  } | null;
  position: {
    id: string;
    name: string;
  } | null;
  user: {
    id: string;
    email: string;
  };
  devices: Array<{
    id: string;
    deviceName: string;
    platform: 'IOS' | 'ANDROID' | 'WEB';
    isPrimary: boolean;
  }>;
}> {
  return authRequest('/employees/me');
}

export async function loadPublicInvitation(token: string): Promise<{
  id: string;
  email: string;
  status: string;
  tenantName: string;
  tenantSlug: string;
  expiresAt: string;
  submittedAt: string | null;
  registrationCompleted: boolean;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}> {
  const response = await fetch(`${API_URL}/api/v1/employees/invitations/public/${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Unable to load invitation.'));
  }

  return response.json();
}

export async function lookupCompanyByCode(code: string): Promise<{
  companyName: string;
  companyCode: string;
  tenantName: string;
  tenantSlug: string;
}> {
  const response = await fetch(`${API_URL}/api/v1/employees/public/join/code/lookup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Unable to verify company code.'));
  }

  return response.json();
}

export async function submitCompanyJoinRequest(payload: {
  code: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate: string;
  avatarDataUrl: string;
}): Promise<{
  id: string;
  status: 'PENDING_APPROVAL';
  tenantName: string;
  companyName: string;
}> {
  const response = await fetch(`${API_URL}/api/v1/employees/public/join/code/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Unable to submit join request.'));
  }

  return response.json();
}

export async function registerFromInvitation(
  token: string,
  payload: {
    password: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    birthDate: string;
    gender: 'male' | 'female';
    phone: string;
    avatarDataUrl?: string;
  },
): Promise<{
  invitationId: string;
  status: 'APPROVED' | 'PENDING_APPROVAL';
  accessGranted: boolean;
}> {
  const response = await fetch(`${API_URL}/api/v1/employees/invitations/public/${encodeURIComponent(token)}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Unable to complete registration.'));
  }

  return response.json();
}

export async function loadMyAccessStatus(): Promise<{
  workspaceAccessAllowed: boolean;
  invitationStatus: 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
}> {
  return authRequest('/employees/me/access-status');
}

export async function bootstrapDemoDevice(): Promise<void> {
  const session = await getDemoSession();
  const deviceFingerprint = await getCurrentDeviceFingerprint();
  const deviceName = getCurrentDeviceName();
  const platform = getCurrentDevicePlatform();

  const response = await fetch(`${API_URL}/api/v1/devices/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({
      platform,
      deviceFingerprint,
      deviceName,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Unable to register current device.'));
  }
}

export async function bootstrapPushNotifications(): Promise<void> {
  if (Constants.appOwnership === 'expo') {
    return;
  }

  if (Platform.OS === 'web' || !Device.isDevice) {
    return;
  }

  const Notifications = await import('expo-notifications');
  const session = await getDemoSession();
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;

  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    return;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    return;
  }

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });

  await fetch(`${API_URL}/api/v1/push/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({
      token: pushToken.data,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    }),
  });
}

export async function loadAttendanceStatus(): Promise<AttendanceStatusResponse> {
  return authRequest<AttendanceStatusResponse>('/attendance/me/status');
}

export async function loadMyShifts(): Promise<
  Array<{
    id: string;
    shiftDate: string;
    startsAt: string;
    endsAt: string;
    location: {
      id: string;
      name: string;
    };
    position: {
      id: string;
      name: string;
    };
    template: {
      id: string;
      name: string;
    };
  }>
> {
  return authRequest('/schedule/me');
}

export type AttendanceActionName = 'check-in' | 'check-out' | 'break/start' | 'break/end';

export async function submitAttendanceAction(
  action: AttendanceActionName,
  payload: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    biometricVerificationId?: string;
    notes?: string;
    isPaidBreak?: boolean;
  },
) {
  const session = await getDemoSession();
  const deviceFingerprint = await getCurrentDeviceFingerprint();
  const response = await fetch(`${API_URL}/api/v1/attendance/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracyMeters: payload.accuracyMeters,
      biometricVerificationId: payload.biometricVerificationId,
      deviceFingerprint,
      notes: payload.notes ?? 'Mobile attendance action',
      isPaidBreak: payload.isPaidBreak ?? false,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Attendance action failed.'));
  }

  return response.json();
}

export async function loadBiometricPolicy(): Promise<BiometricPolicyResponse> {
  return authRequest<BiometricPolicyResponse>('/biometric/policy');
}

export async function startBiometricEnrollment() {
  const session = await getDemoSession();
  const response = await fetch(`${API_URL}/api/v1/biometric/enroll/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({ consentVersion: 'v1' }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Unable to start biometric enrollment.'));
  }

  return response.json();
}

export async function completeBiometricEnrollment() {
  return completeBiometricEnrollmentWithArtifacts([], null);
}

export async function completeBiometricEnrollmentWithArtifacts(
  artifacts: string[],
  captureMetadata: Record<string, unknown> | null,
) {
  const session = await getDemoSession();
  const response = await fetch(`${API_URL}/api/v1/biometric/enroll/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({
      artifacts,
      captureMetadata,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Unable to complete biometric enrollment.'));
  }

  return response.json();
}

export async function verifyBiometric(intent = 'attendance') {
  return queueVerifyBiometricWithArtifacts(intent, [], null);
}

export async function queueVerifyBiometricWithArtifacts(
  intent = 'attendance',
  artifacts: string[],
  captureMetadata: Record<string, unknown> | null,
) {
  const session = await getDemoSession();
  const response = await fetch(`${API_URL}/api/v1/biometric/verify/async`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({
      intent,
      artifacts,
      captureMetadata,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Unable to verify biometric identity.'));
  }

  return response.json();
}

export async function loadMyBiometricJob(jobId: string): Promise<BiometricJobItem> {
  return authRequest<BiometricJobItem>(`/biometric/jobs/${jobId}`);
}

export async function loadMyTimeOffBalances(): Promise<MyTimeOffBalancesResponse> {
  return authRequest<MyTimeOffBalancesResponse>('/requests/me/balances');
}

export async function loadMyRequests(): Promise<EmployeeRequestItem[]> {
  return authRequest<EmployeeRequestItem[]>('/requests/me');
}

export async function loadMyRequestCalendar(dateFrom: string, dateTo: string): Promise<RequestsCalendarResponse> {
  return authRequest<RequestsCalendarResponse>(
    `/requests/me/calendar?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`,
  );
}

export async function createMyRequest(payload: {
  requestType: EmployeeRequestItem['requestType'];
  title: string;
  reason?: string;
  startsOn: string;
  endsOn: string;
  relatedRequestId?: string;
  previousStartsOn?: string;
  previousEndsOn?: string;
  attachments?: Array<{
    fileName: string;
    dataUrl: string;
  }>;
}) {
  return authRequest<EmployeeRequestItem>('/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function addRequestComment(requestId: string, body: string) {
  return authRequest(`/requests/${requestId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function loadMyTasks(query?: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<TaskItem[]> {
  const searchParams = new URLSearchParams();

  if (query?.date) {
    searchParams.set('date', query.date);
  }

  if (query?.dateFrom) {
    searchParams.set('dateFrom', query.dateFrom);
  }

  if (query?.dateTo) {
    searchParams.set('dateTo', query.dateTo);
  }

  const suffix = searchParams.toString();
  return authRequest<TaskItem[]>(`/collaboration/tasks/me${suffix ? `?${suffix}` : ''}`);
}

export async function updateMyTaskStatus(taskId: string, status: TaskItem['status']) {
  return authRequest<TaskItem>(`/collaboration/tasks/${taskId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function addMyTaskPhotoProof(
  taskId: string,
  payload: {
    action: 'add' | 'replace';
    fileName: string;
    dataUrl: string;
    targetProofId?: string;
  },
) {
  return authRequest<TaskItem>(`/collaboration/tasks/${taskId}/photo-proofs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteMyTaskPhotoProof(taskId: string, proofId: string) {
  return authRequest<TaskItem>(`/collaboration/tasks/${taskId}/photo-proofs/${proofId}`, {
    method: 'DELETE',
  });
}

export type RescheduleMyTaskResponse = {
  task: TaskItem;
  replacedTaskId: string | null;
};

export async function rescheduleMyTask(taskId: string, dueAt: string, comment?: string) {
  return authRequest<RescheduleMyTaskResponse>(`/collaboration/tasks/${taskId}/reschedule`, {
    method: 'POST',
    body: JSON.stringify({
      dueAt,
      ...(comment ? { comment } : {}),
    }),
  });
}

export async function toggleMyTaskChecklistItem(taskId: string, itemId: string) {
  return authRequest<TaskItem>(`/collaboration/tasks/${taskId}/checklist/${itemId}/toggle`, {
    method: 'POST',
  });
}

export async function addMyTaskComment(taskId: string, body: string) {
  return authRequest<TaskItem>(`/collaboration/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function loadMyAnnouncements(): Promise<AnnouncementItem[]> {
  return authRequest<AnnouncementItem[]>('/collaboration/announcements/me');
}

export async function loadManagerAnnouncements(): Promise<AnnouncementItem[]> {
  return authRequest<AnnouncementItem[]>('/collaboration/announcements');
}

export async function createManagerAnnouncement(input: {
  audience?: AnnouncementAudience;
  title: string;
  body: string;
  isPinned?: boolean;
  groupId?: string;
  groupIds?: string[];
  targetEmployeeId?: string;
  targetEmployeeIds?: string[];
  imageDataUrl?: string;
  imageAspectRatio?: AnnouncementImageAspectRatio;
}) {
  const normalizedGroupIds = Array.from(
    new Set([input.groupId, ...(input.groupIds ?? [])].filter(Boolean)),
  );
  const normalizedTargetEmployeeIds = Array.from(
    new Set([input.targetEmployeeId, ...(input.targetEmployeeIds ?? [])].filter(Boolean)),
  );

  return authRequest<AnnouncementItem>('/collaboration/announcements', {
    method: 'POST',
    body: JSON.stringify({
      audience: input.audience ?? 'ALL',
      title: input.title,
      body: input.body,
      isPinned: input.isPinned ?? false,
      ...(normalizedGroupIds.length === 1 ? { groupId: normalizedGroupIds[0] } : {}),
      ...(normalizedGroupIds.length > 1 ? { groupIds: normalizedGroupIds } : {}),
      ...(normalizedTargetEmployeeIds.length === 1
        ? { targetEmployeeId: normalizedTargetEmployeeIds[0] }
        : {}),
      ...(normalizedTargetEmployeeIds.length > 1
        ? { targetEmployeeIds: normalizedTargetEmployeeIds }
        : {}),
      ...(input.imageDataUrl ? { imageDataUrl: input.imageDataUrl } : {}),
      ...(input.imageAspectRatio ? { imageAspectRatio: input.imageAspectRatio } : {}),
    }),
  });
}

export async function updateManagerAnnouncement(
  announcementId: string,
  input: {
    title?: string;
    body?: string;
    isPinned?: boolean;
    imageDataUrl?: string;
    imageAspectRatio?: AnnouncementImageAspectRatio;
    removeImage?: boolean;
  },
) {
  return authRequest<AnnouncementItem>(`/collaboration/announcements/${announcementId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteManagerAnnouncement(announcementId: string) {
  return authRequest<{ success: boolean }>(`/collaboration/announcements/${announcementId}`, {
    method: 'DELETE',
  });
}

export async function markMyAnnouncementRead(
  announcementId: string,
): Promise<{
  success: boolean;
  notificationId?: string | null;
  readAt?: string | null;
}> {
  return authRequest(`/collaboration/announcements/${announcementId}/read`, {
    method: 'POST',
  });
}

export async function loadMyInbox(): Promise<EmployeeInboxResponse> {
  return authRequest<EmployeeInboxResponse>('/collaboration/inbox/me');
}

export async function loadMyInboxSummary(): Promise<EmployeeInboxSummary> {
  return authRequest<EmployeeInboxSummary>('/collaboration/inbox-summary/me');
}

export async function loadMyChats(): Promise<ChatThreadItem[]> {
  return authRequest<ChatThreadItem[]>('/collaboration/chats');
}

export async function markMyChatRead(threadId: string) {
  return authRequest(`/collaboration/chats/${threadId}/read`, {
    method: 'POST',
  });
}

export async function sendMyChatMessage(threadId: string, body: string) {
  return authRequest<ChatThreadItem>(`/collaboration/chats/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function markMyNotificationRead(notificationId: string) {
  return authRequest(`/notifications/${notificationId}/read`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function loadManagerLiveSessions(): Promise<AttendanceLiveSession[]> {
  const response = await authRequest<AttendanceLiveSession[] | { sessions: AttendanceLiveSession[] }>('/attendance/team/live');
  return Array.isArray(response) ? response : (response.sessions ?? []);
}

export async function loadManagerApprovalInbox(): Promise<ApprovalInboxItem[]> {
  const response = await authRequest<ApprovalInboxItem[] | { items: ApprovalInboxItem[] }>('/requests/inbox');
  return Array.isArray(response) ? response : (response.items ?? []);
}

export async function loadManagerTasks(query?: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<TaskItem[]> {
  const searchParams = new URLSearchParams();

  if (query?.date) {
    searchParams.set('date', query.date);
  }

  if (query?.dateFrom) {
    searchParams.set('dateFrom', query.dateFrom);
  }

  if (query?.dateTo) {
    searchParams.set('dateTo', query.dateTo);
  }

  const suffix = searchParams.toString();
  const response = await authRequest<
    TaskItem[] | { items?: TaskItem[]; tasks?: TaskItem[] }
  >(`/collaboration/tasks${suffix ? `?${suffix}` : ''}`);

  if (Array.isArray(response)) {
    return response;
  }

  return response.tasks ?? response.items ?? [];
}

export async function loadManagerAttendanceHistory(employeeId: string, dateFrom: string, dateTo: string) {
  return authRequest<AttendanceHistoryResponse>(
    `/attendance/employees/${employeeId}/history?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`,
  );
}

export async function loadManagerEmployees(): Promise<Array<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  gender?: string | null;
  department: {
    id: string;
    name: string;
  } | null;
  position: {
    id: string;
    name: string;
  } | null;
  primaryLocation: {
    id: string;
    name: string;
    timezone?: string | null;
  } | null;
  avatar?: any;
}>> {
  const response = await authRequest<any>('/employees');
  const items = Array.isArray(response) ? response : (response.items ?? []);
  return items.map((emp: any) => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    email: emp.user?.email ?? '',
    employeeNumber: emp.employeeNumber,
    gender: emp.gender ?? null,
    department: emp.department
      ? {
          id: emp.department.id,
          name: emp.department.name,
        }
      : null,
    position: emp.position
      ? {
          id: emp.position.id,
          name: emp.position.name,
        }
      : null,
    primaryLocation: emp.primaryLocation
      ? {
          id: emp.primaryLocation.id,
          name: emp.primaryLocation.name,
          timezone: emp.primaryLocation.timezone ?? null,
        }
      : null,
      avatar: resolveEmployeeAvatarSource({
        avatar: emp.avatar,
        avatarUrl: emp.avatarUrl,
        email: emp.user?.email,
        employeeNumber: emp.employeeNumber,
        firstName: emp.firstName,
        gender: emp.gender,
        id: emp.id,
        lastName: emp.lastName,
      }),
  }));
}

export async function loadManagerGroups(): Promise<WorkGroupItem[]> {
  const response = await authRequest<WorkGroupItem[] | { groups: WorkGroupItem[] }>('/collaboration/groups');
  if (Array.isArray(response)) {
    return response;
  }

  return response.groups ?? [];
}

export async function createManagerTask(payload: {
  title: string;
  description?: string;
  priority?: TaskItem['priority'];
  requiresPhoto?: boolean;
  dueAt?: string;
  assigneeEmployeeId?: string;
  groupId?: string;
}) {
  return authRequest<TaskItem>('/collaboration/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createManagerTaskTemplate(payload: {
  title: string;
  description?: string;
  priority?: TaskItem['priority'];
  requiresPhoto?: boolean;
  expandOnDemand?: boolean;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  weekDays?: number[];
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  dueAfterDays?: number;
  dueTimeLocal?: string;
  assigneeEmployeeId?: string;
  groupId?: string;
  departmentId?: string;
  locationId?: string;
  checklist?: string[];
  isActive?: boolean;
}) {
  return authRequest<TaskTemplateItem>('/collaboration/task-templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loadEmployeesList(): Promise<{ id: string; firstName: string; lastName: string; }[]> {
  const response = await authRequest<any>('/employees');
  const items = Array.isArray(response) ? response : (response.items ?? []);
  return items.map((emp: any) => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName
  }));
}
