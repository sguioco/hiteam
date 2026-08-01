"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  MapPin,
  Monitor,
  ScanFace,
  ShieldAlert,
  User,
  Users,
  XCircle,
} from "lucide-react";
import {
  AttendanceAnomalyResponse,
  EmployeeAccessRole,
  EmployeeDetailBootstrapResponse,
  EmployeeDetailRecord,
  AttendanceHistoryResponse,
  EmployeeBiometricHistoryResponse,
  EmployeeManagerAccessResponse,
  EmployeeWorkMode,
  OrganizationLocationSummary,
  WorkGroupItem,
} from "@smart/types";
import { AdminShell } from "../../../components/admin-shell";
import { Table } from "../../../components/application/table/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { apiRequest } from "../../../lib/api";
import {
  getSession,
  hasDesktopAdminAccess,
  hasManagerAccess as hasWorkspaceManagerAccess,
} from "../../../lib/auth";
import { useI18n } from "../../../lib/i18n";
import {
  getRuntimeLocale,
  getRuntimeLocaleTag,
} from "../../../lib/runtime-locale";
import { getAvatarInitials } from "../../../lib/avatar-placeholder";

type EmployeeDetails = EmployeeDetailRecord;
type Tab = "info" | "attendance" | "biometric" | "anomalies";

