import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import {
  AttendanceActionResponse,
  AttendanceStatusResponse,
  AttendanceHistoryResponse,
  AttendanceBootstrapResponse,
  ApprovalInboxItem,
  AnnouncementAudience,
  AnnouncementImageAspectRatio,
  BiometricBootstrapResponse,
  BiometricJobItem,
  BiometricPolicyResponse,
  EmployeesBootstrapResponse,
  EmployeeInboxResponse,
  EmployeeInboxSummary,
  EmployeeRequestItem,
  RequestsCalendarResponse,
  RequestsBootstrapResponse,
  AnnouncementItem,
  MyTimeOffBalancesResponse,
  AttendanceLiveSession,
  ChatThreadItem,
  CollaborationBootstrapResponse,
  DashboardBootstrapResponse,
  EmployeeScheduleShiftItem,
  EmployeeProfileResponse,
  LeaderboardBootstrapResponse,
  LeaderboardOverviewResponse,
  ManagerEmployeeItem,
  ManagerScheduleBootstrapResponse,
  ManagerScheduleShiftItem,
  ManagerShiftTemplateItem,
  ManagerTasksBootstrapResponse,
  TaskItem,
  TaskTemplateItem,
  WorkGroupItem,
  NewsBootstrapResponse,
} from "@smart/types";
import type { BannerTheme } from "./banner-theme";
import {
  getCurrentDeviceFingerprint,
  getCurrentDeviceName,
  getCurrentDevicePlatform,
} from "./device";
import { resolveEmployeeAvatarSource } from "./employee-avatar";
import type { AppLanguage } from "./i18n";

const API_URL = normalizeApiUrl(
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
);
const API_REQUEST_TIMEOUT_MS = 20_000;
const EXTENDED_API_REQUEST_TIMEOUT_MS = 45_000;
const API_REQUEST_RETRY_DELAY_MS = 450;
const DEVICE_BOOTSTRAP_TTL_MS = 60 * 60_000;

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
const SESSION_STORAGE_PATH = `${FileSystem.documentDirectory ?? ""}smart-auth-session.json`;
let unauthorizedHandler: (() => void) | null = null;
let deviceBootstrapPromise: Promise<void> | null = null;
let lastDeviceBootstrapAt = 0;

function normalizeApiUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function buildApiUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function isNetworkError(error: unknown) {
  return (
    error instanceof Error &&
    /network request failed|fetch failed|load failed/i.test(error.message)
  );
}

function getApiConnectivityErrorMessage() {
  return `Unable to reach the API server. Current mobile API URL: ${API_URL}`;
}

function resolveRequestTimeoutMs(path: string) {
  if (
    /\/biometric\/(?:verify\/async|enroll\/complete|jobs\/)/.test(path) ||
    /\/employees\/public\/join\/code\/submit$/.test(path) ||
    /\/employees\/invitations\/public\/.+\/register$/.test(path)
  ) {
    return EXTENDED_API_REQUEST_TIMEOUT_MS;
  }

  return API_REQUEST_TIMEOUT_MS;
}

