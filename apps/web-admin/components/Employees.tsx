"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Crown,
  FolderOpen,
  ListTodo,
  Mail,
  Phone,
  Plus,
  Search,
  Settings,
  SmilePlus,
  Smartphone,
  Trash2,
  UserRound,
  UserPlus,
  Users,
  X,
  Clock,
  CreditCard,
} from "lucide-react";
import {
  AttendanceLiveSession,
  CollaborationOverviewResponse,
  EmployeeAccessRole,
  EmployeeApiRecord,
  EmployeeBiometricHistoryResponse,
  EmployeeDetailBootstrapResponse,
  EmployeeDetails,
  EmployeesBootstrapResponse,
  InvitationRecord,
  ScheduleShiftTemplateRecord,
  TaskItem,
  WorkGroupItem,
} from "@smart/types";
import {
  EmojiStyle,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";
import type { SortDescriptor } from "react-aria-components";
import { Table } from "@/components/application/table/table";
import { Avatar } from "@/components/base/avatar/avatar";
import { EmployeeDropdown } from "@/components/employee-dropdown";
import { AnimatedDisclosure } from "@/components/ui/animated-disclosure";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateOfBirthField } from "@/components/ui/date-of-birth-field";
import { ImageAdjustField } from "@/components/image-adjust-field";
import { WorkspaceLoading } from "@/components/workspace-loading";
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
  TaskDatePicker,
  TaskDateTimePicker,
  TaskTimePicker,
} from "@/components/task-schedule-pickers";
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { toAdminHref } from "@/lib/admin-routes";
import {
  readBrowserStorageItem,
  writeBrowserStorageItem,
} from "@/lib/browser-storage";
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
import {
  getRuntimeLocale,
  getRuntimeLocaleTag,
  runtimeLocalize,
} from "@/lib/runtime-locale";
import { navigateWithClickSupport } from "@/lib/navigation";
import { useWorkspaceAutoRefresh } from "@/lib/use-workspace-auto-refresh";

type ReviewInvitationResponse = {
  id: string;
  status: string;
  employeeId?: string | null;
  email?: string;
  generatedPassword?: string;
};

type ShiftTemplateRecord = ScheduleShiftTemplateRecord;
type EmployeesDirectorySnapshot = EmployeesBootstrapResponse;
type TeamOption = WorkGroupItem;
type LocationOption = {
  id: string;
  companyId: string;
  name: string;
};

export type EmployeesInitialData = EmployeesDirectorySnapshot;

type EmployeeStatus =
  | "late"
  | "on_shift"
  | "off_shift"
  | "not_registered"
  | "inactive"
  | "dismissed";
type ViewMode = "employees" | "groups";
type EmployeeWorkMode = "STATIONARY" | "FIELD";
type InvitationDialogMode = "setup" | "review";
type EmployeeSortKey = "name" | "status" | "group" | "activeTasks";
const DEFAULT_TEAM_AVATAR_EMOJI = "👥";
const TEAM_AVATAR_EMOJIS = [
  "👥",
  "🍳",
  "🛎️",
  "🚚",
  "💅",
  "🧹",
  "🏪",
  "🏨",
  "🔧",
  "🛒",
  "🎯",
  "📦",
  "☕",
  "🌿",
];
const TEAM_SUGGESTIONS = [
  { emoji: "🍳", nameRu: "Кухня", nameEn: "Kitchen" },
  { emoji: "🛎️", nameRu: "Зал", nameEn: "Service floor" },
  { emoji: "🚚", nameRu: "Доставка", nameEn: "Delivery" },
  { emoji: "💅", nameRu: "Мастера", nameEn: "Specialists" },
  { emoji: "🏪", nameRu: "Магазин", nameEn: "Store" },
];
const EMPLOYEE_ACCESS_ROLES: Array<{
  value: EmployeeAccessRole;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
}> = [
  {
    value: "owner",
    titleRu: "Владелец",
    titleEn: "Owner",
    descriptionRu: "Полный доступ ко всем сотрудникам, бригадам и настройкам.",
    descriptionEn: "Full access to employees, teams, and workspace settings.",
  },
  {
    value: "team_leader",
    titleRu: "Лидер бригады",
    titleEn: "Team leader",
    descriptionRu: "Управляет задачами и посещаемостью своей бригады.",
    descriptionEn: "Manages tasks and attendance for one assigned team.",
  },
  {
    value: "employee",
    titleRu: "Сотрудник",
    titleEn: "Employee",
    descriptionRu: "Видит свои смены, задачи, посещаемость и профиль.",
    descriptionEn: "Sees own shifts, tasks, attendance, and profile.",
  },
];

type TaskDialogState =
  | {
      mode: "employee";
      targetIds: string[];
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
  role: EmployeeAccessRole;
  roleLabel: string;
  groupId: string | null;
  group: string | null;
  groupEmoji: string | null;
  location: string;
  locationId: string | null;
  status: EmployeeStatus;
  activeTasks: number;
  phone: string;
  position: string;
  hireDate: string;
  attendance: number | null;
  avatarUrl: string | null;
};

function employeeRecordBelongsToLocation(
  employee: EmployeeApiRecord | undefined,
  locationId: string,
) {
  if (!employee || !locationId) return Boolean(employee);

  return (
    employee.primaryLocation?.id === locationId ||
    employee.locationAssignments?.some(
      (assignment) =>
        assignment.locationId === locationId && !assignment.unassignedAt,
    ) === true
  );
}

const statusStyles: Record<EmployeeStatus, string> = {
  late: "bg-[color:var(--soft-danger)] text-[color:var(--danger)]",
  on_shift: "bg-[color:var(--soft-success)] text-[color:var(--success)]",
  off_shift: "bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]",
  not_registered:
    "bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]",
  inactive: "bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]",
  dismissed: "bg-[color:var(--soft-danger)] text-[color:var(--danger)]",
};

const statusToneByEmployeeStatus: Record<EmployeeStatus, string> = {
  late: "is-error",
  on_shift: "is-success",
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
const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

const initialTaskDraft = {
  locationId: "",
  title: "",
  description: "",
  priority: "MEDIUM" as TaskItem["priority"],
  dueAt: "",
  dueTimeLocal: "18:00",
  hasDueTime: false,
  requiresPhoto: false,
  isRecurring: false,
  weekDays: [1, 2, 3, 4, 5],
  startDate: new Date().toISOString().split("T")[0],
};
const TASK_WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 0];

const reviewFieldClassName = "h-11 rounded-xl bg-secondary/30 text-sm";
const reviewInfoBoxClassName =
  "flex min-h-11 items-center rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground";
const employeeWorkModeOptions: Array<{
  value: EmployeeWorkMode;
  labelRu: string;
  labelEn: string;
  descriptionRu: string;
  descriptionEn: string;
}> = [
  {
    value: "STATIONARY",
    labelRu: "Штатный",
    labelEn: "Stationary",
    descriptionRu: "Check-in только в радиусе локации организации.",
    descriptionEn: "Check-in is limited to the organization location radius.",
  },
  {
    value: "FIELD",
    labelRu: "Выездной",
    labelEn: "Field",
    descriptionRu: "Несколько Say hi / Say bye в день, GPS пишется по месту.",
    descriptionEn:
      "Multiple Say hi / Say bye visits per day, GPS is recorded on site.",
  },
];
const EMPLOYEES_DIRECTORY_CACHE_TTL_MS = 2 * 60 * 1000;
const ADD_EMPLOYEE_PROMPT_STORAGE_PREFIX = "smart:add-employee-prompt";
const ADD_EMPLOYEE_PROMPT_PENDING = "pending";
const ADD_EMPLOYEE_PROMPT_DISMISSED = "dismissed";

function buildEmployeesDirectoryCacheKey(
  session: NonNullable<ReturnType<typeof getSession>>,
) {
  return `employees:directory:${session.user.tenantId}:${session.user.id}`;
}

function buildAddEmployeePromptStorageKey(
  session: NonNullable<ReturnType<typeof getSession>>,
) {
  return `${ADD_EMPLOYEE_PROMPT_STORAGE_PREFIX}:${session.user.tenantId}:${session.user.id}`;
}

function isBillingSeatLimitMessage(message: string) {
  return /оплаченных мест|billing|paid seats|seat/i.test(message);
}

function normalizeEmployeeWorkMode(workMode?: string | null): EmployeeWorkMode {
  return workMode === "FIELD" ? "FIELD" : "STATIONARY";
}

