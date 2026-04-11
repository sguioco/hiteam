"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FolderOpen,
  ListTodo,
  Mail,
  Plus,
  Search,
  Settings,
  Smartphone,
  Trash2,
  UserPlus,
  Users,
  X,
  Clock,
} from "lucide-react";
import {
  AttendanceLiveSession,
  CollaborationOverviewResponse,
  EmployeeBiometricHistoryResponse,
  TaskItem,
} from "@smart/types";
import type { SortDescriptor } from "react-aria-components";
import { Table } from "@/components/application/table/table";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateOfBirthField } from "@/components/ui/date-of-birth-field";
import { ImageAdjustField } from "@/components/image-adjust-field";
import { Input } from "@/components/ui/input";
import {
  AppSelectField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import {
  buildEmployeeWorkdayLookup,
  formatWorkdayDateLabel,
  getEmployeeWorkdayStatus,
  type EmployeeScheduleShift,
} from "@/lib/employee-workdays";
import {
  getWebAdminTaskPriorityLabel,
  normalizeWebAdminTaskPriority,
} from "@/lib/task-priority";
import { getRuntimeLocale, getRuntimeLocaleTag, runtimeLocalize } from "@/lib/runtime-locale";

type EmployeeApiRecord = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  employeeNumber: string;
  hireDate: string;
  birthDate?: string | null;
  gender?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: string | null;
  biometricProfile?: {
    enrollmentStatus?: "NOT_STARTED" | "PENDING" | "ENROLLED" | "FAILED" | null;
  } | null;
  user?: {
    id: string;
    email: string;
    roles?: Array<{
      role?: {
        code: string;
      } | null;
    }> | null;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  primaryLocation?: {
    id: string;
    name: string;
  } | null;
  position?: {
    id: string;
    name: string;
  } | null;
};

type EmployeeDetails = EmployeeApiRecord & {
  devices?: Array<{
    id: string;
    platform: string;
    deviceName: string | null;
    isPrimary: boolean;
  }>;
};

type InvitationRecord = {
  id: string;
  companyId?: string | null;
  email: string;
  status: "INVITED" | "PENDING_APPROVAL" | "REJECTED";
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

type ReviewInvitationResponse = {
  id: string;
  status: string;
  employeeId?: string | null;
  email?: string;
  generatedPassword?: string;
};

type ShiftTemplateRecord = {
  id: string;
  name: string;
  startsAtLocal: string;
  endsAtLocal: string;
  location: {
    id: string;
    name: string;
  };
  position: {
    id: string;
    name: string;
  };
};

type OrganizationSetupResponse = {
  company: {
    id: string;
    code: string;
    name: string;
  } | null;
};

type EmployeesDirectorySnapshot = {
  employeeRecords: EmployeeApiRecord[];
  liveSessions: AttendanceLiveSession[];
  overview: CollaborationOverviewResponse | null;
  pendingInvitations: InvitationRecord[];
  scheduleShifts: EmployeeScheduleShift[];
  scheduleTemplates: ShiftTemplateRecord[];
  organizationSetup: OrganizationSetupResponse | null;
  canCheckWorkdays: boolean;
};

export type EmployeesInitialData = EmployeesDirectorySnapshot;

type EmployeeStatus =
  | "late"
  | "on_shift"
  | "on_break"
  | "off_shift"
  | "not_registered"
  | "inactive"
  | "dismissed";
type ViewMode = "employees" | "groups";
type EmployeeSortKey = "name" | "status" | "group" | "activeTasks";
type TaskDialogState =
  | {
      mode: "employee";
      targetId: string;
      targetLabel: string;
    }
  | {
      mode: "group";
      targetId: string;
      targetLabel: string;
    }
  | null;

type EmployeeRowView = {
  id: string;
  name: string;
  employeeNumber: string;
  email: string;
  groupId: string | null;
  group: string | null;
  location: string;
  status: EmployeeStatus;
  activeTasks: number;
  phone: string;
  position: string;
  hireDate: string;
  attendance: number | null;
  avatarUrl: string | null;
};

const statusStyles: Record<EmployeeStatus, string> = {
  late: "bg-[color:var(--soft-danger)] text-[color:var(--danger)]",
  on_shift: "bg-[color:var(--soft-success)] text-[color:var(--success)]",
  on_break: "bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]",
  off_shift: "bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]",
  not_registered: "bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]",
  inactive: "bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]",
  dismissed: "bg-[color:var(--soft-danger)] text-[color:var(--danger)]",
};

const statusToneByEmployeeStatus: Record<EmployeeStatus, string> = {
  late: "is-error",
  on_shift: "is-success",
  on_break: "is-gray",
  off_shift: "is-gray",
  not_registered: "is-gray",
  inactive: "is-gray",
  dismissed: "is-error",
};

const invitationStyles: Record<InvitationRecord["status"], string> = {
  INVITED: "bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]",
  PENDING_APPROVAL:
    "bg-[color:var(--soft-warning)] text-[color:var(--warning)]",
  REJECTED: "bg-[color:var(--soft-danger)] text-[color:var(--danger)]",
};

const CREATE_SHIFT_TEMPLATE_OPTION = "__create_shift_template__";

const initialTaskDraft = {
  title: "",
  description: "",
  priority: "MEDIUM" as TaskItem["priority"],
  dueAt: "",
  requiresPhoto: false,
  isRecurring: false,
  frequency: "DAILY" as "DAILY" | "WEEKLY" | "MONTHLY",
  weekDays: [1, 2, 3, 4, 5],
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
};

const reviewFieldClassName = "h-11 rounded-xl bg-secondary/30 text-sm";
const reviewInfoBoxClassName =
  "flex min-h-11 items-center rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground";
const EMPLOYEES_DIRECTORY_CACHE_TTL_MS = 2 * 60 * 1000;

function buildEmployeesDirectoryCacheKey(
  session: NonNullable<ReturnType<typeof getSession>>,
) {
  return `employees:directory:${session.user.tenantId}:${session.user.id}`;
}

function buildEmployeeName(employee: {
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}) {
  return [employee.lastName, employee.firstName, employee.middleName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getAvatarSrc(
  employee: Pick<
    EmployeeApiRecord,
    "avatarUrl" | "firstName" | "lastName" | "middleName"
  >,
) {
  return employee.avatarUrl ?? null;
}

function resolveEmployeeRoleLabel(
  employee: EmployeeApiRecord,
  locale: "ru" | "en",
) {
  const roleCodes =
    employee.user?.roles
      ?.map((assignment) => assignment.role?.code)
      .filter((code): code is string => Boolean(code)) ?? [];

  if (roleCodes.includes("tenant_owner")) {
    return runtimeLocalize("Владелец", "Owner", locale);
  }

  if (roleCodes.includes("operations_admin") || roleCodes.includes("hr_admin")) {
    return runtimeLocalize("Администратор", "Administrator", locale);
  }

  if (roleCodes.includes("manager")) {
    return runtimeLocalize("Менеджер", "Manager", locale);
  }

  return employee.position?.name ?? runtimeLocalize("Сотрудник", "Employee", locale);
}

function hasCompletedEmployeeRegistration(
  employee: Pick<EmployeeApiRecord, "biometricProfile">,
) {
  return employee.biometricProfile?.enrollmentStatus === "ENROLLED";
}

function resolveEmployeeStatus(
  employee: Pick<EmployeeApiRecord, "status" | "biometricProfile">,
  liveSession?: AttendanceLiveSession,
): EmployeeStatus {
  switch ((employee.status || "").toUpperCase()) {
    case "TERMINATED":
    case "DISMISSED":
      return "dismissed";
    case "INACTIVE":
      return "inactive";
    default:
      break;
  }

  if (!hasCompletedEmployeeRegistration(employee)) {
    return "not_registered";
  }

  const isCheckedIn =
    liveSession?.status === "on_shift" || liveSession?.status === "on_break";

  if (isCheckedIn && (liveSession?.lateMinutes ?? 0) > 0) {
    return "late";
  }

  if (liveSession?.status === "on_break") {
    return "on_break";
  }

  if (isCheckedIn) {
    return "on_shift";
  }

  return "off_shift";
}

function formatHireDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(getRuntimeLocaleTag());
}

function getEmployeeInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function renderEmployeeStatusBadge(status: EmployeeStatus) {
  const locale = getRuntimeLocale();
  const tableStatusLabel = getStatusLabel(status, locale);

  return (
    <span
      className={`team-tasks-employee-status ${statusToneByEmployeeStatus[status]}`}
    >
      <span className="team-tasks-employee-status-dot" aria-hidden="true" />
      {tableStatusLabel}
    </span>
  );
}

function getStatusLabel(status: EmployeeStatus, locale: "ru" | "en") {
  if (status === "late") return runtimeLocalize("Опаздывает", "Late", locale);
  if (status === "on_shift") return runtimeLocalize("На смене", "On shift", locale);
  if (status === "on_break") return runtimeLocalize("На перерыве", "On break", locale);
  if (status === "off_shift") return runtimeLocalize("Не на смене", "Off shift", locale);
  if (status === "not_registered") return runtimeLocalize("Не зарегистрирован", "Not registered", locale);
  if (status === "inactive") return runtimeLocalize("Неактивен", "Inactive", locale);
  return runtimeLocalize("Уволен", "Dismissed", locale);
}

function getInvitationLabel(
  status: InvitationRecord["status"],
  locale: "ru" | "en",
) {
  if (status === "INVITED") {
    return runtimeLocalize("Приглашение отправлено", "Invitation sent", locale);
  }
  if (status === "PENDING_APPROVAL") {
    return runtimeLocalize("Ждёт подтверждения", "Pending approval", locale);
  }
  return runtimeLocalize("Отклонено", "Rejected", locale);
}

function getTaskPriorityOptions(_locale: "ru" | "en") {
  return [
    { value: "LOW" as TaskItem["priority"], label: getWebAdminTaskPriorityLabel("LOW") },
    {
      value: "MEDIUM" as TaskItem["priority"],
      label: getWebAdminTaskPriorityLabel("MEDIUM"),
    },
    {
      value: "HIGH" as TaskItem["priority"],
      label: getWebAdminTaskPriorityLabel("HIGH"),
    },
  ];
}

function getWeekdayShortLabel(day: number, locale: "ru" | "en") {
  if (locale === "en") {
    return day === 7
      ? "Su"
      : day === 1
        ? "Mo"
        : day === 2
          ? "Tu"
          : day === 3
            ? "We"
            : day === 4
              ? "Th"
              : day === 5
                ? "Fr"
                : "Sa";
  }

  return day === 7
    ? "Вс"
    : day === 1
      ? "Пн"
      : day === 2
        ? "Вт"
        : day === 3
          ? "Ср"
          : day === 4
            ? "Чт"
            : day === 5
              ? "Пт"
              : "Сб";
}

function getBiometricStatusLabel(
  enrollmentStatus?: string | null,
  locale: "ru" | "en" = "ru",
) {
  switch (enrollmentStatus) {
    case "ENROLLED":
      return runtimeLocalize("Зарегистрирован", "Registered", locale);
    case "PENDING":
      return runtimeLocalize("Регистрация не завершена", "Registration pending", locale);
    case "FAILED":
      return runtimeLocalize("Ошибка регистрации", "Registration failed", locale);
    default:
      return runtimeLocalize("Не зарегистрирован", "Not registered", locale);
  }
}

function buildExpandedGroupsFromSnapshot(
  snapshot?: EmployeesDirectorySnapshot | null,
) {
  if (!snapshot) {
    return new Set<string>();
  }

  return new Set([
    ...(snapshot.overview?.groups.map((group) => group.id) ?? []),
    ...(snapshot.employeeRecords.some(
      (employee) =>
        !snapshot.overview?.groups.some((group) =>
          group.memberships.some(
            (membership) => membership.employeeId === employee.id,
          ),
        ),
    )
      ? ["__none"]
      : []),
  ]);
}

const Employees = ({
  initialData,
}: {
  initialData?: EmployeesInitialData | null;
}) => {
  const router = useRouter();
  const locale = getRuntimeLocale();
  const taskPriorityOptions = useMemo(() => getTaskPriorityOptions(locale), [locale]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("employees");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });
  const [showFormerEmployees, setShowFormerEmployees] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(!initialData);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [employeeRecords, setEmployeeRecords] = useState<EmployeeApiRecord[]>(
    initialData?.employeeRecords ?? [],
  );
  const [liveSessions, setLiveSessions] = useState<AttendanceLiveSession[]>(
    initialData?.liveSessions ?? [],
  );
  const [overview, setOverview] =
    useState<CollaborationOverviewResponse | null>(initialData?.overview ?? null);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] =
    useState<EmployeeDetails | null>(null);
  const [selectedEmployeeBiometric, setSelectedEmployeeBiometric] =
    useState<EmployeeBiometricHistoryResponse | null>(null);
  const [selectedEmployeeTab, setSelectedEmployeeTab] = useState<
    "general" | "personal"
  >("general");
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => buildExpandedGroupsFromSnapshot(initialData),
  );

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [copiedInviteField, setCopiedInviteField] = useState<
    "code" | "link" | "email" | "password" | null
  >(null);
  const [organizationSetup, setOrganizationSetup] =
    useState<OrganizationSetupResponse | null>(initialData?.organizationSetup ?? null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [createGroupDescription, setCreateGroupDescription] = useState("");
  const [createGroupMembers, setCreateGroupMembers] = useState<string[]>([]);
  const [createGroupSubmitting, setCreateGroupSubmitting] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  const [pendingInvitations, setPendingInvitations] = useState<
    InvitationRecord[]
  >(initialData?.pendingInvitations ?? []);
  const [invitationsLoading, setInvitationsLoading] = useState(!initialData);
  const [selectedInvitation, setSelectedInvitation] =
    useState<InvitationRecord | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [approvalCredentials, setApprovalCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [reviewForm, setReviewForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    birthDate: "",
    gender: "male",
    phone: "",
    shiftTemplateId: "",
    groupId: "__none",
    rejectedReason: "",
    avatarDataUrl: "",
    avatarPreview: "",
    grantManagerAccess: false,
  });

  const [moveDialogEmployeeId, setMoveDialogEmployeeId] = useState<
    string | null
  >(null);
  const [moveTargetGroupId, setMoveTargetGroupId] = useState("__none");
  const [moveSubmitting, setMoveSubmitting] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [taskDialog, setTaskDialog] = useState<TaskDialogState>(null);
  const [taskDraft, setTaskDraft] = useState(initialTaskDraft);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [scheduleShifts, setScheduleShifts] = useState<EmployeeScheduleShift[]>(
    initialData?.scheduleShifts ?? [],
  );
  const [scheduleTemplates, setScheduleTemplates] = useState<
    ShiftTemplateRecord[]
  >(initialData?.scheduleTemplates ?? []);

  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState({
    name: "",
    startsAtLocal: "09:00",
    endsAtLocal: "18:00",
    weekDays: [1, 2, 3, 4, 5],
  });
  const [createTemplateSubmitting, setCreateTemplateSubmitting] =
    useState(false);
  const [createTemplateError, setCreateTemplateError] = useState<string | null>(
    null,
  );
  const [assignShiftDialog, setAssignShiftDialog] = useState<{
    employeeId: string;
    employeeName: string;
  } | null>(null);
  const [assignShiftDraft, setAssignShiftDraft] = useState({
    templateId: "",
    shiftDate: new Date().toISOString().split("T")[0],
  });
  const [assignShiftSubmitting, setAssignShiftSubmitting] = useState(false);
  const [assignShiftError, setAssignShiftError] = useState<string | null>(null);

  function toggleTemplateWeekDay(day: number) {
    setTemplateDraft((current) => ({
      ...current,
      weekDays: current.weekDays.includes(day)
        ? current.weekDays.filter((d) => d !== day)
        : [...current.weekDays, day],
    }));
  }

  async function handleCreateTemplate() {
    if (
      !templateDraft.name.trim() ||
      !templateDraft.startsAtLocal ||
      !templateDraft.endsAtLocal ||
      templateDraft.weekDays.length === 0
    ) {
      setCreateTemplateError(
        runtimeLocalize(
          "Заполните все поля шаблона смены",
          "Fill in all shift template fields",
          locale,
        ),
      );
      return;
    }

    setCreateTemplateSubmitting(true);
    setCreateTemplateError(null);

    const session = getSession();
    if (!session) {
      const location = scheduleTemplates[0]?.location || {
        id: "mock-loc",
        name: runtimeLocalize("Офис", "Office", locale),
      };
      const position = scheduleTemplates[0]?.position || {
        id: "mock-pos",
        name: runtimeLocalize("Сотрудник", "Employee", locale),
      };

      const newTemplate: ShiftTemplateRecord = {
        id: `mock-template-${Date.now()}`,
        name: templateDraft.name.trim(),
        startsAtLocal: templateDraft.startsAtLocal,
        endsAtLocal: templateDraft.endsAtLocal,
        location,
        position,
      };

      setScheduleTemplates((current) => [newTemplate, ...current]);
      setReviewForm((current) => ({
        ...current,
        shiftTemplateId: newTemplate.id,
      }));
      setAssignShiftDraft((current) => ({
        ...current,
        templateId: newTemplate.id,
      }));
      setCreateTemplateOpen(false);
      setTemplateDraft({
        name: "",
        startsAtLocal: "09:00",
        endsAtLocal: "18:00",
        weekDays: [1, 2, 3, 4, 5],
      });
      setCreateTemplateSubmitting(false);
      return;
    }

    try {
      await apiRequest("/schedule/templates", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          name: templateDraft.name.trim(),
          code: templateDraft.name.trim().toLowerCase().replace(/\s+/g, "-"),
          startsAtLocal: templateDraft.startsAtLocal,
          endsAtLocal: templateDraft.endsAtLocal,
          weekDays: templateDraft.weekDays,
          gracePeriodMinutes: 10,
        }),
      });

      const res = await apiRequest<ShiftTemplateRecord[]>(
        "/schedule/templates",
        {
          token: session.accessToken,
        },
      );

      if (res && res.length > 0) {
        setScheduleTemplates(res);
        const created =
          res.find(
            (t) =>
              t.name === templateDraft.name.trim() &&
              t.startsAtLocal === templateDraft.startsAtLocal &&
              t.endsAtLocal === templateDraft.endsAtLocal,
          ) ??
          res.find((t) => t.name === templateDraft.name.trim());
        if (created) {
          setReviewForm((current) => ({
            ...current,
            shiftTemplateId: created.id,
          }));
          setAssignShiftDraft((current) => ({
            ...current,
            templateId: created.id,
          }));
        }
      }

      setCreateTemplateOpen(false);
      setTemplateDraft({
        name: "",
        startsAtLocal: "09:00",
        endsAtLocal: "18:00",
        weekDays: [1, 2, 3, 4, 5],
      });
    } catch (error) {
      setCreateTemplateError(
        error instanceof Error
          ? error.message
          : runtimeLocalize(
              "Ошибка создания шаблона",
              "Failed to create shift template",
              locale,
            ),
      );
    } finally {
      setCreateTemplateSubmitting(false);
    }
  }
  const [canCheckWorkdays, setCanCheckWorkdays] = useState(
    initialData?.canCheckWorkdays ?? false,
  );
  const [taskDayOffConfirmOpen, setTaskDayOffConfirmOpen] = useState(false);
  const didUseInitialData = useRef(Boolean(initialData));

  const [groupEditorId, setGroupEditorId] = useState<string | null>(null);
  const [groupEditorMembers, setGroupEditorMembers] = useState<string[]>([]);
  const [groupEditorName, setGroupEditorName] = useState("");
  const [groupEditorDescription, setGroupEditorDescription] = useState("");
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupDeleting, setGroupDeleting] = useState(false);
  const [groupDeleteConfirmOpen, setGroupDeleteConfirmOpen] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  const groups = overview?.groups ?? [];

  const groupByEmployeeId = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    groups.forEach((group) => {
      group.memberships.forEach((membership) => {
        map.set(membership.employeeId, { id: group.id, name: group.name });
      });
    });
    return map;
  }, [groups]);

  const tasksByEmployeeId = useMemo(() => {
    const map = new Map<string, number>();
    overview?.employeeStats.forEach((item) => {
      if (!item.employee?.id) return;
      map.set(item.employee.id, item.todo + item.inProgress);
    });
    return map;
  }, [overview]);

  const liveSessionsByEmployeeId = useMemo(() => {
    return new Map(liveSessions.map((session) => [session.employeeId, session] as const));
  }, [liveSessions]);

  const employees = useMemo<EmployeeRowView[]>(() => {
    return employeeRecords
      .map((employee) => {
        const group = groupByEmployeeId.get(employee.id);
        const liveSession = liveSessionsByEmployeeId.get(employee.id);
        return {
          id: employee.id,
          name: buildEmployeeName(employee),
          employeeNumber: employee.employeeNumber,
          email: employee.user?.email ?? "",
          groupId: group?.id ?? null,
          group: group?.name ?? null,
          location: employee.primaryLocation?.name ?? "—",
          status: resolveEmployeeStatus(employee, liveSession),
          activeTasks: tasksByEmployeeId.get(employee.id) ?? 0,
          phone: employee.phone ?? "—",
          position: resolveEmployeeRoleLabel(employee, locale),
          hireDate: employee.hireDate,
          attendance: null,
          avatarUrl: employee.avatarUrl ?? null,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name, locale));
  }, [
    employeeRecords,
    groupByEmployeeId,
    liveSessionsByEmployeeId,
    locale,
    tasksByEmployeeId,
  ]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      if (!showFormerEmployees && employee.status === "dismissed") {
        return false;
      }

      if (!query) return true;

      return (
        employee.name.toLowerCase().includes(query) ||
        employee.employeeNumber.toLowerCase().includes(query) ||
        employee.position.toLowerCase().includes(query) ||
        employee.location.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query)
      );
    });
  }, [employees, search, showFormerEmployees]);

  const sortedEmployees = useMemo(() => {
    const collator = new Intl.Collator(locale === "ru" ? "ru" : "en", {
      sensitivity: "base",
      numeric: true,
    });
    const direction = sortDescriptor.direction === "descending" ? -1 : 1;
    const statusOrder: Record<EmployeeStatus, number> = {
      late: 0,
      on_shift: 1,
      on_break: 2,
      off_shift: 3,
      not_registered: 4,
      inactive: 5,
      dismissed: 6,
    };

    return [...filteredEmployees].sort((left, right) => {
      switch (sortDescriptor.column as EmployeeSortKey) {
        case "status":
          return (
            direction *
            (statusOrder[left.status] - statusOrder[right.status] ||
              collator.compare(left.name, right.name))
          );
        case "group":
          return (
            direction *
            (collator.compare(left.group ?? "яяя", right.group ?? "яяя") ||
              collator.compare(left.name, right.name))
          );
        case "activeTasks":
          return (
            direction *
            (left.activeTasks - right.activeTasks ||
              collator.compare(left.name, right.name))
          );
        case "name":
        default:
          return direction * collator.compare(left.name, right.name);
      }
    });
  }, [filteredEmployees, locale, sortDescriptor]);

  const groupedEmployees = useMemo(
    () =>
      groups
        .map((group) => ({
          group,
          members: filteredEmployees.filter(
            (employee) => employee.groupId === group.id,
          ),
        }))
        .sort((left, right) =>
          left.group.name.localeCompare(right.group.name, locale),
        ),
    [filteredEmployees, groups, locale],
  );

  const ungroupedEmployees = useMemo(
    () => filteredEmployees.filter((employee) => !employee.groupId),
    [filteredEmployees],
  );

  const allExpanded = useMemo(() => {
    const visibleKeys = new Set(groups.map((group) => group.id));
    if (ungroupedEmployees.length > 0) {
      visibleKeys.add("__none");
    }

    return (
      visibleKeys.size > 0 &&
      Array.from(visibleKeys).every((key) => expandedGroups.has(key))
    );
  }, [expandedGroups, groups, ungroupedEmployees.length]);

  const selectedEmployee = useMemo(
    () =>
      employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  function openEmployeePage(employeeId: string) {
    router.push(`/employees/${employeeId}`);
  }

  const groupEditor = useMemo(
    () => groups.find((group) => group.id === groupEditorId) ?? null,
    [groupEditorId, groups],
  );
  const employeeWorkdayLookup = useMemo(
    () => buildEmployeeWorkdayLookup(scheduleShifts),
    [scheduleShifts],
  );
  const taskDayStatus = useMemo(() => {
    if (!canCheckWorkdays || taskDialog?.mode !== "employee") {
      return null;
    }

    return getEmployeeWorkdayStatus(
      employeeWorkdayLookup,
      taskDialog.targetId,
      taskDraft.dueAt,
    );
  }, [canCheckWorkdays, employeeWorkdayLookup, taskDialog, taskDraft.dueAt]);

  const biometricPreviewUrl = useMemo(() => {
    if (selectedEmployeeBiometric?.profile?.templateUrl) {
      return selectedEmployeeBiometric.profile.templateUrl;
    }

    for (const verification of selectedEmployeeBiometric?.verifications ?? []) {
      const artifact = verification.artifacts.find((item) => item.url);
      if (artifact?.url) {
        return artifact.url;
      }
    }

    return null;
  }, [selectedEmployeeBiometric]);

  const biometricStatusLabel = useMemo(() => {
    return getBiometricStatusLabel(
      selectedEmployeeBiometric?.profile?.enrollmentStatus,
      locale,
    );
  }, [locale, selectedEmployeeBiometric]);
  const biometricConnectedSince =
    selectedEmployeeBiometric?.profile?.enrolledAt ?? null;
  const biometricLastVerifiedAt =
    selectedEmployeeBiometric?.profile?.lastVerifiedAt ?? null;

  const employeeJoinCode = organizationSetup?.company?.code ?? "";
  const employeeJoinLink =
    typeof window !== "undefined" && employeeJoinCode
      ? `${window.location.origin}/join/company/${encodeURIComponent(employeeJoinCode)}`
      : "";

  function applyDirectorySnapshot(
    snapshot: EmployeesDirectorySnapshot,
    cacheKey?: string | null,
  ) {
    setEmployeeRecords(snapshot.employeeRecords);
    setLiveSessions(snapshot.liveSessions ?? []);
    setOverview(snapshot.overview);
    setPendingInvitations(snapshot.pendingInvitations);
    setScheduleShifts(snapshot.scheduleShifts);
    setScheduleTemplates(snapshot.scheduleTemplates);
    setOrganizationSetup(snapshot.organizationSetup);
    setCanCheckWorkdays(snapshot.canCheckWorkdays);

    setExpandedGroups(buildExpandedGroupsFromSnapshot(snapshot));

    if (cacheKey) {
      writeClientCache(cacheKey, snapshot);
    }
  }

  async function loadDirectory() {
    const session = getSession();
    if (!session) {
      setDirectoryLoading(false);
      setInvitationsLoading(false);
      return;
    }

    setDirectoryLoading(true);
    setDirectoryError(null);

    try {
      const snapshot = await apiRequest<EmployeesDirectorySnapshot>(
        "/bootstrap/employees",
        {
          token: session.accessToken,
        },
      );

      applyDirectorySnapshot(
        snapshot,
        buildEmployeesDirectoryCacheKey(session),
      );
    } catch (requestError) {
      setDirectoryError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось загрузить сотрудников.",
              "Failed to load employees.",
              locale,
            ),
      );
      setEmployeeRecords([]);
      setLiveSessions([]);
      setOverview(null);
      setPendingInvitations([]);
      setScheduleShifts([]);
      setScheduleTemplates([]);
      setOrganizationSetup(null);
      setCanCheckWorkdays(false);
    } finally {
      setDirectoryLoading(false);
      setInvitationsLoading(false);
    }
  }

  useEffect(() => {
    if (didUseInitialData.current && initialData) {
      didUseInitialData.current = false;
      const session = getSession();
      if (session) {
        writeClientCache(buildEmployeesDirectoryCacheKey(session), initialData);
      }
      setDirectoryLoading(false);
      setInvitationsLoading(false);
      return;
    }

    const session = getSession();
    if (session) {
      const cachedDirectory = readClientCache<EmployeesDirectorySnapshot>(
        buildEmployeesDirectoryCacheKey(session),
        EMPLOYEES_DIRECTORY_CACHE_TTL_MS,
      );

      if (cachedDirectory) {
        applyDirectorySnapshot(cachedDirectory.value);
        setDirectoryLoading(false);
        setInvitationsLoading(false);
      }
    }

    void loadDirectory();
  }, [initialData]);

  useEffect(() => {
    const session = getSession();
    if (!session || !selectedEmployeeId) {
      setSelectedEmployeeDetails(null);
      setSelectedEmployeeBiometric(null);
      return;
    }

    setDetailsLoading(true);
    void Promise.all([
      apiRequest<EmployeeDetails>(`/employees/${selectedEmployeeId}`, {
        token: session.accessToken,
      }),
      apiRequest<EmployeeBiometricHistoryResponse>(
        `/biometric/employees/${selectedEmployeeId}/history`,
        {
          token: session.accessToken,
        },
      ).catch(() => null),
    ])
      .then(([employee, biometric]) => {
        setSelectedEmployeeDetails(employee);
        setSelectedEmployeeBiometric(biometric);
      })
      .catch(() => {
        setSelectedEmployeeDetails(null);
        setSelectedEmployeeBiometric(null);
      })
      .finally(() => {
        setDetailsLoading(false);
      });
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (!pageMessage) return;
    const timeout = window.setTimeout(() => setPageMessage(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [pageMessage]);

  useEffect(() => {
    if (selectedEmployeeId) {
      setSelectedEmployeeTab("general");
    }
  }, [selectedEmployeeId]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleAllGroups = () => {
    if (allExpanded) {
      setExpandedGroups(new Set());
      return;
    }

    setExpandedGroups(
      new Set([
        ...groups.map((group) => group.id),
        ...(ungroupedEmployees.length > 0 ? ["__none"] : []),
      ]),
    );
  };

  async function handleInviteSubmit() {
    const session = getSession();
    if (!session) return;

    setInviteSubmitting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await apiRequest("/employees/invitations", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({ email: inviteEmail }),
      });
      setInviteSuccess(
        runtimeLocalize(
          "Приглашение отправлено. Ссылка действует 3 дня.",
          "Invitation sent. The link is valid for 3 days.",
          locale,
        ),
      );
      setInviteEmail("");
      await loadDirectory();
    } catch (requestError) {
      setInviteError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось отправить приглашение.",
              "Failed to send invitation.",
              locale,
            ),
      );
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function copyInviteValue(
    value: string,
    field: "code" | "link" | "email" | "password",
  ) {
    if (!value.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedInviteField(field);
      window.setTimeout(() => {
        setCopiedInviteField((current) => (current === field ? null : current));
      }, 1800);
    } catch {
      setInviteError(
        runtimeLocalize(
          "Не удалось скопировать. Скопируйте значение вручную.",
          "Copy failed. Copy the value manually.",
          locale,
        ),
      );
    }
  }

  async function handleCreateGroup() {
    const session = getSession();
    if (!session || !createGroupName.trim()) return;

    setCreateGroupSubmitting(true);
    setCreateGroupError(null);

    try {
      await apiRequest("/collaboration/groups", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          name: createGroupName.trim(),
          description: createGroupDescription.trim() || undefined,
          memberEmployeeIds: Array.from(new Set(createGroupMembers)),
        }),
      });

      setCreateGroupOpen(false);
      setCreateGroupName("");
      setCreateGroupDescription("");
      setCreateGroupMembers([]);
      setPageMessage(runtimeLocalize("Группа добавлена.", "Group added.", locale));
      await loadDirectory();
    } catch (requestError) {
      setCreateGroupError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize("Не удалось создать группу.", "Failed to create group.", locale),
      );
    } finally {
      setCreateGroupSubmitting(false);
    }
  }

  async function handleResend(invitationId: string) {
    const session = getSession();
    if (!session) return;

    try {
      await apiRequest(`/employees/invitations/${invitationId}/resend`, {
        method: "POST",
        token: session.accessToken,
      });
      setPageMessage(
        runtimeLocalize(
          "Приглашение отправлено повторно.",
          "Invitation sent again.",
          locale,
        ),
      );
      await loadDirectory();
    } catch (requestError) {
      setInviteError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось повторно отправить приглашение.",
              "Failed to resend invitation.",
              locale,
            ),
      );
    }
  }

  function openInvitation(invitation: InvitationRecord) {
    setSelectedInvitation(invitation);
    setReviewError(null);
    setReviewForm({
      firstName: invitation.firstName ?? "",
      lastName: invitation.lastName ?? "",
      middleName: invitation.middleName ?? "",
      birthDate: invitation.birthDate ? invitation.birthDate.slice(0, 10) : "",
      gender: invitation.gender ?? "male",
      phone: invitation.phone ?? "",
      shiftTemplateId: invitation.approvedShiftTemplateId ?? "",
      groupId: invitation.approvedGroupId ?? "__none",
      rejectedReason: invitation.rejectedReason ?? "",
      avatarDataUrl: "",
      avatarPreview: invitation.avatarUrl ?? "",
      grantManagerAccess: false,
    });
  }

  function handleReviewAvatar(nextAvatarDataUrl: string | null) {
    setReviewForm((current) => ({
      ...current,
      avatarDataUrl: nextAvatarDataUrl ?? "",
      avatarPreview: nextAvatarDataUrl ?? "",
    }));
    setReviewError(null);
  }

  async function submitReview(decision: "APPROVE" | "REJECT") {
    const session = getSession();
    if (!session || !selectedInvitation) return;

    setReviewSubmitting(true);
    setReviewError(null);

    try {
      const response = await apiRequest<ReviewInvitationResponse>(
        `/employees/invitations/${selectedInvitation.id}/review`,
        {
          method: "PATCH",
          token: session.accessToken,
          body: JSON.stringify({
            decision,
            firstName: reviewForm.firstName,
            lastName: reviewForm.lastName,
            middleName: reviewForm.middleName || undefined,
            birthDate: reviewForm.birthDate,
            gender: reviewForm.gender,
            phone: reviewForm.phone,
            shiftTemplateId:
              decision === "APPROVE"
                ? reviewForm.shiftTemplateId || undefined
                : undefined,
            groupId:
              decision === "APPROVE"
                ? reviewForm.groupId === "__none"
                  ? ""
                  : reviewForm.groupId || undefined
                : undefined,
            rejectedReason:
              decision === "REJECT" ? reviewForm.rejectedReason : undefined,
            avatarDataUrl: reviewForm.avatarDataUrl || undefined,
            grantManagerAccess:
              decision === "APPROVE"
                ? reviewForm.grantManagerAccess
                : undefined,
          }),
        },
      );
      setSelectedInvitation(null);
      if (
        decision === "APPROVE" &&
        response.generatedPassword &&
        response.email
      ) {
        setApprovalCredentials({
          email: response.email,
          password: response.generatedPassword,
        });
      }
      setPageMessage(
        decision === "APPROVE"
          ? runtimeLocalize(
              "Анкета сотрудника подтверждена.",
              "Employee form approved.",
              locale,
            )
          : runtimeLocalize(
              "Анкета сотрудника отклонена.",
              "Employee form rejected.",
              locale,
            ),
      );
      await loadDirectory();
    } catch (requestError) {
      setReviewError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось сохранить решение.",
              "Failed to save the decision.",
              locale,
            ),
      );
    } finally {
      setReviewSubmitting(false);
    }
  }

  function openMoveDialog(employee: EmployeeRowView) {
    setMoveDialogEmployeeId(employee.id);
    setMoveTargetGroupId(employee.groupId ?? "__none");
    setMoveError(null);
  }

  async function updateGroupMembers(groupId: string, employeeIds: string[]) {
    const session = getSession();
    if (!session) return;

    await apiRequest(`/collaboration/groups/${groupId}/members`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ employeeIds }),
    });
  }

  async function updateGroup(
    groupId: string,
    payload: { name: string; description: string },
  ) {
    const session = getSession();
    if (!session) return;

    await apiRequest(`/collaboration/groups/${groupId}`, {
      method: "PATCH",
      token: session.accessToken,
      body: JSON.stringify(payload),
    });
  }

  async function handleMoveEmployee() {
    const employeeId = moveDialogEmployeeId;
    if (!employeeId) return;

    setMoveSubmitting(true);
    setMoveError(null);

    try {
      const nextGroupId =
        moveTargetGroupId === "__none" ? null : moveTargetGroupId;
      const updates = groups.flatMap((group) => {
        const currentIds = group.memberships.map(
          (membership) => membership.employeeId,
        );
        const hasEmployee = currentIds.includes(employeeId);
        const shouldInclude = group.id === nextGroupId;

        let nextIds = currentIds;
        if (shouldInclude && !hasEmployee) {
          nextIds = [...currentIds, employeeId];
        }
        if (!shouldInclude && hasEmployee) {
          nextIds = currentIds.filter((id) => id !== employeeId);
        }

        const changed =
          nextIds.length !== currentIds.length ||
          nextIds.some((id, index) => id !== currentIds[index]);

        if (!changed) return [];
        return [updateGroupMembers(group.id, nextIds)];
      });

      if (updates.length > 0) {
        await Promise.all(updates);
      }

      setMoveDialogEmployeeId(null);
      setPageMessage(
        runtimeLocalize(
          "Группа сотрудника обновлена.",
          "Employee group updated.",
          locale,
        ),
      );
      await loadDirectory();
    } catch (requestError) {
      setMoveError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось обновить группу сотрудника.",
              "Failed to update employee group.",
              locale,
            ),
      );
    } finally {
      setMoveSubmitting(false);
    }
  }

  function openTaskDialogForEmployee(employee: EmployeeRowView) {
    setTaskError(null);
    setTaskDraft(initialTaskDraft);
    setTaskDayOffConfirmOpen(false);
    setTaskDialog({
      mode: "employee",
      targetId: employee.id,
      targetLabel: employee.name,
    });
  }

  function openTaskDialogForGroup(groupId: string, groupName: string) {
    setTaskError(null);
    setTaskDraft(initialTaskDraft);
    setTaskDayOffConfirmOpen(false);
    setTaskDialog({
      mode: "group",
      targetId: groupId,
      targetLabel: groupName,
    });
  }

  async function handleCreateTask(allowDayOff = false) {
    const session = getSession();
    if (!session || !taskDialog) return;

    setTaskError(null);

    if (
      !allowDayOff &&
      canCheckWorkdays &&
      taskDialog.mode === "employee" &&
      taskDayStatus &&
      !taskDayStatus.isWorkday
    ) {
      setTaskDayOffConfirmOpen(true);
      return;
    }

    setTaskSubmitting(true);

    try {
      if (taskDraft.isRecurring) {
        await apiRequest("/collaboration/task-templates", {
          method: "POST",
          token: session.accessToken,
          body: JSON.stringify({
            title: taskDraft.title,
            description: taskDraft.description || undefined,
            priority: taskDraft.priority,
            requiresPhoto: taskDraft.requiresPhoto || undefined,
            expandOnDemand: true,
            frequency: taskDraft.frequency,
            weekDays:
              taskDraft.frequency === "WEEKLY" ? taskDraft.weekDays : undefined,
            startDate:
              taskDraft.startDate || new Date().toISOString().split("T")[0],
            endDate: taskDraft.endDate || undefined,
            dueAfterDays: 0,
            assigneeEmployeeId:
              taskDialog.mode === "employee" ? taskDialog.targetId : undefined,
            groupId:
              taskDialog.mode === "group" ? taskDialog.targetId : undefined,
          }),
        });
      } else {
        await apiRequest<TaskItem[]>("/collaboration/tasks", {
          method: "POST",
          token: session.accessToken,
          body: JSON.stringify({
            title: taskDraft.title,
            description: taskDraft.description || undefined,
            priority: taskDraft.priority,
            requiresPhoto: taskDraft.requiresPhoto || undefined,
            dueAt: taskDraft.dueAt || undefined,
            assigneeEmployeeId:
              taskDialog.mode === "employee" ? taskDialog.targetId : undefined,
            groupId:
              taskDialog.mode === "group" ? taskDialog.targetId : undefined,
          }),
        });
      }

      setTaskDialog(null);
      setTaskDraft(initialTaskDraft);
      setTaskDayOffConfirmOpen(false);
      setPageMessage(
        taskDialog.mode === "employee"
          ? runtimeLocalize(
              "Задача назначена сотруднику.",
              "Task assigned to the employee.",
              locale,
            )
          : runtimeLocalize(
              "Задача назначена группе.",
              "Task assigned to the group.",
              locale,
            ),
      );
      await loadDirectory();
    } catch (requestError) {
      setTaskError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось создать задачу.",
              "Failed to create task.",
              locale,
            ),
      );
    } finally {
      setTaskSubmitting(false);
    }
  }

  function openAssignShiftDialog(employee: EmployeeRowView) {
    setAssignShiftError(null);
    setAssignShiftDraft({
      templateId: scheduleTemplates[0]?.id ?? "",
      shiftDate: new Date().toISOString().split("T")[0],
    });
    setAssignShiftDialog({
      employeeId: employee.id,
      employeeName: employee.name,
    });
  }

  async function handleCreateShift() {
    const session = getSession();
    if (!session || !assignShiftDialog) return;

    if (!assignShiftDraft.templateId || !assignShiftDraft.shiftDate) {
      setAssignShiftError(
        runtimeLocalize("Выберите шаблон и дату", "Select template and date", locale),
      );
      return;
    }

    setAssignShiftSubmitting(true);
    setAssignShiftError(null);

    try {
      await apiRequest("/schedule/shifts", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          employeeId: assignShiftDialog.employeeId,
          templateId: assignShiftDraft.templateId,
          shiftDate: assignShiftDraft.shiftDate,
        }),
      });

      setAssignShiftDialog(null);
      setPageMessage(
        runtimeLocalize("Смена успешно назначена.", "Shift assigned successfully.", locale),
      );
      await loadDirectory();
    } catch (requestError) {
      setAssignShiftError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize("Не удалось назначить смену.", "Failed to assign shift.", locale),
      );
    } finally {
      setAssignShiftSubmitting(false);
    }
  }

  function openGroupEditor(groupId: string) {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;

    setGroupError(null);
    setGroupDeleteConfirmOpen(false);
    setGroupEditorId(groupId);
    setGroupEditorName(group.name);
    setGroupEditorDescription(group.description ?? "");
    setGroupEditorMembers(
      group.memberships.map((membership) => membership.employeeId),
    );
  }

  async function handleSaveGroup() {
    if (!groupEditorId || !groupEditor) return;

    const normalizedName = groupEditorName.trim();
    const normalizedDescription = groupEditorDescription.trim();

    if (!normalizedName) {
      setGroupError(
        runtimeLocalize("Укажите название группы.", "Enter a group name.", locale),
      );
      return;
    }

    setGroupSaving(true);
    setGroupError(null);

    try {
      const uniqueMembers = Array.from(new Set(groupEditorMembers));
      const currentMemberIds = groupEditor.memberships.map(
        (membership) => membership.employeeId,
      );
      const detailsChanged =
        groupEditor.name !== normalizedName ||
        (groupEditor.description ?? "") !== normalizedDescription;
      const membersChanged =
        currentMemberIds.length !== uniqueMembers.length ||
        currentMemberIds.some((id) => !uniqueMembers.includes(id)) ||
        uniqueMembers.some((id) => !currentMemberIds.includes(id));

      if (detailsChanged) {
        await updateGroup(groupEditorId, {
          name: normalizedName,
          description: normalizedDescription,
        });
      }

      if (membersChanged) {
        await updateGroupMembers(groupEditorId, uniqueMembers);
      }

      setGroupEditorId(null);
      setGroupDeleteConfirmOpen(false);
      setPageMessage(runtimeLocalize("Группа обновлена.", "Group updated.", locale));
      await loadDirectory();
    } catch (requestError) {
      setGroupError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось обновить группу.",
              "Failed to update group.",
              locale,
            ),
      );
    } finally {
      setGroupSaving(false);
    }
  }

  async function handleDeleteGroup() {
    const session = getSession();
    if (!session || !groupEditor) return;

    setGroupDeleting(true);
    setGroupError(null);

    try {
      await apiRequest(`/collaboration/groups/${groupEditor.id}`, {
        method: "DELETE",
        token: session.accessToken,
      });
      setGroupDeleteConfirmOpen(false);
      setGroupEditorId(null);
      setPageMessage(runtimeLocalize("Группа удалена.", "Group deleted.", locale));
      await loadDirectory();
    } catch (requestError) {
      setGroupError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось удалить группу.",
              "Failed to delete group.",
              locale,
            ),
      );
    } finally {
      setGroupDeleting(false);
    }
  }

  function renderEmployeesTable(
    items: EmployeeRowView[],
    options?: {
      cardClassName?: string;
    },
  ) {
    const cardClassName = options?.cardClassName
      ? ` ${options.cardClassName}`
      : "";

    return (
      <div className={`team-tasks-table-card${cardClassName}`}>
        <div className="team-tasks-table-shell">
          <Table
            aria-label={runtimeLocalize("Таблица сотрудников", "Employees table", locale)}
            onSortChange={setSortDescriptor}
            size="sm"
            sortDescriptor={sortDescriptor}
          >
            <Table.Header>
              <Table.Head
                allowsSorting
                className="w-[38%] min-w-[320px]"
                id="name"
                isRowHeader
                label={runtimeLocalize("ФИО", "Full name", locale)}
              />
              <Table.Head
                allowsSorting
                className="w-[16%] min-w-[170px] team-tasks-head-center"
                id="status"
                label={runtimeLocalize("Статус", "Status", locale)}
              />
              <Table.Head
                className="w-[16%] min-w-[170px] team-tasks-head-center"
                id="location"
                label={runtimeLocalize("Локация", "Location", locale)}
              />
              <Table.Head
                allowsSorting
                className="w-[16%] min-w-[170px] team-tasks-head-center"
                id="group"
                label={runtimeLocalize("Группа", "Group", locale)}
              />
              <Table.Head
                allowsSorting
                className="w-[8%] min-w-[96px] team-tasks-head-center team-tasks-head-progress"
                id="activeTasks"
                label={runtimeLocalize("Задачи", "Tasks", locale)}
              />
              <Table.Head
                className="w-[6%] min-w-[96px] team-tasks-head-center"
                id="actions"
                label={runtimeLocalize("Действия", "Actions", locale)}
              />
            </Table.Header>

            <Table.Body items={items}>
              {(employee) => (
                <Table.Row className="team-tasks-table-row" id={employee.id}>
                  <Table.Cell className="align-middle">
                    <button
                      className="team-tasks-row-button team-tasks-row-button--identity"
                      onClick={() => openEmployeePage(employee.id)}
                      type="button"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          alt={employee.name}
                          className="shrink-0"
                          initials={getEmployeeInitials(employee.name)}
                          size="sm"
                          src={employee.avatarUrl ?? null}
                        />
                        <div className="min-w-0 space-y-0.5">
                          <p className="truncate text-base font-medium text-[color:var(--foreground)]">
                            {employee.name}
                          </p>
                          <p className="truncate text-sm text-[color:var(--muted-foreground)]">
                            {employee.position}
                          </p>
                        </div>
                      </div>
                    </button>
                  </Table.Cell>

                  <Table.Cell className="align-middle whitespace-nowrap">
                    <button
                      className="team-tasks-row-button team-tasks-row-button--center"
                      onClick={() => openEmployeePage(employee.id)}
                      type="button"
                    >
                      {renderEmployeeStatusBadge(employee.status)}
                    </button>
                  </Table.Cell>

                  <Table.Cell className="align-middle whitespace-nowrap">
                    <button
                      className="team-tasks-row-button team-tasks-row-button--center"
                      onClick={() => openEmployeePage(employee.id)}
                      type="button"
                    >
                      <span className="team-tasks-team-text">
                        {employee.location}
                      </span>
                    </button>
                  </Table.Cell>

                  <Table.Cell className="align-middle whitespace-nowrap">
                    <button
                      className="team-tasks-row-button team-tasks-row-button--center"
                      onClick={() => openEmployeePage(employee.id)}
                      type="button"
                    >
                      {employee.group ? (
                        <span className="team-tasks-team-text">
                          {employee.group}
                        </span>
                      ) : (
                        <span className="team-tasks-team-text is-empty">—</span>
                      )}
                    </button>
                  </Table.Cell>

                  <Table.Cell className="align-middle">
                    <button
                      className="team-tasks-row-button team-tasks-row-button--progress"
                      onClick={() => openEmployeePage(employee.id)}
                      type="button"
                    >
                      <strong className="text-[1.05rem] font-semibold text-[color:var(--foreground)]">
                        {employee.activeTasks}
                      </strong>
                    </button>
                  </Table.Cell>

                  <Table.Cell className="align-middle">
                    <div className="flex items-center justify-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            className="h-7 w-7 rounded-lg p-0"
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px] rounded-xl font-heading">
                          <DropdownMenuItem onClick={() => openTaskDialogForEmployee(employee)}>
                            <ListTodo className="mr-2 h-4 w-4" />
                            {runtimeLocalize("Назначить задачу", "Assign task", locale)}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openAssignShiftDialog(employee)}>
                            <Clock className="mr-2 h-4 w-4" />
                            {runtimeLocalize("Назначить смену", "Assign shift", locale)}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        className="h-7 w-7 rounded-lg p-0"
                        onClick={() => openMoveDialog(employee)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-5 overflow-hidden p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex overflow-hidden rounded-xl border border-border">
              <button
                className={`flex items-center gap-2 px-4 py-2 text-sm font-heading font-medium transition-colors ${
                  viewMode === "employees"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setViewMode("employees")}
              >
                <Users className="h-4 w-4" /> {runtimeLocalize("Сотрудники", "Employees", locale)}{" "}
                {filteredEmployees.length}
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 text-sm font-heading font-medium transition-colors ${
                  viewMode === "groups"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setViewMode("groups")}
              >
                <FolderOpen className="h-4 w-4" /> {runtimeLocalize("Группы", "Groups", locale)} {groups.length}
              </button>
            </div>
            <Button
              className="rounded-xl bg-accent font-heading text-accent-foreground hover:bg-accent/90"
              onClick={() => {
                if (viewMode === "groups") {
                  setCreateGroupOpen(true);
                  setCreateGroupError(null);
                  return;
                }

                setInviteDialogOpen(true);
                setInviteError(null);
                setInviteSuccess(null);
              }}
            >
              {viewMode === "groups" ? (
                <>
                  <FolderOpen className="h-4 w-4" /> {runtimeLocalize("Добавить группу", "Add group", locale)}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> {runtimeLocalize("Добавить сотрудника", "Add employee", locale)}
                </>
              )}
            </Button>
          </div>
        </div>

        <div
          className={
            viewMode === "employees"
              ? "flex min-h-0 flex-1 flex-col"
              : "min-h-0 overflow-y-auto pr-1"
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[280px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 w-full rounded-xl border-border bg-secondary/30 pl-9 font-heading"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={runtimeLocalize("Поиск сотрудника...", "Search employee...", locale)}
                value={search}
              />
            </div>
            <label className="flex h-10 items-center gap-2 px-1 text-sm font-heading text-foreground">
              <Checkbox
                checked={showFormerEmployees}
                onCheckedChange={(value) =>
                  setShowFormerEmployees(value === true)
                }
              />
              {runtimeLocalize(
                "Показывать бывших сотрудников",
                "Show former employees",
                locale,
              )}
            </label>
            {viewMode === "groups" ? (
              <Button
                className="w-[184px] justify-center rounded-xl font-heading"
                onClick={toggleAllGroups}
                size="sm"
                variant="outline"
              >
                <Users className="h-3.5 w-3.5" />
                {allExpanded
                  ? runtimeLocalize("Свернуть группы", "Collapse groups", locale)
                  : runtimeLocalize("Развернуть группы", "Expand groups", locale)}
              </Button>
            ) : null}
          </div>

          {pageMessage ? (
            <div className="success-box mb-4">{pageMessage}</div>
          ) : null}
          {directoryError ? (
            <div className="error-box mb-4">{directoryError}</div>
          ) : null}

          {!invitationsLoading && pendingInvitations.length > 0 ? (
            <div className="mb-4 space-y-2">
              {pendingInvitations.map((invitation) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/20 px-4 py-3"
                  key={invitation.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading font-semibold text-foreground">
                        {invitation.email}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-heading ${invitationStyles[invitation.status]}`}
                      >
                        {getInvitationLabel(invitation.status, locale)}
                      </span>
                    </div>
                    <p className="text-xs font-heading text-muted-foreground">
                      {invitation.submittedAt
                        ? `${
                            runtimeLocalize("Анкета отправлена", "Form submitted", locale)
                          } ${new Date(invitation.submittedAt).toLocaleString(getRuntimeLocaleTag(locale))}`
                        : `${
                            runtimeLocalize(
                              "Ссылка активна до",
                              "Link active until",
                              locale,
                            )
                          } ${new Date(invitation.expiresAt).toLocaleString(getRuntimeLocaleTag(locale))}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {invitation.status === "INVITED" ? (
                      <Button
                        className="rounded-xl font-heading"
                        onClick={() => void handleResend(invitation.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Mail className="h-4 w-4" /> {runtimeLocalize("Повторить", "Resend", locale)}
                      </Button>
                    ) : null}
                    <Button
                      className="rounded-xl font-heading"
                      onClick={() => openInvitation(invitation)}
                      size="sm"
                    >
                      {runtimeLocalize("Проверить", "Review", locale)}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {directoryLoading ? (
            <div className="rounded-2xl border border-border bg-secondary/20 px-5 py-12 text-center text-sm font-heading text-muted-foreground">
              {runtimeLocalize("Загружаю сотрудников...", "Loading employees...", locale)}
            </div>
          ) : viewMode === "employees" ? (
            sortedEmployees.length > 0 ? (
              renderEmployeesTable(sortedEmployees, { cardClassName: "flex-1" })
            ) : (
              <p className="rounded-2xl border border-border bg-secondary/20 px-5 py-12 text-center text-sm font-heading text-muted-foreground">
                {runtimeLocalize(
                  "По текущему фильтру сотрудники не найдены.",
                  "No employees found for the current filter.",
                  locale,
                )}
              </p>
            )
          ) : (
            <div className="space-y-3">
              {groupedEmployees.map(({ group, members }) => {
                const isOpen = expandedGroups.has(group.id);
                return (
                  <div
                    className="overflow-hidden rounded-xl border border-border"
                    key={group.id}
                  >
                    <div className="flex items-center justify-between bg-secondary/30 p-3 transition-colors hover:bg-secondary/50">
                      <button
                        className="flex flex-1 items-center gap-3 text-left"
                        onClick={() => toggleGroup(group.id)}
                        type="button"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-heading font-semibold text-foreground">
                          {group.name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {members.length}
                        </span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <Button
                          className="h-7 rounded-lg px-2 text-xs font-heading"
                          onClick={() => openGroupEditor(group.id)}
                          size="sm"
                          variant="ghost"
                        >
                          <Settings className="h-3 w-3" /> {runtimeLocalize("Изменить", "Edit", locale)}
                        </Button>
                        <Button
                          className="h-7 rounded-lg px-2 text-xs font-heading"
                          onClick={() =>
                            openTaskDialogForGroup(group.id, group.name)
                          }
                          size="sm"
                          variant="ghost"
                        >
                          <ListTodo className="h-3 w-3" /> {runtimeLocalize("Задача группе", "Task for group", locale)}
                        </Button>
                      </div>
                    </div>
                    {isOpen && members.length > 0
                      ? renderEmployeesTable(members, {
                          cardClassName: "!rounded-none !border-0",
                        })
                      : null}
                    {isOpen && members.length === 0 ? (
                      <p className="p-4 text-center text-sm font-heading text-muted-foreground">
                        {runtimeLocalize(
                          "В этой группе нет сотрудников.",
                          "There are no employees in this group.",
                          locale,
                        )}
                      </p>
                    ) : null}
                  </div>
                );
              })}

              {ungroupedEmployees.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <button
                    className="flex w-full items-center justify-between bg-secondary/30 p-3 transition-colors hover:bg-secondary/50"
                    onClick={() => toggleGroup("__none")}
                  >
                    <div className="flex items-center gap-3">
                      {expandedGroups.has("__none") ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-heading font-semibold italic text-muted-foreground">
                        {runtimeLocalize("Без группы", "No group", locale)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {ungroupedEmployees.length}
                      </span>
                    </div>
                  </button>
                  {expandedGroups.has("__none")
                    ? renderEmployeesTable(ungroupedEmployees, {
                        cardClassName: "!rounded-none !border-0",
                      })
                    : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {runtimeLocalize("Добавить сотрудника", "Add employee", locale)}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {runtimeLocalize(
                "Лучше выдать сотруднику код компании или mobile join link. Email приглашение можно использовать как запасной вариант.",
                "It is better to give the employee the company code or a mobile join link. Email invitation can be used as a fallback option.",
                locale,
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="space-y-1">
                <div className="text-sm font-heading font-semibold text-foreground">
                  {runtimeLocalize("Код компании", "Company code", locale)}
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={
                      employeeJoinCode ||
                      runtimeLocalize(
                        "Сначала настройте организацию",
                        "Configure the organization first",
                        locale,
                      )
                    }
                  />
                  <Button
                    disabled={!employeeJoinCode}
                    onClick={() =>
                      void copyInviteValue(employeeJoinCode, "code")
                    }
                    type="button"
                    variant="outline"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedInviteField === "code"
                      ? runtimeLocalize("Скопировано", "Copied", locale)
                      : runtimeLocalize("Копировать", "Copy", locale)}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-heading font-semibold text-foreground">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  {runtimeLocalize("Ссылка для входа", "Mobile join link", locale)}
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={
                      employeeJoinLink ||
                      runtimeLocalize(
                        "Ссылка появится после настройки организации",
                        "The link will appear after organization setup",
                        locale,
                      )
                    }
                  />
                  <Button
                    disabled={!employeeJoinLink}
                    onClick={() =>
                      void copyInviteValue(employeeJoinLink, "link")
                    }
                    type="button"
                    variant="outline"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedInviteField === "link"
                      ? runtimeLocalize("Скопировано", "Copied", locale)
                      : runtimeLocalize("Копировать", "Copy", locale)}
                  </Button>
                  {employeeJoinLink ? (
                    <Button asChild type="button" variant="outline">
                      <a
                        href={employeeJoinLink}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              {runtimeLocalize(
                "Если не хотите зависеть от email-сервиса, просто отправьте сотруднику код компании. Он сможет сам зарегистрироваться в мобильном приложении. Менеджерский доступ задаётся на этапе подтверждения анкеты.",
                "If you do not want to depend on the email service, just send the employee the company code. They can register in the mobile app on their own. Manager access is granted during form approval.",
                locale,
              )}
            </div>

            <label className="grid gap-2 text-sm font-heading">
              <span>{runtimeLocalize("Email для приглашения", "Invitation email", locale)}</span>
              <Input
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="employee@company.ru"
                value={inviteEmail}
              />
            </label>
            {inviteError ? (
              <div className="error-box">{inviteError}</div>
            ) : null}
            {inviteSuccess ? (
              <div className="success-box">{inviteSuccess}</div>
            ) : null}
            <div className="flex justify-end">
              <Button
                className="rounded-xl font-heading"
                disabled={inviteSubmitting || !inviteEmail.trim()}
                onClick={() => void handleInviteSubmit()}
              >
                <Mail className="h-4 w-4" />
                {inviteSubmitting
                  ? runtimeLocalize("Отправляем...", "Sending...", locale)
                  : runtimeLocalize("Отправить приглашение", "Send invitation", locale)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setApprovalCredentials(null);
          }
        }}
        open={!!approvalCredentials}
      >
        <DialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {runtimeLocalize("Доступ сотрудника создан", "Employee access created", locale)}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {runtimeLocalize(
                "Отправьте сотруднику эти данные для первого входа. Пароль показывается только один раз.",
                "Send these credentials to the employee for the first sign-in. The password is shown only once.",
                locale,
              )}
            </DialogDescription>
          </DialogHeader>

          {approvalCredentials ? (
            <div className="grid gap-4">
              <div className="rounded-[24px] border border-[color:var(--border)] bg-white/80 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Email
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 break-all text-base font-medium text-foreground">
                    {approvalCredentials.email}
                  </div>
                  <Button
                    className="shrink-0 rounded-full"
                    onClick={() =>
                      void copyInviteValue(approvalCredentials.email, "email")
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedInviteField === "email"
                      ? runtimeLocalize("Скопировано", "Copied", locale)
                      : runtimeLocalize("Копировать", "Copy", locale)}
                  </Button>
                </div>
              </div>

              <div className="rounded-[24px] border border-[color:var(--border)] bg-white/80 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  {runtimeLocalize("Временный пароль", "Temporary password", locale)}
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 break-all font-mono text-base text-foreground">
                    {approvalCredentials.password}
                  </div>
                  <Button
                    className="shrink-0 rounded-full"
                    onClick={() =>
                      void copyInviteValue(
                        approvalCredentials.password,
                        "password",
                      )
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedInviteField === "password"
                      ? runtimeLocalize("Скопировано", "Copied", locale)
                      : runtimeLocalize("Копировать", "Copy", locale)}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              className="rounded-full"
              onClick={() => setApprovalCredentials(null)}
              type="button"
            >
              {runtimeLocalize("Готово", "Done", locale)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setCreateGroupOpen(open);
          if (!open) {
            setCreateGroupError(null);
            setCreateGroupName("");
            setCreateGroupDescription("");
            setCreateGroupMembers([]);
          }
        }}
        open={createGroupOpen}
      >
        <DialogContent className="w-[min(720px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {runtimeLocalize("Добавить группу", "Add group", locale)}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {runtimeLocalize(
                "Создайте новую группу внутри организации и сразу добавьте в неё сотрудников.",
                "Create a new group inside the organization and add employees to it right away.",
                locale,
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-heading">
              <span>{runtimeLocalize("Название группы", "Group name", locale)}</span>
              <Input
                maxLength={120}
                onChange={(event) => setCreateGroupName(event.target.value)}
                placeholder={runtimeLocalize(
                  "Например, Администраторы",
                  "For example, Administrators",
                  locale,
                )}
                value={createGroupName}
              />
            </label>
            <label className="grid gap-2 text-sm font-heading">
              <span>{runtimeLocalize("Описание", "Description", locale)}</span>
              <Textarea
                className="min-h-[120px]"
                maxLength={500}
                onChange={(event) =>
                  setCreateGroupDescription(event.target.value)
                }
                placeholder={runtimeLocalize(
                  "Короткое описание группы",
                  "Short group description",
                  locale,
                )}
                value={createGroupDescription}
              />
            </label>
            <div className="text-xs font-heading text-muted-foreground">
              {runtimeLocalize("Состав группы", "Group members", locale)}
            </div>
            {employees.length > 0 ? (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {employees.map((employee) => (
                  <label
                    className="flex items-center justify-between rounded-2xl border border-border bg-secondary/20 px-4 py-3"
                    key={employee.id}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        alt={employee.name}
                        className="shrink-0"
                        initials={getEmployeeInitials(employee.name)}
                        size="md"
                        src={employee.avatarUrl ?? null}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-heading font-medium text-foreground">
                          {employee.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {employee.position} • {employee.location}
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      checked={createGroupMembers.includes(employee.id)}
                      onCheckedChange={(checked) =>
                        setCreateGroupMembers((current) =>
                          checked === true
                            ? Array.from(new Set([...current, employee.id]))
                            : current.filter((id) => id !== employee.id),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/10 px-4 py-5 text-sm text-muted-foreground">
                {runtimeLocalize(
                  "В организации пока нет сотрудников для добавления в группу.",
                  "There are no employees in the organization yet to add to the group.",
                  locale,
                )}
              </div>
            )}
            {createGroupError ? (
              <div className="error-box">{createGroupError}</div>
            ) : null}
            <div className="flex justify-end">
              <Button
                className="rounded-xl font-heading"
                disabled={createGroupSubmitting || !createGroupName.trim()}
                onClick={() => void handleCreateGroup()}
              >
                <FolderOpen className="h-4 w-4" />
                {createGroupSubmitting
                  ? runtimeLocalize("Создаём...", "Creating...", locale)
                  : runtimeLocalize("Создать группу", "Create group", locale)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => !open && setSelectedInvitation(null)}
        open={!!selectedInvitation}
      >
        <DialogContent className="w-[min(720px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          {selectedInvitation ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">
                  {runtimeLocalize("Проверка анкеты сотрудника", "Employee form review", locale)}
                </DialogTitle>
                <DialogDescription className="font-heading">
                  {runtimeLocalize(
                    "Руководитель может исправить поля, добавить фото и подтвердить либо отклонить заявку.",
                    "A manager can adjust the fields, add a photo, and approve or reject the request.",
                    locale,
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Имя*", "First name*", locale)}</span>
                  <Input
                    className={reviewFieldClassName}
                    onChange={(event) =>
                      setReviewForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    value={reviewForm.firstName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Фамилия*", "Last name*", locale)}</span>
                  <Input
                    className={reviewFieldClassName}
                    onChange={(event) =>
                      setReviewForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    value={reviewForm.lastName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Отчество", "Middle name", locale)}</span>
                  <Input
                    className={reviewFieldClassName}
                    onChange={(event) =>
                      setReviewForm((current) => ({
                        ...current,
                        middleName: event.target.value,
                      }))
                    }
                    value={reviewForm.middleName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Дата рождения*", "Date of birth*", locale)}</span>
                  <DateOfBirthField
                    className="grid-cols-[72px_84px_84px]"
                    value={reviewForm.birthDate}
                    onChange={(nextValue) =>
                      setReviewForm((current) => ({
                        ...current,
                        birthDate: nextValue,
                      }))
                    }
                    triggerClassName={reviewFieldClassName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Пол*", "Gender*", locale)}</span>
                  <AppSelectField
                    value={reviewForm.gender}
                    onValueChange={(value) =>
                      setReviewForm((current) => ({
                        ...current,
                        gender: value,
                      }))
                    }
                    options={[
                      { value: "male", label: runtimeLocalize("Мужской", "Male", locale) },
                      { value: "female", label: runtimeLocalize("Женский", "Female", locale) },
                    ]}
                    triggerClassName={reviewFieldClassName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Телефон*", "Phone*", locale)}</span>
                  <Input
                    className={reviewFieldClassName}
                    onChange={(event) =>
                      setReviewForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    value={reviewForm.phone}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Смена*", "Shift*", locale)}</span>
                  <AppSelectField
                    value={reviewForm.shiftTemplateId}
                    onValueChange={(value) => {
                      if (value === CREATE_SHIFT_TEMPLATE_OPTION) {
                        setCreateTemplateOpen(true);
                      } else {
                        setReviewForm((current) => ({
                          ...current,
                          shiftTemplateId: value,
                        }));
                      }
                    }}
                    emptyLabel={runtimeLocalize("Выберите смену", "Select shift", locale)}
                    options={[
                      ...scheduleTemplates.map((template) => ({
                        value: template.id,
                        label: `${template.name} · ${template.startsAtLocal}-${template.endsAtLocal} · ${template.location.name}`,
                      })),
                      {
                        value: CREATE_SHIFT_TEMPLATE_OPTION,
                        label: runtimeLocalize("+ Добавить смену", "+ Add shift", locale),
                      },
                    ]}
                    triggerClassName={reviewFieldClassName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Группа", "Group", locale)}</span>
                  <AppSelectField
                    value={
                      reviewForm.groupId === "__none" ? "" : reviewForm.groupId
                    }
                    onValueChange={(value) =>
                      setReviewForm((current) => ({
                        ...current,
                        groupId: value || "__none",
                      }))
                    }
                    emptyLabel={runtimeLocalize("Без группы", "No group", locale)}
                    options={groups.map((group) => ({
                      value: group.id,
                      label: group.name,
                    }))}
                    triggerClassName={reviewFieldClassName}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-heading sm:col-span-2">
                  <Checkbox
                    checked={reviewForm.grantManagerAccess}
                    onCheckedChange={(value) =>
                      setReviewForm((current) => ({
                        ...current,
                        grantManagerAccess: value === true,
                      }))
                    }
                  />
                  <span className="font-semibold text-foreground">
                    {runtimeLocalize("Выдать менеджерский доступ", "Grant manager access", locale)}
                  </span>
                </label>
              </div>
              <ImageAdjustField
                dialogDescription={runtimeLocalize(
                  "Подгони фото сотрудника перед подтверждением анкеты.",
                  "Adjust the employee photo before approving the form.",
                  locale,
                )}
                dialogTitle={runtimeLocalize(
                  "Редактировать фото сотрудника",
                  "Edit employee photo",
                  locale,
                )}
                onChange={handleReviewAvatar}
                onError={setReviewError}
                previewAlt={runtimeLocalize("Аватар сотрудника", "Employee avatar", locale)}
                renderTrigger={({
                  chooseFile,
                  hasValue,
                  openEditor,
                  previewSrc,
                }) => (
                  <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <div className="flex flex-col items-center gap-3">
                      {previewSrc ? (
                        <img
                          alt={runtimeLocalize("Аватар сотрудника", "Employee avatar", locale)}
                          className="h-32 w-32 rounded-xl object-cover"
                          src={previewSrc}
                        />
                      ) : (
                        <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-secondary/50 text-xs text-muted-foreground">
                          {runtimeLocalize("Нет фото", "No photo", locale)}
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2 text-sm font-heading">
                      <span>{runtimeLocalize("Фото", "Photo", locale)}</span>
                      <div className={reviewInfoBoxClassName}>
                        {hasValue
                          ? runtimeLocalize(
                              "Фото выбрано. При необходимости можно подвинуть кадр и изменить масштаб.",
                              "Photo selected. You can move the frame and adjust the scale if needed.",
                              locale,
                            )
                          : runtimeLocalize(
                              "Можно выбрать фото и сразу отрегулировать масштаб, X и Y.",
                              "You can choose a photo and immediately adjust scale, X and Y.",
                              locale,
                            )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="rounded-xl font-heading"
                          onClick={chooseFile}
                          type="button"
                          variant="outline"
                        >
                          {runtimeLocalize("Заменить файл", "Replace file", locale)}
                        </Button>
                        {hasValue ? (
                          <Button
                            className="rounded-xl font-heading"
                            onClick={openEditor}
                            type="button"
                            variant="outline"
                          >
                            {runtimeLocalize("Настроить", "Adjust", locale)}
                          </Button>
                        ) : null}
                      </div>
                      <span className="mt-2">Email</span>
                      <Input
                        className={reviewFieldClassName}
                        disabled
                        value={selectedInvitation.email}
                      />
                      <span className="mt-2">
                        {runtimeLocalize("Причина отклонения", "Rejection reason", locale)}
                      </span>
                      <Input
                        className={reviewFieldClassName}
                        onChange={(event) =>
                          setReviewForm((current) => ({
                            ...current,
                            rejectedReason: event.target.value,
                          }))
                        }
                        placeholder={runtimeLocalize(
                          "Заполните, если отклоняете заявку",
                          "Fill in if you reject the request",
                          locale,
                        )}
                        value={reviewForm.rejectedReason}
                      />
                    </div>
                  </div>
                )}
                value={reviewForm.avatarPreview || null}
              />
              {reviewError ? (
                <div className="error-box">{reviewError}</div>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  className="rounded-xl font-heading text-[color:var(--danger)] hover:text-[color:var(--danger)]"
                  disabled={reviewSubmitting}
                  onClick={() => void submitReview("REJECT")}
                  variant="outline"
                >
                  <X className="h-4 w-4" /> {runtimeLocalize("Отклонить", "Reject", locale)}
                </Button>
                <Button
                  className="rounded-xl font-heading"
                  disabled={reviewSubmitting}
                  onClick={() => void submitReview("APPROVE")}
                >
                  <Check className="h-4 w-4" />
                  {reviewSubmitting
                    ? runtimeLocalize("Сохраняем...", "Saving...", locale)
                    : runtimeLocalize("Подтвердить", "Approve", locale)}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setCreateTemplateOpen(open);
          if (!open) setCreateTemplateError(null);
        }}
        open={createTemplateOpen}
      >
        <DialogContent className="w-[min(480px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {runtimeLocalize("Создать шаблон смены", "Create shift template", locale)}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {runtimeLocalize(
                "Новый шаблон появится в списке и будет автоматически выбран для этого сотрудника.",
                "The new template will appear in the list and will be automatically selected for this employee.",
                locale,
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-heading font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]/75">
                {runtimeLocalize("Название шаблона", "Template name", locale)}
              </label>
              <Input
                className="h-12 rounded-2xl border-[color:var(--accent)]/15 bg-[color:var(--soft-accent)]/35 px-4 font-heading text-lg placeholder:font-heading placeholder:text-muted-foreground/65 focus-visible:ring-[color:var(--accent)]/20"
                onChange={(event) =>
                  setTemplateDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder={runtimeLocalize(
                  "Например: Утренняя смена",
                  "For example: Morning shift",
                  locale,
                )}
                value={templateDraft.name}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                onChange={(event) =>
                  setTemplateDraft((current) => ({
                    ...current,
                    startsAtLocal: event.target.value,
                  }))
                }
                type="time"
                value={templateDraft.startsAtLocal}
              />
              <Input
                onChange={(event) =>
                  setTemplateDraft((current) => ({
                    ...current,
                    endsAtLocal: event.target.value,
                  }))
                }
                type="time"
                value={templateDraft.endsAtLocal}
              />
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {runtimeLocalize("Рабочие дни", "Workdays", locale)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {runtimeLocalize(
                    "Выберите дни недели, по которым проходит смена",
                    "Select the weekdays when the shift takes place",
                    locale,
                  )}
                </p>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const label = getWeekdayShortLabel(day, locale);
                    const active = templateDraft.weekDays.includes(day);

                    return (
                      <button
                        className={`h-10 rounded-xl border text-sm font-medium transition-colors ${
                          active
                            ? "border-[color:var(--accent)] bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]"
                            : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                        }`}
                        key={`${day}-${label}`}
                        onClick={() => toggleTemplateWeekDay(day)}
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  })}
              </div>
            </div>

            {createTemplateError ? (
              <div className="error-box">{createTemplateError}</div>
            ) : null}

            <div className="flex justify-end pt-2">
              <Button
                className="rounded-xl font-heading"
                disabled={createTemplateSubmitting}
                onClick={() => void handleCreateTemplate()}
                type="button"
              >
                {createTemplateSubmitting
                  ? runtimeLocalize("Создаём...", "Creating...", locale)
                  : runtimeLocalize("Создать шаблон", "Create template", locale)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => !open && setSelectedEmployeeId(null)}
        open={!!selectedEmployeeId}
      >
        <DialogContent className="w-[min(680px,calc(100vw-2rem))] max-w-none overflow-hidden rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-0">
          {selectedEmployee ? (
            <>
              <div className="border-b border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(40,75,255,0.12)_0%,rgba(255,255,255,0.98)_78%)] px-6 pb-5 pt-6">
                <div className="flex items-start gap-4">
                  <Avatar
                    alt={selectedEmployee.name}
                    className="shrink-0 shadow-[0_12px_32px_rgba(40,75,255,0.16)]"
                    initials={getEmployeeInitials(selectedEmployee.name)}
                    size="2xl"
                    src={
                      selectedEmployeeDetails
                        ? getAvatarSrc(selectedEmployeeDetails)
                        : selectedEmployee.avatarUrl ?? null
                    }
                  />
                  <DialogHeader className="gap-2 pr-10">
                    <DialogTitle className="text-[28px] font-heading font-bold text-[color:var(--foreground)]">
                      {selectedEmployee.name}
                    </DialogTitle>
                    <DialogDescription className="font-heading text-sm text-[color:var(--muted-foreground)]">
                      {selectedEmployee.position}
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[rgba(255,255,255,0.82)] px-3 py-1 text-xs font-heading text-[color:var(--muted-foreground)] shadow-[inset_0_0_0_1px_var(--border)]">
                    {selectedEmployee.group ||
                      runtimeLocalize("Без группы", "No group", locale)}
                  </span>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-heading ${statusStyles[selectedEmployee.status]}`}
                  >
                    {getStatusLabel(selectedEmployee.status, locale)}
                  </span>
                </div>
              </div>
              <div className="space-y-5 p-6">
                {detailsLoading ? (
                  <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-6 text-center text-sm font-heading text-muted-foreground">
                    {runtimeLocalize(
                      "Загружаю карточку сотрудника...",
                      "Loading employee card...",
                      locale,
                    )}
                  </div>
                ) : null}
                <div className="flex rounded-2xl border border-border bg-secondary/20 p-1">
                  <button
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-heading font-medium transition ${
                      selectedEmployeeTab === "general"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setSelectedEmployeeTab("general")}
                    type="button"
                  >
                    {runtimeLocalize("Общая информация", "General", locale)}
                  </button>
                  <button
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-heading font-medium transition ${
                      selectedEmployeeTab === "personal"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setSelectedEmployeeTab("personal")}
                    type="button"
                  >
                    {runtimeLocalize("Персональная", "Personal", locale)}
                  </button>
                </div>
                {selectedEmployeeTab === "general" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Телефон", "Phone", locale)}
                        </p>
                        <p className="mt-1 break-words font-medium text-[color:var(--foreground)]">
                          {selectedEmployeeDetails?.phone ||
                            selectedEmployee.phone ||
                            "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          Email
                        </p>
                        <p className="mt-1 break-words font-medium text-[color:var(--foreground)]">
                          {selectedEmployeeDetails?.user?.email ||
                            selectedEmployee.email ||
                            "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Офис / локация", "Office / location", locale)}
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {selectedEmployeeDetails?.primaryLocation?.name ||
                            selectedEmployee.location ||
                            "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Сотрудник с", "Employee since", locale)}
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {formatHireDate(
                            selectedEmployeeDetails?.hireDate ||
                              selectedEmployee.hireDate,
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-center">
                        <p className="text-xs font-heading text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Группа", "Group", locale)}
                        </p>
                        <p className="mt-1 text-sm font-heading font-semibold text-[color:var(--foreground)]">
                          {selectedEmployee.group || "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-center">
                        <p className="text-xs font-heading text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Отдел", "Department", locale)}
                        </p>
                        <p className="mt-1 text-sm font-heading font-semibold text-[color:var(--foreground)]">
                          {selectedEmployeeDetails?.department?.name || "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-center">
                        <p className="text-xs font-heading text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Задачи", "Tasks", locale)}
                        </p>
                        <p className="mt-1 text-sm font-heading font-semibold text-[color:var(--foreground)]">
                          {selectedEmployee.activeTasks}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-center">
                        <p className="text-xs font-heading text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Компания", "Company", locale)}
                        </p>
                        <p className="mt-1 text-sm font-heading font-semibold text-[color:var(--foreground)]">
                          {selectedEmployeeDetails?.company?.name || "—"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                      <div className="rounded-2xl border border-border bg-secondary/20 p-3">
                        {biometricPreviewUrl ? (
                          <img
                            alt={runtimeLocalize(
                              "Эталонная биометрия",
                              "Reference biometric",
                              locale,
                            )}
                            className="h-40 w-full rounded-xl object-cover"
                            src={biometricPreviewUrl}
                          />
                        ) : (
                          <div className="flex h-40 items-center justify-center rounded-xl bg-secondary/50 text-center text-xs font-heading text-muted-foreground">
                            {runtimeLocalize(
                              "Эталонное фото ещё не загружено",
                              "Reference photo is not available yet",
                              locale,
                            )}
                          </div>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            {runtimeLocalize("Биометрия", "Biometrics", locale)}
                          </p>
                          <p className="mt-1 font-medium text-[color:var(--foreground)]">
                            {biometricStatusLabel}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            {runtimeLocalize("Провайдер", "Provider", locale)}
                          </p>
                          <p className="mt-1 font-medium text-[color:var(--foreground)]">
                            {selectedEmployeeBiometric?.profile?.provider ||
                              "—"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            {runtimeLocalize("Дата рождения", "Date of birth", locale)}
                          </p>
                          <p className="mt-1 font-medium text-[color:var(--foreground)]">
                            {formatHireDate(selectedEmployeeDetails?.birthDate)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            {runtimeLocalize("Пол", "Gender", locale)}
                          </p>
                          <p className="mt-1 font-medium text-[color:var(--foreground)]">
                            {selectedEmployeeDetails?.gender === "female"
                              ? runtimeLocalize("Женский", "Female", locale)
                              : selectedEmployeeDetails?.gender === "male"
                                ? runtimeLocalize("Мужской", "Male", locale)
                                : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Последняя верификация", "Last verification", locale)}
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {biometricLastVerifiedAt
                            ? new Date(
                                biometricLastVerifiedAt,
                              ).toLocaleString(getRuntimeLocaleTag(locale))
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Дата регистрации", "Registered at", locale)}
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {biometricConnectedSince
                            ? new Date(
                                biometricConnectedSince,
                              ).toLocaleString(getRuntimeLocaleTag(locale))
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Табельный номер", "Employee number", locale)}
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {selectedEmployee.employeeNumber}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Версия согласия", "Consent version", locale)}
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {selectedEmployeeBiometric?.profile?.consentVersion ||
                            "—"}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        {runtimeLocalize("Паспортные данные", "Passport details", locale)}
                      </p>
                      <p className="mt-2 leading-6 text-[color:var(--foreground)]">
                        {runtimeLocalize(
                          "В backend сейчас нет отдельных полей с паспортными реквизитами для отображения в карточке. Когда эти данные появятся в API, этот блок можно сразу заполнить без смены интерфейса.",
                          "The backend does not yet provide separate passport fields for this card. Once the API exposes them, this block can be filled without changing the interface.",
                          locale,
                        )}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1 rounded-xl border-border font-heading"
                    onClick={() => {
                      setSelectedEmployeeId(null);
                      window.setTimeout(
                        () => openMoveDialog(selectedEmployee),
                        0,
                      );
                    }}
                    variant="outline"
                  >
                    <ArrowRightLeft className="h-4 w-4" /> {runtimeLocalize("Переместить в группу", "Move to group", locale)}
                  </Button>
                  <Button
                    className="flex-1 rounded-xl bg-accent font-heading text-accent-foreground hover:bg-accent/90"
                    onClick={() => {
                      setSelectedEmployeeId(null);
                      window.setTimeout(
                        () => openTaskDialogForEmployee(selectedEmployee),
                        0,
                      );
                    }}
                  >
                    <ListTodo className="h-4 w-4" /> {runtimeLocalize("Назначить задачу", "Assign task", locale)}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => !open && setMoveDialogEmployeeId(null)}
        open={!!moveDialogEmployeeId}
      >
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {runtimeLocalize("Переместить в группу", "Move to group", locale)}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {runtimeLocalize(
                "Выберите группу для сотрудника. Можно оставить без группы.",
                "Select a group for the employee. The employee can remain without a group.",
                locale,
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-heading">
              <span>{runtimeLocalize("Группа", "Group", locale)}</span>
              <Select
                onValueChange={setMoveTargetGroupId}
                value={moveTargetGroupId}
              >
                <SelectTrigger className="h-11 rounded-xl border-border bg-secondary/30 text-sm font-heading">
                  <SelectValue placeholder={runtimeLocalize("Выберите группу", "Select group", locale)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">
                    {runtimeLocalize("Без группы", "No group", locale)}
                  </SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            {moveError ? <div className="error-box">{moveError}</div> : null}
            <div className="flex justify-end gap-2">
              <Button
                className="rounded-xl font-heading"
                onClick={() => setMoveDialogEmployeeId(null)}
                variant="outline"
              >
                {runtimeLocalize("Отмена", "Cancel", locale)}
              </Button>
              <Button
                className="rounded-xl font-heading"
                disabled={moveSubmitting}
                onClick={() => void handleMoveEmployee()}
              >
                {moveSubmitting
                  ? runtimeLocalize("Сохраняем...", "Saving...", locale)
                  : runtimeLocalize("Сохранить", "Save", locale)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setTaskDialog(null);
            setTaskDayOffConfirmOpen(false);
          }
        }}
        open={!!taskDialog}
      >
        <DialogContent className="w-[min(620px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {taskDialog?.mode === "group"
                ? runtimeLocalize("Задача группе", "Task for group", locale)
                : runtimeLocalize("Назначить задачу", "Assign task", locale)}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {taskDialog
                ? `${runtimeLocalize("Получатель", "Recipient", locale)}: ${taskDialog.targetLabel}`
                : runtimeLocalize("Заполните параметры задачи.", "Fill in the task details.", locale)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-heading">
              <span>{runtimeLocalize("Название", "Title", locale)}</span>
              <Input
                onChange={(event) =>
                  setTaskDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder={runtimeLocalize(
                  "Например, Подготовить отчёт",
                  "For example, Prepare the report",
                  locale,
                )}
                value={taskDraft.title}
              />
            </label>
            <label className="grid gap-2 text-sm font-heading">
              <span>{runtimeLocalize("Описание", "Description", locale)}</span>
              <Textarea
                className="min-h-[110px]"
                onChange={(event) =>
                  setTaskDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder={runtimeLocalize(
                  "Кратко опишите задачу",
                  "Briefly describe the task",
                  locale,
                )}
                value={taskDraft.description}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-heading">
                <span>{runtimeLocalize("Приоритет", "Priority", locale)}</span>
                <AppSelectField
                  value={normalizeWebAdminTaskPriority(taskDraft.priority)}
                  onValueChange={(value) =>
                    setTaskDraft((current) => ({
                      ...current,
                      priority: value as TaskItem["priority"],
                    }))
                  }
                  options={taskPriorityOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  triggerClassName="h-11 rounded-xl bg-secondary/30"
                />
              </label>
              {!taskDraft.isRecurring ? (
                <label className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Срок", "Due date", locale)}</span>
                  <Input
                    className="h-11"
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        dueAt: event.target.value,
                      }))
                    }
                    type="datetime-local"
                    value={taskDraft.dueAt}
                  />
                  {taskDialog?.mode === "employee" &&
                  canCheckWorkdays &&
                  taskDayStatus ? (
                    <span
                      className={`rounded-2xl px-3 py-2 text-xs font-heading ${
                        taskDayStatus.isWorkday
                          ? "bg-[color:var(--soft-success)] text-[color:var(--success)]"
                          : "bg-[color:var(--soft-warning)] text-[color:var(--warning)]"
                      }`}
                    >
                      {formatWorkdayDateLabel(taskDayStatus.dayKey, locale)}:{" "}
                      {taskDayStatus.isWorkday
                        ? runtimeLocalize("рабочий день", "workday", locale)
                        : runtimeLocalize("выходной день", "day off", locale)}
                    </span>
                  ) : null}
                </label>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="inline-flex cursor-pointer items-center gap-3 justify-self-start">
                <Checkbox
                  checked={taskDraft.isRecurring}
                  onCheckedChange={(checked) =>
                    setTaskDraft((current) => ({
                      ...current,
                      isRecurring: checked === true,
                    }))
                  }
                />
                  <span className="whitespace-nowrap text-sm font-heading leading-none">
                  {runtimeLocalize("Сделать регулярной задачей", "Make recurring", locale)}
                  </span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-3 justify-self-start">
                <Checkbox
                  checked={taskDraft.requiresPhoto}
                  onCheckedChange={(checked) =>
                    setTaskDraft((current) => ({
                      ...current,
                      requiresPhoto: checked === true,
                    }))
                  }
                />
                  <span className="whitespace-nowrap text-sm font-heading leading-none">
                  {runtimeLocalize(
                    "Требуется фото-подтверждение",
                    "Photo confirmation required",
                    locale,
                  )}
                  </span>
              </label>
            </div>
            {taskDraft.isRecurring ? (
              <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-dashed border-border p-4 bg-secondary/10">
                <label className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Периодичность", "Frequency", locale)}</span>
                  <AppSelectField
                    value={taskDraft.frequency}
                    onValueChange={(value) =>
                      setTaskDraft((current) => ({
                        ...current,
                        frequency: value as "DAILY" | "WEEKLY" | "MONTHLY",
                      }))
                    }
                    options={[
                      { value: "DAILY", label: runtimeLocalize("Ежедневно", "Daily", locale) },
                      { value: "WEEKLY", label: runtimeLocalize("Еженедельно", "Weekly", locale) },
                      { value: "MONTHLY", label: runtimeLocalize("Ежемесячно", "Monthly", locale) },
                    ]}
                    triggerClassName="h-11 rounded-xl bg-secondary/30"
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Начало", "Start date", locale)}</span>
                  <Input
                    className="h-11"
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                    type="date"
                    value={taskDraft.startDate}
                  />
                </label>
                {taskDraft.frequency === "WEEKLY" ? (
                  <label className="col-span-full grid gap-2 text-sm font-heading">
                    <span>{runtimeLocalize("Дни недели", "Weekdays", locale)}</span>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                        const label = getWeekdayShortLabel(day, locale);
                        const isSelected = taskDraft.weekDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            className={`h-9 w-9 rounded-full text-xs font-semibold transition-colors ${isSelected ? "bg-[color:var(--primary)] text-white" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                            onClick={() => {
                              setTaskDraft((current) => ({
                                ...current,
                                weekDays: isSelected
                                  ? current.weekDays.filter((d) => d !== day)
                                  : [...current.weekDays, day].sort(),
                              }));
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </label>
                ) : null}
                <label className="col-span-full grid gap-2 text-sm font-heading">
                  <span>
                    {runtimeLocalize(
                      "Дата окончания (необязательно)",
                      "End date (optional)",
                      locale,
                    )}
                  </span>
                  <Input
                    className="h-11"
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        endDate: event.target.value,
                      }))
                    }
                    type="date"
                    value={taskDraft.endDate || ""}
                  />
                </label>
              </div>
            ) : null}
            {taskError ? <div className="error-box">{taskError}</div> : null}
            <div className="flex justify-end gap-2">
              <Button
                className="rounded-xl font-heading"
                onClick={() => setTaskDialog(null)}
                variant="outline"
              >
                {runtimeLocalize("Отмена", "Cancel", locale)}
              </Button>
              <Button
                className="rounded-xl font-heading"
                disabled={taskSubmitting || !taskDraft.title.trim()}
                onClick={() => void handleCreateTask()}
              >
                {taskSubmitting
                  ? runtimeLocalize("Создаём...", "Creating...", locale)
                  : runtimeLocalize("Создать задачу", "Create task", locale)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={setTaskDayOffConfirmOpen}
        open={taskDayOffConfirmOpen}
      >
        <DialogContent className="max-w-[460px] rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {runtimeLocalize("Выходной день", "Day off", locale)}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {taskDialog?.mode === "employee" && taskDayStatus
                ? locale === "ru"
                  ? `У сотрудника ${taskDialog.targetLabel} выходной день ${formatWorkdayDateLabel(taskDayStatus.dayKey, locale)}. Вы хотите назначить задачу на этот день?`
                  : `${taskDialog.targetLabel} has a day off on ${formatWorkdayDateLabel(taskDayStatus.dayKey, locale)}. Do you want to assign a task for this day?`
                : runtimeLocalize(
                    "У сотрудника выходной день. Вы хотите назначить задачу на этот день?",
                    "The employee has a day off. Do you want to assign a task for this day?",
                    locale,
                  )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="rounded-xl font-heading"
              onClick={() => setTaskDayOffConfirmOpen(false)}
              variant="outline"
            >
              {runtimeLocalize("Поменять день", "Change day", locale)}
            </Button>
            <Button
              className="rounded-xl font-heading"
              onClick={() => {
                setTaskDayOffConfirmOpen(false);
                void handleCreateTask(true);
              }}
            >
              {runtimeLocalize("Да", "Yes", locale)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setGroupEditorId(null);
            setGroupDeleteConfirmOpen(false);
            setGroupError(null);
          }
        }}
        open={!!groupEditorId}
      >
        <DialogContent className="w-[min(720px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          {groupEditor ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">
                  {runtimeLocalize("Изменить группу", "Edit group", locale)}
                </DialogTitle>
                <DialogDescription className="font-heading">
                  {runtimeLocalize(
                    "Измените название, описание и состав группы",
                    "Update the name, description and members of group",
                    locale,
                  )}{" "}
                  «{groupEditor.name}».
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <label className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Название группы", "Group name", locale)}</span>
                  <Input
                    maxLength={120}
                    onChange={(event) => setGroupEditorName(event.target.value)}
                    placeholder={runtimeLocalize(
                      "Например, Администраторы",
                      "For example, Administrators",
                      locale,
                    )}
                    value={groupEditorName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Описание", "Description", locale)}</span>
                  <Textarea
                    className="min-h-[96px]"
                    maxLength={500}
                    onChange={(event) =>
                      setGroupEditorDescription(event.target.value)
                    }
                    placeholder={runtimeLocalize(
                      "Короткое описание группы",
                      "Short group description",
                      locale,
                    )}
                    value={groupEditorDescription}
                  />
                </label>
                <div className="text-xs font-heading text-muted-foreground">
                  {runtimeLocalize("Состав группы", "Group members", locale)}
                </div>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {employees.map((employee) => (
                    <label
                      className="flex items-center justify-between rounded-2xl border border-border bg-secondary/20 px-4 py-3"
                      key={employee.id}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          alt={employee.name}
                          className="shrink-0"
                          initials={getEmployeeInitials(employee.name)}
                          size="md"
                          src={employee.avatarUrl ?? null}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-heading font-medium text-foreground">
                            {employee.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {employee.position} • {employee.location}
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        checked={groupEditorMembers.includes(employee.id)}
                        onCheckedChange={(checked) =>
                          setGroupEditorMembers((current) =>
                            checked === true
                              ? Array.from(new Set([...current, employee.id]))
                              : current.filter((id) => id !== employee.id),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                {groupError ? (
                  <div className="error-box">{groupError}</div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    className="rounded-xl font-heading"
                    disabled={groupSaving || groupDeleting}
                    onClick={() => setGroupDeleteConfirmOpen(true)}
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {runtimeLocalize("Удалить группу", "Delete group", locale)}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      className="rounded-xl font-heading"
                      onClick={() => setGroupEditorId(null)}
                      variant="outline"
                    >
                      {runtimeLocalize("Отмена", "Cancel", locale)}
                    </Button>
                    <Button
                      className="rounded-xl font-heading"
                      disabled={groupSaving || groupDeleting}
                      onClick={() => void handleSaveGroup()}
                    >
                      {groupSaving
                        ? runtimeLocalize("Сохраняем...", "Saving...", locale)
                        : runtimeLocalize("Сохранить", "Save", locale)}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={setGroupDeleteConfirmOpen}
        open={groupDeleteConfirmOpen}
      >
        <DialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          {groupEditor ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">
                  {runtimeLocalize("Удалить группу", "Delete group", locale)}
                </DialogTitle>
                <DialogDescription className="font-heading">
                  {runtimeLocalize(
                    `Группа «${groupEditor.name}» будет удалена. Сотрудники останутся в системе без группы, а привязка у задач к этой группе будет снята.`,
                    `Group "${groupEditor.name}" will be deleted. Employees will stay in the system without a group, and tasks will be detached from this group.`,
                    locale,
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm font-heading text-muted-foreground">
                {runtimeLocalize("В группе", "In group", locale)}: {groupEditor.memberships.length}{" "}
                {runtimeLocalize("сотрудник(ов), задач", "employee(s), tasks", locale)}:{" "}
                {groupEditor._count?.tasks ?? 0}.
              </div>
              {groupError ? (
                <div className="error-box">{groupError}</div>
              ) : null}
              <DialogFooter>
                <Button
                  className="rounded-xl font-heading"
                  disabled={groupDeleting}
                  onClick={() => setGroupDeleteConfirmOpen(false)}
                  variant="outline"
                >
                  {runtimeLocalize("Отмена", "Cancel", locale)}
                </Button>
                <Button
                  className="rounded-xl font-heading"
                  disabled={groupDeleting}
                  onClick={() => void handleDeleteGroup()}
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  {groupDeleting
                    ? runtimeLocalize("Удаляем...", "Deleting...", locale)
                    : runtimeLocalize("Удалить группу", "Delete group", locale)}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        onOpenChange={(open) => !open && setAssignShiftDialog(null)}
        open={!!assignShiftDialog}
      >
        <DialogContent className="w-[min(480px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {runtimeLocalize("Назначить смену", "Assign shift", locale)}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {assignShiftDialog
                ? `${runtimeLocalize("Сотрудник", "Employee", locale)}: ${assignShiftDialog.employeeName}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-heading">
              <span>{runtimeLocalize("Шаблон смены", "Shift template", locale)}</span>
              <Select
                onValueChange={(value) => {
                  if (value === CREATE_SHIFT_TEMPLATE_OPTION) {
                    setCreateTemplateOpen(true);
                    return;
                  }

                  setAssignShiftDraft((current) => ({
                    ...current,
                    templateId: value,
                  }));
                }}
                value={assignShiftDraft.templateId}
              >
                <SelectTrigger className="h-11 rounded-xl border-border bg-secondary/30 text-sm font-heading">
                  <SelectValue placeholder={runtimeLocalize("Выберите шаблон", "Select template", locale)} />
                </SelectTrigger>
                <SelectContent>
                  {scheduleTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.startsAtLocal}-{template.endsAtLocal})
                    </SelectItem>
                  ))}
                  <SelectItem value={CREATE_SHIFT_TEMPLATE_OPTION}>
                    {runtimeLocalize("+ Создать шаблон смены", "+ Create shift template", locale)}
                  </SelectItem>
                </SelectContent>
              </Select>
              {scheduleTemplates.length === 0 ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-secondary/20 px-3 py-3 text-sm text-muted-foreground">
                  <span>
                    {runtimeLocalize(
                      "Пока нет ни одного шаблона смены. Сначала создай шаблон, потом он сразу появится в списке.",
                      "There are no shift templates yet. Create one first and it will appear in the list immediately.",
                      locale,
                    )}
                  </span>
                  <Button
                    className="shrink-0 rounded-xl font-heading"
                    onClick={() => setCreateTemplateOpen(true)}
                    type="button"
                    variant="outline"
                  >
                    {runtimeLocalize("Создать", "Create", locale)}
                  </Button>
                </div>
              ) : null}
            </label>
            <label className="grid gap-2 text-sm font-heading">
              <span>{runtimeLocalize("Дата", "Date", locale)}</span>
              <Input
                className="h-11"
                onChange={(event) =>
                  setAssignShiftDraft((current) => ({
                    ...current,
                    shiftDate: event.target.value,
                  }))
                }
                type="date"
                value={assignShiftDraft.shiftDate}
              />
            </label>
            {assignShiftError ? (
              <div className="error-box">{assignShiftError}</div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                className="rounded-xl font-heading"
                onClick={() => setAssignShiftDialog(null)}
                variant="outline"
              >
                {runtimeLocalize("Отмена", "Cancel", locale)}
              </Button>
              <Button
                className="rounded-xl font-heading"
                disabled={assignShiftSubmitting || !assignShiftDraft.templateId}
                onClick={() => void handleCreateShift()}
              >
                {assignShiftSubmitting
                  ? runtimeLocalize("Сохраняем...", "Saving...", locale)
                  : runtimeLocalize("Назначить", "Assign", locale)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
