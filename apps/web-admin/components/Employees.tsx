"use client";

import { useEffect, useMemo, useState } from "react";
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
  Search,
  Settings,
  Smartphone,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  CollaborationOverviewResponse,
  EmployeeBiometricHistoryResponse,
  TaskItem,
} from "@smart/types";
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
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  buildEmployeeWorkdayLookup,
  formatWorkdayDateLabel,
  getEmployeeWorkdayStatus,
  type EmployeeScheduleShift,
} from "@/lib/employee-workdays";
import { getMockAvatarDataUrl } from "@/lib/mock-avatar";

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
  user?: {
    id: string;
    email: string;
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

type EmployeeStatus = "active" | "inactive" | "vacation" | "sick" | "dismissed";
type ViewMode = "employees" | "groups";
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
  active: "bg-[color:var(--soft-success)] text-[color:var(--success)]",
  inactive: "bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]",
  vacation: "bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]",
  sick: "bg-[color:var(--soft-warning)] text-[color:var(--warning)]",
  dismissed: "bg-[color:var(--soft-danger)] text-[color:var(--danger)]",
};

const statusTextStyles: Record<EmployeeStatus, string> = {
  active: "text-[color:var(--success)]",
  inactive: "text-[color:var(--accent-strong)]",
  vacation: "text-[color:var(--accent-strong)]",
  sick: "text-[color:var(--warning)]",
  dismissed: "text-[color:var(--danger)]",
};

const statusLabels: Record<EmployeeStatus, string> = {
  active: "На смене",
  inactive: "Вне смены",
  vacation: "Отпуск",
  sick: "Больничный",
  dismissed: "Уволен",
};

const invitationLabels: Record<InvitationRecord["status"], string> = {
  INVITED: "Приглашение отправлено",
  PENDING_APPROVAL: "Ждёт подтверждения",
  REJECTED: "Отклонено",
};

const invitationStyles: Record<InvitationRecord["status"], string> = {
  INVITED: "bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]",
  PENDING_APPROVAL:
    "bg-[color:var(--soft-warning)] text-[color:var(--warning)]",
  REJECTED: "bg-[color:var(--soft-danger)] text-[color:var(--danger)]",
};

const CREATE_SHIFT_TEMPLATE_OPTION = "__create_shift_template__";

const taskPriorityOptions: Array<{
  value: TaskItem["priority"];
  label: string;
}> = [
  { value: "LOW", label: "Низкий" },
  { value: "MEDIUM", label: "Средний" },
  { value: "HIGH", label: "Высокий" },
  { value: "URGENT", label: "Срочный" },
];

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
  return (
    employee.avatarUrl ||
    getMockAvatarDataUrl(
      buildEmployeeName(employee) || employee.lastName || "employee",
    )
  );
}

function normalizeEmployeeStatus(status?: string | null): EmployeeStatus {
  switch ((status || "").toUpperCase()) {
    case "TERMINATED":
    case "DISMISSED":
      return "dismissed";
    case "INACTIVE":
    case "CHECKED_OUT":
      return "inactive";
    case "VACATION":
      return "vacation";
    case "SICK":
    case "SICK_LEAVE":
      return "sick";
    default:
      return "active";
  }
}

function formatHireDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("ru-RU");
}