function getEmployeeWorkModeLabel(
  workMode: EmployeeWorkMode | undefined,
  locale: "ru" | "en",
) {
  const option = employeeWorkModeOptions.find(
    (item) => item.value === workMode,
  );
  return option
    ? runtimeLocalize(option.labelRu, option.labelEn, locale)
    : runtimeLocalize("Штатный", "Stationary", locale);
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

function resolveEmployeeAccessRole(
  employee: EmployeeApiRecord,
): EmployeeAccessRole {
  const roleCodes =
    employee.user?.roles
      ?.map((assignment) => assignment.role?.code)
      .filter((code): code is string => Boolean(code)) ?? [];

  if (roleCodes.includes("tenant_owner")) return "owner";
  if (roleCodes.includes("manager")) return "team_leader";
  return "employee";
}

function getEmployeeAccessRoleLabel(
  role: EmployeeAccessRole,
  locale: "ru" | "en",
) {
  if (role === "owner") return runtimeLocalize("Владелец", "Owner", locale);
  if (role === "team_leader") return runtimeLocalize("Лидер", "Leader", locale);
  return runtimeLocalize("Сотрудник", "Employee", locale);
}

function getEmployeeAccessRoleClasses(role: EmployeeAccessRole) {
  if (role === "owner") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (role === "team_leader") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getEmployeeAccessRoleIcon(role: EmployeeAccessRole) {
  if (role === "owner") return Crown;
  if (role === "team_leader") return Users;
  return UserRound;
}

function RoleBadge({
  label,
  role,
}: {
  label: string;
  role: EmployeeAccessRole;
}) {
  const Icon = getEmployeeAccessRoleIcon(role);

  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold ${getEmployeeAccessRoleClasses(role)}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function TeamChoiceGrid({
  groups,
  selectedGroupId,
  onSelect,
  locale,
  includeNoTeam = true,
  onCreateTeam,
}: {
  groups: TeamOption[];
  selectedGroupId: string;
  onSelect: (groupId: string) => void;
  locale: "ru" | "en";
  includeNoTeam?: boolean;
  onCreateTeam?: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {groups.map((group) => {
        const selected = selectedGroupId === group.id;
        return (
          <button
            aria-pressed={selected}
            className={`min-h-[96px] rounded-2xl border p-3 text-center font-heading transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.96] ${
              selected
                ? "border-[color:var(--accent)] bg-[rgba(49,84,255,0.08)] shadow-[0_10px_26px_rgba(37,99,235,0.13)]"
                : "border-border bg-white hover:border-[rgba(49,84,255,0.28)] hover:bg-[rgba(49,84,255,0.04)]"
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
              {runtimeLocalize(
                `${group.memberships.length} чел.`,
                `${group.memberships.length} people`,
                locale,
              )}
            </span>
          </button>
        );
      })}
      {includeNoTeam ? (
        <button
          aria-pressed={selectedGroupId === "__none"}
          className={`min-h-[96px] rounded-2xl border p-3 text-center font-heading transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.96] ${
            selectedGroupId === "__none"
              ? "border-[color:var(--accent)] bg-[rgba(49,84,255,0.08)] shadow-[0_10px_26px_rgba(37,99,235,0.13)]"
              : "border-dashed border-border bg-white hover:border-[rgba(49,84,255,0.28)] hover:bg-[rgba(49,84,255,0.04)]"
          }`}
          onClick={() => onSelect("__none")}
          type="button"
        >
          <span className="block text-2xl leading-none">—</span>
          <span className="mt-2 block text-sm font-semibold text-foreground">
            {runtimeLocalize("Без бригады", "No team", locale)}
          </span>
          <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
            {runtimeLocalize("Снять привязку", "Clear team", locale)}
          </span>
        </button>
      ) : null}
      {onCreateTeam ? (
        <button
          className="min-h-[96px] rounded-2xl border border-dashed border-border bg-white p-3 text-center font-heading transition-[background-color,border-color,transform] duration-150 hover:border-[rgba(49,84,255,0.28)] hover:bg-[rgba(49,84,255,0.04)] active:scale-[0.96]"
          onClick={onCreateTeam}
          type="button"
        >
          <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-foreground">
            <Plus className="h-4 w-4" />
          </span>
          <span className="mt-2 block text-sm font-semibold text-foreground">
            {runtimeLocalize("Новая", "New team", locale)}
          </span>
          <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
            {runtimeLocalize("Создать", "Create", locale)}
          </span>
        </button>
      ) : null}
    </div>
  );
}

function TeamEmojiPickerField({
  value,
  onChange,
  locale,
}: {
  value: string;
  onChange: (emoji: string) => void;
  locale: "ru" | "en";
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const quickEmojiOptions = TEAM_AVATAR_EMOJIS.slice(
    0,
    Math.max(0, TEAM_AVATAR_EMOJIS.length - 3),
  );
  const chooseEmojiLabel = runtimeLocalize(
    "Выбрать эмодзи",
    "Choose emoji",
    locale,
  );

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <button
          aria-expanded={pickerOpen}
          aria-label={chooseEmojiLabel}
          className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-secondary/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-[background-color,border-color,transform] duration-150 hover:bg-secondary/40 active:scale-[0.96] ${
            pickerOpen ? "border-accent" : "border-border"
          }`}
          onClick={() => setPickerOpen((current) => !current)}
          title={chooseEmojiLabel}
          type="button"
        >
          <SmilePlus className="h-5 w-5 text-muted-foreground" />
          <span className="sr-only">{chooseEmojiLabel}</span>
        </button>
        {[
          ...(value && !quickEmojiOptions.includes(value) ? [value] : []),
          ...quickEmojiOptions,
        ].map((emoji) => (
          <button
            aria-pressed={value === emoji}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition-[background-color,border-color,transform] duration-150 active:scale-[0.96] ${
              value === emoji
                ? "border-accent bg-white shadow-[0_0_0_1px_var(--accent)]"
                : "border-border bg-secondary/20 hover:bg-secondary/40"
            }`}
            key={emoji}
            onClick={() => {
              onChange(emoji);
              setPickerOpen(false);
            }}
            type="button"
          >
            {emoji}
          </button>
        ))}
      </div>
      {pickerOpen ? (
        <div className="absolute left-0 top-12 z-[90] w-[min(360px,calc(100vw-4rem))] overflow-hidden rounded-2xl border border-border bg-white p-2 shadow-[0_20px_70px_rgba(15,23,42,0.18)]">
          <EmojiPicker
            emojiStyle={EmojiStyle.APPLE}
            height={320}
            lazyLoadEmojis
            onEmojiClick={(emoji: EmojiClickData) => {
              onChange(emoji.emoji);
              setPickerOpen(false);
            }}
            previewConfig={{ showPreview: false }}
            searchPlaceholder={runtimeLocalize("Поиск", "Search", locale)}
            theme={Theme.LIGHT}
            width="100%"
          />
        </div>
      ) : null}
    </div>
  );
}

function TeamMembersDropdown({
  employees,
  selectedIds,
  onChange,
  locale,
}: {
  employees: EmployeeRowView[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  locale: "ru" | "en";
}) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedEmployees = employees.filter((employee) =>
    selectedSet.has(employee.id),
  );
  const triggerLabel =
    selectedEmployees.length === 0
      ? runtimeLocalize("Выберите сотрудников", "Select employees", locale)
      : selectedEmployees.length === 1
        ? (selectedEmployees[0]?.name ?? "")
        : runtimeLocalize(
            `${selectedEmployees.length} сотрудников выбрано`,
            `${selectedEmployees.length} employees selected`,
            locale,
          );

  function toggleEmployee(employeeId: string) {
    const next = new Set(selectedIds);
    if (next.has(employeeId)) {
      next.delete(employeeId);
    } else {
      next.add(employeeId);
    }
    onChange(Array.from(next));
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary/10 px-4 py-5 text-sm text-muted-foreground">
        {runtimeLocalize(
          "В организации пока нет сотрудников для добавления в бригаду.",
          "There are no employees in the organization yet to add to the team.",
          locale,
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-2 text-left font-heading transition-[background-color,border-color] hover:bg-secondary/20"
          type="button"
        >
          <span className="min-w-0 truncate text-sm text-foreground">
            {triggerLabel}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[min(340px,calc(100vh-10rem))] w-[var(--radix-dropdown-menu-trigger-width)] rounded-[22px] border-border bg-white p-2 shadow-[0_18px_60px_rgba(15,23,42,0.16)]"
        sideOffset={8}
      >
        {employees.map((employee) => (
          <DropdownMenuCheckboxItem
            checked={selectedSet.has(employee.id)}
            className="min-h-14 rounded-2xl px-3 py-2 pr-9 font-heading text-sm focus:bg-[color:var(--accent)] focus:text-white"
            key={employee.id}
            onCheckedChange={() => toggleEmployee(employee.id)}
            onSelect={(event) => event.preventDefault()}
          >
            <Avatar
              alt={employee.name}
              className="shrink-0"
              initials={employee.name}
              size="sm"
              src={employee.avatarUrl ?? null}
            />
            <span className="min-w-0 truncate font-semibold">
              {employee.name}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
  if (status === "on_shift")
    return runtimeLocalize("На смене", "On shift", locale);
  if (status === "off_shift")
    return runtimeLocalize("Не на смене", "Off shift", locale);
  if (status === "not_registered")
    return runtimeLocalize("Не зарегистрирован", "Not registered", locale);
  if (status === "inactive")
    return runtimeLocalize("Неактивен", "Inactive", locale);
  return runtimeLocalize("Уволен", "Dismissed", locale);
}

function getInvitationLabel(
  status: InvitationRecord["status"],
  locale: "ru" | "en",
) {
  if (status === "INVITED") {
    return runtimeLocalize("Email добавлен", "Email registered", locale);
  }
  if (status === "PENDING_APPROVAL") {
    return runtimeLocalize("Ждёт подтверждения", "Pending approval", locale);
  }
  return runtimeLocalize("Отклонено", "Rejected", locale);
}

function getTaskPriorityOptions(_locale: "ru" | "en") {
  return [
    {
      value: "LOW" as TaskItem["priority"],
      label: getWebAdminTaskPriorityLabel("LOW"),
    },
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
  const normalizedDay = day === 7 ? 0 : day;

  if (locale === "en") {
    return normalizedDay === 0
      ? "Su"
      : normalizedDay === 1
        ? "Mo"
        : normalizedDay === 2
          ? "Tu"
          : normalizedDay === 3
            ? "We"
            : normalizedDay === 4
              ? "Th"
              : normalizedDay === 5
                ? "Fr"
                : "Sa";
  }

  return normalizedDay === 0
    ? "Вс"
    : normalizedDay === 1
      ? "Пн"
      : normalizedDay === 2
        ? "Вт"
        : normalizedDay === 3
          ? "Ср"
          : normalizedDay === 4
            ? "Чт"
            : normalizedDay === 5
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
      return runtimeLocalize(
        "Регистрация не завершена",
        "Registration pending",
        locale,
      );
    case "FAILED":
      return runtimeLocalize(
        "Ошибка регистрации",
        "Registration failed",
        locale,
      );
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

function resolveTeamAvatarEmoji(group?: { avatarEmoji?: string | null }) {
  return group?.avatarEmoji?.trim() || DEFAULT_TEAM_AVATAR_EMOJI;
}

const Employees = ({
  initialData,
}: {
  initialData?: EmployeesInitialData | null;
}) => {
  const router = useRouter();
  const activeSession = getSession();
  const locale = getRuntimeLocale();
  const addEmployeePromptStorageKey = activeSession
    ? buildAddEmployeePromptStorageKey(activeSession)
    : null;
  const taskPriorityOptions = useMemo(
    () => getTaskPriorityOptions(locale),
    [locale],
  );
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("employees");
  const [shouldPulseAddEmployee, setShouldPulseAddEmployee] = useState(false);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });
  const [showFormerEmployees, setShowFormerEmployees] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(!initialData);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [navigatingEmployeeId, setNavigatingEmployeeId] = useState<
    string | null
  >(null);

  const [employeeRecords, setEmployeeRecords] = useState<EmployeeApiRecord[]>(
    initialData?.employeeRecords ?? [],
  );
  const [liveSessions, setLiveSessions] = useState<AttendanceLiveSession[]>(
    initialData?.liveSessions ?? [],
  );
  const [overview, setOverview] =
    useState<CollaborationOverviewResponse | null>(
      initialData?.overview ?? null,
    );
  const [directoryGroups, setDirectoryGroups] = useState<WorkGroupItem[]>(
    initialData?.groups ?? [],
  );
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>(
    initialData?.locations ?? [],
  );
  const [updatingLocationEmployeeId, setUpdatingLocationEmployeeId] =
    useState<string | null>(null);

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
  const [breaksUpdating, setBreaksUpdating] = useState(false);
  const [workModeUpdating, setWorkModeUpdating] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
    buildExpandedGroupsFromSnapshot(initialData),
  );

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteStep, setInviteStep] = useState<1 | 2>(1);
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [invitePositionTitle, setInvitePositionTitle] = useState("");
  const [inviteRole, setInviteRole] = useState<EmployeeAccessRole>("employee");
  const [inviteAssignTeam, setInviteAssignTeam] = useState(false);
  const [inviteTeamId, setInviteTeamId] = useState("__none");
  const [inviteTeamName, setInviteTeamName] = useState("");
  const [inviteTeamEmoji, setInviteTeamEmoji] = useState("🍳");
  const [inviteEmojiPickerOpen, setInviteEmojiPickerOpen] = useState(false);
  const [inviteTeamCreating, setInviteTeamCreating] = useState(false);
  const [inviteTeamError, setInviteTeamError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [mobileLinkCopied, setMobileLinkCopied] = useState(false);
  const [seatLimitDialogOpen, setSeatLimitDialogOpen] = useState(false);
  const [copiedInviteField, setCopiedInviteField] = useState<
    "email" | "password" | null
  >(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [createGroupDescription, setCreateGroupDescription] = useState("");
  const [createGroupEmoji, setCreateGroupEmoji] = useState(
    DEFAULT_TEAM_AVATAR_EMOJI,
  );
  const [createGroupMembers, setCreateGroupMembers] = useState<string[]>([]);
  const [createGroupSubmitting, setCreateGroupSubmitting] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  const [pendingInvitations, setPendingInvitations] = useState<
    InvitationRecord[]
  >(initialData?.pendingInvitations ?? []);
  const [invitationsLoading, setInvitationsLoading] = useState(!initialData);
  const [selectedInvitation, setSelectedInvitation] =
    useState<InvitationRecord | null>(null);
  const [invitationDialogMode, setInvitationDialogMode] =
    useState<InvitationDialogMode>("review");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [invitationDeleting, setInvitationDeleting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [approvalCredentials, setApprovalCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [reviewForm, setReviewForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    positionTitle: "",
    birthDate: "",
    gender: "male",
    phone: "",
    shiftTemplateId: "",
    groupId: "__none",
    role: "employee" as EmployeeAccessRole,
    rejectedReason: "",
    avatarDataUrl: "",
    avatarPreview: "",
    workMode: "STATIONARY" as EmployeeWorkMode,
  });

  const [moveDialogEmployeeId, setMoveDialogEmployeeId] = useState<
    string | null
  >(null);
  const [moveTargetGroupId, setMoveTargetGroupId] = useState("__none");
  const [moveMakeLeader, setMoveMakeLeader] = useState(false);
  const [moveSubmitting, setMoveSubmitting] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [teamFilterId, setTeamFilterId] = useState("all");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState("__none");
  const [bulkRole, setBulkRole] = useState<EmployeeAccessRole | "keep">("keep");
  const [bulkLocationId, setBulkLocationId] = useState("keep");
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

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
    locationId: initialData?.locations?.length === 1 ? initialData.locations[0]?.id ?? "" : "",
    name: "",
    startsAtLocal: "09:00",
    endsAtLocal: "18:00",
    weekDays: [1, 2, 3, 4, 5],
    fixedBreakEnabled: false,
    fixedBreakStartsAtLocal: "13:00",
    fixedBreakDurationMinutes: "30",
    fixedBreakIsPaid: false,
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
    locationId: "",
    templateId: "",
    shiftDate: new Date().toISOString().split("T")[0],
    fixedBreakEnabled: false,
    fixedBreakStartsAtLocal: "13:00",
    fixedBreakDurationMinutes: "30",
    fixedBreakIsPaid: false,
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
      !templateDraft.locationId ||
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

    const fixedBreakDuration = Number(templateDraft.fixedBreakDurationMinutes);
    if (
      templateDraft.fixedBreakEnabled &&
      (!Number.isFinite(fixedBreakDuration) || fixedBreakDuration <= 0)
    ) {
      setCreateTemplateError(
        runtimeLocalize(
          "Укажите длительность фиксированного перерыва",
          "Enter fixed break duration",
          locale,
        ),
      );
      return;
    }

    setCreateTemplateSubmitting(true);
    setCreateTemplateError(null);

    const session = getSession();
    if (!session) {
      setCreateTemplateError(
        runtimeLocalize(
          "Сессия не найдена. Войдите заново",
          "Session not found. Please sign in again.",
          locale,
        ),
      );
      setCreateTemplateSubmitting(false);
      return;
    }

    try {
      await apiRequest("/schedule/templates", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          name: templateDraft.name.trim(),
          locationId: templateDraft.locationId,
          code: templateDraft.name.trim().toLowerCase().replace(/\s+/g, "-"),
          startsAtLocal: templateDraft.startsAtLocal,
          endsAtLocal: templateDraft.endsAtLocal,
          weekDays: templateDraft.weekDays,
          gracePeriodMinutes: 10,
          fixedBreakStartsAtLocal: templateDraft.fixedBreakEnabled
            ? templateDraft.fixedBreakStartsAtLocal
            : undefined,
          fixedBreakDurationMinutes: templateDraft.fixedBreakEnabled
            ? fixedBreakDuration
            : 0,
          fixedBreakIsPaid: false,
        }),
      });

      const snapshot = await apiRequest<EmployeesDirectorySnapshot>(
        "/bootstrap/employees",
        {
          token: session.accessToken,
          skipClientCache: true,
        },
      );
      applyDirectorySnapshot(
        snapshot,
        buildEmployeesDirectoryCacheKey(session),
      );

      const res = snapshot.scheduleTemplates;
      if (res && res.length > 0) {
        const created =
          res.find(
            (t) =>
              t.name === templateDraft.name.trim() &&
              t.startsAtLocal === templateDraft.startsAtLocal &&
              t.endsAtLocal === templateDraft.endsAtLocal,
          ) ?? res.find((t) => t.name === templateDraft.name.trim());
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
        locationId: locationOptions.length === 1 ? locationOptions[0]?.id ?? "" : "",
        name: "",
        startsAtLocal: "09:00",
        endsAtLocal: "18:00",
        weekDays: [1, 2, 3, 4, 5],
        fixedBreakEnabled: false,
        fixedBreakStartsAtLocal: "13:00",
        fixedBreakDurationMinutes: "30",
        fixedBreakIsPaid: false,
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
  const [organizationSetup, setOrganizationSetup] = useState(
    initialData?.organizationSetup ?? null,
  );
  const attendanceTrackingEnabled =
    organizationSetup?.attendanceTrackingEnabled ?? true;
  const [taskDayOffConfirmOpen, setTaskDayOffConfirmOpen] = useState(false);
  const didUseInitialData = useRef(Boolean(initialData));

  const [groupEditorId, setGroupEditorId] = useState<string | null>(null);
  const [groupEditorMembers, setGroupEditorMembers] = useState<string[]>([]);
  const [groupEditorName, setGroupEditorName] = useState("");
  const [groupEditorDescription, setGroupEditorDescription] = useState("");
  const [groupEditorEmoji, setGroupEditorEmoji] = useState(
    DEFAULT_TEAM_AVATAR_EMOJI,
  );
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupDeleting, setGroupDeleting] = useState(false);
  const [groupDeleteConfirmOpen, setGroupDeleteConfirmOpen] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  const groups = overview?.groups ?? directoryGroups;

  const groupByEmployeeId = useMemo(() => {
    const map = new Map<string, { id: string; name: string; emoji: string }>();
    groups.forEach((group) => {
      group.memberships.forEach((membership) => {
        map.set(membership.employeeId, {
          id: group.id,
          name: group.name,
          emoji: resolveTeamAvatarEmoji(group),
        });
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
    return new Map(
      liveSessions.map((session) => [session.employeeId, session] as const),
    );
  }, [liveSessions]);

  const employees = useMemo<EmployeeRowView[]>(() => {
    return employeeRecords
      .map((employee) => {
        const group = groupByEmployeeId.get(employee.id);
        const liveSession = liveSessionsByEmployeeId.get(employee.id);
        const role = resolveEmployeeAccessRole(employee);
        return {
          id: employee.id,
          name: buildEmployeeName(employee),
          employeeNumber: employee.employeeNumber,
          email: employee.user?.email ?? "",
          role,
          roleLabel: getEmployeeAccessRoleLabel(role, locale),
          groupId: group?.id ?? null,
          group: group?.name ?? null,
          groupEmoji: group?.emoji ?? null,
          location: employee.primaryLocation?.name ?? "—",
          locationId: employee.primaryLocation?.id ?? null,
          status: resolveEmployeeStatus(employee, liveSession),
          activeTasks: tasksByEmployeeId.get(employee.id) ?? 0,
          phone: employee.phone ?? "—",
          position:
            employee.position?.name ??
            runtimeLocalize("Сотрудник", "Employee", locale),
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

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    void apiRequest<LocationOption[]>("/org/locations", {
      token: session.accessToken,
    })
      .then(setLocationOptions)
      .catch(() => setLocationOptions([]));
  }, []);

  async function updateEmployeeLocation(
    employeeId: string,
    locationId: string,
  ) {
    const session = getSession();
    if (!session) return;
    setUpdatingLocationEmployeeId(employeeId);
    setPageMessage(null);
    try {
      const updated = await apiRequest<EmployeeApiRecord>(
        `/employees/${employeeId}/location`,
        {
          method: "PATCH",
          token: session.accessToken,
          body: JSON.stringify({
            locationId,
            futureShiftStrategy: "keep",
          }),
        },
      );
      setEmployeeRecords((current) =>
        current.map((employee) =>
          employee.id === employeeId ? { ...employee, ...updated } : employee,
        ),
      );
      setPageMessage(
        runtimeLocalize(
          "Локация сотрудника обновлена.",
          "Employee location updated.",
          locale,
        ),
      );
    } catch (nextError) {
      setDirectoryError(
        nextError instanceof Error
          ? nextError.message
          : runtimeLocalize(
              "Не удалось изменить локацию.",
              "Failed to update location.",
              locale,
            ),
      );
    } finally {
      setUpdatingLocationEmployeeId(null);
    }
  }

  const taskEmployeeOptions = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.status !== "dismissed" &&
          (!taskDraft.locationId ||
            employeeRecordBelongsToLocation(
              employeeRecords.find(({ id }) => id === employee.id),
              taskDraft.locationId,
            )),
      ),
    [employeeRecords, employees, taskDraft.locationId],
  );
  const taskRecipientSummary = useMemo(() => {
    if (taskDialog?.mode !== "employee") {
      return taskDialog?.targetLabel ?? null;
    }

    const selectedIds = taskDialog.targetIds;
    if (
      selectedIds.length === taskEmployeeOptions.length &&
      taskEmployeeOptions.length > 0
    ) {
      return runtimeLocalize("Все сотрудники", "All employees", locale);
    }

    if (selectedIds.length === 1) {
      return (
        taskEmployeeOptions.find((employee) => employee.id === selectedIds[0])
          ?.name ?? taskDialog.targetLabel
      );
    }

    if (selectedIds.length > 1) {
      return runtimeLocalize(
        `${selectedIds.length} сотрудников выбрано`,
        `${selectedIds.length} employees selected`,
        locale,
      );
    }

    return null;
  }, [locale, taskDialog, taskEmployeeOptions]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      if (!showFormerEmployees && employee.status === "dismissed") {
        return false;
      }

      if (teamFilterId === "__none" && employee.groupId) {
        return false;
      }

      if (
        teamFilterId !== "all" &&
        teamFilterId !== "__none" &&
        employee.groupId !== teamFilterId
      ) {
        return false;
      }

      if (!query) return true;

      return (
        employee.name.toLowerCase().includes(query) ||
        employee.employeeNumber.toLowerCase().includes(query) ||
        employee.position.toLowerCase().includes(query) ||
        employee.roleLabel.toLowerCase().includes(query) ||
        (employee.group ?? "").toLowerCase().includes(query) ||
        employee.location.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query)
      );
    });
  }, [employees, search, showFormerEmployees, teamFilterId]);

  const sortedEmployees = useMemo(() => {
    const collator = new Intl.Collator(locale === "ru" ? "ru" : "en", {
      sensitivity: "base",
      numeric: true,
    });
    const direction = sortDescriptor.direction === "descending" ? -1 : 1;
    const statusOrder: Record<EmployeeStatus, number> = {
      late: 0,
      on_shift: 1,
      off_shift: 2,
      not_registered: 3,
      inactive: 4,
      dismissed: 5,
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
          leader:
            employees.find(
              (employee) =>
                employee.groupId === group.id &&
                employee.role === "team_leader",
            ) ?? null,
        }))
        .sort((left, right) =>
          left.group.name.localeCompare(right.group.name, locale),
        ),
    [employees, filteredEmployees, groups, locale],
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

  useEffect(() => {
    if (
      teamFilterId !== "all" &&
      teamFilterId !== "__none" &&
      !groups.some((group) => group.id === teamFilterId)
    ) {
      setTeamFilterId("all");
    }
  }, [groups, teamFilterId]);

  const selectedEmployee = useMemo(
    () =>
      employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );
  const selectedEmployeeBreaksEnabled = Boolean(
    selectedEmployeeDetails?.breaksEnabled ??
    employeeRecords.find((employee) => employee.id === selectedEmployeeId)
      ?.breaksEnabled ??
    false,
  );
  const selectedEmployeeWorkMode = normalizeEmployeeWorkMode(
    selectedEmployeeDetails?.workMode ??
      employeeRecords.find((employee) => employee.id === selectedEmployeeId)
        ?.workMode,
  );
  const navigatingEmployee = useMemo(
    () =>
      navigatingEmployeeId
        ? (employees.find((employee) => employee.id === navigatingEmployeeId) ??
          null)
        : null,
    [employees, navigatingEmployeeId],
  );

  function openEmployeePage(
    employeeId: string,
    event?: MouseEvent<HTMLElement>,
  ) {
    const href = `/employees/${employeeId}`;

    if (
      event &&
      (event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey)
    ) {
      navigateWithClickSupport(
        (nextHref) => router.push(nextHref),
        href,
        event,
      );
      return;
    }

    if (navigatingEmployeeId) {
      return;
    }

    setNavigatingEmployeeId(employeeId);
    void router.prefetch(href);

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        router.push(href);
      });
      return;
    }

    router.push(href);
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
    if (
      !canCheckWorkdays ||
      taskDialog?.mode !== "employee" ||
      taskDialog.targetIds.length !== 1 ||
      !taskDraft.hasDueTime ||
      !taskDraft.dueAt
    ) {
      return null;
    }

    return getEmployeeWorkdayStatus(
      employeeWorkdayLookup,
      taskDialog.targetIds[0],
      taskDraft.dueAt,
    );
  }, [
    canCheckWorkdays,
    employeeWorkdayLookup,
    taskDialog,
    taskDraft.dueAt,
    taskDraft.hasDueTime,
  ]);

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

  function applyDirectorySnapshot(
    snapshot: EmployeesDirectorySnapshot,
    cacheKey?: string | null,
  ) {
    setEmployeeRecords(snapshot.employeeRecords);
    setLiveSessions(snapshot.liveSessions ?? []);
    setOverview(snapshot.overview);
    setDirectoryGroups(snapshot.groups ?? []);
    setLocationOptions(snapshot.locations ?? []);
    setPendingInvitations(snapshot.pendingInvitations);
    setScheduleShifts(snapshot.scheduleShifts);
    setScheduleTemplates(snapshot.scheduleTemplates);
    setCanCheckWorkdays(snapshot.canCheckWorkdays);
    setOrganizationSetup(snapshot.organizationSetup ?? null);

    setExpandedGroups(buildExpandedGroupsFromSnapshot(snapshot));

    if (cacheKey) {
      writeClientCache(cacheKey, snapshot);
    }
  }

  async function loadDirectory(options?: {
    force?: boolean;
    silent?: boolean;
  }) {
    const session = getSession();
    if (!session) {
      if (!options?.silent) {
        setDirectoryLoading(false);
        setInvitationsLoading(false);
      }
      return;
    }

    if (!options?.silent) {
      setDirectoryLoading(true);
      setDirectoryError(null);
    }

    try {
      const snapshot = await apiRequest<EmployeesDirectorySnapshot>(
        "/bootstrap/employees",
        {
          token: session.accessToken,
          skipClientCache: options?.force ?? false,
        },
      );

      applyDirectorySnapshot(
        snapshot,
        buildEmployeesDirectoryCacheKey(session),
      );
      setDirectoryError(null);
    } catch (requestError) {
      if (!options?.silent) {
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
        setDirectoryGroups([]);
        setPendingInvitations([]);
        setScheduleShifts([]);
        setScheduleTemplates([]);
        setCanCheckWorkdays(false);
        setOrganizationSetup(null);
      }
    } finally {
      if (!options?.silent) {
        setDirectoryLoading(false);
        setInvitationsLoading(false);
      }
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
      void loadDirectory({
        force: true,
        silent: true,
      });
      return;
    }

    const session = getSession();
    const cachedDirectory = session
      ? readClientCache<EmployeesDirectorySnapshot>(
          buildEmployeesDirectoryCacheKey(session),
          EMPLOYEES_DIRECTORY_CACHE_TTL_MS,
        )
      : null;

    if (cachedDirectory) {
      applyDirectorySnapshot(cachedDirectory.value);
      setDirectoryLoading(false);
      setInvitationsLoading(false);
    }

    if (session && !cachedDirectory) {
      setDirectoryLoading(true);
      setInvitationsLoading(true);
    }

    if (session) {
      void loadDirectory({
        force: true,
        silent: Boolean(cachedDirectory),
      });
    }
  }, [initialData]);

  useWorkspaceAutoRefresh({
    session: activeSession,
    enabled: Boolean(activeSession),
    onRefresh: async () => {
      await loadDirectory({
        force: true,
        silent: true,
      });
    },
  });

  useEffect(() => {
    if (!addEmployeePromptStorageKey || typeof window === "undefined") {
      setShouldPulseAddEmployee(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const shouldPromptFromRedirect = params.get("focusAddEmployee") === "1";
    const storedPrompt = readBrowserStorageItem(addEmployeePromptStorageKey, {
      includeSessionFallback: true,
    });

    if (storedPrompt === ADD_EMPLOYEE_PROMPT_DISMISSED) {
      setShouldPulseAddEmployee(false);
      return;
    }

    if (
      storedPrompt === ADD_EMPLOYEE_PROMPT_PENDING ||
      shouldPromptFromRedirect
    ) {
      setShouldPulseAddEmployee(true);
      if (
        shouldPromptFromRedirect &&
        storedPrompt !== ADD_EMPLOYEE_PROMPT_PENDING
      ) {
        writeBrowserStorageItem(
          addEmployeePromptStorageKey,
          ADD_EMPLOYEE_PROMPT_PENDING,
          { includeSessionFallback: true },
        );
      }
      return;
    }

    setShouldPulseAddEmployee(false);
  }, [addEmployeePromptStorageKey]);

  useEffect(() => {
    const session = getSession();
    if (!session || !selectedEmployeeId) {
      setSelectedEmployeeDetails(null);
      setSelectedEmployeeBiometric(null);
      return;
    }

    setDetailsLoading(true);
    setSelectedEmployeeDetails(null);
    setSelectedEmployeeBiometric(null);
    void apiRequest<EmployeeDetailBootstrapResponse>(
      `/bootstrap/employees/${selectedEmployeeId}`,
      {
        token: session.accessToken,
      },
    )
      .then((snapshot) => {
        setSelectedEmployeeDetails(snapshot.employee);
        setSelectedEmployeeBiometric(snapshot.biometricHistory);
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
    if (!navigatingEmployeeId) return;

    const timeout = window.setTimeout(() => {
      setNavigatingEmployeeId(null);
    }, 10000);

    return () => window.clearTimeout(timeout);
  }, [navigatingEmployeeId]);

  useEffect(() => {
    if (selectedEmployeeId) {
      setSelectedEmployeeTab("general");
    }
  }, [selectedEmployeeId]);

  async function updateSelectedEmployeeBreaks(nextBreaksEnabled: boolean) {
    const session = getSession();
    if (!session || !selectedEmployeeId) return;

    setBreaksUpdating(true);
    try {
      const updatedEmployee = await apiRequest<EmployeeDetails>(
        `/employees/${selectedEmployeeId}/breaks`,
        {
          method: "PATCH",
          token: session.accessToken,
          body: JSON.stringify({ breaksEnabled: nextBreaksEnabled }),
        },
      );

      setSelectedEmployeeDetails((current) =>
        current
          ? { ...current, breaksEnabled: updatedEmployee.breaksEnabled }
          : updatedEmployee,
      );
      setEmployeeRecords((current) =>
        current.map((employee) =>
          employee.id === updatedEmployee.id
            ? { ...employee, breaksEnabled: updatedEmployee.breaksEnabled }
            : employee,
        ),
      );
      setPageMessage(
        nextBreaksEnabled
          ? runtimeLocalize(
              "Перерывы включены для сотрудника",
              "Breaks enabled for employee",
              locale,
            )
          : runtimeLocalize(
              "Перерывы выключены для сотрудника",
              "Breaks disabled for employee",
              locale,
            ),
      );
    } catch (error) {
      setPageMessage(
        error instanceof Error
          ? error.message
          : runtimeLocalize(
              "Не удалось обновить перерывы",
              "Unable to update breaks",
              locale,
            ),
      );
    } finally {
      setBreaksUpdating(false);
    }
  }

  async function updateSelectedEmployeeWorkMode(
    nextWorkMode: EmployeeWorkMode,
  ) {
    const session = getSession();
    if (
      !session ||
      !selectedEmployeeId ||
      nextWorkMode === selectedEmployeeWorkMode
    )
      return;

    setWorkModeUpdating(true);
    try {
      const updatedEmployee = await apiRequest<EmployeeDetails>(
        `/employees/${selectedEmployeeId}/work-mode`,
        {
          method: "PATCH",
          token: session.accessToken,
          body: JSON.stringify({ workMode: nextWorkMode }),
        },
      );

      setSelectedEmployeeDetails((current) =>
        current
          ? { ...current, workMode: updatedEmployee.workMode }
          : updatedEmployee,
      );
      setEmployeeRecords((current) =>
        current.map((employee) =>
          employee.id === updatedEmployee.id
            ? { ...employee, workMode: updatedEmployee.workMode }
            : employee,
        ),
      );
      setPageMessage(
        runtimeLocalize(
          "Тип сотрудника обновлён",
          "Employee type updated",
          locale,
        ),
      );
    } catch (error) {
      setPageMessage(
        error instanceof Error
          ? error.message
          : runtimeLocalize(
              "Не удалось обновить тип сотрудника",
              "Unable to update employee type",
              locale,
            ),
      );
    } finally {
      setWorkModeUpdating(false);
    }
  }

  function dismissAddEmployeePrompt() {
    if (addEmployeePromptStorageKey) {
      writeBrowserStorageItem(
        addEmployeePromptStorageKey,
        ADD_EMPLOYEE_PROMPT_DISMISSED,
        { includeSessionFallback: true },
      );
    }
    setShouldPulseAddEmployee(false);
  }

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

  function resetInviteDraft() {
    setInviteStep(1);
    setInviteFirstName("");
    setInviteLastName("");
    setInvitePositionTitle("");
    setInviteRole("employee");
    setInviteAssignTeam(false);
    setInviteTeamId("__none");
    setInviteTeamName("");
    setInviteTeamEmoji("🍳");
    setInviteTeamError(null);
    setInviteEmail("");
  }

  function getInviteContactValue() {
    return {
      contactValue: inviteEmail.trim().toLowerCase(),
    };
  }

  function validateInviteStepOne() {
    const { contactValue } = getInviteContactValue();

    if (!inviteFirstName.trim() || !inviteLastName.trim()) {
      return runtimeLocalize(
        "Укажите имя и фамилию сотрудника.",
        "Enter the employee first and last name.",
        locale,
      );
    }

    if (!invitePositionTitle.trim()) {
      return runtimeLocalize(
        "Укажите должность сотрудника.",
        "Enter the employee position.",
        locale,
      );
    }

    if (!contactValue) {
      return runtimeLocalize(
        "Введите email сотрудника.",
        "Enter the employee email.",
        locale,
      );
    }

    return null;
  }

  function goToInviteStepTwo() {
    const error = validateInviteStepOne();
    if (error) {
      setInviteError(error);
      return;
    }

    setInviteError(null);

    if (inviteRole === "owner") {
      void handleInviteSubmit();
      return;
    }

    setInviteStep(2);
  }

  async function createInlineInviteTeam() {
    const session = getSession();
    if (!session || !inviteTeamName.trim()) return;

    setInviteTeamCreating(true);
    setInviteTeamError(null);

    try {
      const team = await apiRequest<{ id: string }>("/collaboration/teams", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          name: inviteTeamName.trim(),
          avatarEmoji: inviteTeamEmoji,
        }),
      });
      setInviteTeamId(team.id);
      setInviteAssignTeam(true);
      setInviteTeamName("");
      await loadDirectory({ force: true, silent: true });
    } catch (requestError) {
      setInviteTeamError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось создать бригаду.",
              "Failed to create team.",
              locale,
            ),
      );
    } finally {
      setInviteTeamCreating(false);
    }
  }

  async function handleInviteSubmit() {
    const session = getSession();
    if (!session) return;
    const { contactValue } = getInviteContactValue();

    const stepOneError = validateInviteStepOne();
    if (stepOneError) {
      setInviteError(stepOneError);
      setInviteStep(1);
      return;
    }

    const shouldSendTeam =
      inviteRole === "team_leader" ||
      (inviteRole === "employee" && inviteAssignTeam);
    const selectedTeamId = inviteTeamId === "__none" ? "" : inviteTeamId;

    if (inviteRole === "team_leader" && !selectedTeamId) {
      setInviteError(
        runtimeLocalize(
          "Лидеру нужно выбрать бригаду.",
          "Select a team for the leader.",
          locale,
        ),
      );
      setInviteStep(2);
      return;
    }

    setInviteSubmitting(true);
    setInviteError(null);

    try {
      await apiRequest<InvitationRecord>("/employees/invitations", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          email: contactValue,
          firstName: inviteFirstName.trim(),
          lastName: inviteLastName.trim(),
          positionTitle: invitePositionTitle.trim(),
          role: inviteRole,
          teamId: shouldSendTeam ? selectedTeamId : undefined,
        }),
      });
      setInviteDialogOpen(false);
      resetInviteDraft();
      setPageMessage(
        runtimeLocalize(
          `Приглашение отправлено. Роль: ${getEmployeeAccessRoleLabel(inviteRole, locale)}.`,
          `Invitation sent. Role: ${getEmployeeAccessRoleLabel(inviteRole, locale)}.`,
          locale,
        ),
      );
      await loadDirectory({ force: true });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось сохранить контакт сотрудника.",
              "Failed to save the employee contact.",
              locale,
            );

      if (isBillingSeatLimitMessage(message)) {
        setInviteDialogOpen(false);
        setSeatLimitDialogOpen(true);
        setInviteError(null);
        return;
      }

      setInviteError(message);
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function copyInviteValue(value: string, field: "email" | "password") {
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

  async function copyMobileAppLink() {
    const href =
      typeof window !== "undefined"
        ? `${window.location.origin}/mobile`
        : "/mobile";

    try {
      await navigator.clipboard.writeText(href);
      setMobileLinkCopied(true);
      window.setTimeout(() => setMobileLinkCopied(false), 1800);
      setPageMessage(
        runtimeLocalize(
          "Ссылка на приложение скопирована.",
          "Mobile app link copied.",
          locale,
        ),
      );
    } catch {
      setPageMessage(href);
    }
  }

  function openCreateGroupForEmployees(employeeIds: string[] = []) {
    setCreateGroupMembers(Array.from(new Set(employeeIds)));
    setCreateGroupName("");
    setCreateGroupDescription("");
    setCreateGroupEmoji(DEFAULT_TEAM_AVATAR_EMOJI);
    setCreateGroupError(null);
    setCreateGroupOpen(true);
  }

  async function handleCreateGroup() {
    const session = getSession();
    if (!session || !createGroupName.trim()) return;

    setCreateGroupSubmitting(true);
    setCreateGroupError(null);

    try {
      await apiRequest("/collaboration/teams", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          name: createGroupName.trim(),
          description: createGroupDescription.trim() || undefined,
          avatarEmoji: createGroupEmoji,
          memberEmployeeIds: Array.from(new Set(createGroupMembers)),
        }),
      });

      setCreateGroupOpen(false);
      setCreateGroupName("");
      setCreateGroupDescription("");
      setCreateGroupEmoji(DEFAULT_TEAM_AVATAR_EMOJI);
      setCreateGroupMembers([]);
      setPageMessage(
        runtimeLocalize("Бригада добавлена.", "Team added.", locale),
      );
      await loadDirectory({ force: true });
    } catch (requestError) {
      setCreateGroupError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось создать бригаду.",
              "Failed to create team.",
              locale,
            ),
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
          "Invitation was resent.",
          locale,
        ),
      );
      await loadDirectory();
    } catch (requestError) {
      setInviteError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось отправить приглашение повторно.",
              "Failed to resend invitation.",
              locale,
            ),
      );
    }
  }

  function openInvitation(
    invitation: InvitationRecord,
    mode: InvitationDialogMode = "review",
  ) {
    setSelectedInvitation(invitation);
    setInvitationDialogMode(
      mode === "setup" && !attendanceTrackingEnabled ? "review" : mode,
    );
    setReviewError(null);
    setReviewForm({
      firstName: invitation.firstName ?? "",
      lastName: invitation.lastName ?? "",
      middleName: invitation.middleName ?? "",
      positionTitle: invitation.positionTitle ?? "",
      birthDate: invitation.birthDate ? invitation.birthDate.slice(0, 10) : "",
      gender: invitation.gender ?? "male",
      phone: invitation.phone ?? "",
      shiftTemplateId: invitation.approvedShiftTemplateId ?? "",
      groupId: invitation.approvedGroupId ?? "__none",
      role: invitation.role ?? "employee",
      rejectedReason: invitation.rejectedReason ?? "",
      avatarDataUrl: "",
      avatarPreview: invitation.avatarUrl ?? "",
      workMode: normalizeEmployeeWorkMode(invitation.workMode),
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

  async function submitInvitationSetup() {
    const session = getSession();
    if (!session || !selectedInvitation) return;

    const firstName = reviewForm.firstName.trim();
    const lastName = reviewForm.lastName.trim();
    const shiftTemplateId = reviewForm.shiftTemplateId.trim();

    if (!firstName || !lastName) {
      setReviewError(
        runtimeLocalize(
          "Укажите имя и фамилию сотрудника.",
          "Enter the employee first and last name.",
          locale,
        ),
      );
      return;
    }

    if (reviewForm.workMode === "STATIONARY" && !shiftTemplateId) {
      setReviewError(
        runtimeLocalize(
          "Выберите смену для сотрудника.",
          "Select a shift for the employee.",
          locale,
        ),
      );
      return;
    }

    if (reviewForm.role === "team_leader" && reviewForm.groupId === "__none") {
      setReviewError(
        runtimeLocalize(
          "Лидеру нужно выбрать бригаду.",
          "Select a team for the leader.",
          locale,
        ),
      );
      return;
    }

    setReviewSubmitting(true);
    setReviewError(null);

    try {
      await apiRequest<InvitationRecord>(
        `/employees/invitations/${selectedInvitation.id}/setup`,
        {
          method: "PATCH",
          token: session.accessToken,
          body: JSON.stringify({
            firstName,
            lastName,
            middleName: reviewForm.middleName.trim() || undefined,
            positionTitle: reviewForm.positionTitle.trim() || undefined,
            role: reviewForm.role,
            shiftTemplateId:
              reviewForm.workMode === "STATIONARY" ? shiftTemplateId : "",
            teamId:
              reviewForm.groupId === "__none"
                ? ""
                : reviewForm.groupId || undefined,
            workMode: reviewForm.workMode,
          }),
        },
      );
      setSelectedInvitation(null);
      setInvitationDialogMode("review");
      setPageMessage(
        runtimeLocalize(
          "Приглашение настроено. Сотрудник заполнит остальные данные сам.",
          "Invitation setup saved. The employee will fill in the rest.",
          locale,
        ),
      );
      await loadDirectory();
    } catch (requestError) {
      setReviewError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось настроить приглашение.",
              "Failed to save invitation setup.",
              locale,
            ),
      );
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function deleteSelectedInvitationEmployee() {
    const session = getSession();
    if (!session || !selectedInvitation) return;

    const confirmed = window.confirm(
      runtimeLocalize(
        "Удалить сотрудника и его приглашение?",
        "Delete this employee and invitation?",
        locale,
      ),
    );

    if (!confirmed) {
      return;
    }

    setInvitationDeleting(true);
    setReviewError(null);

    try {
      await apiRequest(`/employees/invitations/${selectedInvitation.id}`, {
        method: "DELETE",
        token: session.accessToken,
      });
      setSelectedInvitation(null);
      setInvitationDialogMode("review");
      setPageMessage(
        runtimeLocalize(
          "Сотрудник и приглашение удалены.",
          "Employee and invitation deleted.",
          locale,
        ),
      );
      await loadDirectory();
    } catch (requestError) {
      setReviewError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось удалить сотрудника.",
              "Failed to delete the employee.",
              locale,
            ),
      );
    } finally {
      setInvitationDeleting(false);
    }
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
            positionTitle: reviewForm.positionTitle || undefined,
            role: reviewForm.role,
            birthDate: reviewForm.birthDate,
            gender: reviewForm.gender,
            phone: reviewForm.phone,
            shiftTemplateId:
              decision === "APPROVE" && reviewForm.workMode === "STATIONARY"
                ? reviewForm.shiftTemplateId || undefined
                : undefined,
            teamId:
              decision === "APPROVE"
                ? reviewForm.groupId === "__none"
                  ? ""
                  : reviewForm.groupId || undefined
                : undefined,
            rejectedReason:
              decision === "REJECT" ? reviewForm.rejectedReason : undefined,
            avatarDataUrl: reviewForm.avatarDataUrl || undefined,
            workMode: reviewForm.workMode,
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
    setMoveMakeLeader(employee.role === "team_leader");
    setMoveError(null);
  }

  async function updateGroupMembers(groupId: string, employeeIds: string[]) {
    const session = getSession();
    if (!session) return;

    await apiRequest(`/collaboration/teams/${groupId}/members`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ employeeIds }),
    });
  }

  async function updateGroup(
    groupId: string,
    payload: { name: string; description: string; avatarEmoji?: string },
  ) {
    const session = getSession();
    if (!session) return;

    await apiRequest(`/collaboration/teams/${groupId}`, {
      method: "PATCH",
      token: session.accessToken,
      body: JSON.stringify(payload),
    });
  }

  async function handleMoveEmployee() {
    const employeeId = moveDialogEmployeeId;
    if (!employeeId) return;
    const employee = employees.find((item) => item.id === employeeId);

    if (employee?.role === "owner") {
      setMoveError(
        runtimeLocalize(
          "Владельцу бригада не назначается.",
          "Owner does not need a team assignment.",
          locale,
        ),
      );
      return;
    }

    setMoveSubmitting(true);
    setMoveError(null);

    try {
      const nextGroupId =
        moveTargetGroupId === "__none" ? null : moveTargetGroupId;

      if (moveMakeLeader && !nextGroupId) {
        setMoveError(
          runtimeLocalize(
            "Лидеру нужно выбрать бригаду.",
            "Select a team for the leader.",
            locale,
          ),
        );
        setMoveSubmitting(false);
        return;
      }

      const session = getSession();
      if (!session) return;

      await apiRequest(`/employees/${employeeId}`, {
        method: "PATCH",
        token: session.accessToken,
        body: JSON.stringify({
          teamId: nextGroupId ?? "",
          role: moveMakeLeader ? "team_leader" : "employee",
        }),
      });

      setMoveDialogEmployeeId(null);
      setPageMessage(
        runtimeLocalize(
          "Бригада сотрудника обновлена.",
          "Employee team updated.",
          locale,
        ),
      );
      await loadDirectory();
    } catch (requestError) {
      setMoveError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось обновить бригаду сотрудника.",
              "Failed to update employee team.",
              locale,
            ),
      );
    } finally {
      setMoveSubmitting(false);
    }
  }

  function toggleEmployeeSelection(employeeId: string, checked: boolean) {
    setSelectedEmployeeIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(employeeId);
      } else {
        next.delete(employeeId);
      }
      return next;
    });
    setBulkError(null);
  }

  function clearEmployeeSelection() {
    setSelectedEmployeeIds(new Set());
    setBulkError(null);
  }

  async function applyBulkAssignment() {
    const session = getSession();
    if (!session) return;
    const employeeIds = Array.from(selectedEmployeeIds);

    if (employeeIds.length < 2) {
      return;
    }

    const nextTeamId = bulkTargetGroupId === "__none" ? "" : bulkTargetGroupId;

    if (bulkRole === "team_leader" && !nextTeamId) {
      setBulkError(
        runtimeLocalize(
          "Для роли лидера выберите бригаду.",
          "Select a team before setting team leader role.",
          locale,
        ),
      );
      return;
    }

    setBulkSubmitting(true);
    setBulkError(null);

    try {
      await apiRequest("/employees/bulk-assign", {
        method: "PATCH",
        token: session.accessToken,
        body: JSON.stringify({
          employeeIds,
          teamId: nextTeamId,
          role: bulkRole === "keep" ? undefined : bulkRole,
        }),
      });
      if (bulkLocationId !== "keep") {
        await Promise.all(
          employeeIds.map((employeeId) =>
            apiRequest(`/employees/${employeeId}/location`, {
              method: "PATCH",
              token: session.accessToken,
              body: JSON.stringify({
                locationId: bulkLocationId,
                futureShiftStrategy: "keep",
                reason: "Bulk location transfer",
              }),
            }),
          ),
        );
      }

      setBulkAssignDialogOpen(false);
      clearEmployeeSelection();
      setPageMessage(
        runtimeLocalize(
          "Массовое назначение применено.",
          "Bulk assignment applied.",
          locale,
        ),
      );
      await loadDirectory({ force: true });
    } catch (requestError) {
      setBulkError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось применить массовое назначение.",
              "Failed to apply bulk assignment.",
              locale,
            ),
      );
    } finally {
      setBulkSubmitting(false);
    }
  }

  function openTaskDialogForEmployee(employee: EmployeeRowView) {
    setTaskError(null);
    setTaskDraft({
      ...initialTaskDraft,
      locationId:
        employee.locationId ??
        (locationOptions.length === 1 ? locationOptions[0]?.id ?? "" : ""),
    });
    setTaskDayOffConfirmOpen(false);
    setTaskDialog({
      mode: "employee",
      targetIds: [employee.id],
      targetLabel: employee.name,
    });
  }

  function openTaskDialogForGroup(groupId: string, groupName: string) {
    setTaskError(null);
    setTaskDraft({
      ...initialTaskDraft,
      locationId: locationOptions.length === 1 ? locationOptions[0]?.id ?? "" : "",
    });
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
    const assigneeEmployeeIds =
      taskDialog.mode === "employee"
        ? Array.from(new Set(taskDialog.targetIds.filter(Boolean)))
        : [];

    setTaskError(null);

    if (locationOptions.length > 0 && !taskDraft.locationId) {
      setTaskError(
        runtimeLocalize("Выберите локацию.", "Select a location.", locale),
      );
      return;
    }

    if (taskDialog.mode === "employee" && assigneeEmployeeIds.length === 0) {
      setTaskError(
        runtimeLocalize(
          "Выберите хотя бы одного сотрудника.",
          "Select at least one employee.",
          locale,
        ),
      );
      return;
    }

    if (taskDraft.isRecurring && taskDraft.weekDays.length === 0) {
      setTaskError(
        runtimeLocalize(
          "Выберите хотя бы один день повтора.",
          "Select at least one recurring day.",
          locale,
        ),
      );
      return;
    }

    if (taskDraft.hasDueTime) {
      if (taskDraft.isRecurring && !taskDraft.dueTimeLocal) {
        setTaskError(
          runtimeLocalize(
            "Выберите точное время.",
            "Select an exact time.",
            locale,
          ),
        );
        return;
      }

      if (!taskDraft.isRecurring) {
        const dueDate = taskDraft.dueAt ? new Date(taskDraft.dueAt) : null;
        if (
          !dueDate ||
          Number.isNaN(dueDate.getTime()) ||
          dueDate < new Date()
        ) {
          setTaskError(
            runtimeLocalize(
              "Выберите будущую дату и время выполнения.",
              "Select a future due date and time.",
              locale,
            ),
          );
          return;
        }
      }
    }

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
        if (taskDialog.mode === "employee") {
          await Promise.all(
            assigneeEmployeeIds.map((assigneeEmployeeId) =>
              apiRequest("/collaboration/task-templates", {
                method: "POST",
                token: session.accessToken,
                body: JSON.stringify({
                  title: taskDraft.title,
                  description: taskDraft.description || undefined,
                  priority: taskDraft.priority,
                  requiresPhoto: taskDraft.requiresPhoto || undefined,
                  expandOnDemand: true,
                  frequency: "WEEKLY",
                  weekDays: taskDraft.weekDays,
                  startDate:
                    taskDraft.startDate || new Date().toISOString().split("T")[0],
                  dueAfterDays: 0,
                  dueTimeLocal: taskDraft.hasDueTime
                    ? taskDraft.dueTimeLocal || undefined
                    : undefined,
                  assigneeEmployeeId,
                  locationId: taskDraft.locationId || undefined,
                }),
              }),
            ),
          );
        } else {
          await apiRequest("/collaboration/task-templates", {
            method: "POST",
            token: session.accessToken,
            body: JSON.stringify({
              title: taskDraft.title,
              description: taskDraft.description || undefined,
              priority: taskDraft.priority,
              requiresPhoto: taskDraft.requiresPhoto || undefined,
              expandOnDemand: true,
              frequency: "WEEKLY",
              weekDays: taskDraft.weekDays,
              startDate:
                taskDraft.startDate || new Date().toISOString().split("T")[0],
              dueAfterDays: 0,
              dueTimeLocal: taskDraft.hasDueTime
                ? taskDraft.dueTimeLocal || undefined
                : undefined,
              groupId: taskDialog.targetId,
              locationId: taskDraft.locationId || undefined,
            }),
          });
        }
      } else {
        if (taskDialog.mode === "employee") {
          await Promise.all(
            assigneeEmployeeIds.map((assigneeEmployeeId) =>
              apiRequest<TaskItem[]>("/collaboration/tasks", {
                method: "POST",
                token: session.accessToken,
                body: JSON.stringify({
                  title: taskDraft.title,
                  description: taskDraft.description || undefined,
                  priority: taskDraft.priority,
                  requiresPhoto: taskDraft.requiresPhoto || undefined,
                  dueAt: taskDraft.hasDueTime
                    ? taskDraft.dueAt || undefined
                    : undefined,
                  assigneeEmployeeId,
                  locationId: taskDraft.locationId || undefined,
                }),
              }),
            ),
          );
        } else {
          await apiRequest<TaskItem[]>("/collaboration/tasks", {
            method: "POST",
            token: session.accessToken,
            body: JSON.stringify({
              title: taskDraft.title,
              description: taskDraft.description || undefined,
              priority: taskDraft.priority,
              requiresPhoto: taskDraft.requiresPhoto || undefined,
              dueAt: taskDraft.hasDueTime
                ? taskDraft.dueAt || undefined
                : undefined,
              groupId: taskDialog.targetId,
              locationId: taskDraft.locationId || undefined,
            }),
          });
        }
      }

      setTaskDialog(null);
      setTaskDraft(initialTaskDraft);
      setTaskDayOffConfirmOpen(false);
      setPageMessage(
        taskDialog.mode === "employee"
          ? assigneeEmployeeIds.length === 1
            ? runtimeLocalize(
                "Задача назначена сотруднику.",
                "Task assigned to the employee.",
                locale,
              )
            : runtimeLocalize(
                `Задача назначена ${assigneeEmployeeIds.length} сотрудникам.`,
                `Task assigned to ${assigneeEmployeeIds.length} employees.`,
                locale,
              )
          : runtimeLocalize(
              "Задача назначена бригаде.",
              "Task assigned to the team.",
              locale,
            ),
      );
      await loadDirectory({ force: true });
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
    const locationId =
      employee.locationId ??
      (locationOptions.length === 1 ? locationOptions[0]?.id ?? "" : "");
    const template = scheduleTemplates.find(
      (item) => !locationId || item.location.id === locationId,
    );
    const fixedBreakDuration = template?.fixedBreakDurationMinutes ?? 0;
    setAssignShiftError(null);
    setAssignShiftDraft({
      locationId,
      templateId: template?.id ?? "",
      shiftDate: new Date().toISOString().split("T")[0],
      fixedBreakEnabled: fixedBreakDuration > 0,
      fixedBreakStartsAtLocal: template?.fixedBreakStartsAtLocal ?? "13:00",
      fixedBreakDurationMinutes: String(fixedBreakDuration || 30),
      fixedBreakIsPaid: false,
    });
    setAssignShiftDialog({
      employeeId: employee.id,
      employeeName: employee.name,
    });
  }

  function applyAssignShiftTemplateDefaults(templateId: string) {
    const template = scheduleTemplates.find((item) => item.id === templateId);
    const fixedBreakDuration = template?.fixedBreakDurationMinutes ?? 0;

    setAssignShiftDraft((current) => ({
      ...current,
      templateId,
      fixedBreakEnabled: fixedBreakDuration > 0,
      fixedBreakStartsAtLocal: template?.fixedBreakStartsAtLocal ?? "13:00",
      fixedBreakDurationMinutes: String(fixedBreakDuration || 30),
      fixedBreakIsPaid: false,
    }));
  }

  async function handleCreateShift() {
    const session = getSession();
    if (!session || !assignShiftDialog) return;

    if (!assignShiftDraft.locationId || !assignShiftDraft.templateId || !assignShiftDraft.shiftDate) {
      setAssignShiftError(
        runtimeLocalize(
          "Выберите шаблон и дату",
          "Select template and date",
          locale,
        ),
      );
      return;
    }

    const fixedBreakDuration = Number(
      assignShiftDraft.fixedBreakDurationMinutes,
    );
    if (
      assignShiftDraft.fixedBreakEnabled &&
      (!Number.isFinite(fixedBreakDuration) || fixedBreakDuration <= 0)
    ) {
      setAssignShiftError(
        runtimeLocalize(
          "Укажите длительность фиксированного перерыва",
          "Enter fixed break duration",
          locale,
        ),
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
          fixedBreakStartsAtLocal: assignShiftDraft.fixedBreakEnabled
            ? assignShiftDraft.fixedBreakStartsAtLocal
            : undefined,
          fixedBreakDurationMinutes: assignShiftDraft.fixedBreakEnabled
            ? fixedBreakDuration
            : 0,
          fixedBreakIsPaid: false,
        }),
      });

      setAssignShiftDialog(null);
      setPageMessage(
        runtimeLocalize(
          "Смена успешно назначена.",
          "Shift assigned successfully.",
          locale,
        ),
      );
      await loadDirectory();
    } catch (requestError) {
      setAssignShiftError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось назначить смену.",
              "Failed to assign shift.",
              locale,
            ),
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
    setGroupEditorEmoji(resolveTeamAvatarEmoji(group));
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
        runtimeLocalize(
          "Укажите название бригады.",
          "Enter a team name.",
          locale,
        ),
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
      const normalizedAvatarEmoji =
        groupEditorEmoji.trim() || DEFAULT_TEAM_AVATAR_EMOJI;
      const detailsChanged =
        groupEditor.name !== normalizedName ||
        (groupEditor.description ?? "") !== normalizedDescription ||
        resolveTeamAvatarEmoji(groupEditor) !== normalizedAvatarEmoji;
      const membersChanged =
        currentMemberIds.length !== uniqueMembers.length ||
        currentMemberIds.some((id) => !uniqueMembers.includes(id)) ||
        uniqueMembers.some((id) => !currentMemberIds.includes(id));

      if (detailsChanged) {
        await updateGroup(groupEditorId, {
          name: normalizedName,
          description: normalizedDescription,
          avatarEmoji: normalizedAvatarEmoji,
        });
      }

      if (membersChanged) {
        await updateGroupMembers(groupEditorId, uniqueMembers);
      }

      setGroupEditorId(null);
      setGroupDeleteConfirmOpen(false);
      setPageMessage(
        runtimeLocalize("Бригада обновлена.", "Team updated.", locale),
      );
      await loadDirectory();
    } catch (requestError) {
      setGroupError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось обновить бригаду.",
              "Failed to update team.",
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
      await apiRequest(`/collaboration/teams/${groupEditor.id}`, {
        method: "DELETE",
        token: session.accessToken,
      });
      setGroupDeleteConfirmOpen(false);
      setGroupEditorId(null);
      setPageMessage(
        runtimeLocalize("Бригада удалена.", "Team deleted.", locale),
      );
      await loadDirectory();
    } catch (requestError) {
      setGroupError(
        requestError instanceof Error
          ? requestError.message
          : runtimeLocalize(
              "Не удалось удалить бригаду.",
              "Failed to delete team.",
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
            aria-label={runtimeLocalize(
              "Таблица сотрудников",
              "Employees table",
              locale,
            )}
            onSortChange={setSortDescriptor}
            size="sm"
            sortDescriptor={sortDescriptor}
          >
            <Table.Header>
              <Table.Head
                allowsSorting
                className="w-[38%] min-w-[340px]"
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
                label={runtimeLocalize("Бригада", "Team", locale)}
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
                <Table.Row
                  className="team-tasks-table-row group"
                  id={employee.id}
                >
                  <Table.Cell className="align-middle">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedEmployeeIds.has(employee.id)}
                        onCheckedChange={(checked) =>
                          toggleEmployeeSelection(employee.id, checked === true)
                        }
                      />
                      <button
                        className="team-tasks-row-button team-tasks-row-button--identity"
                        onClick={(event) =>
                          openEmployeePage(employee.id, event)
                        }
                        type="button"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            alt={employee.name}
                            className="shrink-0"
                            initials={employee.name}
                            size="sm"
                            src={employee.avatarUrl ?? null}
                          />
                          <div className="min-w-0 space-y-0.5">
                            <p className="truncate text-base font-medium text-[color:var(--foreground)]">
                              {employee.name}
                            </p>
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm text-[color:var(--muted-foreground)]">
                                {employee.position}
                              </p>
                              <RoleBadge
                                role={employee.role}
                                label={employee.roleLabel}
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </Table.Cell>

                  <Table.Cell className="align-middle whitespace-nowrap">
                    <button
                      className="team-tasks-row-button team-tasks-row-button--center"
                      onClick={(event) => openEmployeePage(employee.id, event)}
                      type="button"
                    >
                      {renderEmployeeStatusBadge(employee.status)}
                    </button>
                  </Table.Cell>

                  <Table.Cell className="align-middle whitespace-nowrap">
                    {locationOptions.length > 1 ? (
                      <Select
                        disabled={
                          updatingLocationEmployeeId === employee.id ||
                          employee.status === "dismissed"
                        }
                        onValueChange={(locationId) =>
                          void updateEmployeeLocation(employee.id, locationId)
                        }
                        value={employee.locationId ?? undefined}
                      >
                        <SelectTrigger className="h-9 min-w-[150px] rounded-xl border-transparent bg-transparent px-2 text-sm shadow-none hover:border-[color:var(--border)] hover:bg-[color:var(--panel)]">
                          <SelectValue placeholder={employee.location} />
                        </SelectTrigger>
                        <SelectContent>
                          {locationOptions.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <button
                        className="team-tasks-row-button team-tasks-row-button--center"
                        onClick={(event) =>
                          openEmployeePage(employee.id, event)
                        }
                        type="button"
                      >
                        <span className="team-tasks-team-text">
                          {employee.location}
                        </span>
                      </button>
                    )}
                  </Table.Cell>

                  <Table.Cell className="align-middle whitespace-nowrap">
                    <button
                      className="team-tasks-row-button team-tasks-row-button--center"
                      onClick={(event) => openEmployeePage(employee.id, event)}
                      type="button"
                    >
                      {employee.group ? (
                        <span className="team-tasks-team-text inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          <span>{employee.groupEmoji}</span>
                          <span>{employee.group}</span>
                        </span>
                      ) : (
                        <span className="team-tasks-team-text is-empty">—</span>
                      )}
                    </button>
                  </Table.Cell>

                  <Table.Cell className="align-middle">
                    <button
                      className="team-tasks-row-button team-tasks-row-button--progress"
                      onClick={(event) => openEmployeePage(employee.id, event)}
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
                        <DropdownMenuContent
                          align="end"
                          className="w-[200px] rounded-xl font-heading"
                        >
                          <DropdownMenuItem
                            onClick={() => openTaskDialogForEmployee(employee)}
                          >
                            <ListTodo className="mr-2 h-4 w-4" />
                            {runtimeLocalize(
                              "Назначить задачу",
                              "Assign task",
                              locale,
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openAssignShiftDialog(employee)}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            {runtimeLocalize(
                              "Назначить смену",
                              "Assign shift",
                              locale,
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openMoveDialog(employee)}
                          >
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            {employee.group
                              ? runtimeLocalize(
                                  "Изменить бригаду",
                                  "Change team",
                                  locale,
                                )
                              : runtimeLocalize(
                                  "Назначить бригаду",
                                  "Assign team",
                                  locale,
                                )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        className={`h-8 rounded-lg px-2.5 text-xs transition ${
                          employee.group
                            ? "opacity-0 group-hover:opacity-100"
                            : "border border-[rgba(37,99,235,0.16)] bg-[rgba(37,99,235,0.08)] text-[color:var(--accent)] opacity-100 hover:bg-[rgba(37,99,235,0.12)]"
                        }`}
                        onClick={() => openMoveDialog(employee)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        {employee.group
                          ? runtimeLocalize("Изменить", "Change", locale)
                          : runtimeLocalize(
                              "Назначить бригаду",
                              "Assign team",
                              locale,
                            )}
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
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
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
                <Users className="h-4 w-4" />{" "}
                {runtimeLocalize("Сотрудники", "Employees", locale)}{" "}
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
                <FolderOpen className="h-4 w-4" />{" "}
                {runtimeLocalize("Бригады", "Teams", locale)} {groups.length}
              </button>
            </div>
            <Button
              className={`rounded-xl bg-accent font-heading text-accent-foreground hover:bg-accent/90 ${
                viewMode === "employees" && shouldPulseAddEmployee
                  ? "employees-add-employee-pulse"
                  : ""
              }`}
              onClick={() => {
                dismissAddEmployeePrompt();
                resetInviteDraft();
                setInviteDialogOpen(true);
                setInviteError(null);
              }}
            >
              <UserPlus className="h-4 w-4" />{" "}
              {runtimeLocalize("Добавить сотрудника", "Add employee", locale)}
            </Button>
            <Button
              className="rounded-xl font-heading"
              onClick={() => {
                setCreateGroupOpen(true);
                setCreateGroupError(null);
              }}
              type="button"
              variant="outline"
            >
              <FolderOpen className="h-4 w-4" />{" "}
              {runtimeLocalize("Добавить бригаду", "Add team", locale)}
            </Button>
            <Button
              className="rounded-xl font-heading"
              onClick={() => void copyMobileAppLink()}
              type="button"
              variant="outline"
            >
              <Smartphone className="h-4 w-4" />
              {mobileLinkCopied
                ? runtimeLocalize("Скопировано", "Copied", locale)
                : runtimeLocalize(
                    "Ссылка на приложение",
                    "Mobile app link",
                    locale,
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
                placeholder={runtimeLocalize(
                  "Поиск сотрудника...",
                  "Search employee...",
                  locale,
                )}
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
                  ? runtimeLocalize(
                      "Свернуть бригады",
                      "Collapse teams",
                      locale,
                    )
                  : runtimeLocalize(
                      "Развернуть бригады",
                      "Expand teams",
                      locale,
                    )}
              </Button>
            ) : null}
          </div>

          {viewMode === "employees" ? (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {[
                {
                  id: "all",
                  label: runtimeLocalize("Все", "All", locale),
                  count: employees.length,
                },
                {
                  id: "__none",
                  label: runtimeLocalize("Без бригады", "No team", locale),
                  count: employees.filter((employee) => !employee.groupId)
                    .length,
                },
                ...groups.map((group) => ({
                  id: group.id,
                  label: `${resolveTeamAvatarEmoji(group)} ${group.name}`,
                  count: employees.filter(
                    (employee) => employee.groupId === group.id,
                  ).length,
                })),
              ].map((item) => (
                <button
                  className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-heading transition ${
                    teamFilterId === item.id
                      ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
                      : "border-border bg-white text-muted-foreground hover:text-foreground"
                  }`}
                  key={item.id}
                  onClick={() => setTeamFilterId(item.id)}
                  type="button"
                >
                  <span>{item.label}</span>
                  <span
                    className={`rounded-full px-1.5 text-[11px] ${
                      teamFilterId === item.id
                        ? "bg-white/18 text-white"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {viewMode === "employees" && selectedEmployeeIds.size >= 2 ? (
            <div className="mb-4 rounded-2xl border border-[rgba(49,84,255,0.24)] bg-[rgba(49,84,255,0.07)] p-3 shadow-[0_14px_36px_rgba(37,99,235,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-[220px] items-center gap-3 font-heading text-sm font-semibold text-[color:var(--foreground)]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--accent)] text-white">
                    <Check className="h-4 w-4" />
                  </span>
                  {runtimeLocalize(
                    `${selectedEmployeeIds.size} сотрудников выбрано`,
                    `${selectedEmployeeIds.size} employees selected`,
                    locale,
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="rounded-xl font-heading"
                    onClick={() => {
                      setBulkError(null);
                      setBulkAssignDialogOpen(true);
                    }}
                    type="button"
                  >
                    <Users className="h-4 w-4" />
                    {runtimeLocalize(
                      "Назначить в бригаду",
                      "Assign to team",
                      locale,
                    )}
                  </Button>
                  <Button
                    className="rounded-xl font-heading"
                    onClick={() => {
                      setBulkRole("team_leader");
                      setBulkError(null);
                      setBulkAssignDialogOpen(true);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <Crown className="h-4 w-4" />
                    {runtimeLocalize("Сменить роль", "Change role", locale)}
                  </Button>
                  <Button
                    className="rounded-xl font-heading"
                    onClick={() => {
                      setBulkError(null);
                      setBulkAssignDialogOpen(true);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    {runtimeLocalize(
                      "Сменить локацию",
                      "Change location",
                      locale,
                    )}
                  </Button>
                  <Button
                    className="rounded-xl font-heading"
                    onClick={clearEmployeeSelection}
                    type="button"
                    variant="outline"
                  >
                    {runtimeLocalize("Сбросить", "Clear", locale)}
                  </Button>
                </div>
              </div>
              {bulkError ? (
                <div className="error-box mt-3">{bulkError}</div>
              ) : null}
            </div>
          ) : null}

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
                        {invitation.email ?? invitation.phone ?? "—"}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-heading ${invitationStyles[invitation.status]}`}
                      >
                        {getInvitationLabel(invitation.status, locale)}
                      </span>
                      <RoleBadge
                        label={getEmployeeAccessRoleLabel(
                          invitation.role ?? "employee",
                          locale,
                        )}
                        role={invitation.role ?? "employee"}
                      />
                    </div>
                    <p className="text-xs font-heading text-muted-foreground">
                      {invitation.submittedAt
                        ? `${runtimeLocalize(
                            "Анкета отправлена",
                            "Form submitted",
                            locale,
                          )} ${new Date(invitation.submittedAt).toLocaleString(getRuntimeLocaleTag(locale))}`
                        : `${runtimeLocalize(
                            invitation.email
                              ? "Email добавлен, доступ активен до"
                              : "Телефон добавлен, доступ активен до",
                            invitation.email
                              ? "Email is registered, access is active until"
                              : "Phone is registered, access is active until",
                            locale,
                          )} ${new Date(invitation.expiresAt).toLocaleString(getRuntimeLocaleTag(locale))}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {invitation.status === "INVITED" ? (
                      <>
                        {attendanceTrackingEnabled ? (
                          <Button
                            className="rounded-xl font-heading"
                            onClick={() => openInvitation(invitation, "setup")}
                            size="sm"
                          >
                            {runtimeLocalize("Настроить", "Setup", locale)}
                          </Button>
                        ) : null}
                        <Button
                          className="rounded-xl font-heading"
                          onClick={() => void handleResend(invitation.id)}
                          size="sm"
                          variant="outline"
                        >
                          <Mail className="h-4 w-4" />{" "}
                          {runtimeLocalize(
                            "Отправить повторно",
                            "Resend",
                            locale,
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="rounded-xl font-heading"
                        onClick={() => openInvitation(invitation)}
                        size="sm"
                      >
                        {runtimeLocalize("Проверить", "Review", locale)}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {directoryLoading ? (
            <WorkspaceLoading
              className="rounded-2xl border border-border bg-secondary/20"
              label={runtimeLocalize(
                "Загружаю сотрудников",
                "Loading employees",
                locale,
              )}
            />
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
              {groups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/10 p-6 font-heading">
                  <p className="text-lg font-semibold text-foreground">
                    {runtimeLocalize(
                      "Организуйте первую бригаду",
                      "Create your first team",
                      locale,
                    )}
                  </p>
                  <p className="mt-2 max-w-[62ch] text-sm leading-6 text-muted-foreground">
                    {runtimeLocalize(
                      "Бригады помогают быстро назначать задачи, новости и роли лидеров.",
                      "Teams help assign tasks, announcements, and leader roles quickly.",
                      locale,
                    )}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {TEAM_SUGGESTIONS.slice(0, 5).map((suggestion) => (
                      <button
                        className="rounded-xl border border-border bg-white px-3 py-2 text-sm hover:bg-secondary/40"
                        key={suggestion.nameRu}
                        onClick={() => {
                          setCreateGroupEmoji(suggestion.emoji);
                          setCreateGroupName(
                            runtimeLocalize(
                              suggestion.nameRu,
                              suggestion.nameEn,
                              locale,
                            ),
                          );
                          setCreateGroupOpen(true);
                        }}
                        type="button"
                      >
                        {suggestion.emoji}{" "}
                        {runtimeLocalize(
                          suggestion.nameRu,
                          suggestion.nameEn,
                          locale,
                        )}
                      </button>
                    ))}
                  </div>
                  <Button
                    className="mt-5 rounded-xl font-heading"
                    onClick={() => setCreateGroupOpen(true)}
                    type="button"
                  >
                    <FolderOpen className="h-4 w-4" />
                    {runtimeLocalize("Создать бригаду", "Create team", locale)}
                  </Button>
                </div>
              ) : null}
              {groupedEmployees.map(({ group, leader, members }) => {
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
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-base shadow-sm">
                          {resolveTeamAvatarEmoji(group)}
                        </span>
                        <span className="font-heading font-semibold text-foreground">
                          {group.name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {members.length}
                        </span>
                        <span className="hidden text-xs font-heading text-muted-foreground sm:inline">
                          {runtimeLocalize("Лидер", "Leader", locale)}:{" "}
                          {leader?.name ?? "—"}
                        </span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <Button
                          className="h-7 rounded-lg px-2 text-xs font-heading"
                          onClick={() => openGroupEditor(group.id)}
                          size="sm"
                          variant="ghost"
                        >
                          <Settings className="h-3 w-3" />{" "}
                          {runtimeLocalize("Изменить", "Edit", locale)}
                        </Button>
                        <Button
                          className="h-7 rounded-lg px-2 text-xs font-heading"
                          onClick={() =>
                            openTaskDialogForGroup(group.id, group.name)
                          }
                          size="sm"
                          variant="ghost"
                        >
                          <ListTodo className="h-3 w-3" />{" "}
                          {runtimeLocalize(
                            "Задача бригаде",
                            "Task for team",
                            locale,
                          )}
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
                          "В этой бригаде нет сотрудников.",
                          "There are no employees in this team.",
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
                        {runtimeLocalize("Без бригады", "No team", locale)}
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

      <Dialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open);
          if (!open) {
            setInviteError(null);
            setInviteTeamError(null);
            setInviteEmojiPickerOpen(false);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[min(760px,calc(100vw-1.5rem))] max-w-none overflow-y-auto rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {runtimeLocalize("Добавить сотрудника", "Add employee", locale)}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {runtimeLocalize(
                "Шаг 1 — данные и роль. Шаг 2 — бригада, если она нужна для выбранной роли.",
                "Step 1 is profile and role. Step 2 is team assignment when the selected role needs it.",
                locale,
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-[color:var(--accent)] transition-all"
                style={{ width: inviteStep === 1 ? "50%" : "100%" }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-heading font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span>
                {runtimeLocalize(
                  `Шаг ${inviteStep} из 2`,
                  `Step ${inviteStep} of 2`,
                  locale,
                )}
              </span>
              <span>
                {inviteStep === 1
                  ? runtimeLocalize("Данные и роль", "Profile and role", locale)
                  : runtimeLocalize("Бригада", "Team", locale)}
              </span>
            </div>

            {inviteStep === 1 ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-heading">
                    <span>{runtimeLocalize("Имя", "First name", locale)}</span>
                    <Input
                      onChange={(event) =>
                        setInviteFirstName(event.target.value)
                      }
                      value={inviteFirstName}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-heading">
                    <span>
                      {runtimeLocalize("Фамилия", "Last name", locale)}
                    </span>
                    <Input
                      onChange={(event) =>
                        setInviteLastName(event.target.value)
                      }
                      value={inviteLastName}
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-heading">
                  <span>
                    {runtimeLocalize("Должность", "Position", locale)}
                  </span>
                  <Input
                    onChange={(event) =>
                      setInvitePositionTitle(event.target.value)
                    }
                    placeholder={runtimeLocalize(
                      "Например, Бариста",
                      "For example, Barista",
                      locale,
                    )}
                    value={invitePositionTitle}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>
                    {runtimeLocalize("Рабочий email", "Work email", locale)}
                  </span>
                  <Input
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="employee@company.ru"
                    type="email"
                    value={inviteEmail}
                  />
                </label>
                <div className="grid gap-2 text-sm font-heading">
                  <span>{runtimeLocalize("Роль", "Role", locale)}</span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {EMPLOYEE_ACCESS_ROLES.map((roleOption) => {
                      const selected = inviteRole === roleOption.value;
                      const Icon = getEmployeeAccessRoleIcon(roleOption.value);
                      return (
                        <button
                          className={`min-h-[132px] rounded-2xl border p-3 text-left transition ${
                            selected
                              ? "border-[color:var(--accent)] bg-[rgba(49,84,255,0.08)]"
                              : "border-border bg-secondary/20 hover:bg-white"
                          }`}
                          key={roleOption.value}
                          onClick={() => {
                            setInviteRole(roleOption.value);
                            if (roleOption.value === "owner") {
                              setInviteAssignTeam(false);
                              setInviteTeamId("__none");
                            }
                            setInviteError(null);
                          }}
                          type="button"
                        >
                          <Icon className="mb-3 h-5 w-5 text-[color:var(--accent)]" />
                          <span className="block font-semibold text-foreground">
                            {runtimeLocalize(
                              roleOption.titleRu,
                              roleOption.titleEn,
                              locale,
                            )}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {runtimeLocalize(
                              roleOption.descriptionRu,
                              roleOption.descriptionEn,
                              locale,
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {inviteRole === "employee" ? (
                  <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/20 p-4 text-sm font-heading">
                    <Checkbox
                      checked={inviteAssignTeam}
                      onCheckedChange={(checked) =>
                        setInviteAssignTeam(checked === true)
                      }
                    />
                    <span className="grid gap-1">
                      <span className="font-semibold text-foreground">
                        {runtimeLocalize(
                          "Назначить сотрудника в бригаду",
                          "Assign employee to a team",
                          locale,
                        )}
                      </span>
                      <span className="text-xs leading-5 text-muted-foreground">
                        {runtimeLocalize(
                          "Можно оставить без бригады и назначить позже из списка сотрудников.",
                          "You can leave this blank and assign a team later from the employee list.",
                          locale,
                        )}
                      </span>
                    </span>
                  </label>
                ) : null}

                {inviteRole === "team_leader" || inviteAssignTeam ? (
                  <div className="grid gap-3">
                    <label className="grid gap-2 text-sm font-heading">
                      <span>
                        {inviteRole === "team_leader"
                          ? runtimeLocalize(
                              "Бригада лидера",
                              "Leader team",
                              locale,
                            )
                          : runtimeLocalize("Бригада", "Team", locale)}
                      </span>
                      <Select
                        onValueChange={setInviteTeamId}
                        value={inviteTeamId}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-border bg-secondary/30 text-sm font-heading">
                          <SelectValue
                            placeholder={runtimeLocalize(
                              "Выберите бригаду",
                              "Select team",
                              locale,
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            disabled={inviteRole === "team_leader"}
                            value="__none"
                          >
                            {runtimeLocalize(
                              "Без бригады",
                              "No team",
                              locale,
                            )}
                          </SelectItem>
                          {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {resolveTeamAvatarEmoji(group)} {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>

                    {groups.length === 0 ? (
                      <div className="grid gap-2">
                        <p className="text-xs font-heading text-muted-foreground">
                          {runtimeLocalize(
                            "Бригад пока нет. Создайте первую прямо здесь.",
                            "No teams yet. Create the first one here.",
                            locale,
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {TEAM_SUGGESTIONS.map((suggestion) => (
                            <button
                              className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-heading hover:bg-secondary/40"
                              key={suggestion.nameRu}
                              onClick={() => {
                                setInviteTeamEmoji(suggestion.emoji);
                                setInviteEmojiPickerOpen(false);
                                setInviteTeamName(
                                  runtimeLocalize(
                                    suggestion.nameRu,
                                    suggestion.nameEn,
                                    locale,
                                  ),
                                );
                              }}
                              type="button"
                            >
                              {suggestion.emoji}{" "}
                              {runtimeLocalize(
                                suggestion.nameRu,
                                suggestion.nameEn,
                                locale,
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-border bg-secondary/20 p-3">
                      <div className="relative mb-3 flex flex-wrap gap-2">
                        <button
                          aria-expanded={inviteEmojiPickerOpen}
                          aria-label={runtimeLocalize(
                            "Выбрать свой эмодзи",
                            "Choose custom emoji",
                            locale,
                          )}
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border bg-secondary/20 transition-[background-color,border-color,transform] duration-150 hover:bg-secondary/40 active:scale-[0.96] ${
                            inviteEmojiPickerOpen
                              ? "border-accent"
                              : "border-border"
                          }`}
                          onClick={() =>
                            setInviteEmojiPickerOpen((current) => !current)
                          }
                          type="button"
                        >
                          <SmilePlus className="h-4 w-4 text-muted-foreground" />
                        </button>
                        {[
                          ...(inviteTeamEmoji &&
                          !TEAM_AVATAR_EMOJIS.slice(0, 10).includes(
                            inviteTeamEmoji,
                          )
                            ? [inviteTeamEmoji]
                            : []),
                          ...TEAM_AVATAR_EMOJIS.slice(0, 10),
                        ].map((emoji) => (
                          <button
                            aria-pressed={inviteTeamEmoji === emoji}
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border text-base transition ${
                              inviteTeamEmoji === emoji
                                ? "border-accent bg-white shadow-[0_0_0_1px_var(--accent)]"
                                : "border-border bg-white"
                            }`}
                            key={emoji}
                            onClick={() => {
                              setInviteTeamEmoji(emoji);
                              setInviteEmojiPickerOpen(false);
                            }}
                            type="button"
                          >
                            {emoji}
                          </button>
                        ))}
                        {inviteEmojiPickerOpen ? (
                          <div className="absolute bottom-11 left-0 z-[80] w-[min(360px,calc(100vw-4rem))] overflow-hidden rounded-2xl border border-border bg-white p-2 shadow-[0_20px_70px_rgba(15,23,42,0.18)]">
                            <EmojiPicker
                              emojiStyle={EmojiStyle.APPLE}
                              height={300}
                              lazyLoadEmojis
                              onEmojiClick={(emoji: EmojiClickData) => {
                                setInviteTeamEmoji(emoji.emoji);
                                setInviteEmojiPickerOpen(false);
                              }}
                              previewConfig={{ showPreview: false }}
                              searchPlaceholder={runtimeLocalize(
                                "Поиск",
                                "Search",
                                locale,
                              )}
                              theme={Theme.LIGHT}
                              width="100%"
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          className="h-10 flex-1 rounded-xl bg-white"
                          onChange={(event) =>
                            setInviteTeamName(event.target.value)
                          }
                          placeholder={runtimeLocalize(
                            "Новая бригада",
                            "New team",
                            locale,
                          )}
                          value={inviteTeamName}
                        />
                        <Button
                          className="rounded-xl font-heading"
                          disabled={
                            inviteTeamCreating || !inviteTeamName.trim()
                          }
                          onClick={() => void createInlineInviteTeam()}
                          type="button"
                          variant="outline"
                        >
                          {inviteTeamCreating
                            ? runtimeLocalize(
                                "Создаём...",
                                "Creating...",
                                locale,
                              )
                            : runtimeLocalize("Создать", "Create", locale)}
                        </Button>
                      </div>
                      {inviteTeamError ? (
                        <div className="error-box mt-3">{inviteTeamError}</div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="px-1 text-sm font-heading text-muted-foreground">
                    {runtimeLocalize(
                      "Сотрудник будет без бригады. Назначить можно позже",
                      "The employee will have no team. You can assign one later",
                      locale,
                    )}
                  </p>
                )}
              </div>
            )}

            {inviteError ? (
              <div className="error-box">{inviteError}</div>
            ) : null}
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                className="rounded-xl font-heading"
                onClick={() => {
                  if (inviteStep === 1) {
                    setInviteDialogOpen(false);
                    return;
                  }
                  setInviteStep(1);
                  setInviteError(null);
                }}
                type="button"
                variant="outline"
              >
                {inviteStep === 1
                  ? runtimeLocalize("Отмена", "Cancel", locale)
                  : runtimeLocalize("Назад", "Back", locale)}
              </Button>
              <Button
                className="rounded-xl font-heading"
                disabled={inviteSubmitting}
                onClick={() =>
                  inviteStep === 1
                    ? goToInviteStepTwo()
                    : void handleInviteSubmit()
                }
                type="button"
              >
                {inviteStep === 1 ? (
                  <ArrowRightLeft className="h-4 w-4" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {inviteSubmitting
                  ? runtimeLocalize("Отправляем...", "Sending...", locale)
                  : inviteStep === 1
                    ? inviteRole === "owner"
                      ? runtimeLocalize("Отправить", "Send", locale)
                      : runtimeLocalize("Далее", "Next", locale)
                    : runtimeLocalize(
                        "Отправить приглашение",
                        "Send invite",
                        locale,
                      )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={seatLimitDialogOpen} onOpenChange={setSeatLimitDialogOpen}>
        <DialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          <DialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="font-heading text-2xl">
              {runtimeLocalize(
                "Не хватает оплаченных мест",
                "Not enough paid seats",
                locale,
              )}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {runtimeLocalize(
                "Чтобы добавить сотрудника, сначала добавьте место в Billing. Инвайт резервирует место сразу.",
                "Add a seat in Billing before inviting another employee. An invitation reserves a seat immediately.",
                locale,
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-border bg-secondary/20 p-4 font-heading text-sm text-muted-foreground">
            {runtimeLocalize(
              "В Billing видно, сколько сотрудников уже занимает оплаченные места и какая цена применяется по стране организации.",
              "Billing shows how many employees already use paid seats and which regional price applies.",
              locale,
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              className="rounded-xl font-heading"
              onClick={() => setSeatLimitDialogOpen(false)}
              type="button"
              variant="outline"
            >
              {runtimeLocalize("Закрыть", "Close", locale)}
            </Button>
            <Button
              className="rounded-xl bg-accent font-heading text-accent-foreground hover:bg-accent/90"
              onClick={() => {
                setSeatLimitDialogOpen(false);
                router.push(toAdminHref("/billing"));
              }}
              type="button"
            >
              <CreditCard className="h-4 w-4" />
              {runtimeLocalize("Перейти в Billing", "Open Billing", locale)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setBulkAssignDialogOpen(open);
          if (!open) {
            setBulkError(null);
          }
        }}
        open={bulkAssignDialogOpen}
      >
        <DialogContent className="w-[min(640px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {runtimeLocalize("Назначить в бригаду", "Assign to team", locale)}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {runtimeLocalize(
                `${selectedEmployeeIds.size} сотрудника будут обновлены. Текущую роль можно оставить без изменений.`,
                `${selectedEmployeeIds.size} employees will be updated. You can keep their current role.`,
                locale,
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <TeamChoiceGrid
              groups={groups}
              locale={locale}
              onCreateTeam={() => {
                openCreateGroupForEmployees(Array.from(selectedEmployeeIds));
                setBulkAssignDialogOpen(false);
              }}
              onSelect={setBulkTargetGroupId}
              selectedGroupId={bulkTargetGroupId}
            />
            <div className="grid gap-2">
              <div className="text-xs font-heading font-semibold uppercase text-muted-foreground">
                {runtimeLocalize("Локация", "Location", locale)}
              </div>
              <Select
                onValueChange={setBulkLocationId}
                value={bulkLocationId}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue
                    placeholder={runtimeLocalize(
                      "Не менять локацию",
                      "Keep location",
                      locale,
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">
                    {runtimeLocalize(
                      "Не менять локацию",
                      "Keep location",
                      locale,
                    )}
                  </SelectItem>
                  {locationOptions.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/20 p-3">
              <div className="mb-2 text-xs font-heading font-semibold uppercase text-muted-foreground">
                {runtimeLocalize("Роль", "Role", locale)}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  {
                    value: "keep" as const,
                    title: runtimeLocalize("Не менять", "Keep role", locale),
                    note: runtimeLocalize(
                      "Оставить текущие роли",
                      "Keep current roles",
                      locale,
                    ),
                  },
                  {
                    value: "employee" as const,
                    title: runtimeLocalize("Сотрудник", "Employee", locale),
                    note: runtimeLocalize(
                      "Обычный доступ",
                      "Regular access",
                      locale,
                    ),
                  },
                  {
                    value: "team_leader" as const,
                    title: runtimeLocalize("Лидер", "Team leader", locale),
                    note: runtimeLocalize(
                      "Доступ лидера бригады",
                      "Team leader access",
                      locale,
                    ),
                  },
                ].map((option) => {
                  const selected = bulkRole === option.value;
                  return (
                    <button
                      className={`rounded-xl border px-3 py-2 text-left font-heading transition-[background-color,border-color,transform] duration-150 active:scale-[0.96] ${
                        selected
                          ? "border-[color:var(--accent)] bg-[rgba(49,84,255,0.08)] text-foreground"
                          : "border-border bg-white text-muted-foreground hover:text-foreground"
                      }`}
                      key={option.value}
                      onClick={() => setBulkRole(option.value)}
                      type="button"
                    >
                      <span className="block text-sm font-semibold">
                        {option.title}
                      </span>
                      <span className="mt-1 block text-[11px]">
                        {option.note}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {bulkError ? <div className="error-box">{bulkError}</div> : null}
            <div className="flex justify-end gap-2">
              <Button
                className="rounded-xl font-heading"
                onClick={() => setBulkAssignDialogOpen(false)}
                type="button"
                variant="outline"
              >
                {runtimeLocalize("Отмена", "Cancel", locale)}
              </Button>
              <Button
                className="rounded-xl font-heading"
                disabled={bulkSubmitting}
                onClick={() => void applyBulkAssignment()}
                type="button"
              >
                {bulkSubmitting
                  ? runtimeLocalize("Сохраняем...", "Saving...", locale)
                  : runtimeLocalize(
                      `Назначить ${selectedEmployeeIds.size}`,
                      `Assign ${selectedEmployeeIds.size}`,
                      locale,
                    )}
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
              {runtimeLocalize(
                "Доступ сотрудника создан",
                "Employee access created",
                locale,
              )}
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
                  {runtimeLocalize(
                    "Временный пароль",
                    "Temporary password",
                    locale,
                  )}
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
            setCreateGroupEmoji(DEFAULT_TEAM_AVATAR_EMOJI);
            setCreateGroupMembers([]);
          }
        }}
        open={createGroupOpen}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[min(720px,calc(100vw-1.5rem))] max-w-none overflow-y-auto rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {runtimeLocalize("Добавить бригаду", "Add team", locale)}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {runtimeLocalize(
                "Создайте новую бригаду внутри организации и сразу добавьте в неё сотрудников.",
                "Create a new team inside the organization and add employees to it right away.",
                locale,
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2 text-sm font-heading">
              <span>
                {runtimeLocalize("Эмодзи бригады", "Team emoji", locale)}
              </span>
              <TeamEmojiPickerField
                locale={locale}
                onChange={setCreateGroupEmoji}
                value={createGroupEmoji}
              />
            </div>
            <label className="grid gap-2 text-sm font-heading">
              <span>
                {runtimeLocalize("Название бригады", "Team name", locale)}
              </span>
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
                  "Короткое описание бригады",
                  "Short team description",
                  locale,
                )}
                value={createGroupDescription}
              />
            </label>
            <div className="text-xs font-heading text-muted-foreground">
              {runtimeLocalize("Состав бригады", "Team members", locale)}
            </div>
            <TeamMembersDropdown
              employees={employees}
              locale={locale}
              onChange={setCreateGroupMembers}
              selectedIds={createGroupMembers}
            />
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
                  : runtimeLocalize("Создать бригаду", "Create team", locale)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setSelectedInvitation(null);
            setInvitationDialogMode("review");
            setReviewError(null);
            setInvitationDeleting(false);
          }
        }}
        open={!!selectedInvitation}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[min(720px,calc(100vw-1.5rem))] max-w-none overflow-y-auto rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4 sm:p-6">
          {selectedInvitation ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">
                  {invitationDialogMode === "setup"
                    ? runtimeLocalize(
                        "Настроить приглашение",
                        "Setup invitation",
                        locale,
                      )
                    : runtimeLocalize(
                        "Проверка анкеты сотрудника",
                        "Employee form review",
                        locale,
                      )}
                </DialogTitle>
                <DialogDescription className="font-heading">
                  {invitationDialogMode === "setup"
                    ? runtimeLocalize(
                        "Заполните имя, фамилию, смену и бригаду. Остальное сотрудник заполнит сам.",
                        "Fill in the name, shift, and team. The employee will complete the rest.",
                        locale,
                      )
                    : runtimeLocalize(
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
                  <span>
                    {runtimeLocalize("Фамилия*", "Last name*", locale)}
                  </span>
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
                {invitationDialogMode === "review" ? (
                  <label className="grid gap-2 text-sm font-heading">
                    <span>
                      {runtimeLocalize("Отчество", "Middle name", locale)}
                    </span>
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
                ) : null}
                <label className="grid gap-2 text-sm font-heading">
                  <span>
                    {runtimeLocalize("Должность", "Position", locale)}
                  </span>
                  <Input
                    className={reviewFieldClassName}
                    onChange={(event) =>
                      setReviewForm((current) => ({
                        ...current,
                        positionTitle: event.target.value,
                      }))
                    }
                    value={reviewForm.positionTitle}
                  />
                </label>
                <div className="grid gap-2 text-sm font-heading sm:col-span-2">
                  <span>{runtimeLocalize("Роль", "Role", locale)}</span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {EMPLOYEE_ACCESS_ROLES.map((option) => {
                      const selected = reviewForm.role === option.value;
                      const Icon = getEmployeeAccessRoleIcon(option.value);
                      return (
                        <button
                          className={`rounded-2xl border p-3 text-left transition ${
                            selected
                              ? "border-[color:var(--accent)] bg-[rgba(49,84,255,0.08)]"
                              : "border-border bg-secondary/20 hover:bg-white"
                          }`}
                          key={option.value}
                          onClick={() =>
                            setReviewForm((current) => ({
                              ...current,
                              role: option.value,
                              groupId:
                                option.value === "owner"
                                  ? "__none"
                                  : current.groupId,
                            }))
                          }
                          type="button"
                        >
                          <Icon className="mb-2 h-4 w-4 text-[color:var(--accent)]" />
                          <span className="block font-semibold">
                            {runtimeLocalize(
                              option.titleRu,
                              option.titleEn,
                              locale,
                            )}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {runtimeLocalize(
                              option.descriptionRu,
                              option.descriptionEn,
                              locale,
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {invitationDialogMode === "review" ? (
                  <>
                    <label className="grid gap-2 text-sm font-heading">
                      <span>
                        {runtimeLocalize(
                          "Дата рождения*",
                          "Date of birth*",
                          locale,
                        )}
                      </span>
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
                          {
                            value: "male",
                            label: runtimeLocalize("Мужской", "Male", locale),
                          },
                          {
                            value: "female",
                            label: runtimeLocalize("Женский", "Female", locale),
                          },
                        ]}
                        triggerClassName={reviewFieldClassName}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-heading">
                      <span>
                        {runtimeLocalize("Телефон*", "Phone*", locale)}
                      </span>
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
                  </>
                ) : null}
                <div className="grid gap-2 text-sm font-heading sm:col-span-2">
                  <span>
                    {runtimeLocalize("Тип сотрудника", "Employee type", locale)}
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {employeeWorkModeOptions.map((option) => {
                      const selected = reviewForm.workMode === option.value;
                      return (
                        <button
                          className={`rounded-2xl border p-3 text-left transition ${
                            selected
                              ? "border-[color:var(--accent)] bg-[rgba(49,84,255,0.08)] text-[color:var(--foreground)]"
                              : "border-border bg-secondary/20 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                          }`}
                          key={option.value}
                          onClick={() =>
                            setReviewForm((current) => ({
                              ...current,
                              workMode: option.value,
                              shiftTemplateId:
                                option.value === "FIELD"
                                  ? ""
                                  : current.shiftTemplateId,
                            }))
                          }
                          type="button"
                        >
                          <span className="block font-semibold">
                            {runtimeLocalize(
                              option.labelRu,
                              option.labelEn,
                              locale,
                            )}
                          </span>
                          <span className="mt-1 block text-xs leading-5">
                            {runtimeLocalize(
                              option.descriptionRu,
                              option.descriptionEn,
                              locale,
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="grid gap-2 text-sm font-heading">
                  <span>
                    {reviewForm.workMode === "FIELD"
                      ? runtimeLocalize("Смена", "Shift", locale)
                      : runtimeLocalize("Смена*", "Shift*", locale)}
                  </span>
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
                    emptyLabel={runtimeLocalize(
                      "Выберите смену",
                      "Select shift",
                      locale,
                    )}
                    options={[
                      ...scheduleTemplates.map((template) => ({
                        value: template.id,
                        label: `${template.name} · ${template.startsAtLocal}-${template.endsAtLocal} · ${template.location.name}`,
                      })),
                      {
                        value: CREATE_SHIFT_TEMPLATE_OPTION,
                        label: runtimeLocalize(
                          "+ Добавить смену",
                          "+ Add shift",
                          locale,
                        ),
                      },
                    ]}
                    triggerClassName={`${reviewFieldClassName} ${
                      reviewForm.workMode === "FIELD"
                        ? "pointer-events-none opacity-50"
                        : ""
                    }`}
                  />
                </label>
                {reviewForm.role !== "owner" ? (
                  <label className="grid gap-2 text-sm font-heading">
                    <span>
                      {reviewForm.role === "team_leader"
                        ? runtimeLocalize("Бригада*", "Team*", locale)
                        : runtimeLocalize("Бригада", "Team", locale)}
                    </span>
                    <AppSelectField
                      value={
                        reviewForm.groupId === "__none"
                          ? ""
                          : reviewForm.groupId
                      }
                      onValueChange={(value) =>
                        setReviewForm((current) => ({
                          ...current,
                          groupId: value || "__none",
                        }))
                      }
                      emptyLabel={runtimeLocalize(
                        "Без бригады",
                        "No team",
                        locale,
                      )}
                      options={groups.map((group) => ({
                        value: group.id,
                        label: `${resolveTeamAvatarEmoji(group)} ${group.name}`,
                      }))}
                      triggerClassName={reviewFieldClassName}
                    />
                  </label>
                ) : (
                  <div className="grid gap-2 text-sm font-heading">
                    <span>{runtimeLocalize("Бригада", "Team", locale)}</span>
                    <div className={reviewInfoBoxClassName}>
                      {runtimeLocalize(
                        "Владельцу бригада не назначается.",
                        "Owner does not need a team assignment.",
                        locale,
                      )}
                    </div>
                  </div>
                )}
              </div>
              {invitationDialogMode === "setup" ? (
                <div className="grid gap-3 rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm font-heading">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {runtimeLocalize(
                        "Приглашение отправлено",
                        "Invitation sent",
                        locale,
                      )}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-foreground">
                      {selectedInvitation.email ? (
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold">
                        {selectedInvitation.email ??
                          selectedInvitation.phone ??
                          "—"}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {runtimeLocalize(
                      "Менеджер задаёт только базовую структуру. Дату рождения, телефон, фото и остальные данные сотрудник заполнит сам при регистрации.",
                      "The manager sets only the basic structure. Birth date, phone, photo, and the rest are completed by the employee during registration.",
                      locale,
                    )}
                  </p>
                </div>
              ) : (
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
                  outputQuality={0.92}
                  outputSize={512}
                  previewAlt={runtimeLocalize(
                    "Аватар сотрудника",
                    "Employee avatar",
                    locale,
                  )}
                  sourceMaxSide={1024}
                  sourceQuality={0.92}
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
                            alt={runtimeLocalize(
                              "Аватар сотрудника",
                              "Employee avatar",
                              locale,
                            )}
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
                            {runtimeLocalize(
                              "Заменить файл",
                              "Replace file",
                              locale,
                            )}
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
                        <span className="mt-2">
                          {selectedInvitation.email
                            ? "Email"
                            : runtimeLocalize("Телефон", "Phone", locale)}
                        </span>
                        <Input
                          className={reviewFieldClassName}
                          disabled
                          value={
                            selectedInvitation.email ??
                            selectedInvitation.phone ??
                            ""
                          }
                        />
                        <span className="mt-2">
                          {runtimeLocalize(
                            "Причина отклонения",
                            "Rejection reason",
                            locale,
                          )}
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
              )}
              {reviewError ? (
                <div className="error-box">{reviewError}</div>
              ) : null}
              {invitationDialogMode === "setup" ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button
                    className="rounded-xl border-red-200 bg-red-50 font-heading text-red-700 hover:bg-red-100 hover:text-red-800"
                    disabled={reviewSubmitting || invitationDeleting}
                    onClick={() => void deleteSelectedInvitationEmployee()}
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="h-4 w-4" />
                    {invitationDeleting
                      ? runtimeLocalize("Удаляем...", "Deleting...", locale)
                      : runtimeLocalize(
                          "Удалить сотрудника",
                          "Delete employee",
                          locale,
                        )}
                  </Button>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      className="rounded-xl font-heading"
                      disabled={reviewSubmitting || invitationDeleting}
                      onClick={() => {
                        setSelectedInvitation(null);
                        setInvitationDialogMode("review");
                      }}
                      type="button"
                      variant="outline"
                    >
                      {runtimeLocalize("Позже", "Later", locale)}
                    </Button>
                    <Button
                      className="rounded-xl font-heading"
                      disabled={reviewSubmitting || invitationDeleting}
                      onClick={() => void submitInvitationSetup()}
                      type="button"
                    >
                      <Check className="h-4 w-4" />
                      {reviewSubmitting
                        ? runtimeLocalize("Сохраняем...", "Saving...", locale)
                        : runtimeLocalize(
                            "Сохранить настройку",
                            "Save setup",
                            locale,
                          )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    className="rounded-xl font-heading text-[color:var(--danger)] hover:text-[color:var(--danger)]"
                    disabled={reviewSubmitting}
                    onClick={() => void submitReview("REJECT")}
                    variant="outline"
                  >
                    <X className="h-4 w-4" />{" "}
                    {runtimeLocalize("Отклонить", "Reject", locale)}
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
              )}
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
              {runtimeLocalize(
                "Создать шаблон смены",
                "Create shift template",
                locale,
              )}
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
            {locationOptions.length > 0 ? (
              <label className="grid gap-2 text-sm font-heading">
                <span>{runtimeLocalize("Локация", "Location", locale)}</span>
                <AppSelectField
                  onValueChange={(locationId) =>
                    setTemplateDraft((current) => ({ ...current, locationId }))
                  }
                  options={locationOptions.map((location) => ({
                    value: location.id,
                    label: location.name,
                  }))}
                  placeholder={runtimeLocalize(
                    "Выберите локацию",
                    "Select location",
                    locale,
                  )}
                  triggerClassName="h-11 rounded-xl bg-secondary/30"
                  value={templateDraft.locationId}
                />
              </label>
            ) : null}
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
              <TaskTimePicker
                locale={locale}
                onChange={(value) =>
                  setTemplateDraft((current) => ({
                    ...current,
                    startsAtLocal: value,
                  }))
                }
                value={templateDraft.startsAtLocal}
              />
              <TaskTimePicker
                locale={locale}
                onChange={(value) =>
                  setTemplateDraft((current) => ({
                    ...current,
                    endsAtLocal: value,
                  }))
                }
                value={templateDraft.endsAtLocal}
              />
            </div>

            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <label className="flex items-center gap-3 text-sm font-heading font-semibold">
                <input
                  checked={templateDraft.fixedBreakEnabled}
                  className="h-4 w-4 rounded border accent-primary"
                  onChange={(event) =>
                    setTemplateDraft((current) => ({
                      ...current,
                      fixedBreakEnabled: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                {runtimeLocalize(
                  "Фиксированный перерыв",
                  "Fixed break",
                  locale,
                )}
              </label>
              <AnimatedDisclosure show={templateDraft.fixedBreakEnabled}>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-heading text-muted-foreground">
                    {runtimeLocalize("Начало", "Start", locale)}
                    <TaskTimePicker
                      locale={locale}
                      onChange={(value) =>
                        setTemplateDraft((current) => ({
                          ...current,
                          fixedBreakStartsAtLocal: value,
                        }))
                      }
                      value={templateDraft.fixedBreakStartsAtLocal}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-heading text-muted-foreground">
                    {runtimeLocalize("Минут", "Minutes", locale)}
                    <Input
                      className="h-11"
                      min={1}
                      onChange={(event) =>
                        setTemplateDraft((current) => ({
                          ...current,
                          fixedBreakDurationMinutes: event.target.value,
                        }))
                      }
                      type="number"
                      value={templateDraft.fixedBreakDurationMinutes}
                    />
                  </label>
                </div>
              </AnimatedDisclosure>
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
                  : runtimeLocalize(
                      "Создать шаблон",
                      "Create template",
                      locale,
                    )}
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
                    initials={selectedEmployee.name}
                    size="2xl"
                    src={
                      selectedEmployeeDetails
                        ? getAvatarSrc(selectedEmployeeDetails)
                        : (selectedEmployee.avatarUrl ?? null)
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
                      runtimeLocalize("Без бригады", "No team", locale)}
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
                  <WorkspaceLoading
                    className="min-h-[120px] rounded-2xl border border-border bg-secondary/20"
                    iconClassName="h-9 w-9"
                    label={runtimeLocalize(
                      "Загружаю карточку сотрудника",
                      "Loading employee card",
                      locale,
                    )}
                  />
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
                          {runtimeLocalize(
                            "Офис / локация",
                            "Office / location",
                            locale,
                          )}
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {selectedEmployeeDetails?.primaryLocation?.name ||
                            selectedEmployee.location ||
                            "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {runtimeLocalize(
                            "Сотрудник с",
                            "Employee since",
                            locale,
                          )}
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {formatHireDate(
                            selectedEmployeeDetails?.hireDate ||
                              selectedEmployee.hireDate,
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/20 p-4 font-heading">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="grid gap-2">
                          <p className="text-sm font-semibold text-[color:var(--foreground)]">
                            {runtimeLocalize(
                              "Роль и бригада",
                              "Role and team",
                              locale,
                            )}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <RoleBadge
                              label={selectedEmployee.roleLabel}
                              role={selectedEmployee.role}
                            />
                            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700">
                              {selectedEmployee.group ? (
                                <>
                                  <span>{selectedEmployee.groupEmoji}</span>
                                  <span>{selectedEmployee.group}</span>
                                </>
                              ) : (
                                "—"
                              )}
                            </span>
                          </div>
                        </div>
                        <Button
                          className="shrink-0 rounded-xl font-heading"
                          onClick={() => openMoveDialog(selectedEmployee)}
                          type="button"
                          variant="outline"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                          {selectedEmployee.group
                            ? runtimeLocalize("Изменить", "Change", locale)
                            : runtimeLocalize("Назначить", "Assign", locale)}
                        </Button>
                      </div>
                      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                        {[
                          {
                            label: runtimeLocalize(
                              "Все сотрудники",
                              "All employees",
                              locale,
                            ),
                            allowed: selectedEmployee.role === "owner",
                          },
                          {
                            label: runtimeLocalize(
                              "Своя бригада",
                              "Own team",
                              locale,
                            ),
                            allowed: selectedEmployee.role !== "employee",
                          },
                          {
                            label: runtimeLocalize(
                              "Только свой профиль",
                              "Own profile",
                              locale,
                            ),
                            allowed: true,
                          },
                        ].map((item) => (
                          <div
                            className={`rounded-xl border px-3 py-2 ${
                              item.allowed
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-slate-200 bg-white text-slate-500"
                            }`}
                            key={item.label}
                          >
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/20 p-4 font-heading">
                      <div className="flex flex-col gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[color:var(--foreground)]">
                            {runtimeLocalize(
                              "Тип сотрудника",
                              "Employee type",
                              locale,
                            )}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--accent)]">
                            {getEmployeeWorkModeLabel(
                              selectedEmployeeWorkMode,
                              locale,
                            )}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">
                            {selectedEmployeeWorkMode === "FIELD"
                              ? runtimeLocalize(
                                  "Выездной сотрудник может делать несколько Say hi / Say bye в день. Координаты пишутся в каждом событии.",
                                  "A field employee can make multiple Say hi / Say bye visits per day. Coordinates are stored on every event.",
                                  locale,
                                )
                              : runtimeLocalize(
                                  "Штатный сотрудник отмечается в радиусе основной локации или смены.",
                                  "A stationary employee checks in within the primary location or shift radius.",
                                  locale,
                                )}
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {employeeWorkModeOptions.map((option) => {
                            const selected =
                              selectedEmployeeWorkMode === option.value;
                            return (
                              <button
                                className={`rounded-2xl border p-3 text-left transition ${
                                  selected
                                    ? "border-[color:var(--accent)] bg-[rgba(49,84,255,0.08)] text-[color:var(--foreground)]"
                                    : "border-border bg-[color:var(--panel-muted)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                                } ${workModeUpdating || detailsLoading ? "opacity-70" : ""}`}
                                disabled={workModeUpdating || detailsLoading}
                                key={option.value}
                                onClick={() =>
                                  void updateSelectedEmployeeWorkMode(
                                    option.value,
                                  )
                                }
                                type="button"
                              >
                                <span className="block text-sm font-semibold">
                                  {runtimeLocalize(
                                    option.labelRu,
                                    option.labelEn,
                                    locale,
                                  )}
                                </span>
                                <span className="mt-1 block text-xs leading-5">
                                  {runtimeLocalize(
                                    option.descriptionRu,
                                    option.descriptionEn,
                                    locale,
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/20 p-4 font-heading">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[color:var(--foreground)]">
                            {runtimeLocalize("Перерывы", "Breaks", locale)}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">
                            {runtimeLocalize(
                              "Если политика перерывов включена в Payroll, сотрудник увидит кнопку в мобильном banner.",
                              "When break policy is enabled in Payroll, this employee sees the button in the mobile banner.",
                              locale,
                            )}
                          </p>
                        </div>
                        <Button
                          className="shrink-0 rounded-xl font-heading"
                          disabled={breaksUpdating || detailsLoading}
                          onClick={() =>
                            void updateSelectedEmployeeBreaks(
                              !selectedEmployeeBreaksEnabled,
                            )
                          }
                          type="button"
                          variant={
                            selectedEmployeeBreaksEnabled
                              ? "secondary"
                              : "outline"
                          }
                        >
                          <Clock className="h-4 w-4" />
                          {breaksUpdating
                            ? runtimeLocalize(
                                "Сохраняю...",
                                "Saving...",
                                locale,
                              )
                            : selectedEmployeeBreaksEnabled
                              ? runtimeLocalize("Выключить", "Disable", locale)
                              : runtimeLocalize("Включить", "Enable", locale)}
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-center">
                        <p className="text-xs font-heading text-[color:var(--muted-foreground)]">
                          {runtimeLocalize("Бригада", "Team", locale)}
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
                            {runtimeLocalize(
                              "Дата рождения",
                              "Date of birth",
                              locale,
                            )}
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
                          {runtimeLocalize(
                            "Последняя верификация",
                            "Last verification",
                            locale,
                          )}
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {biometricLastVerifiedAt
                            ? new Date(biometricLastVerifiedAt).toLocaleString(
                                getRuntimeLocaleTag(locale),
                              )
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {runtimeLocalize(
                            "Дата регистрации",
                            "Registered at",
                            locale,
                          )}
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {biometricConnectedSince
                            ? new Date(biometricConnectedSince).toLocaleString(
                                getRuntimeLocaleTag(locale),
                              )
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {runtimeLocalize(
                            "Табельный номер",
                            "Employee number",
                            locale,
                          )}
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {selectedEmployee.employeeNumber}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {runtimeLocalize(
                            "Версия согласия",
                            "Consent version",
                            locale,
                          )}
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {selectedEmployeeBiometric?.profile?.consentVersion ||
                            "—"}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        {runtimeLocalize(
                          "Паспортные данные",
                          "Passport details",
                          locale,
                        )}
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
                    <ArrowRightLeft className="h-4 w-4" />{" "}
                    {runtimeLocalize(
                      "Переместить в бригаду",
                      "Move to team",
                      locale,
                    )}
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
                    <ListTodo className="h-4 w-4" />{" "}
                    {runtimeLocalize("Назначить задачу", "Assign task", locale)}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setMoveDialogEmployeeId(null);
            setMoveMakeLeader(false);
          }
        }}
        open={!!moveDialogEmployeeId}
      >
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {runtimeLocalize("Назначить в бригаду", "Assign to a team", locale)}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {runtimeLocalize(
                "Выберите бригаду для сотрудника. Можно сразу сделать его лидером.",
                "Select a team for the employee. You can also make them the team leader.",
                locale,
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <TeamChoiceGrid
              groups={groups}
              locale={locale}
              onCreateTeam={() => {
                if (moveDialogEmployeeId) {
                  openCreateGroupForEmployees([moveDialogEmployeeId]);
                  setMoveDialogEmployeeId(null);
                }
              }}
              onSelect={setMoveTargetGroupId}
              selectedGroupId={moveTargetGroupId}
            />
            <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/20 p-4 text-sm font-heading">
              <Checkbox
                checked={moveMakeLeader}
                onCheckedChange={(checked) =>
                  setMoveMakeLeader(checked === true)
                }
              />
              <span className="grid gap-1">
                <span className="font-semibold text-foreground">
                  {runtimeLocalize(
                    "Сделать лидером бригады",
                    "Make team leader",
                    locale,
                  )}
                </span>
                <span className="text-xs leading-5 text-muted-foreground">
                  {runtimeLocalize(
                    "Лидер должен быть привязан к одной бригаде.",
                    "A leader must be assigned to one team.",
                    locale,
                  )}
                </span>
              </span>
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
                ? runtimeLocalize("Задача бригаде", "Task for team", locale)
                : runtimeLocalize("Назначить задачу", "Assign task", locale)}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {taskDialog
                ? `${runtimeLocalize("Получатель", "Recipient", locale)}: ${
                    taskRecipientSummary ?? taskDialog.targetLabel
                  }`
                : runtimeLocalize(
                    "Заполните параметры задачи.",
                    "Fill in the task details.",
                    locale,
                  )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {locationOptions.length > 0 ? (
              <label className="grid gap-2 text-sm font-heading">
                <span>{runtimeLocalize("Локация", "Location", locale)}</span>
                <AppSelectField
                  onValueChange={(locationId) => {
                    setTaskDraft((current) => ({ ...current, locationId }));
                    setTaskDialog((current) =>
                      current?.mode === "employee"
                        ? {
                            ...current,
                            targetIds: current.targetIds.filter((employeeId) =>
                              employeeRecordBelongsToLocation(
                                employeeRecords.find(({ id }) => id === employeeId),
                                locationId,
                              ),
                            ),
                          }
                        : current,
                    );
                  }}
                  options={locationOptions.map((location) => ({
                    value: location.id,
                    label: location.name,
                  }))}
                  placeholder={runtimeLocalize(
                    "Выберите локацию",
                    "Select location",
                    locale,
                  )}
                  triggerClassName="h-11 rounded-xl bg-secondary/30"
                  value={taskDraft.locationId}
                />
              </label>
            ) : null}
            {taskDialog?.mode === "employee" ? (
              <div className="grid gap-2 text-sm font-heading">
                <span>{runtimeLocalize("Получатель", "Recipient", locale)}</span>
                <EmployeeDropdown
                  allEmployeesLabel={runtimeLocalize(
                    "Все сотрудники",
                    "All employees",
                    locale,
                  )}
                  employeeLabel={runtimeLocalize("Сотрудник", "Employee", locale)}
                  employees={taskEmployeeOptions}
                  groupBy="group"
                  groupFallbackLabel={runtimeLocalize("Без группы", "Without group", locale)}
                  loadingLabel={runtimeLocalize(
                    "Загружаем сотрудников",
                    "Loading employees",
                    locale,
                  )}
                  mode="multiple"
                  noEmployeesLabel={runtimeLocalize(
                    "Сотрудники не найдены.",
                    "No employees found.",
                    locale,
                  )}
                  onSelectedEmployeeIdsChange={(employeeIds) =>
                    setTaskDialog((current) =>
                      current?.mode === "employee"
                        ? {
                            ...current,
                            targetIds: employeeIds,
                          }
                        : current,
                    )
                  }
                  placeholder={runtimeLocalize(
                    "Выберите сотрудника",
                    "Select employee",
                    locale,
                  )}
                  searchPlaceholder={runtimeLocalize(
                    "Поиск сотрудника",
                    "Search employee",
                    locale,
                  )}
                  selectedEmployeeIds={taskDialog.targetIds}
                  selectedEmployeesLabel={(count) =>
                    runtimeLocalize(
                      `${count} сотрудников выбрано`,
                      `${count} employees selected`,
                      locale,
                    )
                  }
                />
              </div>
            ) : null}
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
              <AnimatedDisclosure show={!taskDraft.isRecurring}>
                <div className="grid gap-2 text-sm font-heading">
                  <div className="grid gap-2">
                    <label className="inline-flex min-h-5 cursor-pointer items-center gap-3 justify-self-start">
                      <Checkbox
                        checked={taskDraft.hasDueTime}
                        onCheckedChange={(checked) =>
                          setTaskDraft((current) => ({
                            ...current,
                            hasDueTime: checked === true,
                            dueAt: checked === true ? current.dueAt : "",
                          }))
                        }
                      />
                      <span className="leading-snug">
                        {runtimeLocalize(
                          "Сделать до времени",
                          "Set deadline time",
                          locale,
                        )}
                      </span>
                    </label>
                    <TaskDateTimePicker
                      className="self-end"
                      isDisabled={!taskDraft.hasDueTime}
                      locale={locale}
                      minToday
                      onChange={(value) =>
                        setTaskDraft((current) => ({
                          ...current,
                          dueAt: value,
                        }))
                      }
                      value={taskDraft.dueAt}
                    />
                  </div>
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
                </div>
              </AnimatedDisclosure>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="inline-flex cursor-pointer items-center gap-3 justify-self-start">
                <Checkbox
                  checked={taskDraft.isRecurring}
                  onCheckedChange={(checked) =>
                    setTaskDraft((current) => ({
                      ...current,
                      isRecurring: checked === true,
                      dueAt: checked === true ? "" : current.dueAt,
                      hasDueTime: checked === true ? false : current.hasDueTime,
                    }))
                  }
                />
                <span className="whitespace-nowrap text-sm font-heading leading-none">
                  {runtimeLocalize(
                    "Сделать регулярной задачей",
                    "Make recurring",
                    locale,
                  )}
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
            <AnimatedDisclosure show={taskDraft.isRecurring}>
              <div className="grid gap-4 rounded-2xl border border-dashed border-border bg-secondary/10 p-4">
                <div className="grid gap-2 text-sm font-heading">
                  <span>
                    {runtimeLocalize("Дни повтора", "Recurring days", locale)}
                  </span>
                  <div className="grid grid-cols-7 justify-items-center gap-1.5 sm:gap-2">
                    {TASK_WEEKDAY_VALUES.map((day) => {
                      const label = getWeekdayShortLabel(day, locale);
                      const isSelected = taskDraft.weekDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`flex size-10 min-w-10 items-center justify-center rounded-full text-[11px] font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.96] sm:size-11 sm:min-w-11 sm:text-xs ${
                            isSelected
                              ? "bg-[color:var(--primary)] text-white shadow-[0_6px_14px_rgba(37,99,235,0.2)]"
                              : "border border-border/70 bg-white text-foreground hover:bg-secondary/50"
                          }`}
                          onClick={() => {
                            setTaskDraft((current) => ({
                              ...current,
                              weekDays: isSelected
                                ? current.weekDays.filter((d) => d !== day)
                                : [...current.weekDays, day].sort(
                                    (left, right) => left - right,
                                  ),
                            }));
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,220px)]">
                  <label className="grid gap-2 text-sm font-heading">
                    <span>
                      {runtimeLocalize("Начало", "Start date", locale)}
                    </span>
                    <TaskDatePicker
                      locale={locale}
                      onChange={(value) =>
                        setTaskDraft((current) => ({
                          ...current,
                          startDate: value,
                        }))
                      }
                      value={taskDraft.startDate}
                    />
                  </label>
                  <div className="grid gap-2 text-sm font-heading">
                    <label className="inline-flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-white px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                      <Checkbox
                        checked={taskDraft.hasDueTime}
                        onCheckedChange={(checked) =>
                          setTaskDraft((current) => ({
                            ...current,
                            hasDueTime: checked === true,
                            dueTimeLocal:
                              checked === true
                                ? current.dueTimeLocal || "18:00"
                                : current.dueTimeLocal,
                          }))
                        }
                      />
                      <span>
                        {runtimeLocalize("Точное время", "Exact time", locale)}
                      </span>
                    </label>
                    <TaskTimePicker
                      isDisabled={!taskDraft.hasDueTime}
                      locale={locale}
                      onChange={(value) =>
                        setTaskDraft((current) => ({
                          ...current,
                          dueTimeLocal: value,
                        }))
                      }
                      value={taskDraft.hasDueTime ? taskDraft.dueTimeLocal : ""}
                    />
                  </div>
                </div>
              </div>
            </AnimatedDisclosure>
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
                disabled={
                  taskSubmitting ||
                  !taskDraft.title.trim() ||
                  (taskDialog?.mode === "employee" &&
                    taskDialog.targetIds.length === 0) ||
                  (taskDraft.isRecurring && taskDraft.weekDays.length === 0) ||
                  (taskDraft.hasDueTime &&
                    (taskDraft.isRecurring
                      ? !taskDraft.dueTimeLocal
                      : !taskDraft.dueAt))
                }
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
                  ? `У сотрудника ${taskRecipientSummary ?? taskDialog.targetLabel} выходной день ${formatWorkdayDateLabel(taskDayStatus.dayKey, locale)}. Вы хотите назначить задачу на этот день?`
                  : `${taskRecipientSummary ?? taskDialog.targetLabel} has a day off on ${formatWorkdayDateLabel(taskDayStatus.dayKey, locale)}. Do you want to assign a task for this day?`
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
            setGroupEditorEmoji(DEFAULT_TEAM_AVATAR_EMOJI);
          }
        }}
        open={!!groupEditorId}
      >
        <DialogContent className="w-[min(720px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          {groupEditor ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">
                  {runtimeLocalize("Изменить бригаду", "Edit team", locale)}
                </DialogTitle>
                <DialogDescription className="font-heading">
                  {runtimeLocalize(
                    "Измените название, описание, эмодзи и состав бригады",
                    "Update the team name, description, emoji and members",
                    locale,
                  )}{" "}
                  «{groupEditor.name}».
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid gap-2 text-sm font-heading">
                  <span>
                    {runtimeLocalize("Эмодзи бригады", "Team emoji", locale)}
                  </span>
                  <TeamEmojiPickerField
                    locale={locale}
                    onChange={setGroupEditorEmoji}
                    value={groupEditorEmoji}
                  />
                </div>
                <label className="grid gap-2 text-sm font-heading">
                  <span>
                    {runtimeLocalize("Название бригады", "Team name", locale)}
                  </span>
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
                  <span>
                    {runtimeLocalize("Описание", "Description", locale)}
                  </span>
                  <Textarea
                    className="min-h-[96px]"
                    maxLength={500}
                    onChange={(event) =>
                      setGroupEditorDescription(event.target.value)
                    }
                    placeholder={runtimeLocalize(
                      "Короткое описание бригады",
                      "Short team description",
                      locale,
                    )}
                    value={groupEditorDescription}
                  />
                </label>
                <div className="text-xs font-heading text-muted-foreground">
                  {runtimeLocalize("Состав бригады", "Team members", locale)}
                </div>
                <TeamMembersDropdown
                  employees={employees}
                  locale={locale}
                  onChange={setGroupEditorMembers}
                  selectedIds={groupEditorMembers}
                />
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
                    {runtimeLocalize("Удалить бригаду", "Delete team", locale)}
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
                  {runtimeLocalize("Удалить бригаду", "Delete team", locale)}
                </DialogTitle>
                <DialogDescription className="font-heading">
                  {runtimeLocalize(
                    `Бригада «${groupEditor.name}» будет удалена. Сотрудники останутся в системе без бригады, а привязка у задач к этой бригаде будет снята.`,
                    `Team "${groupEditor.name}" will be deleted. Employees will stay in the system without a team, and tasks will be detached from this team.`,
                    locale,
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm font-heading text-muted-foreground">
                {runtimeLocalize("В бригаде", "In team", locale)}:{" "}
                {groupEditor.memberships.length}{" "}
                {runtimeLocalize(
                  "сотрудник(ов), задач",
                  "employee(s), tasks",
                  locale,
                )}
                : {groupEditor._count?.tasks ?? 0}.
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
                    : runtimeLocalize("Удалить бригаду", "Delete team", locale)}
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
            {locationOptions.length > 0 ? (
              <label className="grid gap-2 text-sm font-heading">
                <span>{runtimeLocalize("Локация", "Location", locale)}</span>
                <AppSelectField
                  onValueChange={(locationId) => {
                    const template = scheduleTemplates.find(
                      (item) => item.location.id === locationId,
                    );
                    const duration = template?.fixedBreakDurationMinutes ?? 0;
                    setAssignShiftDraft((current) => ({
                      ...current,
                      locationId,
                      templateId: template?.id ?? "",
                      fixedBreakEnabled: duration > 0,
                      fixedBreakStartsAtLocal:
                        template?.fixedBreakStartsAtLocal ?? "13:00",
                      fixedBreakDurationMinutes: String(duration || 30),
                    }));
                  }}
                  options={locationOptions.map((location) => ({
                    value: location.id,
                    label: location.name,
                  }))}
                  placeholder={runtimeLocalize(
                    "Выберите локацию",
                    "Select location",
                    locale,
                  )}
                  triggerClassName="h-11 rounded-xl bg-secondary/30"
                  value={assignShiftDraft.locationId}
                />
              </label>
            ) : null}
            <label className="grid gap-2 text-sm font-heading">
              <span>
                {runtimeLocalize("Шаблон смены", "Shift template", locale)}
              </span>
              <Select
                onValueChange={(value) => {
                  if (value === CREATE_SHIFT_TEMPLATE_OPTION) {
                    setCreateTemplateOpen(true);
                    return;
                  }

                  applyAssignShiftTemplateDefaults(value);
                }}
                value={assignShiftDraft.templateId}
              >
                <SelectTrigger className="h-11 rounded-xl border-border bg-secondary/30 text-sm font-heading">
                  <SelectValue
                    placeholder={runtimeLocalize(
                      "Выберите шаблон",
                      "Select template",
                      locale,
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {scheduleTemplates
                    .filter(
                      (template) =>
                        !assignShiftDraft.locationId ||
                        template.location.id === assignShiftDraft.locationId,
                    )
                    .map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.startsAtLocal}-
                      {template.endsAtLocal})
                    </SelectItem>
                    ))}
                  <SelectItem value={CREATE_SHIFT_TEMPLATE_OPTION}>
                    {runtimeLocalize(
                      "+ Создать шаблон смены",
                      "+ Create shift template",
                      locale,
                    )}
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
              <TaskDatePicker
                locale={locale}
                onChange={(value) =>
                  setAssignShiftDraft((current) => ({
                    ...current,
                    shiftDate: value,
                  }))
                }
                value={assignShiftDraft.shiftDate}
              />
            </label>
            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <label className="flex items-center gap-3 text-sm font-heading font-semibold">
                <input
                  checked={assignShiftDraft.fixedBreakEnabled}
                  className="h-4 w-4 rounded border accent-primary"
                  onChange={(event) =>
                    setAssignShiftDraft((current) => ({
                      ...current,
                      fixedBreakEnabled: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                {runtimeLocalize(
                  "Фиксированный перерыв",
                  "Fixed break",
                  locale,
                )}
              </label>
              <AnimatedDisclosure show={assignShiftDraft.fixedBreakEnabled}>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-heading text-muted-foreground">
                    {runtimeLocalize("Начало", "Start", locale)}
                    <TaskTimePicker
                      locale={locale}
                      onChange={(value) =>
                        setAssignShiftDraft((current) => ({
                          ...current,
                          fixedBreakStartsAtLocal: value,
                        }))
                      }
                      value={assignShiftDraft.fixedBreakStartsAtLocal}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-heading text-muted-foreground">
                    {runtimeLocalize("Минут", "Minutes", locale)}
                    <Input
                      className="h-11"
                      min={1}
                      onChange={(event) =>
                        setAssignShiftDraft((current) => ({
                          ...current,
                          fixedBreakDurationMinutes: event.target.value,
                        }))
                      }
                      type="number"
                      value={assignShiftDraft.fixedBreakDurationMinutes}
                    />
                  </label>
                </div>
              </AnimatedDisclosure>
            </div>
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

      {navigatingEmployeeId ? (
        <div className="pointer-events-none absolute inset-0 z-[30] flex items-center justify-center bg-[rgba(244,247,252,0.38)] backdrop-blur-[2px]">
          <div className="flex items-center gap-4 rounded-[24px] border border-border/80 bg-white/96 px-5 py-4 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <WorkspaceLoading
              className="min-h-0"
              iconClassName="h-12 w-12"
              label={runtimeLocalize(
                "Открываю карточку сотрудника",
                "Opening employee profile",
                locale,
              )}
            />
            <div className="grid gap-1">
              <strong className="text-sm font-heading text-foreground">
                {runtimeLocalize(
                  "Открываю карточку сотрудника",
                  "Opening employee profile",
                  locale,
                )}
              </strong>
              <span className="text-xs text-muted-foreground">
                {navigatingEmployee
                  ? navigatingEmployee.name
                  : runtimeLocalize(
                      "Переходим на страницу",
                      "Navigating to page",
                      locale,
                    )}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Employees;