function resetDeviceBootstrapState() {
  deviceBootstrapPromise = null;
  lastDeviceBootstrapAt = 0;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOnceWithTimeout(path: string, options?: RequestInit) {
  const timeoutMs = resolveRequestTimeoutMs(path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(buildApiUrl(path), {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error) || isNetworkError(error)) {
      throw new Error(getApiConnectivityErrorMessage());
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithTimeout(path: string, options?: RequestInit) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetchOnceWithTimeout(path, options);
    } catch (error) {
      lastError = error;

      if (!(isAbortError(error) || isNetworkError(error))) {
        throw error;
      }

      if (attempt === 0) {
        await wait(API_REQUEST_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError instanceof Error
    ? new Error(getApiConnectivityErrorMessage())
    : new Error(getApiConnectivityErrorMessage());
}

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

  try {
    await FileSystem.writeAsStringAsync(
      SESSION_STORAGE_PATH,
      JSON.stringify(session),
    );
  } catch {
    // Best effort session persistence; in-memory session remains active for the current runtime.
  }
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
  resetDeviceBootstrapState();
  void clearPersistedSession();
  unauthorizedHandler?.();
}

async function refreshSession(): Promise<AppSession | null> {
  const session = cachedSession ?? (await readPersistedSession());

  if (!session?.refreshToken) {
    return null;
  }

  try {
    const response = await fetchWithTimeout("/api/v1/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: session.refreshToken,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const nextSession = (await response.json()) as AppSession;
    cachedSession = nextSession;
    await persistSession(nextSession);
    return nextSession;
  } catch {
    return null;
  }
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
      return parsed.message.join(", ");
    }

    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }

    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // Fall back to raw response text when the server does not return JSON.
  }

  return text;
}

async function authenticateSession(payload: {
  tenantSlug?: string;
  email: string;
  password: string;
}) {
  const response = await fetchWithTimeout("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      ...(payload.tenantSlug ? { tenantSlug: payload.tenantSlug } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Unable to sign in."));
  }

  cachedSession = (await response.json()) as AppSession;
  resetDeviceBootstrapState();
  await persistSession(cachedSession);
  return cachedSession;
}

async function performAuthorizedRequest(
  path: string,
  accessToken: string,
  options?: RequestInit,
) {
  const headers = new Headers(options?.headers ?? {});

  if (!(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetchWithTimeout(`/api/v1${path}`, {
    ...options,
    headers,
  });
}

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let session = await getDemoSession();
  let response = await performAuthorizedRequest(
    path,
    session.accessToken,
    options,
  );

  if (response.status === 401) {
    const refreshedSession = await refreshSession();

    if (!refreshedSession) {
      handleUnauthorized();
      throw new Error("Unauthorized");
    }

    session = refreshedSession;
    response = await performAuthorizedRequest(
      path,
      session.accessToken,
      options,
    );
  }

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `Request failed with status ${response.status}`,
      ),
    );
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

  throw new Error("Not authenticated. Sign in again.");
}

export function resetDemoSession() {
  cachedSession = null;
  resetDeviceBootstrapState();
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

export async function translateTexts(
  texts: string[],
  targetLocale: AppLanguage,
) {
  const payload = await authRequest<{ translations?: Record<string, string> }>(
    "/translate",
    {
      method: "POST",
      body: JSON.stringify({
        texts,
        targetLocale,
      }),
    },
  );

  return payload.translations ?? {};
}

export async function signInWithEmail(
  email: string,
  password: string,
  tenantSlug?: string,
) {
  return authenticateSession({
    tenantSlug,
    email,
    password,
  });
}

export async function loadMyProfile(): Promise<EmployeeProfileResponse> {
  const response = await loadDashboardBootstrap();
  if (!response.initialData.profile) {
    throw new Error("Profile is unavailable.");
  }
  return response.initialData.profile;
}

export async function updateMyBannerTheme(
  theme: BannerTheme,
): Promise<EmployeeProfileResponse> {
  return authRequest<EmployeeProfileResponse>("/employees/me/preferences", {
    method: "PATCH",
    body: JSON.stringify({
      bannerTheme: theme,
    }),
  });
}

export async function loadPublicInvitation(token: string): Promise<{
  id: string;
  email: string | null;
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
  const response = await fetchWithTimeout(
    `/api/v1/employees/invitations/public/${encodeURIComponent(token)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Unable to load invitation."),
    );
  }

  return response.json();
}

export async function lookupInvitationByEmail(email: string): Promise<{
  token: string;
  email: string;
  status: string;
  registrationCompleted: boolean;
  companyName: string;
  tenantName: string;
  tenantSlug: string;
}> {
  const response = await fetchWithTimeout(
    "/api/v1/employees/public/join/email/lookup",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Unable to verify employee email."),
    );
  }

  return response.json();
}

export async function registerFromInvitation(
  token: string,
  payload: {
    email?: string;
    password: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    birthDate: string;
    gender: "male" | "female";
    phone: string;
    avatarDataUrl?: string;
  },
): Promise<{
  invitationId: string;
  status: "APPROVED" | "PENDING_APPROVAL";
  accessGranted: boolean;
}> {
  const response = await fetchWithTimeout(
    `/api/v1/employees/invitations/public/${encodeURIComponent(token)}/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Unable to complete registration."),
    );
  }

  return response.json();
}