const EmployeeRow = ({
  emp,
  onMove,
  onOpenTask,
  onSelect,
}: {
  emp: EmployeeRowView;
  onMove: (employee: EmployeeRowView) => void;
  onOpenTask: (employee: EmployeeRowView) => void;
  onSelect: (employeeId: string) => void;
}) => (
  <tr
    className="cursor-pointer border-t border-border transition-colors hover:bg-secondary/30"
    onClick={() => onSelect(emp.id)}
  >
    <td className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <img
          alt={emp.name}
          className="h-10 w-10 shrink-0 rounded-full object-cover shadow-[0_8px_20px_rgba(40,75,255,0.12)]"
          src={emp.avatarUrl || getMockAvatarDataUrl(emp.name)}
        />
        <div className="min-w-0">
          <p className="truncate font-heading font-medium text-foreground">
            {emp.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {emp.position} • {emp.employeeNumber}
          </p>
        </div>
      </div>
    </td>
    <td className="px-3 py-2.5">
      <span className={`text-xs font-heading ${statusTextStyles[emp.status]}`}>
        {statusLabels[emp.status]}
      </span>
    </td>
    <td className="px-3 py-2.5 text-xs font-heading text-muted-foreground">
      {emp.location}
    </td>
    <td className="px-3 py-2.5">
      {emp.group ? (
        <span className="text-xs font-heading text-foreground">
          {emp.group}
        </span>
      ) : (
        <span className="text-xs italic text-muted-foreground">—</span>
      )}
    </td>
    <td className="px-3 py-2.5 text-center font-heading font-semibold text-foreground">
      {emp.activeTasks}
    </td>
    <td className="px-3 py-2.5">
      <div className="flex gap-1">
        <Button
          className="h-7 w-7 rounded-lg p-0"
          onClick={(event) => {
            event.stopPropagation();
            onOpenTask(emp);
          }}
          size="sm"
          variant="ghost"
        >
          <ListTodo className="h-3.5 w-3.5" />
        </Button>
        <Button
          className="h-7 w-7 rounded-lg p-0"
          onClick={(event) => {
            event.stopPropagation();
            onMove(emp);
          }}
          size="sm"
          variant="ghost"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
        </Button>
      </div>
    </td>
  </tr>
);

const TableHead = () => (
  <thead>
    <tr className="bg-secondary/50">
      <th className="px-3 py-2.5 text-left text-xs font-heading font-medium text-muted-foreground">
        ФИО
      </th>
      <th className="px-3 py-2.5 text-left text-xs font-heading font-medium text-muted-foreground">
        Статус
      </th>
      <th className="px-3 py-2.5 text-left text-xs font-heading font-medium text-muted-foreground">
        Локация
      </th>
      <th className="px-3 py-2.5 text-left text-xs font-heading font-medium text-muted-foreground">
        Группа
      </th>
      <th className="px-3 py-2.5 text-center text-xs font-heading font-medium text-muted-foreground">
        Задачи
      </th>
      <th className="px-3 py-2.5 text-left text-xs font-heading font-medium text-muted-foreground">
        Действия
      </th>
    </tr>
  </thead>
);

const Employees = () => {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("employees");
  const [showFormerEmployees, setShowFormerEmployees] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [employeeRecords, setEmployeeRecords] = useState<EmployeeApiRecord[]>(
    [],
  );
  const [overview, setOverview] =
    useState<CollaborationOverviewResponse | null>(null);

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

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [copiedInviteField, setCopiedInviteField] = useState<
    "code" | "link" | "email" | "password" | null
  >(null);
  const [organizationSetup, setOrganizationSetup] =
    useState<OrganizationSetupResponse | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [createGroupDescription, setCreateGroupDescription] = useState("");
  const [createGroupSubmitting, setCreateGroupSubmitting] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  const [pendingInvitations, setPendingInvitations] = useState<
    InvitationRecord[]
  >([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
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
    [],
  );
  const [scheduleTemplates, setScheduleTemplates] = useState<
    ShiftTemplateRecord[]
  >([]);

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
      setCreateTemplateError("Заполните все поля шаблона смены");
      return;
    }

    setCreateTemplateSubmitting(true);
    setCreateTemplateError(null);

    const session = getSession();
    if (!session) {
      const location = scheduleTemplates[0]?.location || {
        id: "mock-loc",
        name: "Офис",
      };
      const position = scheduleTemplates[0]?.position || {
        id: "mock-pos",
        name: "Сотрудник",
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
      const locationId = scheduleTemplates[0]?.location?.id;
      const positionId = scheduleTemplates[0]?.position?.id;

      if (!locationId || !positionId) {
        throw new Error(
          "Не удалось определить локацию или должность. Сначала создайте хотя бы один шаблон в настройках расписания.",
        );
      }

      await apiRequest("/schedule/templates", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          name: templateDraft.name.trim(),
          code: templateDraft.name.trim().toLowerCase().replace(/\s+/g, "-"),
          locationId,
          positionId,
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
        const created = res.find((t) => t.name === templateDraft.name.trim());
        if (created) {
          setReviewForm((current) => ({
            ...current,
            shiftTemplateId: created.id,
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
        error instanceof Error ? error.message : "Ошибка создания шаблона",
      );
    } finally {
      setCreateTemplateSubmitting(false);
    }
  }
  const [canCheckWorkdays, setCanCheckWorkdays] = useState(false);
  const [taskDayOffConfirmOpen, setTaskDayOffConfirmOpen] = useState(false);

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

  const employees = useMemo<EmployeeRowView[]>(() => {
    return employeeRecords
      .map((employee) => {
        const group = groupByEmployeeId.get(employee.id);
        return {
          id: employee.id,
          name: buildEmployeeName(employee),
          employeeNumber: employee.employeeNumber,
          email: employee.user?.email ?? "",
          groupId: group?.id ?? null,
          group: group?.name ?? null,
          location: employee.primaryLocation?.name ?? "—",
          status: normalizeEmployeeStatus(employee.status),
          activeTasks: tasksByEmployeeId.get(employee.id) ?? 0,
          phone: employee.phone ?? "—",
          position: employee.position?.name ?? "Сотрудник",
          hireDate: employee.hireDate,
          attendance: null,
          avatarUrl: employee.avatarUrl ?? null,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name, "ru"));
  }, [employeeRecords, groupByEmployeeId, tasksByEmployeeId]);

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
          left.group.name.localeCompare(right.group.name, "ru"),
        ),
    [filteredEmployees, groups],
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
    switch (selectedEmployeeBiometric?.profile?.enrollmentStatus) {
      case "ENROLLED":
        return "Биометрия подключена";
      case "PENDING":
        return "Ожидает завершения";
      case "FAILED":
        return "Ошибка биометрии";
      case "NOT_STARTED":
        return "Не настроена";
      default:
        return "Не настроена";
    }
  }, [selectedEmployeeBiometric]);

  const employeeJoinCode = organizationSetup?.company?.code ?? "";
  const employeeJoinLink =
    typeof window !== "undefined" && employeeJoinCode
      ? `${window.location.origin}/join/company/${encodeURIComponent(employeeJoinCode)}`
      : "";

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
      const [
        employeesData,
        overviewData,
        invitationsData,
        shiftsData,
        templatesData,
        orgSetupData,
      ] = await Promise.all([
        apiRequest<EmployeeApiRecord[]>("/employees", {
          token: session.accessToken,
        }),
        apiRequest<CollaborationOverviewResponse>("/collaboration/overview", {
          token: session.accessToken,
        }),
        apiRequest<InvitationRecord[]>("/employees/invitations/pending", {
          token: session.accessToken,
        }),
        apiRequest<EmployeeScheduleShift[]>("/schedule/shifts", {
          token: session.accessToken,
        })
          .then((result) => {
            setCanCheckWorkdays(true);
            return result;
          })
          .catch(() => {
            setCanCheckWorkdays(false);
            return [];
          }),
        apiRequest<ShiftTemplateRecord[]>("/schedule/templates", {
          token: session.accessToken,
        }).catch(() => []),
        apiRequest<OrganizationSetupResponse>("/org/setup", {
          token: session.accessToken,
        }).catch(() => ({ company: null })),
      ]);

      setEmployeeRecords(employeesData);
      setOverview(overviewData);
      setPendingInvitations(invitationsData);
      setScheduleShifts(shiftsData);
      setScheduleTemplates(templatesData);
      setOrganizationSetup(orgSetupData);
      setExpandedGroups(
        new Set([
          ...overviewData.groups.map((group) => group.id),
          ...(employeesData.some(
            (employee) =>
              !overviewData.groups.some((group) =>
                group.memberships.some(
                  (membership) => membership.employeeId === employee.id,
                ),
              ),
          )
            ? ["__none"]
            : []),
        ]),
      );
    } catch (requestError) {
      setDirectoryError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось загрузить сотрудников.",
      );
      setEmployeeRecords([]);
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
    void loadDirectory();
  }, []);

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
      setInviteSuccess("Приглашение отправлено. Ссылка действует 3 дня.");
      setInviteEmail("");
      await loadDirectory();
    } catch (requestError) {
      setInviteError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось отправить приглашение.",
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
      setInviteError("Не удалось скопировать. Скопируйте значение вручную.");
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
        }),
      });

      setCreateGroupOpen(false);
      setCreateGroupName("");
      setCreateGroupDescription("");
      setPageMessage("Группа добавлена.");
      await loadDirectory();
    } catch (requestError) {
      setCreateGroupError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось создать группу.",
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
      setPageMessage("Приглашение отправлено повторно.");
      await loadDirectory();
    } catch (requestError) {
      setInviteError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось повторно отправить приглашение.",
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
          ? "Анкета сотрудника подтверждена."
          : "Анкета сотрудника отклонена.",
      );
      await loadDirectory();
    } catch (requestError) {
      setReviewError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось сохранить решение.",
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
      setPageMessage("Группа сотрудника обновлена.");
      await loadDirectory();
    } catch (requestError) {
      setMoveError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось обновить группу сотрудника.",
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
          ? "Задача назначена сотруднику."
          : "Задача назначена группе.",
      );
      await loadDirectory();
    } catch (requestError) {
      setTaskError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось создать задачу.",
      );
    } finally {
      setTaskSubmitting(false);
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
      setGroupError("Укажите название группы.");
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
      setPageMessage("Группа обновлена.");
      await loadDirectory();
    } catch (requestError) {
      setGroupError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось обновить группу.",
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
      setPageMessage("Группа удалена.");
      await loadDirectory();
    } catch (requestError) {
      setGroupError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось удалить группу.",
      );
    } finally {
      setGroupDeleting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div className="scrollbar-hide mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-y-auto space-y-5 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Сотрудники
            </h1>
            <span className="text-sm font-heading text-muted-foreground">
              {filteredEmployees.length} чел.
            </span>
          </div>
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
                <Users className="h-4 w-4" /> Сотрудники
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 text-sm font-heading font-medium transition-colors ${
                  viewMode === "groups"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setViewMode("groups")}
              >
                <FolderOpen className="h-4 w-4" /> Группы
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
                  <FolderOpen className="h-4 w-4" /> Добавить группу
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Добавить сотрудника
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[280px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 w-full rounded-xl border-border bg-secondary/30 pl-9 font-heading"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск сотрудника..."
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
              Показывать бывших сотрудников
            </label>
            {viewMode === "groups" ? (
              <Button
                className="w-[184px] justify-center rounded-xl font-heading"
                onClick={toggleAllGroups}
                size="sm"
                variant="outline"
              >
                <Users className="h-3.5 w-3.5" />
                {allExpanded ? "Свернуть группы" : "Развернуть группы"}
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
                        {invitationLabels[invitation.status]}
                      </span>
                    </div>
                    <p className="text-xs font-heading text-muted-foreground">
                      {invitation.submittedAt
                        ? `Анкета отправлена ${new Date(invitation.submittedAt).toLocaleString("ru-RU")}`
                        : `Ссылка активна до ${new Date(invitation.expiresAt).toLocaleString("ru-RU")}`}
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
                        <Mail className="h-4 w-4" /> Повторить
                      </Button>
                    ) : null}
                    <Button
                      className="rounded-xl font-heading"
                      onClick={() => openInvitation(invitation)}
                      size="sm"
                    >
                      Проверить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {directoryLoading ? (
            <div className="rounded-2xl border border-border bg-secondary/20 px-5 py-12 text-center text-sm font-heading text-muted-foreground">
              Загружаю сотрудников...
            </div>
          ) : viewMode === "employees" ? (
            filteredEmployees.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <TableHead />
                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <EmployeeRow
                        emp={employee}
                        key={employee.id}
                        onMove={openMoveDialog}
                        onOpenTask={openTaskDialogForEmployee}
                        onSelect={setSelectedEmployeeId}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-2xl border border-border bg-secondary/20 px-5 py-12 text-center text-sm font-heading text-muted-foreground">
                По текущему фильтру сотрудники не найдены.
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
                          <Settings className="h-3 w-3" /> Изменить
                        </Button>
                        <Button
                          className="h-7 rounded-lg px-2 text-xs font-heading"
                          onClick={() =>
                            openTaskDialogForGroup(group.id, group.name)
                          }
                          size="sm"
                          variant="ghost"
                        >
                          <ListTodo className="h-3 w-3" /> Задача группе
                        </Button>
                      </div>
                    </div>
                    {isOpen && members.length > 0 ? (
                      <table className="w-full text-sm">
                        <TableHead />
                        <tbody>
                          {members.map((employee) => (
                            <EmployeeRow
                              emp={employee}
                              key={employee.id}
                              onMove={openMoveDialog}
                              onOpenTask={openTaskDialogForEmployee}
                              onSelect={setSelectedEmployeeId}
                            />
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                    {isOpen && members.length === 0 ? (
                      <p className="p-4 text-center text-sm font-heading text-muted-foreground">
                        В этой группе нет сотрудников.
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
                        Без группы
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {ungroupedEmployees.length}
                      </span>
                    </div>
                  </button>
                  {expandedGroups.has("__none") ? (
                    <table className="w-full text-sm">
                      <TableHead />
                      <tbody>
                        {ungroupedEmployees.map((employee) => (
                          <EmployeeRow
                            emp={employee}
                            key={employee.id}
                            onMove={openMoveDialog}
                            onOpenTask={openTaskDialogForEmployee}
                            onSelect={setSelectedEmployeeId}
                          />
                        ))}
                      </tbody>
                    </table>
                  ) : null}
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
              Добавить сотрудника
            </DialogTitle>
            <DialogDescription className="font-heading">
              Лучше выдать сотруднику код компании или mobile join link. Email
              приглашение можно использовать как запасной вариант.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="space-y-1">
                <div className="text-sm font-heading font-semibold text-foreground">
                  Код компании
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={employeeJoinCode || "Сначала настройте организацию"}
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
                      ? "Скопировано"
                      : "Копировать"}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-heading font-semibold text-foreground">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  Mobile join link
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={
                      employeeJoinLink ||
                      "Ссылка появится после настройки организации"
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
                      ? "Скопировано"
                      : "Копировать"}
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
              Если не хотите зависеть от email-сервиса, просто отправьте
              сотруднику код компании. Он сможет сам зарегистрироваться в
              мобильном приложении. Менеджерский доступ задаётся на этапе
              подтверждения анкеты.
            </div>

            <label className="grid gap-2 text-sm font-heading">
              <span>Email для приглашения</span>
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
                {inviteSubmitting ? "Отправляем..." : "Отправить приглашение"}
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
              Доступ сотрудника создан
            </DialogTitle>
            <DialogDescription className="font-heading">
              Отправьте сотруднику эти данные для первого входа. Пароль
              показывается только один раз.
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
                      ? "Скопировано"
                      : "Копировать"}
                  </Button>
                </div>
              </div>

              <div className="rounded-[24px] border border-[color:var(--border)] bg-white/80 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Временный пароль
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
                      ? "Скопировано"
                      : "Копировать"}
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
              Готово
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
          }
        }}
        open={createGroupOpen}
      >
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              Добавить группу
            </DialogTitle>
            <DialogDescription className="font-heading">
              Создайте новую группу внутри организации. Сотрудников можно будет
              добавить сразу после создания.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-heading">
              <span>Название группы</span>
              <Input
                maxLength={120}
                onChange={(event) => setCreateGroupName(event.target.value)}
                placeholder="Например, Администраторы"
                value={createGroupName}
              />
            </label>
            <label className="grid gap-2 text-sm font-heading">
              <span>Описание</span>
              <Textarea
                className="min-h-[120px]"
                maxLength={500}
                onChange={(event) =>
                  setCreateGroupDescription(event.target.value)
                }
                placeholder="Короткое описание группы"
                value={createGroupDescription}
              />
            </label>
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
                {createGroupSubmitting ? "Создаём..." : "Создать группу"}
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
                  Проверка анкеты сотрудника
                </DialogTitle>
                <DialogDescription className="font-heading">
                  Руководитель может исправить поля, добавить фото и подтвердить
                  либо отклонить заявку.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-heading">
                  <span>Имя*</span>
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
                  <span>Фамилия*</span>
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
                  <span>Отчество</span>
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
                  <span>Дата рождения*</span>
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
                  <span>Пол*</span>
                  <AppSelectField
                    value={reviewForm.gender}
                    onValueChange={(value) =>
                      setReviewForm((current) => ({
                        ...current,
                        gender: value,
                      }))
                    }
                    options={[
                      { value: "male", label: "Мужской" },
                      { value: "female", label: "Женский" },
                    ]}
                    triggerClassName={reviewFieldClassName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>Телефон*</span>
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
                  <span>Смена*</span>
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
                    emptyLabel="Выберите смену"
                    options={[
                      ...scheduleTemplates.map((template) => ({
                        value: template.id,
                        label: `${template.name} · ${template.startsAtLocal}-${template.endsAtLocal} · ${template.location.name}`,
                      })),
                      {
                        value: CREATE_SHIFT_TEMPLATE_OPTION,
                        label: "+ Добавить смену",
                      },
                    ]}
                    triggerClassName={reviewFieldClassName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>Группа</span>
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
                    emptyLabel="Без группы"
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
                    Выдать менеджерский доступ
                  </span>
                </label>
              </div>
              <ImageAdjustField
                dialogDescription="Подгони фото сотрудника перед подтверждением анкеты."
                dialogTitle="Редактировать фото сотрудника"
                onChange={handleReviewAvatar}
                onError={setReviewError}
                previewAlt="Аватар сотрудника"
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
                          alt="Аватар сотрудника"
                          className="h-32 w-32 rounded-xl object-cover"
                          src={previewSrc}
                        />
                      ) : (
                        <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-secondary/50 text-xs text-muted-foreground">
                          Нет фото
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2 text-sm font-heading">
                      <span>Фото</span>
                      <div className={reviewInfoBoxClassName}>
                        {hasValue
                          ? "Фото выбрано. При необходимости можно подвинуть кадр и изменить масштаб."
                          : "Можно выбрать фото и сразу отрегулировать масштаб, X и Y."}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="rounded-xl font-heading"
                          onClick={chooseFile}
                          type="button"
                          variant="outline"
                        >
                          Заменить файл
                        </Button>
                        {hasValue ? (
                          <Button
                            className="rounded-xl font-heading"
                            onClick={openEditor}
                            type="button"
                            variant="outline"
                          >
                            Настроить
                          </Button>
                        ) : null}
                      </div>
                      <span className="mt-2">Email</span>
                      <Input
                        className={reviewFieldClassName}
                        disabled
                        value={selectedInvitation.email}
                      />
                      <span className="mt-2">Причина отклонения</span>
                      <Input
                        className={reviewFieldClassName}
                        onChange={(event) =>
                          setReviewForm((current) => ({
                            ...current,
                            rejectedReason: event.target.value,
                          }))
                        }
                        placeholder="Заполните, если отклоняете заявку"
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
                  <X className="h-4 w-4" /> Отклонить
                </Button>
                <Button
                  className="rounded-xl font-heading"
                  disabled={reviewSubmitting}
                  onClick={() => void submitReview("APPROVE")}
                >
                  <Check className="h-4 w-4" />
                  {reviewSubmitting ? "Сохраняем..." : "Подтвердить"}
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
              Создать шаблон смены
            </DialogTitle>
            <DialogDescription className="font-heading">
              Новый шаблон появится в списке и будет автоматически выбран для
              этого сотрудника.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-heading font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]/75">
                Название шаблона
              </label>
              <Input
                className="h-12 rounded-2xl border-[color:var(--accent)]/15 bg-[color:var(--soft-accent)]/35 px-4 font-heading text-lg placeholder:font-heading placeholder:text-muted-foreground/65 focus-visible:ring-[color:var(--accent)]/20"
                onChange={(event) =>
                  setTemplateDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Например: Утренняя смена"
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
                  Рабочие дни
                </p>
                <p className="text-xs text-muted-foreground">
                  Выберите дни недели, по которым проходит смена
                </p>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(
                  (label, index) => {
                    const day = index + 1;
                    const active = templateDraft.weekDays.includes(day);

                    return (
                      <button
                        className={`h-10 rounded-xl border text-sm font-medium transition-colors ${
                          active
                            ? "border-[color:var(--accent)] bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]"
                            : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                        }`}
                        key={label}
                        onClick={() => toggleTemplateWeekDay(day)}
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  },
                )}
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
                {createTemplateSubmitting ? "Создаём..." : "Создать шаблон"}
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
                  <img
                    alt={selectedEmployee.name}
                    className="h-16 w-16 shrink-0 rounded-full object-cover shadow-[0_12px_32px_rgba(40,75,255,0.16)]"
                    src={
                      selectedEmployeeDetails
                        ? getAvatarSrc(selectedEmployeeDetails)
                        : selectedEmployee.avatarUrl ||
                          getMockAvatarDataUrl(selectedEmployee.name)
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
                    {selectedEmployee.group || "Без группы"}
                  </span>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-heading ${statusStyles[selectedEmployee.status]}`}
                  >
                    {statusLabels[selectedEmployee.status]}
                  </span>
                </div>
              </div>
              <div className="space-y-5 p-6">
                {detailsLoading ? (
                  <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-6 text-center text-sm font-heading text-muted-foreground">
                    Загружаю карточку сотрудника...
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
                    Общая информация
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
                    Персональная
                  </button>
                </div>
                {selectedEmployeeTab === "general" ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          Телефон
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
                          Офис / локация
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {selectedEmployeeDetails?.primaryLocation?.name ||
                            selectedEmployee.location ||
                            "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          Сотрудник с
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
                          Группа
                        </p>
                        <p className="mt-1 text-sm font-heading font-semibold text-[color:var(--foreground)]">
                          {selectedEmployee.group || "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-center">
                        <p className="text-xs font-heading text-[color:var(--muted-foreground)]">
                          Отдел
                        </p>
                        <p className="mt-1 text-sm font-heading font-semibold text-[color:var(--foreground)]">
                          {selectedEmployeeDetails?.department?.name || "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-center">
                        <p className="text-xs font-heading text-[color:var(--muted-foreground)]">
                          Задачи
                        </p>
                        <p className="mt-1 text-sm font-heading font-semibold text-[color:var(--foreground)]">
                          {selectedEmployee.activeTasks}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-center">
                        <p className="text-xs font-heading text-[color:var(--muted-foreground)]">
                          Компания
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
                            alt="Биометрический профиль"
                            className="h-40 w-full rounded-xl object-cover"
                            src={biometricPreviewUrl}
                          />
                        ) : (
                          <div className="flex h-40 items-center justify-center rounded-xl bg-secondary/50 text-center text-xs font-heading text-muted-foreground">
                            Биометрический снимок не найден
                          </div>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            Биометрия
                          </p>
                          <p className="mt-1 font-medium text-[color:var(--foreground)]">
                            {biometricStatusLabel}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            Провайдер
                          </p>
                          <p className="mt-1 font-medium text-[color:var(--foreground)]">
                            {selectedEmployeeBiometric?.profile?.provider ||
                              "—"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            Дата рождения
                          </p>
                          <p className="mt-1 font-medium text-[color:var(--foreground)]">
                            {formatHireDate(selectedEmployeeDetails?.birthDate)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            Пол
                          </p>
                          <p className="mt-1 font-medium text-[color:var(--foreground)]">
                            {selectedEmployeeDetails?.gender === "female"
                              ? "Женский"
                              : selectedEmployeeDetails?.gender === "male"
                                ? "Мужской"
                                : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          Последняя верификация
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {selectedEmployeeBiometric?.profile?.lastVerifiedAt
                            ? new Date(
                                selectedEmployeeBiometric.profile
                                  .lastVerifiedAt,
                              ).toLocaleString("ru-RU")
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          Подключено с
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {selectedEmployeeBiometric?.profile?.enrolledAt
                            ? new Date(
                                selectedEmployeeBiometric.profile.enrolledAt,
                              ).toLocaleString("ru-RU")
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          Табельный номер
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {selectedEmployee.employeeNumber}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          Версия согласия
                        </p>
                        <p className="mt-1 font-medium text-[color:var(--foreground)]">
                          {selectedEmployeeBiometric?.profile?.consentVersion ||
                            "—"}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-[color:var(--panel-muted)] p-4 text-sm font-heading">
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        Паспортные данные
                      </p>
                      <p className="mt-2 leading-6 text-[color:var(--foreground)]">
                        В backend сейчас нет отдельных полей с паспортными
                        реквизитами для отображения в карточке. Когда эти данные
                        появятся в API, этот блок можно сразу заполнить без
                        смены интерфейса.
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
                    <ArrowRightLeft className="h-4 w-4" /> Переместить в группу
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
                    <ListTodo className="h-4 w-4" /> Назначить задачу
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
              Переместить в группу
            </DialogTitle>
            <DialogDescription className="font-heading">
              Выберите группу для сотрудника. Можно оставить без группы.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-heading">
              <span>Группа</span>
              <Select
                onValueChange={setMoveTargetGroupId}
                value={moveTargetGroupId}
              >
                <SelectTrigger className="h-11 rounded-xl border-border bg-secondary/30 text-sm font-heading">
                  <SelectValue placeholder="Выберите группу" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Без группы</SelectItem>
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
                Отмена
              </Button>
              <Button
                className="rounded-xl font-heading"
                disabled={moveSubmitting}
                onClick={() => void handleMoveEmployee()}
              >
                {moveSubmitting ? "Сохраняем..." : "Сохранить"}
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
                ? "Задача группе"
                : "Назначить задачу"}
            </DialogTitle>
            <DialogDescription className="font-heading">
              {taskDialog
                ? `Получатель: ${taskDialog.targetLabel}`
                : "Заполните параметры задачи."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-heading">
              <span>Название</span>
              <Input
                onChange={(event) =>
                  setTaskDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Например, Подготовить отчёт"
                value={taskDraft.title}
              />
            </label>
            <label className="grid gap-2 text-sm font-heading">
              <span>Описание</span>
              <Textarea
                className="min-h-[110px]"
                onChange={(event) =>
                  setTaskDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Кратко опишите задачу"
                value={taskDraft.description}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-heading">
                <span>Приоритет</span>
                <AppSelectField
                  value={taskDraft.priority}
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
                  <span>Срок</span>
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
                      {formatWorkdayDateLabel(taskDayStatus.dayKey)}:{" "}
                      {taskDayStatus.isWorkday
                        ? "рабочий день"
                        : "выходной день"}
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
                  Сделать регулярной задачей
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
                  Требуется фото-подтверждение
                </span>
              </label>
            </div>
            {taskDraft.isRecurring ? (
              <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-dashed border-border p-4 bg-secondary/10">
                <label className="grid gap-2 text-sm font-heading">
                  <span>Периодичность</span>
                  <AppSelectField
                    value={taskDraft.frequency}
                    onValueChange={(value) =>
                      setTaskDraft((current) => ({
                        ...current,
                        frequency: value as "DAILY" | "WEEKLY" | "MONTHLY",
                      }))
                    }
                    options={[
                      { value: "DAILY", label: "Ежедневно" },
                      { value: "WEEKLY", label: "Еженедельно" },
                      { value: "MONTHLY", label: "Ежемесячно" },
                    ]}
                    triggerClassName="h-11 rounded-xl bg-secondary/30"
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>Начало</span>
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
                    <span>Дни недели</span>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                        const label =
                          day === 0
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
                  <span>Дата окончания (необязательно)</span>
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
                Отмена
              </Button>
              <Button
                className="rounded-xl font-heading"
                disabled={taskSubmitting || !taskDraft.title.trim()}
                onClick={() => void handleCreateTask()}
              >
                {taskSubmitting ? "Создаём..." : "Создать задачу"}
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
              Выходной день
            </DialogTitle>
            <DialogDescription className="font-heading">
              {taskDialog?.mode === "employee" && taskDayStatus
                ? `У сотрудника ${taskDialog.targetLabel} выходной день ${formatWorkdayDateLabel(taskDayStatus.dayKey)}. Вы хотите назначить задачу на этот день?`
                : "У сотрудника выходной день. Вы хотите назначить задачу на этот день?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="rounded-xl font-heading"
              onClick={() => setTaskDayOffConfirmOpen(false)}
              variant="outline"
            >
              Поменять день
            </Button>
            <Button
              className="rounded-xl font-heading"
              onClick={() => {
                setTaskDayOffConfirmOpen(false);
                void handleCreateTask(true);
              }}
            >
              Да
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
                  Изменить группу
                </DialogTitle>
                <DialogDescription className="font-heading">
                  Измените название, описание и состав группы «
                  {groupEditor.name}».
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <label className="grid gap-2 text-sm font-heading">
                  <span>Название группы</span>
                  <Input
                    maxLength={120}
                    onChange={(event) => setGroupEditorName(event.target.value)}
                    placeholder="Например, Администраторы"
                    value={groupEditorName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>Описание</span>
                  <Textarea
                    className="min-h-[96px]"
                    maxLength={500}
                    onChange={(event) =>
                      setGroupEditorDescription(event.target.value)
                    }
                    placeholder="Короткое описание группы"
                    value={groupEditorDescription}
                  />
                </label>
                <div className="text-xs font-heading text-muted-foreground">
                  Состав группы
                </div>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {employees.map((employee) => (
                    <label
                      className="flex items-center justify-between rounded-2xl border border-border bg-secondary/20 px-4 py-3"
                      key={employee.id}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          alt={employee.name}
                          className="h-10 w-10 rounded-full object-cover"
                          src={
                            employee.avatarUrl ||
                            getMockAvatarDataUrl(employee.name)
                          }
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
                    Удалить группу
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      className="rounded-xl font-heading"
                      onClick={() => setGroupEditorId(null)}
                      variant="outline"
                    >
                      Отмена
                    </Button>
                    <Button
                      className="rounded-xl font-heading"
                      disabled={groupSaving || groupDeleting}
                      onClick={() => void handleSaveGroup()}
                    >
                      {groupSaving ? "Сохраняем..." : "Сохранить"}
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
                  Удалить группу
                </DialogTitle>
                <DialogDescription className="font-heading">
                  Группа «{groupEditor.name}» будет удалена. Сотрудники
                  останутся в системе без группы, а привязка у задач к этой
                  группе будет снята.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm font-heading text-muted-foreground">
                В группе: {groupEditor.memberships.length} сотрудник(ов), задач:{" "}
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
                  Отмена
                </Button>
                <Button
                  className="rounded-xl font-heading"
                  disabled={groupDeleting}
                  onClick={() => void handleDeleteGroup()}
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  {groupDeleting ? "Удаляем..." : "Удалить группу"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