type EmployeeManagerAccess = EmployeeManagerAccessResponse;
const DEFAULT_TEAM_AVATAR_EMOJI = "👥";

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (getRuntimeLocale() === "ru") {
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
  }
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(getRuntimeLocaleTag(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(getRuntimeLocaleTag(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(getRuntimeLocaleTag(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDevicePlatform(platform: string, locale: string) {
  switch (platform) {
    case "IOS":
      return locale === "ru" ? "iPhone / iPad" : "iPhone / iPad";
    case "ANDROID":
      return "Android";
    case "WEB":
      return locale === "ru" ? "Веб / десктоп" : "Web / desktop";
    default:
      return platform;
  }
}

function normalizeEmployeeWorkMode(workMode?: string | null): EmployeeWorkMode {
  return workMode === "FIELD" ? "FIELD" : "STATIONARY";
}

function getEmployeeWorkModeLabel(workMode: EmployeeWorkMode, locale: string) {
  if (workMode === "FIELD") {
    return locale === "ru" ? "Выездной" : "Field";
  }

  return locale === "ru" ? "Штатный" : "Stationary";
}

function getEmployeeWorkModeDescription(
  workMode: EmployeeWorkMode,
  locale: string,
) {
  if (workMode === "FIELD") {
    return locale === "ru"
      ? "Не зависит от офисной точки: координаты каждой отметки сохраняются в истории."
      : "Not tied to the office point: every check-in coordinate is stored in history.";
  }

  return locale === "ru"
    ? "Отметки проверяются по основной локации или локации смены."
    : "Check-ins are validated against the primary or shift location.";
}

function getEnrollmentStatusLabel(
  status: string | null | undefined,
  locale: string,
) {
  switch (status) {
    case "ENROLLED":
      return locale === "ru" ? "Зарегистрирован" : "Registered";
    case "PENDING":
      return locale === "ru"
        ? "Регистрация не завершена"
        : "Registration pending";
    case "FAILED":
      return locale === "ru" ? "Ошибка регистрации" : "Registration failed";
    case "NOT_STARTED":
    default:
      return locale === "ru" ? "Не зарегистрирован" : "Not registered";
  }
}

function getEnrollmentStatusClassName(status: string | null | undefined) {
  switch (status) {
    case "ENROLLED":
      return "text-green-600";
    case "PENDING":
      return "text-amber-600";
    case "FAILED":
      return "text-red-600";
    case "NOT_STARTED":
    default:
      return "text-muted-foreground";
  }
}

function resolveTeamAvatarEmoji(group?: { avatarEmoji?: string | null }) {
  return group?.avatarEmoji?.trim() || DEFAULT_TEAM_AVATAR_EMOJI;
}

function getEmployeeAccessRoleFromManagerAccess(
  managerAccess?: EmployeeManagerAccess | null,
): EmployeeAccessRole {
  if (managerAccess?.hasAdminRole) return "owner";
  if (managerAccess?.hasManagerAccess) return "team_leader";
  return "employee";
}

function getEmployeeAccessRoleLabel(role: EmployeeAccessRole, locale: string) {
  if (role === "owner") return locale === "ru" ? "Владелец" : "Owner";
  if (role === "team_leader")
    return locale === "ru" ? "Лидер бригады" : "Team leader";
  return locale === "ru" ? "Сотрудник" : "Employee";
}

function TeamChoiceGrid({
  groups,
  selectedGroupId,
  onSelect,
  locale,
}: {
  groups: WorkGroupItem[];
  selectedGroupId: string;
  onSelect: (groupId: string) => void;
  locale: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {groups.map((group) => {
        const selected = selectedGroupId === group.id;
        return (
          <button
            aria-pressed={selected}
            className={`min-h-[92px] rounded-2xl border p-3 text-center transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.96] ${
              selected
                ? "border-[#546cf2] bg-[#eef3ff] shadow-[0_10px_26px_rgba(37,99,235,0.12)]"
                : "border-border bg-white text-muted-foreground hover:border-[#cbd5ff] hover:bg-[#f7f9ff] hover:text-foreground"
            }`}
            key={group.id}
            onClick={() => onSelect(group.id)}
            type="button"
          >
            <span className="block text-2xl leading-none">
              {resolveTeamAvatarEmoji(group)}
            </span>
            <span className="mt-2 block truncate text-sm font-semibold text-foreground">
              {group.name}
            </span>
            <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
              {group.memberships.length}{" "}
              {locale === "ru" ? "чел." : "people"}
            </span>
          </button>
        );
      })}
      <button
        aria-pressed={selectedGroupId === "__none"}
        className={`min-h-[92px] rounded-2xl border border-dashed p-3 text-center transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.96] ${
          selectedGroupId === "__none"
            ? "border-[#546cf2] bg-[#eef3ff] shadow-[0_10px_26px_rgba(37,99,235,0.12)]"
            : "border-border bg-white text-muted-foreground hover:border-[#cbd5ff] hover:bg-[#f7f9ff] hover:text-foreground"
        }`}
        onClick={() => onSelect("__none")}
        type="button"
      >
        <span className="block text-2xl leading-none">—</span>
        <span className="mt-2 block text-sm font-semibold text-foreground">
          {locale === "ru" ? "Без бригады" : "No team"}
        </span>
        <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
          {locale === "ru" ? "Снять привязку" : "Clear team"}
        </span>
      </button>
    </div>
  );
}

async function settleRequest<T>(request: Promise<T>) {
  try {
    return { ok: true as const, data: await request };
  } catch {
    return { ok: false as const };
  }
}

function SectionState({
  icon: Icon,
  message,
  tone = "muted",
}: {
  icon: typeof User;
  message: string;
  tone?: "muted" | "error";
}) {
  const iconClassName =
    tone === "error"
      ? "mb-2 size-8 text-red-500 opacity-60"
      : "mb-2 size-8 opacity-40";

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
      <Icon className={iconClassName} />
      <p className="font-medium">{message}</p>
    </div>
  );
}

export type EmployeeDetailPageInitialData = EmployeeDetailBootstrapResponse;

export default function EmployeeCardPageClient({
  initialData,
}: {
  initialData?: EmployeeDetailPageInitialData | null;
}) {
  const { locale } = useI18n();
  const employeeId = initialData?.employeeId ?? "";
  const [employee, setEmployee] = useState<EmployeeDetails | null>(
    initialData?.employee ?? null,
  );
  const [history, setHistory] = useState<AttendanceHistoryResponse | null>(
    initialData?.history ?? null,
  );
  const [anomalies, setAnomalies] = useState<AttendanceAnomalyResponse | null>(
    initialData?.anomalies ?? null,
  );
  const [biometricHistory, setBiometricHistory] =
    useState<EmployeeBiometricHistoryResponse | null>(
      initialData?.biometricHistory ?? null,
    );
  const [managerAccess, setManagerAccess] =
    useState<EmployeeManagerAccess | null>(initialData?.managerAccess ?? null);
  const [groups, setGroups] = useState<WorkGroupItem[]>(
    initialData?.groups ?? [],
  );
  const [tab, setTab] = useState<Tab>("attendance");
  const [deviceActionId, setDeviceActionId] = useState<string | null>(null);
  const [roleActionPending, setRoleActionPending] = useState(false);
  const [teamActionPending, setTeamActionPending] = useState(false);
  const [assignmentTeamId, setAssignmentTeamId] = useState("__none");
  const [assignmentRole, setAssignmentRole] =
    useState<EmployeeAccessRole>("employee");
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [workModeActionPending, setWorkModeActionPending] = useState(false);
  const [locations, setLocations] = useState<OrganizationLocationSummary[]>(
    initialData?.locations ?? [],
  );
  const [locationActionPending, setLocationActionPending] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [selectedVerificationId, setSelectedVerificationId] = useState<
    string | null
  >(null);
  const [selectedAttendanceSessionId, setSelectedAttendanceSessionId] =
    useState<string | null>(null);
  const session = getSession();
  const canManageRoles = hasDesktopAdminAccess(session?.user.roleCodes ?? []);
  const canManageWorkMode = hasWorkspaceManagerAccess(
    session?.user.roleCodes ?? [],
  );
  const initialDataIsComplete = Boolean(
    initialData?.employee &&
      initialData?.history &&
      initialData?.anomalies &&
      initialData?.biometricHistory &&
      initialData?.groups &&
      (!canManageRoles || initialData?.managerAccess),
  );
  const didUseInitialData = useRef(Boolean(initialData) && initialDataIsComplete);

  async function loadEmployeePageData(targetEmployeeId: string) {
    const session = getSession();
    if (!session || !targetEmployeeId) return;

    const result = await settleRequest(
      apiRequest<EmployeeDetailPageInitialData>(
        `/bootstrap/employees/${targetEmployeeId}`,
        {
          token: session.accessToken,
        },
      ),
    );

    if (!result.ok) {
      setNotice({
        kind: "error",
        text:
          locale === "ru"
            ? "Не удалось загрузить данные сотрудника."
            : "Failed to load employee data.",
      });
      return;
    }

    setEmployee(result.data.employee);
    setHistory(result.data.history);
    setAnomalies(result.data.anomalies);
    setBiometricHistory(result.data.biometricHistory);
    setManagerAccess(result.data.managerAccess);
    setGroups(result.data.groups ?? []);
    setLocations(result.data.locations ?? []);
  }

  async function loadLocations() {
    const session = getSession();
    if (!session) return;

    const result = await settleRequest(
      apiRequest<OrganizationLocationSummary[]>("/org/locations", {
        token: session.accessToken,
      }),
    );
    if (result.ok) setLocations(result.data);
  }

  useEffect(() => {
    if (!employeeId) return;

    if (didUseInitialData.current) {
      didUseInitialData.current = false;
      return;
    }

    void loadEmployeePageData(employeeId);
  }, [employeeId, canManageRoles]);

  useEffect(() => {
    if (canManageWorkMode && initialData?.locations === undefined) {
      void loadLocations();
    }
  }, [canManageWorkMode, initialData?.locations]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const tabs: { key: Tab; label: string; icon: typeof User; count?: number }[] =
    useMemo(
      () => [
        {
          key: "attendance",
          label:
            locale === "ru" ? "Check-in / Check-out" : "Check-in / Check-out",
          icon: Clock,
          count: history?.rows.length,
        },
        {
          key: "biometric",
          label: locale === "ru" ? "Биометрия" : "Biometric",
          icon: ScanFace,
          count: biometricHistory?.verifications.length,
        },
        {
          key: "anomalies",
          label: locale === "ru" ? "Аномалии" : "Anomalies",
          icon: ShieldAlert,
          count: anomalies?.items.length,
        },
        {
          key: "info",
          label: locale === "ru" ? "Информация" : "Info",
          icon: User,
        },
      ],
      [locale, history, biometricHistory, anomalies],
    );

  const fullName = employee
    ? `${employee.lastName} ${employee.firstName}`
    : "...";
  const currentTeam = useMemo(
    () =>
      groups.find((group) =>
        group.memberships.some((membership) => membership.employeeId === employeeId),
      ) ?? null,
    [groups, employeeId],
  );
  const currentAccessRole = getEmployeeAccessRoleFromManagerAccess(managerAccess);
  const canManageTeamAssignment = canManageWorkMode && currentAccessRole !== "owner";
  const employeeWorkMode = normalizeEmployeeWorkMode(employee?.workMode);
  const isFieldManager =
    employeeWorkMode === "FIELD" && Boolean(managerAccess?.hasManagerAccess);
  const canPromoteToFieldManager = Boolean(
    managerAccess &&
    (managerAccess.hasManagerAccess || managerAccess.canToggleManagerAccess),
  );
  const selectedVerification = useMemo(
    () =>
      biometricHistory?.verifications.find(
        (item) => item.id === selectedVerificationId,
      ) ?? null,
    [biometricHistory, selectedVerificationId],
  );
  const selectedVerificationArtifacts =
    selectedVerification?.artifacts.filter((artifact) => artifact.url) ?? [];
  const selectedAttendanceSession = useMemo(
    () =>
      history?.rows.find((item) => item.sessionId === selectedAttendanceSessionId) ??
      null,
    [history, selectedAttendanceSessionId],
  );
  const selectedCheckInVerification = useMemo(
    () =>
      biometricHistory?.verifications.find(
        (item) =>
          item.attendanceEvent?.id === selectedAttendanceSession?.checkInEvent.eventId,
      ) ?? null,
    [biometricHistory, selectedAttendanceSession],
  );
  const selectedCheckOutVerification = useMemo(
    () =>
      biometricHistory?.verifications.find(
        (item) =>
          item.attendanceEvent?.id === selectedAttendanceSession?.checkOutEvent?.eventId,
      ) ?? null,
    [biometricHistory, selectedAttendanceSession],
  );
  const biometricStatusLabel = getEnrollmentStatusLabel(
    biometricHistory?.profile?.enrollmentStatus,
    locale,
  );
  const biometricStatusClassName = getEnrollmentStatusClassName(
    biometricHistory?.profile?.enrollmentStatus,
  );
  const biometricEnrolledAt = biometricHistory?.profile?.enrolledAt ?? null;
  const biometricLastVerifiedAt =
    biometricHistory?.profile?.lastVerifiedAt ?? null;
  const primaryBiometricUrl = useMemo(() => {
    if (biometricHistory?.profile?.templateUrl) {
      return biometricHistory.profile.templateUrl;
    }

    for (const verification of biometricHistory?.verifications ?? []) {
      const previewArtifact = verification.artifacts.find(
        (artifact) => artifact.url,
      );
      if (previewArtifact?.url) {
        return previewArtifact.url;
      }
    }

    return null;
  }, [biometricHistory]);

  useEffect(() => {
    setAssignmentTeamId(currentTeam?.id ?? "__none");
    setAssignmentRole(currentAccessRole);
    setAssignmentError(null);
  }, [currentTeam?.id, currentAccessRole, employeeId]);

  async function handleSaveTeamAssignment() {
    const session = getSession();
    if (!session || !employeeId || !employee || teamActionPending) return;

    const nextTeamId = assignmentTeamId === "__none" ? "" : assignmentTeamId;

    if (assignmentRole === "team_leader" && !nextTeamId) {
      setAssignmentError(
        locale === "ru"
          ? "Лидеру бригады нужно выбрать бригаду."
          : "Team leader must be assigned to a team.",
      );
      return;
    }

    if (assignmentRole === "owner" && nextTeamId) {
      setAssignmentError(
        locale === "ru"
          ? "Владельца нельзя привязать к бригаде."
          : "Owner cannot be assigned to a team.",
      );
      return;
    }

    const payload: { teamId: string; role?: EmployeeAccessRole } = {
      teamId: nextTeamId,
    };

    if (assignmentRole !== currentAccessRole && assignmentRole !== "owner") {
      payload.role = assignmentRole;
    }

    setTeamActionPending(true);
    setAssignmentError(null);

    try {
      await apiRequest(`/employees/${employeeId}`, {
        method: "PATCH",
        token: session.accessToken,
        body: JSON.stringify(payload),
      });
      await loadEmployeePageData(employeeId);
      setNotice({
        kind: "success",
        text:
          locale === "ru"
            ? "Бригада и роль сотрудника обновлены."
            : "Employee team and role updated.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : locale === "ru"
            ? "Не удалось сохранить назначение."
            : "Failed to save assignment.";
      setAssignmentError(message);
      setNotice({
        kind: "error",
        text: message,
      });
    } finally {
      setTeamActionPending(false);
    }
  }

  async function handleTransferLocation(locationId: string) {
    const session = getSession();
    if (
      !session ||
      !employeeId ||
      !employee ||
      locationActionPending ||
      locationId === employee.primaryLocation.id
    ) {
      return;
    }

    setLocationActionPending(true);
    try {
      await apiRequest(`/employees/${employeeId}/location`, {
        method: "PATCH",
        token: session.accessToken,
        body: JSON.stringify({
          locationId,
          futureShiftStrategy: "keep",
          reason:
            locale === "ru"
              ? "Перенос из карточки сотрудника"
              : "Transferred from employee profile",
        }),
      });
      await loadEmployeePageData(employeeId);
      setNotice({
        kind: "success",
        text:
          locale === "ru"
            ? "Основная локация сотрудника изменена."
            : "Employee primary location updated.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : locale === "ru"
              ? "Не удалось перенести сотрудника."
              : "Failed to transfer employee.",
      });
    } finally {
      setLocationActionPending(false);
    }
  }

  async function handleDetachDevice(deviceId: string, deviceLabel: string) {
    const session = getSession();
    if (!session || !employeeId) return;

    const confirmed =
      typeof window === "undefined" ||
      window.confirm(
        locale === "ru"
          ? `Отвязать устройство "${deviceLabel}" от сотрудника?`
          : `Detach "${deviceLabel}" from this employee?`,
      );

    if (!confirmed) {
      return;
    }

    setDeviceActionId(deviceId);

    try {
      await apiRequest(`/devices/employees/${employeeId}/${deviceId}`, {
        method: "DELETE",
        token: session.accessToken,
      });
      await loadEmployeePageData(employeeId);
      setNotice({
        kind: "success",
        text: locale === "ru" ? "Устройство отвязано." : "Device detached.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : locale === "ru"
              ? "Не удалось отвязать устройство."
              : "Failed to detach device.",
      });
    } finally {
      setDeviceActionId(null);
    }
  }

  async function handleToggleManagerAccess() {
    const session = getSession();
    if (
      !session ||
      !employeeId ||
      !managerAccess ||
      !managerAccess.canToggleManagerAccess
    ) {
      return;
    }

    const nextValue = !managerAccess.hasManagerAccess;
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(
        nextValue
          ? locale === "ru"
            ? "Выдать сотруднику доступ менеджера?"
            : "Grant manager access to this employee?"
          : locale === "ru"
            ? "Снять с сотрудника доступ менеджера и вернуть роль обычного работника?"
            : "Remove manager access and turn this user back into a regular employee?",
      );

    if (!confirmed) {
      return;
    }

    setRoleActionPending(true);

    try {
      const nextAccess = await apiRequest<EmployeeManagerAccess>(
        `/employees/${employeeId}/manager-access`,
        {
          method: "PATCH",
          token: session.accessToken,
          body: JSON.stringify({
            grantManagerAccess: nextValue,
          }),
        },
      );
      setManagerAccess(nextAccess);
      setNotice({
        kind: "success",
        text: nextValue
          ? locale === "ru"
            ? "Сотрудник переведён в менеджеры."
            : "Employee promoted to manager."
          : locale === "ru"
            ? "Сотрудник переведён в обычные работники."
            : "Employee moved back to regular staff.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : locale === "ru"
              ? "Не удалось изменить роль сотрудника."
              : "Failed to update employee role.",
      });
    } finally {
      setRoleActionPending(false);
    }
  }

  async function saveEmployeeWorkMode(nextWorkMode: EmployeeWorkMode) {
    const session = getSession();
    if (!session || !employeeId) {
      throw new Error(
        locale === "ru" ? "Сессия не найдена." : "Session not found.",
      );
    }

    const updatedEmployee = await apiRequest<EmployeeDetails>(
      `/employees/${employeeId}/work-mode`,
      {
        method: "PATCH",
        token: session.accessToken,
        body: JSON.stringify({ workMode: nextWorkMode }),
      },
    );

    setEmployee((current) =>
      current
        ? { ...current, workMode: updatedEmployee.workMode }
        : updatedEmployee,
    );

    return updatedEmployee;
  }

  async function handleUpdateWorkMode(nextWorkMode: EmployeeWorkMode) {
    if (
      !employee ||
      nextWorkMode === employeeWorkMode ||
      workModeActionPending
    ) {
      return;
    }

    setWorkModeActionPending(true);

    try {
      await saveEmployeeWorkMode(nextWorkMode);
      setNotice({
        kind: "success",
        text:
          nextWorkMode === "FIELD"
            ? locale === "ru"
              ? "Сотрудник переведён в выездной режим."
              : "Employee switched to field mode."
            : locale === "ru"
              ? "Сотрудник переведён в штатный режим."
              : "Employee switched to stationary mode.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : locale === "ru"
              ? "Не удалось изменить режим сотрудника."
              : "Failed to update employee mode.",
      });
    } finally {
      setWorkModeActionPending(false);
    }
  }

  async function handlePromoteToFieldManager() {
    const session = getSession();
    if (!session || !employeeId || !managerAccess) {
      return;
    }

    const needsManagerAccess = !managerAccess.hasManagerAccess;
    const nextWorkMode: EmployeeWorkMode = isFieldManager
      ? "STATIONARY"
      : "FIELD";
    const needsWorkModeChange = employeeWorkMode !== nextWorkMode;

    if (needsManagerAccess && !managerAccess.canToggleManagerAccess) {
      setNotice({
        kind: "error",
        text:
          locale === "ru"
            ? "Нельзя выдать менеджерский доступ этому сотруднику."
            : "Manager access cannot be granted to this employee.",
      });
      return;
    }

    const confirmed =
      typeof window === "undefined" ||
      window.confirm(
        isFieldManager
          ? locale === "ru"
            ? "Сделать сотрудника штатным менеджером? Менеджерский доступ останется, отметки снова будут проверяться по офисной точке или смене."
            : "Make this employee a stationary manager? Manager access stays, check-ins will be validated against the office or shift point again."
          : locale === "ru"
            ? "Назначить сотрудника выездным менеджером? Он получит доступ менеджера и сможет отмечаться вне офисной точки."
            : "Assign this employee as a field manager? They will get manager access and can check in outside the office point.",
      );

    if (!confirmed) {
      return;
    }

    setRoleActionPending(needsManagerAccess);
    setWorkModeActionPending(needsWorkModeChange);

    try {
      if (needsManagerAccess) {
        const nextAccess = await apiRequest<EmployeeManagerAccess>(
          `/employees/${employeeId}/manager-access`,
          {
            method: "PATCH",
            token: session.accessToken,
            body: JSON.stringify({ grantManagerAccess: true }),
          },
        );
        setManagerAccess(nextAccess);
      }

      if (needsWorkModeChange) {
        await saveEmployeeWorkMode(nextWorkMode);
      }

      setNotice({
        kind: "success",
        text:
          nextWorkMode === "FIELD"
            ? locale === "ru"
              ? "Сотрудник назначен выездным менеджером."
              : "Employee assigned as a field manager."
            : locale === "ru"
              ? "Сотрудник назначен штатным менеджером."
              : "Employee assigned as a stationary manager.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : nextWorkMode === "FIELD"
              ? locale === "ru"
                ? "Не удалось назначить выездного менеджера."
                : "Failed to assign field manager."
              : locale === "ru"
                ? "Не удалось назначить штатного менеджера."
                : "Failed to assign stationary manager.",
      });
    } finally {
      setRoleActionPending(false);
      setWorkModeActionPending(false);
    }
  }

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/employees"
          >
            <ArrowLeft className="size-4" />
            {locale === "ru" ? "Сотрудники" : "Employees"}
          </Link>

          <div className="flex flex-wrap items-center gap-4">
            {employee?.avatarUrl ? (
              <img
                alt={fullName}
                className="size-14 rounded-full object-cover"
                src={employee.avatarUrl}
              />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-full bg-[rgba(227,231,239,0.78)] text-base font-semibold text-[rgba(72,84,104,0.72)]">
                {getAvatarInitials(fullName)}
              </span>
            )}
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {fullName}
              </h1>
              {employee && (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Briefcase className="size-3.5" />
                    {employee.position.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {employee.primaryLocation.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    {employee.department.name}
                  </span>
                </p>
              )}
              {managerAccess ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      managerAccess.hasAdminRole
                        ? "bg-violet-50 text-violet-700"
                        : managerAccess.hasManagerAccess
                          ? "bg-sky-50 text-sky-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {managerAccess.hasAdminRole
                      ? locale === "ru"
                        ? "Админ"
                        : "Admin"
                      : managerAccess.hasManagerAccess
                        ? locale === "ru"
                          ? "Менеджер"
                          : "Manager"
                        : locale === "ru"
                          ? "Сотрудник"
                          : "Employee"}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      employeeWorkMode === "FIELD"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {getEmployeeWorkModeLabel(employeeWorkMode, locale)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                    <Users className="size-3" />
                    {currentTeam
                      ? `${resolveTeamAvatarEmoji(currentTeam)} ${currentTeam.name}`
                      : locale === "ru"
                        ? "Без бригады"
                        : "No team"}
                  </span>
                </div>
              ) : null}
            </div>
            {canPromoteToFieldManager ? (
              <button
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isFieldManager
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-[#546cf2] bg-[#546cf2] text-white hover:bg-[#455bd6]"
                }`}
                disabled={roleActionPending || workModeActionPending}
                onClick={() => void handlePromoteToFieldManager()}
                type="button"
              >
                {roleActionPending || workModeActionPending
                  ? locale === "ru"
                    ? "Сохраняем..."
                    : "Saving..."
                  : isFieldManager
                    ? locale === "ru"
                      ? "Сделать штатным менеджером"
                      : "Make stationary manager"
                    : locale === "ru"
                      ? "Сделать выездным менеджером"
                      : "Make field manager"}
              </button>
            ) : null}
            {canManageRoles && managerAccess?.canToggleManagerAccess ? (
              <button
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={roleActionPending || workModeActionPending}
                onClick={() => void handleToggleManagerAccess()}
                type="button"
              >
                {roleActionPending
                  ? locale === "ru"
                    ? "Обновляем..."
                    : "Updating..."
                  : managerAccess.hasManagerAccess
                    ? locale === "ru"
                      ? "Сделать обычным сотрудником"
                      : "Downgrade to employee"
                    : locale === "ru"
                      ? "Сделать менеджером"
                      : "Upgrade to manager"}
              </button>
            ) : null}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  tab === t.key
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
                key={t.key}
                onClick={() => setTab(t.key)}
                type="button"
              >
                <Icon className="size-4" />
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span
                    className={`text-sm font-semibold leading-none ${
                      tab === t.key ? "text-white/90" : "text-muted-foreground"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {notice && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
              notice.kind === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {notice.text}
          </div>
        )}

        {employee && canManageWorkMode ? (
          <section
            className={`mb-6 rounded-2xl border p-4 sm:p-5 ${
              currentAccessRole === "owner"
                ? "border-border bg-card"
                : "border-amber-200 bg-amber-50/60"
            }`}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-foreground">
                  <Users className="size-4 text-[#546cf2]" />
                  {locale === "ru"
                    ? `Назначить ${fullName} в бригаду`
                    : `Assign ${fullName} to a team`}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentAccessRole === "owner"
                    ? locale === "ru"
                      ? "Владелец остается без бригады и имеет полный доступ."
                      : "Owner stays outside teams and keeps full access."
                    : locale === "ru"
                      ? "Выберите бригаду сотрудника. Здесь же можно сделать его лидером бригады."
                      : "Choose the employee team. You can also make them a team leader here."}
                </p>
              </div>
              <div className="grid min-w-[240px] gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-white px-3 py-2">
                  <span className="block text-muted-foreground">
                    {locale === "ru" ? "Роль" : "Role"}
                  </span>
                  <span className="mt-1 block font-semibold text-foreground">
                    {getEmployeeAccessRoleLabel(currentAccessRole, locale)}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-white px-3 py-2">
                  <span className="block text-muted-foreground">
                    {locale === "ru" ? "Бригада" : "Team"}
                  </span>
                  <span className="mt-1 block truncate font-semibold text-foreground">
                    {currentTeam
                      ? `${resolveTeamAvatarEmoji(currentTeam)} ${currentTeam.name}`
                      : locale === "ru"
                        ? "Нет"
                        : "None"}
                  </span>
                </div>
              </div>
            </div>

            {canManageTeamAssignment ? (
              <>
                <TeamChoiceGrid
                  groups={groups}
                  locale={locale}
                  onSelect={setAssignmentTeamId}
                  selectedGroupId={assignmentTeamId}
                />

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(["employee", "team_leader"] as const).map((role) => {
                    const selected = assignmentRole === role;
                    const Icon = role === "team_leader" ? Crown : User;

                    return (
                      <button
                        aria-pressed={selected}
                        className={`rounded-2xl border p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.96] ${
                          selected
                            ? "border-[#546cf2] bg-white shadow-[0_10px_26px_rgba(37,99,235,0.12)]"
                            : "border-border bg-white/80 text-muted-foreground hover:border-[#cbd5ff] hover:bg-white hover:text-foreground"
                        }`}
                        key={role}
                        onClick={() => setAssignmentRole(role)}
                        type="button"
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Icon className="size-4 text-[#546cf2]" />
                          {getEmployeeAccessRoleLabel(role, locale)}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {role === "team_leader"
                            ? locale === "ru"
                              ? "Сможет управлять задачами и посещаемостью своей бригады."
                              : "Can manage tasks and attendance for this team."
                            : locale === "ru"
                              ? "Обычный доступ сотрудника без управления бригадой."
                              : "Regular employee access without team management."}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {assignmentError ? (
                  <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {assignmentError}
                  </p>
                ) : null}

                <div className="mt-4 flex justify-end">
                  <button
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0f63e9] px-4 py-2.5 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#0b55cf] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={teamActionPending}
                    onClick={() => void handleSaveTeamAssignment()}
                    type="button"
                  >
                    {teamActionPending
                      ? locale === "ru"
                        ? "Сохраняем..."
                        : "Saving..."
                      : locale === "ru"
                        ? "Сохранить назначение"
                        : "Save assignment"}
                    <ArrowRightLeft className="size-4" />
                  </button>
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {/* Tab Content */}
        <div className="space-y-3">
          {/* ─── Attendance ─── */}
          {tab === "attendance" && (
            <>
              {history === null ? (
                <SectionState
                  icon={Clock}
                  message={
                    locale === "ru"
                      ? "Не удалось загрузить историю посещаемости."
                      : "Failed to load attendance history."
                  }
                  tone="error"
                />
              ) : history.rows.length > 0 ? (
                <div className="team-tasks-table-card">
                  <div className="team-tasks-table-shell">
                    <Table
                      aria-label={
                        locale === "ru"
                          ? "История посещаемости"
                          : "Attendance history"
                      }
                      onRowAction={(key) =>
                        setSelectedAttendanceSessionId(String(key))
                      }
                      size="sm"
                    >
                      <Table.Header>
                        <Table.Head
                          className="min-w-[130px]"
                          id="date"
                          isRowHeader
                          label={locale === "ru" ? "Дата" : "Date"}
                        />
                        <Table.Head id="checkIn" label="Check-in" />
                        <Table.Head id="checkOut" label="Check-out" />
                        <Table.Head
                          id="worked"
                          label={locale === "ru" ? "Отработано" : "Worked"}
                        />
                        <Table.Head
                          id="late"
                          label={locale === "ru" ? "Опоздание" : "Late"}
                        />
                        <Table.Head
                          id="earlyLeave"
                          label={
                            locale === "ru" ? "Ранний уход" : "Early leave"
                          }
                        />
                        <Table.Head
                          id="status"
                          label={locale === "ru" ? "Статус" : "Status"}
                        />
                      </Table.Header>
                      <Table.Body items={history.rows}>
                        {(row) => (
                          <Table.Row
                            className="team-tasks-table-row cursor-pointer"
                            id={row.sessionId}
                          >
                            <Table.Cell className="font-medium">
                              {formatDate(row.startedAt)}
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex items-center gap-1.5">
                                <span className="text-green-600">
                                  {formatTime(row.checkInEvent.occurredAt)}
                                </span>
                                {row.checkInEvent.distanceMeters !== null ? (
                                  <span className="text-[10px] text-muted-foreground">
                                    {row.checkInEvent.distanceMeters}
                                    {locale === "ru" ? "м" : "m"}
                                  </span>
                                ) : null}
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              {row.checkOutEvent ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-red-500">
                                    {formatTime(row.checkOutEvent.occurredAt)}
                                  </span>
                                  {row.checkOutEvent.distanceMeters !== null ? (
                                    <span className="text-[10px] text-muted-foreground">
                                      {row.checkOutEvent.distanceMeters}
                                      {locale === "ru" ? "м" : "m"}
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-amber-500">
                                  {locale === "ru" ? "На смене" : "On shift"}
                                </span>
                              )}
                            </Table.Cell>
                            <Table.Cell className="font-medium">
                              {formatHours(row.workedMinutes)}
                            </Table.Cell>
                            <Table.Cell>
                              {row.lateMinutes > 0 ? (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                                  {row.lateMinutes}
                                  {locale === "ru" ? "м" : "m"}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50">
                                  —
                                </span>
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              {row.earlyLeaveMinutes > 0 ? (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                                  {row.earlyLeaveMinutes}
                                  {locale === "ru" ? "м" : "m"}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50">
                                  —
                                </span>
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              {row.status === "on_shift" || row.status === "on_break" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                  <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
                                  {locale === "ru" ? "На смене" : "On shift"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <CheckCircle2 className="size-3.5 text-green-500" />
                                  {locale === "ru" ? "Завершено" : "Done"}
                                </span>
                              )}
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table>
                  </div>
                </div>
              ) : (
                <SectionState
                  icon={Clock}
                  message={
                    locale === "ru"
                      ? "Нет записей посещаемости"
                      : "No attendance records"
                  }
                />
              )}
            </>
          )}

          {/* ─── Biometric ─── */}
          {tab === "biometric" && (
            <>
              {biometricHistory === null ? (
                <SectionState
                  icon={ScanFace}
                  message={
                    locale === "ru"
                      ? "Не удалось загрузить биометрические данные сотрудника."
                      : "Failed to load biometric records for this employee."
                  }
                  tone="error"
                />
              ) : (
                <>
                  <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
                    <div className="p-4">
                      <div className="mb-3 flex items-center justify-center gap-2 text-center">
                        <ScanFace className="size-4 text-accent" />
                        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                          {locale === "ru"
                            ? "Эталонная биометрия"
                            : "Reference biometric"}
                        </h3>
                      </div>
                      {primaryBiometricUrl ? (
                        <img
                          alt={
                            locale === "ru"
                              ? "Эталонное лицо сотрудника"
                              : "Reference employee face"
                          }
                          className="h-72 w-full rounded-2xl object-cover"
                          src={primaryBiometricUrl}
                        />
                      ) : (
                        <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                          {locale === "ru"
                            ? "Сотрудник ещё не завершил первичную регистрацию лица."
                            : "The employee has not completed initial face registration yet."}
                        </div>
                      )}
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <dl className="space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/20 px-4 py-3">
                          <dt className="text-muted-foreground">
                            {locale === "ru" ? "Статус" : "Status"}
                          </dt>
                          <dd
                            className={`font-semibold ${biometricStatusClassName}`}
                          >
                            {biometricStatusLabel}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/20 px-4 py-3">
                          <dt className="text-muted-foreground">
                            {locale === "ru"
                              ? "Дата регистрации"
                              : "Registered at"}
                          </dt>
                          <dd className="font-medium text-foreground">
                            {biometricEnrolledAt
                              ? formatDate(biometricEnrolledAt)
                              : "—"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/20 px-4 py-3">
                          <dt className="text-muted-foreground">
                            {locale === "ru"
                              ? "Последняя проверка"
                              : "Last verified"}
                          </dt>
                          <dd className="font-medium text-foreground">
                            {biometricLastVerifiedAt
                              ? formatDate(biometricLastVerifiedAt)
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  {biometricHistory.verifications.length > 0 ? (
                    <div className="team-tasks-table-card">
                      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-3">
                        <div>
                          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
                            {locale === "ru"
                              ? "История верификаций"
                              : "Verification history"}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {locale === "ru"
                              ? "Автоматические сканы лица за последние 7 дней и связанные события посещаемости."
                              : "Automatic face scans from the last 7 days and linked attendance events."}
                          </p>
                        </div>
                        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                          {biometricHistory.verifications.length}
                        </span>
                      </div>
                      <div
                        className="team-tasks-table-shell overflow-y-auto"
                        style={{ maxHeight: "428px" }}
                      >
                        <Table
                          aria-label={
                            locale === "ru"
                              ? "История верификаций"
                              : "Verification history"
                          }
                          onRowAction={(key) =>
                            setSelectedVerificationId(String(key))
                          }
                          size="sm"
                        >
                          <Table.Header className="sticky top-0 z-[1]">
                            <Table.Head
                              className="min-w-[150px]"
                              id="capturedAt"
                              isRowHeader
                              label={locale === "ru" ? "Дата" : "Date"}
                            />
                            <Table.Head
                              id="result"
                              label={locale === "ru" ? "Результат" : "Result"}
                            />
                            <Table.Head id="liveness" label="Liveness" />
                            <Table.Head id="match" label="Match" />
                            <Table.Head
                              id="event"
                              label={locale === "ru" ? "Событие" : "Event"}
                            />
                            <Table.Head
                              id="note"
                              label={locale === "ru" ? "Примечание" : "Note"}
                            />
                          </Table.Header>
                          <Table.Body items={biometricHistory.verifications}>
                            {(v) => (
                              <Table.Row
                                className="team-tasks-table-row cursor-pointer"
                                id={v.id}
                              >
                                <Table.Cell className="font-medium">
                                  {formatDate(v.capturedAt)}
                                  <br />
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(v.capturedAt)}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      v.result === "PASSED"
                                        ? "bg-green-50 text-green-700"
                                        : v.result === "REVIEW"
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-red-50 text-red-700"
                                    }`}
                                  >
                                    {v.result === "PASSED" ? (
                                      <CheckCircle2 className="size-3" />
                                    ) : v.result === "FAILED" ? (
                                      <XCircle className="size-3" />
                                    ) : (
                                      <ShieldAlert className="size-3" />
                                    )}
                                    {v.result}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  {v.livenessScore !== null
                                    ? `${Math.round(v.livenessScore * 100)}%`
                                    : "—"}
                                </Table.Cell>
                                <Table.Cell>
                                  {v.matchScore !== null
                                    ? `${Math.round(v.matchScore * 100)}%`
                                    : "—"}
                                </Table.Cell>
                                <Table.Cell className="text-xs text-muted-foreground">
                                  {v.attendanceEvent
                                    ? `${v.attendanceEvent.eventType} ${formatDateTime(v.attendanceEvent.occurredAt)}`
                                    : "—"}
                                </Table.Cell>
                                <Table.Cell className="text-xs">
                                  {v.reviewReason ?? "—"}
                                </Table.Cell>
                              </Table.Row>
                            )}
                          </Table.Body>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <SectionState
                      icon={ScanFace}
                      message={
                        locale === "ru"
                          ? "Нет записей верификации"
                          : "No verification records"
                      }
                    />
                  )}
                </>
              )}
            </>
          )}

          {/* ─── Anomalies ─── */}
          {tab === "anomalies" && (
            <>
              {anomalies === null ? (
                <SectionState
                  icon={ShieldAlert}
                  message={
                    locale === "ru"
                      ? "Не удалось загрузить аномалии по сотруднику."
                      : "Failed to load anomalies for this employee."
                  }
                  tone="error"
                />
              ) : anomalies.items.length > 0 ? (
                <div className="space-y-2">
                  {anomalies.items.map((item) => (
                    <div
                      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
                      key={item.anomalyId}
                    >
                      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
                      <div>
                        <p className="font-medium text-foreground">
                          {item.summary}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {item.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <SectionState
                  icon={CheckCircle2}
                  message={
                    locale === "ru"
                      ? "Аномалий не обнаружено"
                      : "No anomalies found"
                  }
                />
              )}
            </>
          )}

          {/* ─── Info ─── */}
          {tab === "info" &&
            (employee ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    <User className="size-4" />
                    {locale === "ru" ? "Личные данные" : "Personal"}
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Имя" : "Name"}
                      </dt>
                      <dd className="font-medium">
                        {employee.lastName} {employee.firstName}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="font-medium">{employee.user.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Дата рождения" : "Date of birth"}
                      </dt>
                      <dd className="font-medium">
                        {employee.birthDate
                          ? formatDate(employee.birthDate)
                          : locale === "ru"
                            ? "Не указана"
                            : "Not set"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Дата найма" : "Hire date"}
                      </dt>
                      <dd className="font-medium">
                        {formatDate(employee.hireDate)}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    <Briefcase className="size-4" />
                    {locale === "ru" ? "Организация" : "Organization"}
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Бригада" : "Team"}
                      </dt>
                      <dd className="truncate font-medium">
                        {currentTeam
                          ? `${resolveTeamAvatarEmoji(currentTeam)} ${currentTeam.name}`
                          : locale === "ru"
                            ? "Нет"
                            : "None"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Отдел" : "Department"}
                      </dt>
                      <dd className="font-medium">
                        {employee.department.name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Должность" : "Position"}
                      </dt>
                      <dd className="font-medium">{employee.position.name}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Локация" : "Location"}
                      </dt>
                      <dd className="min-w-0 font-medium">
                        {canManageWorkMode && locations.length > 1 ? (
                          <select
                            aria-label={
                              locale === "ru"
                                ? "Основная локация сотрудника"
                                : "Employee primary location"
                            }
                            className="h-10 max-w-[250px] rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none transition-colors focus:border-[#546cf2]"
                            disabled={locationActionPending}
                            onChange={(event) =>
                              void handleTransferLocation(event.target.value)
                            }
                            value={employee.primaryLocation.id}
                          >
                            {locations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.company?.name
                                  ? `${location.company.name} · `
                                  : ""}
                                {location.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          employee.primaryLocation.name
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {locale === "ru" ? "Режим" : "Mode"}
                      </dt>
                      <dd className="font-medium">
                        {getEmployeeWorkModeLabel(employeeWorkMode, locale)}
                      </dd>
                    </div>
                    {managerAccess ? (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          {locale === "ru" ? "Роль доступа" : "Access role"}
                        </dt>
                        <dd className="font-medium">
                          {managerAccess.hasAdminRole
                            ? locale === "ru"
                              ? "Администратор"
                              : "Administrator"
                            : managerAccess.hasManagerAccess
                              ? locale === "ru"
                                ? "Менеджер"
                                : "Manager"
                              : locale === "ru"
                                ? "Сотрудник"
                                : "Employee"}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                {(employee.locationAssignments?.length ?? 0) > 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-5 sm:col-span-2">
                    <h3 className="mb-4 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      <ArrowRightLeft className="size-4" />
                      {locale === "ru"
                        ? "История локаций"
                        : "Location history"}
                    </h3>
                    <div className="space-y-2">
                      {employee.locationAssignments?.map((assignment) => (
                        <div
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm"
                          key={assignment.id}
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">
                              {assignment.location.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatDateTime(assignment.assignedAt)}
                              {assignment.unassignedAt
                                ? ` — ${formatDateTime(assignment.unassignedAt)}`
                                : locale === "ru"
                                  ? " — по настоящее время"
                                  : " — present"}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              assignment.unassignedAt
                                ? "bg-slate-100 text-slate-600"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {assignment.unassignedAt
                              ? locale === "ru"
                                ? "Завершено"
                                : "Ended"
                              : locale === "ru"
                                ? "Активна"
                                : "Active"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {canManageWorkMode ? (
                  <div className="rounded-2xl border border-border bg-card p-5 sm:col-span-2">
                    <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      <MapPin className="size-4" />
                      {locale === "ru" ? "Рабочий режим" : "Work mode"}
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(["STATIONARY", "FIELD"] as const).map((mode) => {
                        const selected = employeeWorkMode === mode;

                        return (
                          <button
                            className={`rounded-2xl border p-4 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                              selected
                                ? "border-[#546cf2] bg-[#eef3ff] text-foreground"
                                : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            }`}
                            disabled={workModeActionPending || selected}
                            key={mode}
                            onClick={() => void handleUpdateWorkMode(mode)}
                            type="button"
                          >
                            <span className="block font-semibold">
                              {getEmployeeWorkModeLabel(mode, locale)}
                            </span>
                            <span className="mt-1 block leading-5">
                              {getEmployeeWorkModeDescription(mode, locale)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="rounded-2xl border border-border bg-card p-5 sm:col-span-2">
                  <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    <Monitor className="size-4" />
                    {locale === "ru" ? "Устройства" : "Devices"}
                  </h3>
                  {employee.devices.length > 0 ? (
                    <div className="space-y-2">
                      {employee.devices.map((device) => (
                        <div
                          className="flex flex-col gap-3 rounded-xl bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                          key={device.id}
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {device.deviceName ??
                                formatDevicePlatform(device.platform, locale)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatDevicePlatform(device.platform, locale)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {device.isPrimary && (
                              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                                {locale === "ru" ? "Основное" : "Primary"}
                              </span>
                            )}
                            <button
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={deviceActionId === device.id}
                              onClick={() =>
                                void handleDetachDevice(
                                  device.id,
                                  device.deviceName ??
                                    formatDevicePlatform(
                                      device.platform,
                                      locale,
                                    ),
                                )
                              }
                              type="button"
                            >
                              {deviceActionId === device.id
                                ? locale === "ru"
                                  ? "Отвязываем..."
                                  : "Detaching..."
                                : locale === "ru"
                                  ? "Отвязать устройство"
                                  : "Detach device"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {locale === "ru"
                        ? "Устройства не зарегистрированы"
                        : "No devices registered"}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <SectionState
                icon={User}
                message={
                  locale === "ru"
                    ? "Не удалось загрузить профиль сотрудника."
                    : "Failed to load the employee profile."
                }
                tone="error"
              />
            ))}
        </div>

        <Dialog
          open={Boolean(selectedAttendanceSession)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedAttendanceSessionId(null);
            }
          }}
        >
          <DialogContent className="w-[min(1080px,calc(100vw-2rem))]">
            <DialogHeader>
              <DialogTitle>
                {locale === "ru"
                  ? "Биометрия смены"
                  : "Shift biometric verification"}
              </DialogTitle>
              <DialogDescription>
                {selectedAttendanceSession
                  ? `${formatDate(selectedAttendanceSession.startedAt)} • ${
                      locale === "ru" ? "Смена" : "Shift"
                    }`
                  : locale === "ru"
                    ? "Скан check-in и check-out для выбранной смены."
                    : "Check-in and check-out scans for the selected shift."}
              </DialogDescription>
            </DialogHeader>

            {selectedAttendanceSession ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  {
                    key: "check-in",
                    label: "Check-in",
                    verification: selectedCheckInVerification,
                    occurredAt: selectedAttendanceSession.checkInEvent.occurredAt,
                  },
                  {
                    key: "check-out",
                    label: "Check-out",
                    verification: selectedCheckOutVerification,
                    occurredAt:
                      selectedAttendanceSession.checkOutEvent?.occurredAt ?? null,
                  },
                ].map((item) => {
                  const previewArtifact =
                    item.verification?.artifacts.find((artifact) => artifact.url) ??
                    null;

                  return (
                    <div
                      className="rounded-2xl border border-border bg-card p-4"
                      key={item.key}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
                            {item.label}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.occurredAt
                              ? `${formatDate(item.occurredAt)} ${formatTime(item.occurredAt)}`
                              : locale === "ru"
                                ? "Событие не записано"
                                : "Event not recorded"}
                          </p>
                        </div>
                        {item.verification ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.verification.result === "PASSED"
                                ? "bg-green-50 text-green-700"
                                : item.verification.result === "REVIEW"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                            }`}
                          >
                            {item.verification.result}
                          </span>
                        ) : null}
                      </div>

                      {previewArtifact?.url ? (
                        <img
                          alt={
                            locale === "ru"
                              ? `Биометрия ${item.label}`
                              : `${item.label} biometric`
                          }
                          className="mb-3 h-72 w-full rounded-2xl border border-border object-cover"
                          src={previewArtifact.url}
                        />
                      ) : (
                        <div className="mb-3 flex h-72 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                          {item.occurredAt
                            ? locale === "ru"
                              ? "Для этого события не найдено сохранённое фото биометрии."
                              : "No saved biometric photo was found for this event."
                            : locale === "ru"
                              ? "Check-out ещё не записан."
                              : "Check-out has not been recorded yet."}
                        </div>
                      )}

                      <dl className="grid gap-2 text-sm">
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/20 px-3 py-2">
                          <dt className="text-muted-foreground">Liveness</dt>
                          <dd className="font-medium text-foreground">
                            {item.verification?.livenessScore !== null &&
                            item.verification?.livenessScore !== undefined
                              ? `${Math.round(item.verification.livenessScore * 100)}%`
                              : "—"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/20 px-3 py-2">
                          <dt className="text-muted-foreground">Match</dt>
                          <dd className="font-medium text-foreground">
                            {item.verification?.matchScore !== null &&
                            item.verification?.matchScore !== undefined
                              ? `${Math.round(item.verification.matchScore * 100)}%`
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(selectedVerification)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedVerificationId(null);
            }
          }}
        >
          <DialogContent className="w-[min(880px,calc(100vw-2rem))]">
            <DialogHeader>
              <DialogTitle>
                {locale === "ru" ? "Фото верификации" : "Verification photo"}
              </DialogTitle>
              <DialogDescription>
                {selectedVerification
                  ? `${formatDate(selectedVerification.capturedAt)} ${formatTime(selectedVerification.capturedAt)}`
                  : locale === "ru"
                    ? "Артефакты верификации сотрудника."
                    : "Employee verification artifacts."}
              </DialogDescription>
            </DialogHeader>

            {selectedVerification ? (
              selectedVerificationArtifacts.length > 0 ? (
                <div className="space-y-4">
                  <img
                    alt={
                      locale === "ru"
                        ? "Загруженное фото верификации"
                        : "Uploaded verification photo"
                    }
                    className="max-h-[68vh] w-full rounded-2xl border border-border object-contain"
                    src={selectedVerificationArtifacts[0].url ?? undefined}
                  />
                  {selectedVerificationArtifacts.length > 1 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {selectedVerificationArtifacts.map((artifact) => (
                        <img
                          alt={
                            locale === "ru"
                              ? "Артефакт верификации"
                              : "Verification artifact"
                          }
                          className="aspect-square w-full rounded-xl border border-border object-cover"
                          key={artifact.id}
                          src={artifact.url ?? undefined}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-60 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                  {locale === "ru"
                    ? "У этой верификации нет сохранённого фото."
                    : "This verification does not have a saved photo."}
                </div>
              )
            ) : null}
          </DialogContent>
        </Dialog>
      </main>
    </AdminShell>
  );
}