export async function loadMyAccessStatus(): Promise<{
  workspaceAccessAllowed: boolean;
  invitationStatus: "APPROVED" | "PENDING_APPROVAL" | "REJECTED";
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
}> {
  return authRequest("/employees/me/access-status");
}

export async function bootstrapDemoDevice(force = false): Promise<void> {
  if (!force && Date.now() - lastDeviceBootstrapAt < DEVICE_BOOTSTRAP_TTL_MS) {
    return;
  }

  if (deviceBootstrapPromise) {
    return deviceBootstrapPromise;
  }

  deviceBootstrapPromise = (async () => {
    const deviceFingerprint = await getCurrentDeviceFingerprint();
    const deviceName = getCurrentDeviceName();
    const platform = getCurrentDevicePlatform();

    await authRequest<{ success?: boolean }>("/devices/register", {
      method: "POST",
      body: JSON.stringify({
        platform,
        deviceFingerprint,
        deviceName,
      }),
    });

    lastDeviceBootstrapAt = Date.now();
  })().finally(() => {
    deviceBootstrapPromise = null;
  });

  return deviceBootstrapPromise;
}

export async function bootstrapPushNotifications(): Promise<void> {
  if (Constants.appOwnership === "expo") {
    return;
  }

  if (Platform.OS === "web" || !Device.isDevice) {
    return;
  }

  const Notifications = await import("expo-notifications");
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    return;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    return;
  }

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });

  await authRequest("/push/register", {
    method: "POST",
    body: JSON.stringify({
      token: pushToken.data,
      platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
    }),
  });
}

export async function loadAttendanceStatus(): Promise<AttendanceStatusResponse> {
  const response = await loadDashboardBootstrap();
  const status = response.initialData.attendanceStatus;

  if (!status) {
    throw new Error("Attendance status is not available.");
  }

  return status;
}

export type MobileDashboardBootstrapResponse = DashboardBootstrapResponse<
  ManagerEmployeeItem,
  EmployeeProfileResponse | null
>;

