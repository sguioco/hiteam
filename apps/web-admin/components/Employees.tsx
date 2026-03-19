"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  ListTodo,
  Mail,
  Search,
  Settings,
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
import { Input } from "@/components/ui/input";
import {
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
};

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });
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
    <td className="px-3 py-2.5 font-heading font-semibold text-foreground">
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
      <th className="px-3 py-2.5 text-left text-xs font-heading font-medium text-muted-foreground">
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

  const [employeeRecords, setEmployeeRecords] = useState<EmployeeApiRecord[]>([]);
  const [overview, setOverview] = useState<CollaborationOverviewResponse | null>(
    null,
  );

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
  const [reviewForm, setReviewForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    birthDate: "",
    gender: "male",
    phone: "",
    rejectedReason: "",
    avatarDataUrl: "",
    avatarPreview: "",
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
  const [canCheckWorkdays, setCanCheckWorkdays] = useState(false);
  const [taskDayOffConfirmOpen, setTaskDayOffConfirmOpen] = useState(false);

  const [groupEditorId, setGroupEditorId] = useState<string | null>(null);
  const [groupEditorMembers, setGroupEditorMembers] = useState<string[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);
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
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
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
      ]);

      setEmployeeRecords(employeesData);
      setOverview(overviewData);
      setPendingInvitations(invitationsData);
      setScheduleShifts(shiftsData);
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
      rejectedReason: invitation.rejectedReason ?? "",
      avatarDataUrl: "",
      avatarPreview: invitation.avatarUrl ?? "",
    });
  }

  async function handleReviewAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await fileToDataUrl(file);
    setReviewForm((current) => ({
      ...current,
      avatarDataUrl: dataUrl,
      avatarPreview: dataUrl,
    }));
  }

  async function submitReview(decision: "APPROVE" | "REJECT") {
    const session = getSession();
    if (!session || !selectedInvitation) return;

    setReviewSubmitting(true);
    setReviewError(null);

    try {
      await apiRequest(`/employees/invitations/${selectedInvitation.id}/review`, {
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
          rejectedReason:
            decision === "REJECT" ? reviewForm.rejectedReason : undefined,
          avatarDataUrl: reviewForm.avatarDataUrl || undefined,
        }),
      });
      setSelectedInvitation(null);
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
      await apiRequest<TaskItem[]>("/collaboration/tasks", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          title: taskDraft.title,
          description: taskDraft.description || undefined,
          priority: taskDraft.priority,
          dueAt: taskDraft.dueAt || undefined,
          assigneeEmployeeId:
            taskDialog.mode === "employee" ? taskDialog.targetId : undefined,
          groupId: taskDialog.mode === "group" ? taskDialog.targetId : undefined,
        }),
      });

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
    setGroupEditorId(groupId);
    setGroupEditorMembers(
      group.memberships.map((membership) => membership.employeeId),
    );
  }

  async function handleSaveGroupMembers() {
    if (!groupEditorId) return;

    setGroupSaving(true);
    setGroupError(null);

    try {
      await updateGroupMembers(groupEditorId, groupEditorMembers);
      setGroupEditorId(null);
      setPageMessage("Состав группы обновлён.");
      await loadDirectory();
    } catch (requestError) {
      setGroupError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось обновить состав группы.",
      );
    } finally {
      setGroupSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
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

          {pageMessage ? <div className="success-box mb-4">{pageMessage}</div> : null}
          {directoryError ? <div className="error-box mb-4">{directoryError}</div> : null}

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
                    <button
                      className="flex w-full items-center justify-between bg-secondary/30 p-3 transition-colors hover:bg-secondary/50"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="flex items-center gap-3">
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
                      </div>
                      <div
                        className="flex items-center gap-1.5"
                        onClick={(event) => event.stopPropagation()}
                      >
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
                          onClick={() => openTaskDialogForGroup(group.id, group.name)}
                          size="sm"
                          variant="ghost"
                        >
                          <ListTodo className="h-3 w-3" /> Задача группе
                        </Button>
                      </div>
                    </button>
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
              Введите email. Сотруднику придёт письмо с приглашением и ссылкой на
              регистрацию.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-heading">
              <span>Email</span>
              <Input
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="employee@company.ru"
                value={inviteEmail}
              />
            </label>
            {inviteError ? <div className="error-box">{inviteError}</div> : null}
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
                  <span>Имя</span>
                  <Input
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
                  <span>Фамилия</span>
                  <Input
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
                  <span>Дата рождения</span>
                  <Input
                    onChange={(event) =>
                      setReviewForm((current) => ({
                        ...current,
                        birthDate: event.target.value,
                      }))
                    }
                    type="date"
                    value={reviewForm.birthDate}
                  />
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>Пол</span>
                  <select
                    className="rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm font-heading"
                    onChange={(event) =>
                      setReviewForm((current) => ({
                        ...current,
                        gender: event.target.value,
                      }))
                    }
                    value={reviewForm.gender}
                  >
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-heading">
                  <span>Телефон</span>
                  <Input
                    onChange={(event) =>
                      setReviewForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    value={reviewForm.phone}
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-border bg-secondary/20 p-3">
                  {reviewForm.avatarPreview ? (
                    <img
                      alt="Аватар сотрудника"
                      className="h-32 w-full rounded-xl object-cover"
                      src={reviewForm.avatarPreview}
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-xl bg-secondary/50 text-xs text-muted-foreground">
                      Нет фото
                    </div>
                  )}
                </div>
                <div className="grid gap-2 text-sm font-heading">
                  <span>Email</span>
                  <Input disabled value={selectedInvitation.email} />
                  <span className="mt-2">Фото</span>
                  <Input
                    accept="image/*"
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      void handleReviewAvatar(event)
                    }
                    type="file"
                  />
                  <span className="mt-2">Причина отклонения</span>
                  <Input
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
              {reviewError ? <div className="error-box">{reviewError}</div> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  className="rounded-xl font-heading"
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
                            {selectedEmployeeBiometric?.profile?.provider || "—"}
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
                                selectedEmployeeBiometric.profile.lastVerifiedAt,
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
                          {selectedEmployeeBiometric?.profile?.consentVersion || "—"}
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
                      window.setTimeout(() => openMoveDialog(selectedEmployee), 0);
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
              {taskDialog?.mode === "group" ? "Задача группе" : "Назначить задачу"}
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
                <div className="relative">
                  <select
                    className="h-11 w-full appearance-none rounded-xl border border-border bg-secondary/30 px-3 pr-12 py-2 text-sm font-heading"
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        priority: event.target.value as TaskItem["priority"],
                      }))
                    }
                    value={taskDraft.priority}
                  >
                    {taskPriorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </label>
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
                {taskDialog?.mode === "employee" && canCheckWorkdays && taskDayStatus ? (
                  <span
                    className={`rounded-2xl px-3 py-2 text-xs font-heading ${
                      taskDayStatus.isWorkday
                        ? "bg-[color:var(--soft-success)] text-[color:var(--success)]"
                        : "bg-[color:var(--soft-warning)] text-[color:var(--warning)]"
                    }`}
                  >
                    {formatWorkdayDateLabel(taskDayStatus.dayKey)}:{" "}
                    {taskDayStatus.isWorkday ? "рабочий день" : "выходной день"}
                  </span>
                ) : null}
              </label>
            </div>
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
        onOpenChange={(open) => !open && setGroupEditorId(null)}
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
                  Управление составом группы «{groupEditor.name}».
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
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
                          src={employee.avatarUrl || getMockAvatarDataUrl(employee.name)}
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
                {groupError ? <div className="error-box">{groupError}</div> : null}
                <div className="flex justify-end gap-2">
                  <Button
                    className="rounded-xl font-heading"
                    onClick={() => setGroupEditorId(null)}
                    variant="outline"
                  >
                    Отмена
                  </Button>
                  <Button
                    className="rounded-xl font-heading"
                    disabled={groupSaving}
                    onClick={() => void handleSaveGroupMembers()}
                  >
                    {groupSaving ? "Сохраняем..." : "Сохранить состав"}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