export async function loadDashboardBootstrap(query?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<MobileDashboardBootstrapResponse> {
  const searchParams = new URLSearchParams();

  if (query?.dateFrom) {
    searchParams.set("dateFrom", query.dateFrom);
  }

  if (query?.dateTo) {
    searchParams.set("dateTo", query.dateTo);
  }

  const suffix = searchParams.toString();
  const response = await authRequest<DashboardBootstrapResponse>(
    `/bootstrap/dashboard${suffix ? `?${suffix}` : ""}`,
  );

  return {
    ...response,
    initialData: {
      ...response.initialData,
      employees: (response.initialData.employees ?? []).map(
        normalizeManagerEmployee,
      ),
      groups: response.initialData.groups ?? [],
      liveSessions: response.initialData.liveSessions ?? [],
      requests: response.initialData.requests ?? [],
      scheduleShifts: response.initialData.scheduleShifts ?? [],
      taskBoard: response.initialData.taskBoard ?? null,
      personalTaskBoard: response.initialData.personalTaskBoard ?? null,
      attendanceStatus: response.initialData.attendanceStatus ?? null,
      profile:
        (response.initialData.profile as EmployeeProfileResponse | null) ??
        null,
      personalHistory: response.initialData.personalHistory ?? null,
      anomalies: response.initialData.anomalies ?? null,
      canCheckWorkdays: response.initialData.canCheckWorkdays ?? false,
    },
  };
}

export async function loadTodayBootstrap(query?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<{
  attendanceStatus: AttendanceStatusResponse | null;
  profile: EmployeeProfileResponse | null;
  shifts: EmployeeScheduleShiftItem[];
  tasks: TaskItem[];
}> {
  const response = await loadDashboardBootstrap(query);
  const initialData = response.initialData;

  return {
    attendanceStatus: initialData.attendanceStatus,
    profile: initialData.profile,
    shifts: initialData.scheduleShifts,
    tasks: initialData.taskBoard?.tasks ?? [],
  };
}

export type MobileAttendanceBootstrapResponse = Omit<
  AttendanceBootstrapResponse,
  "employees"
> & {
  employees: ManagerEmployeeItem[];
};

export async function loadAttendanceBootstrap(query?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<MobileAttendanceBootstrapResponse> {
  const searchParams = new URLSearchParams();

  if (query?.dateFrom) {
    searchParams.set("dateFrom", query.dateFrom);
  }

  if (query?.dateTo) {
    searchParams.set("dateTo", query.dateTo);
  }

  const suffix = searchParams.toString();
  const response = await authRequest<AttendanceBootstrapResponse>(
    `/bootstrap/attendance${suffix ? `?${suffix}` : ""}`,
  );

  return {
    ...response,
    employees: (response.employees ?? []).map(normalizeManagerEmployee),
    liveSessions: response.liveSessions ?? [],
    history: response.history ?? null,
    anomalies: response.anomalies ?? null,
    audit: response.audit ?? null,
  };
}

export async function loadMyShifts(): Promise<EmployeeScheduleShiftItem[]> {
  const response = await loadManagerScheduleBootstrap();
  return response.initialData?.shifts ?? [];
}

function normalizeManagerEmployee(emp: any): ManagerEmployeeItem {
  return {
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    email: emp.user?.email ?? emp.email ?? "",
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
      email: emp.user?.email ?? emp.email,
      employeeNumber: emp.employeeNumber,
      firstName: emp.firstName,
      gender: emp.gender,
      id: emp.id,
      lastName: emp.lastName,
    }),
  };
}

export async function loadManagerScheduleBootstrap(query?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<ManagerScheduleBootstrapResponse<ManagerEmployeeItem>> {
  const searchParams = new URLSearchParams();

  if (query?.dateFrom) {
    searchParams.set("dateFrom", query.dateFrom);
  }

  if (query?.dateTo) {
    searchParams.set("dateTo", query.dateTo);
  }

  const suffix = searchParams.toString();
  const response = await authRequest<ManagerScheduleBootstrapResponse>(
    `/bootstrap/schedule${suffix ? `?${suffix}` : ""}`,
  );

  if (!response.initialData) {
    return {
      ...response,
      initialData: null,
    };
  }

  return {
    ...response,
    initialData: {
      ...response.initialData,
      employees: response.initialData.employees.map(normalizeManagerEmployee),
      groups: response.initialData.groups ?? [],
      taskBoard: response.initialData.taskBoard,
    },
  };
}

export async function loadManagerShiftTemplates(): Promise<
  ManagerShiftTemplateItem[]
> {
  const response = await loadManagerScheduleBootstrap();
  return response.initialData?.templates ?? [];
}

export async function loadManagerShifts(): Promise<ManagerScheduleShiftItem[]> {
  const response = await loadManagerScheduleBootstrap();
  return response.initialData?.shifts ?? [];
}

export async function createManagerShift(payload: {
  templateId: string;
  employeeId: string;
  shiftDate: string;
}) {
  return authRequest<ManagerScheduleShiftItem>("/schedule/shifts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type AttendanceActionName =
  | "check-in"
  | "check-out"
  | "break/start"
  | "break/end";

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
): Promise<AttendanceActionResponse> {
  const deviceFingerprint = await getCurrentDeviceFingerprint();
  return authRequest(`/attendance/${action}`, {
    method: "POST",
    body: JSON.stringify({
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracyMeters: payload.accuracyMeters,
      biometricVerificationId: payload.biometricVerificationId,
      deviceFingerprint,
      notes: payload.notes ?? "Mobile attendance action",
      isPaidBreak: payload.isPaidBreak,
    }),
  });
}

export async function loadLeaderboardOverview(
  monthKey?: string,
): Promise<LeaderboardOverviewResponse> {
  const query = monthKey ? `?month=${encodeURIComponent(monthKey)}` : "";
  const response = await authRequest<LeaderboardBootstrapResponse>(
    `/bootstrap/leaderboard${query}`,
  );

  return response.initialData;
}

export async function updateLeaderboardSettings(payload: {
  hidePeersFromEmployees: boolean;
}) {
  return authRequest<{ hidePeersFromEmployees: boolean }>(
    "/leaderboard/settings",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function loadBiometricPolicy(): Promise<BiometricPolicyResponse> {
  return authRequest<BiometricPolicyResponse>("/biometric/policy");
}

export type MobileBiometricBootstrapResponse = Omit<
  BiometricBootstrapResponse,
  "employees"
> & {
  employees: ManagerEmployeeItem[];
};

export async function loadBiometricBootstrap(
  result?: "PASSED" | "FAILED" | "REVIEW" | "__all" | "",
): Promise<MobileBiometricBootstrapResponse> {
  const suffix =
    result && result !== "__all"
      ? `?result=${encodeURIComponent(result)}`
      : "";
  const response = await authRequest<BiometricBootstrapResponse>(
    `/bootstrap/biometric${suffix}`,
  );

  return {
    ...response,
    employees: (response.employees ?? []).map(normalizeManagerEmployee),
    reviews: response.reviews ?? null,
    result: response.result ?? "__all",
  };
}

export async function startBiometricEnrollment() {
  return authRequest("/biometric/enroll/start", {
    method: "POST",
    body: JSON.stringify({ consentVersion: "v1" }),
  });
}

export async function completeBiometricEnrollment() {
  return completeBiometricEnrollmentWithArtifacts([], null);
}

export async function completeBiometricEnrollmentWithArtifacts(
  artifacts: string[],
  captureMetadata: Record<string, unknown> | null,
) {
  return authRequest("/biometric/enroll/complete", {
    method: "POST",
    body: JSON.stringify({
      artifacts,
      captureMetadata,
    }),
  });
}

export async function verifyBiometric(intent = "attendance") {
  return verifyBiometricWithArtifacts(intent, [], null);
}

export async function verifyBiometricWithArtifacts(
  intent = "attendance",
  artifacts: string[],
  captureMetadata: Record<string, unknown> | null,
) {
  return authRequest<{
    verificationId: string;
    result: "PASSED" | "FAILED" | "REVIEW";
    livenessScore: number | null;
    matchScore: number | null;
  }>("/biometric/verify", {
    method: "POST",
    body: JSON.stringify({
      intent,
      artifacts,
      captureMetadata,
    }),
  });
}

export async function queueVerifyBiometricWithArtifacts(
  intent = "attendance",
  artifacts: string[],
  captureMetadata: Record<string, unknown> | null,
) {
  return authRequest("/biometric/verify/async", {
    method: "POST",
    body: JSON.stringify({
      intent,
      artifacts,
      captureMetadata,
    }),
  });
}

export async function loadMyBiometricJob(
  jobId: string,
): Promise<BiometricJobItem> {
  return authRequest<BiometricJobItem>(`/biometric/jobs/${jobId}`);
}

export async function loadMyTimeOffBalances(): Promise<MyTimeOffBalancesResponse> {
  const response = await loadRequestsBootstrap();
  if (!response.initialData.balances) {
    throw new Error("Time off balances are unavailable.");
  }
  return response.initialData.balances;
}

export async function loadMyRequests(): Promise<EmployeeRequestItem[]> {
  const response = await loadRequestsBootstrap();
  return response.initialData.items;
}

export async function loadMyRequestCalendar(
  dateFrom: string,
  dateTo: string,
): Promise<RequestsCalendarResponse> {
  const response = await loadRequestsBootstrap({ dateFrom, dateTo });
  if (!response.initialData.calendar) {
    throw new Error("Request calendar is unavailable.");
  }
  return response.initialData.calendar;
}

export async function loadRequestsBootstrap(query?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<RequestsBootstrapResponse> {
  const params = new URLSearchParams();
  if (query?.dateFrom) {
    params.set("dateFrom", query.dateFrom);
  }
  if (query?.dateTo) {
    params.set("dateTo", query.dateTo);
  }

  const queryString = params.toString();
  return authRequest<RequestsBootstrapResponse>(
    `/bootstrap/requests${queryString ? `?${queryString}` : ""}`,
  );
}

export async function createMyRequest(payload: {
  requestType: EmployeeRequestItem["requestType"];
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
  return authRequest<EmployeeRequestItem>("/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addRequestComment(requestId: string, body: string) {
  return authRequest(`/requests/${requestId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function loadMyTasks(query?: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<TaskItem[]> {
  const response = await loadDashboardBootstrap({
    dateFrom: query?.dateFrom ?? query?.date,
    dateTo: query?.dateTo ?? query?.date,
  });

  return (
    response.initialData.personalTaskBoard?.tasks ??
    response.initialData.taskBoard?.tasks ??
    []
  );
}

export async function updateMyTaskStatus(
  taskId: string,
  status: TaskItem["status"],
) {
  return authRequest<TaskItem>(`/collaboration/tasks/${taskId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function addMyTaskPhotoProof(
  taskId: string,
  payload: {
    action: "add" | "replace";
    fileName: string;
    dataUrl: string;
    targetProofId?: string;
  },
) {
  return authRequest<TaskItem>(`/collaboration/tasks/${taskId}/photo-proofs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteMyTaskPhotoProof(taskId: string, proofId: string) {
  return authRequest<TaskItem>(
    `/collaboration/tasks/${taskId}/photo-proofs/${proofId}`,
    {
      method: "DELETE",
    },
  );
}

export type RescheduleMyTaskResponse = {
  task: TaskItem;
  replacedTaskId: string | null;
};

export async function rescheduleMyTask(
  taskId: string,
  dueAt: string,
  comment?: string,
) {
  return authRequest<RescheduleMyTaskResponse>(
    `/collaboration/tasks/${taskId}/reschedule`,
    {
      method: "POST",
      body: JSON.stringify({
        dueAt,
        ...(comment ? { comment } : {}),
      }),
    },
  );
}

export async function toggleMyTaskChecklistItem(
  taskId: string,
  itemId: string,
) {
  return authRequest<TaskItem>(
    `/collaboration/tasks/${taskId}/checklist/${itemId}/toggle`,
    {
      method: "POST",
    },
  );
}

export async function addMyTaskComment(taskId: string, body: string) {
  return authRequest<TaskItem>(`/collaboration/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function loadMyAnnouncements(): Promise<AnnouncementItem[]> {
  const response = await loadNewsBootstrap();
  return response.initialData.items;
}

export async function loadManagerAnnouncements(): Promise<AnnouncementItem[]> {
  const response = await loadNewsBootstrap();
  return response.initialData.items;
}

export async function loadNewsBootstrap(): Promise<NewsBootstrapResponse<ManagerEmployeeItem>> {
  const response = await authRequest<NewsBootstrapResponse>("/bootstrap/news");

  return {
    ...response,
    initialData: {
      ...response.initialData,
      employees: (response.initialData.employees ?? []).map(
        normalizeManagerEmployee,
      ),
      groups: response.initialData.groups ?? [],
      items: response.initialData.items ?? [],
    },
  };
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
  linkUrl?: string;
  attachmentLocation?: {
    address: string;
    latitude: number;
    longitude: number;
    placeId?: string;
  };
  attachments?: Array<{
    dataUrl: string;
    fileName: string;
  }>;
  imageDataUrl?: string;
  imageAspectRatio?: AnnouncementImageAspectRatio;
  scheduledFor?: string;
}) {
  const normalizedGroupIds = Array.from(
    new Set([input.groupId, ...(input.groupIds ?? [])].filter(Boolean)),
  );
  const normalizedTargetEmployeeIds = Array.from(
    new Set(
      [input.targetEmployeeId, ...(input.targetEmployeeIds ?? [])].filter(
        Boolean,
      ),
    ),
  );

  return authRequest<AnnouncementItem>("/collaboration/announcements", {
    method: "POST",
    body: JSON.stringify({
      audience: input.audience ?? "ALL",
      title: input.title,
      body: input.body,
      isPinned: input.isPinned ?? false,
      ...(normalizedGroupIds.length === 1
        ? { groupId: normalizedGroupIds[0] }
        : {}),
      ...(normalizedGroupIds.length > 1
        ? { groupIds: normalizedGroupIds }
        : {}),
      ...(normalizedTargetEmployeeIds.length === 1
        ? { targetEmployeeId: normalizedTargetEmployeeIds[0] }
        : {}),
      ...(normalizedTargetEmployeeIds.length > 1
        ? { targetEmployeeIds: normalizedTargetEmployeeIds }
        : {}),
      ...(input.linkUrl ? { linkUrl: input.linkUrl } : {}),
      ...(input.attachmentLocation
        ? { attachmentLocation: input.attachmentLocation }
        : {}),
      ...(input.attachments?.length
        ? { attachments: input.attachments }
        : {}),
      ...(input.imageDataUrl ? { imageDataUrl: input.imageDataUrl } : {}),
      ...(input.imageAspectRatio
        ? { imageAspectRatio: input.imageAspectRatio }
        : {}),
      ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}),
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
    linkUrl?: string;
    removeLink?: boolean;
    attachmentLocation?: {
      address: string;
      latitude: number;
      longitude: number;
      placeId?: string;
    };
    removeAttachmentLocation?: boolean;
    attachments?: Array<{
      dataUrl: string;
      fileName: string;
    }>;
    removeAttachments?: boolean;
  },
) {
  return authRequest<AnnouncementItem>(
    `/collaboration/announcements/${announcementId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteManagerAnnouncement(announcementId: string) {
  return authRequest<{ success: boolean }>(
    `/collaboration/announcements/${announcementId}`,
    {
      method: "DELETE",
    },
  );
}

export async function markMyAnnouncementRead(announcementId: string): Promise<{
  success: boolean;
  notificationId?: string | null;
  readAt?: string | null;
}> {
  return authRequest(`/collaboration/announcements/${announcementId}/read`, {
    method: "POST",
  });
}

export async function loadMyInbox(): Promise<EmployeeInboxResponse> {
  return authRequest<EmployeeInboxResponse>("/collaboration/inbox/me");
}

export async function loadMyInboxSummary(): Promise<EmployeeInboxSummary> {
  return authRequest<EmployeeInboxSummary>("/collaboration/inbox-summary/me");
}

export async function loadMyChats(): Promise<ChatThreadItem[]> {
  return authRequest<ChatThreadItem[]>("/collaboration/chats");
}

export async function markMyChatRead(threadId: string) {
  return authRequest(`/collaboration/chats/${threadId}/read`, {
    method: "POST",
  });
}

export async function sendMyChatMessage(threadId: string, body: string) {
  return authRequest<ChatThreadItem>(
    `/collaboration/chats/${threadId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    },
  );
}

export async function markMyNotificationRead(notificationId: string) {
  return authRequest(`/notifications/${notificationId}/read`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function loadManagerLiveSessions(): Promise<
  AttendanceLiveSession[]
> {
  const response = await loadAttendanceBootstrap();
  return response.liveSessions;
}

export async function loadManagerApprovalInbox(): Promise<ApprovalInboxItem[]> {
  const response = await loadRequestsBootstrap();
  return response.initialData.inbox;
}

export async function loadManagerTasks(query?: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<TaskItem[]> {
  if (query?.date || query?.dateFrom || query?.dateTo) {
    const response = await loadManagerTasksBootstrap({
      dateFrom: query.dateFrom ?? query.date,
      dateTo: query.dateTo ?? query.date,
    });
    return response.tasks;
  }

  const response = await loadCollaborationBootstrap();
  return response.taskBoard?.tasks ?? [];
}

export async function loadCollaborationBootstrap(query?: {
  days?: number;
  search?: string;
  status?: string;
  priority?: string;
  groupId?: string;
  assigneeEmployeeId?: string;
  departmentId?: string;
  locationId?: string;
  onlyOverdue?: boolean;
}): Promise<CollaborationBootstrapResponse<ManagerEmployeeItem>> {
  const searchParams = new URLSearchParams();

  if (query?.days) {
    searchParams.set("days", String(query.days));
  }

  for (const key of [
    "search",
    "status",
    "priority",
    "groupId",
    "assigneeEmployeeId",
    "departmentId",
    "locationId",
  ] as const) {
    const value = query?.[key];
    if (value) {
      searchParams.set(key, value);
    }
  }

  if (query?.onlyOverdue !== undefined) {
    searchParams.set("onlyOverdue", query.onlyOverdue ? "true" : "false");
  }

  const suffix = searchParams.toString();
  const response = await authRequest<CollaborationBootstrapResponse>(
    `/bootstrap/collaboration${suffix ? `?${suffix}` : ""}`,
  );

  return {
    ...response,
    employees: (response.employees ?? []).map(normalizeManagerEmployee),
  };
}

export async function loadManagerTasksBootstrap(query?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<ManagerTasksBootstrapResponse<ManagerEmployeeItem>> {
  const searchParams = new URLSearchParams();

  if (query?.dateFrom) {
    searchParams.set("dateFrom", query.dateFrom);
  }

  if (query?.dateTo) {
    searchParams.set("dateTo", query.dateTo);
  }

  const suffix = searchParams.toString();
  const response = await authRequest<ManagerTasksBootstrapResponse>(
    `/bootstrap/tasks${suffix ? `?${suffix}` : ""}`,
  );

  return {
    ...response,
    employees: response.employees.map(normalizeManagerEmployee),
    groups: response.groups ?? [],
    liveSessions: response.liveSessions ?? [],
    tasks: response.tasks ?? [],
  };
}

export async function loadManagerAttendanceHistory(
  employeeId: string,
  dateFrom: string,
  dateTo: string,
) {
  return authRequest<AttendanceHistoryResponse>(
    `/attendance/employees/${employeeId}/history?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`,
  );
}

export type MobileEmployeesBootstrapResponse = Omit<
  EmployeesBootstrapResponse,
  "employeeRecords"
> & {
  employeeRecords: ManagerEmployeeItem[];
  groups: WorkGroupItem[];
};

export async function loadEmployeesBootstrap(): Promise<MobileEmployeesBootstrapResponse> {
  const response = await authRequest<EmployeesBootstrapResponse>(
    "/bootstrap/employees",
  );

  return {
    ...response,
    employeeRecords: (response.employeeRecords ?? []).map(
      normalizeManagerEmployee,
    ),
    liveSessions: response.liveSessions ?? [],
    groups: response.groups ?? response.overview?.groups ?? [],
    pendingInvitations: response.pendingInvitations ?? [],
    scheduleShifts: response.scheduleShifts ?? [],
    scheduleTemplates: response.scheduleTemplates ?? [],
    organizationSetup: response.organizationSetup ?? null,
    overview: response.overview ?? null,
    canCheckWorkdays: response.canCheckWorkdays ?? false,
  };
}

export async function loadManagerEmployees(): Promise<ManagerEmployeeItem[]> {
  const response = await loadEmployeesBootstrap();
  return response.employeeRecords;
}

export async function loadManagerGroups(): Promise<WorkGroupItem[]> {
  const response = await loadEmployeesBootstrap();
  return response.groups;
}

export async function createManagerTask(payload: {
  title: string;
  description?: string;
  priority?: TaskItem["priority"];
  requiresPhoto?: boolean;
  dueAt?: string;
  assigneeEmployeeId?: string;
  groupId?: string;
}) {
  return authRequest<TaskItem>("/collaboration/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createManagerTaskTemplate(payload: {
  title: string;
  description?: string;
  priority?: TaskItem["priority"];
  requiresPhoto?: boolean;
  expandOnDemand?: boolean;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
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
  return authRequest<TaskTemplateItem>("/collaboration/task-templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loadEmployeesList(): Promise<
  { id: string; firstName: string; lastName: string }[]
> {
  const response = await loadEmployeesBootstrap();
  return response.employeeRecords.map((emp) => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
  }));
}
