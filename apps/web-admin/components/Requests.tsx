"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ApprovalInboxItem,
  RequestStatus,
  RequestType,
} from "@smart/types";
import {
  ArrowRightLeft,
  Banknote,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  LoaderCircle,
  MessageSquare,
  Package,
  Paperclip,
  Search,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectOptionText,
  SelectOptionTitle,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api";
import { isDemoAccessToken } from "@/lib/demo-mode";
import { getSession } from "@/lib/auth";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import { useI18n } from "@/lib/i18n";
import { createMockApprovalInboxItems } from "@/lib/mock-admin-data";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | "PENDING" | "APPROVED" | "REJECTED";
type FilterRequestType = "all" | RequestType;
type VisibleFilterStatus = Exclude<FilterStatus, "all">;

type RequestCommentResponse = {
  id: string;
  body: string;
  createdAt: string;
  authorEmployee: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

const STATUS_FILTERS: VisibleFilterStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
];

const REQUEST_TYPE_FILTERS: FilterRequestType[] = [
  "all",
  "LEAVE",
  "VACATION_CHANGE",
  "SICK_LEAVE",
  "UNPAID_LEAVE",
  "SHIFT_CHANGE",
  "ADVANCE",
  "SUPPLY",
  "GENERAL",
];

const requestsCopy = {
  ru: {
    sessionMissing: "Сессия не найдена. Войдите заново",
    loadFailed: "Не удалось загрузить заявки",
    actionFailed: "Не удалось выполнить действие по заявке",
    commentFailed: "Не удалось добавить комментарий",
    demoData: "Показаны демонстрационные данные",
    title: "Входящие согласования",
    approvalType: "Тип согласования",
    search: "Поиск по сотруднику, номеру или теме",
    loading: "Загружаем заявки...",
    noInbox: "Во входящих пока нет заявок",
    noFiltered: "Нет заявок под выбранные фильтры",
    approveSuccess: "Решение отправлено. Заявка обновлена",
    rejectSuccess: "Заявка отклонена.",
    commentSuccess: "Комментарий добавлен",
    allTypes: "Все типы",
    requestFlowStatus: "Передано дальше",
    requestStatusLabel: "Запрос",
    stepLabel: "Шаг",
    ofLabel: "из",
    employeeNumber: "Табельный номер",
    period: "Период",
    days: "Дней",
    comments: "Комментарии",
    attachments: "Вложения",
    approvers: "согласующих",
    stepShort: "Шаг",
    commentMissing: "Комментарий к заявке не указан.",
    details: "Открыть детали",
    approve: "Согласовать",
    reject: "Отклонить",
    reason: "Причина",
    noReason: "Сотрудник не добавил описание.",
    progress: "Прогресс",
    stepsWord: "шагов",
    approvalChain: "Цепочка согласования",
    skipped: "Пропущено",
    processedAt: "Обработано",
    waitingAction: "Ожидает действия",
    messagesCount: "сообщений",
    noComments: "Комментариев пока нет.",
    newComment: "Новый комментарий",
    newCommentPlaceholder:
      "Добавьте контекст для сотрудника или следующего согласующего",
    sendComment: "Отправить комментарий",
    decisionPlaceholder: "Комментарий к решению (необязательно)",
    statuses: {
      PENDING: "Ожидает",
      APPROVED: "Согласовано",
      REJECTED: "Отклонено",
    },
    requestTypes: {
      LEAVE: "Отпуск",
      VACATION_CHANGE: "Перенос отпуска",
      SICK_LEAVE: "Больничный",
      UNPAID_LEAVE: "За свой счет",
      SHIFT_CHANGE: "Смена графика",
      ADVANCE: "Аванс",
      SUPPLY: "Снабжение",
      GENERAL: "Общий запрос",
    },
  },
  en: {
    sessionMissing: "Session not found. Please sign in again.",
    loadFailed: "Unable to load requests.",
    actionFailed: "Unable to complete the request action.",
    commentFailed: "Unable to add the comment.",
    demoData: "Showing demo data.",
    title: "Incoming approvals",
    approvalType: "Approval type",
    search: "Search by employee, number, or topic",
    loading: "Loading requests...",
    noInbox: "There are no requests in the inbox yet.",
    noFiltered: "No requests match the selected filters.",
    approveSuccess: "Decision sent. Request updated.",
    rejectSuccess: "Request rejected.",
    commentSuccess: "Comment added.",
    allTypes: "All types",
    requestFlowStatus: "Forwarded",
    requestStatusLabel: "Request",
    stepLabel: "Step",
    ofLabel: "of",
    employeeNumber: "Employee number",
    period: "Period",
    days: "Days",
    comments: "Comments",
    attachments: "Attachments",
    approvers: "approvers",
    stepShort: "Step",
    commentMissing: "No comment was provided for this request.",
    details: "Open details",
    approve: "Approve",
    reject: "Reject",
    reason: "Reason",
    noReason: "The employee did not provide a description.",
    progress: "Progress",
    stepsWord: "steps",
    approvalChain: "Approval chain",
    skipped: "Skipped",
    processedAt: "Processed",
    waitingAction: "Waiting for action",
    messagesCount: "messages",
    noComments: "No comments yet.",
    newComment: "New comment",
    newCommentPlaceholder:
      "Add context for the employee or the next approver",
    sendComment: "Send comment",
    decisionPlaceholder: "Decision comment (optional)",
    statuses: {
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Rejected",
    },
    requestTypes: {
      LEAVE: "Leave",
      VACATION_CHANGE: "Vacation change",
      SICK_LEAVE: "Sick leave",
      UNPAID_LEAVE: "Unpaid leave",
      SHIFT_CHANGE: "Shift change",
      ADVANCE: "Advance",
      SUPPLY: "Supply",
      GENERAL: "General request",
    },
  },
} as const;

const statusConfig = {
  PENDING: {
    badgeClass:
      "border-[color:rgba(190,122,32,0.14)] bg-[color:var(--soft-warning)] text-[color:var(--warning)]",
    icon: Clock3,
  },
  APPROVED: {
    badgeClass:
      "border-[color:rgba(21,115,71,0.14)] bg-[color:var(--soft-success)] text-[color:var(--success)]",
    icon: Check,
  },
  REJECTED: {
    badgeClass:
      "border-[color:rgba(193,68,68,0.14)] bg-[color:var(--soft-danger)] text-[color:var(--danger)]",
    icon: X,
  },
} as const;

const requestTypeConfig: Record<
  RequestType,
  {
    icon: typeof CalendarDays;
    iconClass: string;
    iconWrapClass: string;
  }
> = {
  LEAVE: {
    icon: CalendarDays,
    iconClass: "text-[color:var(--accent)]",
    iconWrapClass: "bg-[color:var(--soft-accent)]",
  },
  VACATION_CHANGE: {
    icon: CalendarDays,
    iconClass: "text-[color:var(--accent-strong)]",
    iconWrapClass: "bg-[color:var(--soft-accent)]",
  },
  SICK_LEAVE: {
    icon: Stethoscope,
    iconClass: "text-[color:var(--danger)]",
    iconWrapClass: "bg-[color:var(--soft-danger)]",
  },
  UNPAID_LEAVE: {
    icon: CalendarDays,
    iconClass: "text-[color:var(--warning)]",
    iconWrapClass: "bg-[color:var(--soft-warning)]",
  },
  SHIFT_CHANGE: {
    icon: ArrowRightLeft,
    iconClass: "text-[color:var(--accent)]",
    iconWrapClass: "bg-[color:var(--soft-accent)]",
  },
  ADVANCE: {
    icon: Banknote,
    iconClass: "text-[color:var(--success)]",
    iconWrapClass: "bg-[color:var(--soft-success)]",
  },
  SUPPLY: {
    icon: Package,
    iconClass: "text-[color:var(--warning)]",
    iconWrapClass: "bg-[color:var(--soft-warning)]",
  },
  GENERAL: {
    icon: FileText,
    iconClass: "text-[color:var(--muted-foreground)]",
    iconWrapClass: "bg-[color:var(--panel-muted)]",
  },
};

const REQUESTS_CACHE_TTL_MS = 60_000;

function buildRequestsCacheKey(session: ReturnType<typeof getSession>) {
  return session ? `requests-inbox:${session.user.id}` : null;
}

function formatDate(value: string, locale = "ru-RU") {
  return new Date(value).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value: string, locale = "ru-RU") {
  return new Date(value).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPeriod(startsOn: string, endsOn: string, locale = "ru-RU") {
  return `${formatDate(startsOn, locale)} - ${formatDate(endsOn, locale)}`;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function getRequestStatusLabel(
  item: ApprovalInboxItem,
  labels: Record<VisibleFilterStatus, string>,
  forwardedLabel: string,
) {
  if (item.status === "APPROVED" && item.request.status === "PENDING") {
    return {
      label: forwardedLabel,
      badgeClass:
        "border-[color:rgba(40,75,255,0.16)] bg-[color:var(--soft-accent)] text-[color:var(--accent-strong)]",
      icon: ArrowRightLeft,
    };
  }

  return {
    ...statusConfig[item.status as keyof typeof statusConfig],
    label: labels[item.status as keyof typeof labels],
  };
}

function applyDecisionToItem(
  item: ApprovalInboxItem,
  decision: "APPROVED" | "REJECTED",
  comment?: string,
) {
  const lastSequence = Math.max(
    ...item.request.approvalSteps.map((step) => step.sequence),
  );
  const nextRequestStatus: RequestStatus =
    decision === "REJECTED"
      ? "REJECTED"
      : item.sequence >= lastSequence
        ? "APPROVED"
        : "PENDING";

  return {
    ...item,
    status: decision,
    request: {
      ...item.request,
      status: nextRequestStatus,
      approvalSteps: item.request.approvalSteps.map((step) =>
        step.sequence === item.sequence
          ? {
              ...step,
              status: decision,
              comment: comment ?? step.comment,
              actedAt: new Date().toISOString(),
            }
          : step,
      ),
    },
  };
}

export default function Requests() {
  const { locale } = useI18n();
  const session = getSession();
  const requestsCacheKey = buildRequestsCacheKey(session);
  const ui = requestsCopy[locale];
  const localeTag = locale === "ru" ? "ru-RU" : "en-US";
  const [items, setItems] = useState<ApprovalInboxItem[]>([]);
  const [isMockMode, setIsMockMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [typeFilter, setTypeFilter] = useState<FilterRequestType>("all");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [decisionDrafts, setDecisionDrafts] = useState<Record<string, string>>(
    {},
  );
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  const [decisionLoadingKey, setDecisionLoadingKey] = useState<string | null>(
    null,
  );
  const [commentLoadingId, setCommentLoadingId] = useState<string | null>(null);
  const requestTypeLabels = ui.requestTypes;
  const requestStatusLabels = ui.statuses;
  const requestTypeSelectOptions = REQUEST_TYPE_FILTERS.map((filter) =>
    filter === "all"
      ? {
          value: filter,
          label: ui.allTypes,
        }
      : {
          value: filter,
          label: requestTypeLabels[filter],
        },
  );

  async function loadInbox() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const isDemoSession = isDemoAccessToken(session?.accessToken);

    try {
      if (!session) {
        setItems(createMockApprovalInboxItems(new Date(), locale));
        setIsMockMode(true);
        setMessage(ui.demoData);
        return;
      }

      const data = await apiRequest<ApprovalInboxItem[]>("/requests/inbox", {
        token: session.accessToken,
      });
      setItems(data);
      setIsMockMode(false);
    } catch (loadError) {
      if (isDemoSession) {
        setItems(createMockApprovalInboxItems(new Date(), locale));
        setIsMockMode(true);
        setError(
          loadError instanceof Error
            ? `${loadError.message} ${ui.demoData}`
            : `${ui.loadFailed} ${ui.demoData}`,
        );
      } else {
        setItems([]);
        setIsMockMode(false);
        setError(loadError instanceof Error ? loadError.message : ui.loadFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const cached = requestsCacheKey
      ? readClientCache<ApprovalInboxItem[]>(
          requestsCacheKey,
          REQUESTS_CACHE_TTL_MS,
        )
      : null;

    if (cached) {
      setItems(cached.value);
      setIsMockMode(false);
      setLoading(false);
      if (!cached.isStale) {
        return;
      }
    }

    void loadInbox();
  }, [locale, requestsCacheKey]);

  useEffect(() => {
    if (!requestsCacheKey || isMockMode || loading) {
      return;
    }

    writeClientCache(requestsCacheKey, items);
  }, [isMockMode, items, loading, requestsCacheKey]);

  const counts = useMemo(
    () => ({
      all: items.length,
      PENDING: items.filter((item) => item.status === "PENDING").length,
      APPROVED: items.filter((item) => item.status === "APPROVED").length,
      REJECTED: items.filter((item) => item.status === "REJECTED").length,
    }),
    [items],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const statusOrder = { PENDING: 0, APPROVED: 1, REJECTED: 2, SKIPPED: 3 };

    return items
      .filter((item) => {
        const employeeName =
          `${item.request.employee.firstName} ${item.request.employee.lastName}`.toLowerCase();
        const typeLabel = requestTypeLabels[item.request.requestType].toLowerCase();
        const matchesSearch =
          !query ||
          employeeName.includes(query) ||
          item.request.employee.employeeNumber.toLowerCase().includes(query) ||
          item.request.title.toLowerCase().includes(query) ||
          item.request.reason?.toLowerCase().includes(query) ||
          typeLabel.includes(query);
        const matchesStatus =
          statusFilter === "all" || item.status === statusFilter;
        const matchesType =
          typeFilter === "all" || item.request.requestType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((left, right) => {
        const statusDiff = statusOrder[left.status] - statusOrder[right.status];
        if (statusDiff !== 0) return statusDiff;

        return (
          new Date(left.request.startsOn).getTime() -
          new Date(right.request.startsOn).getTime()
        );
      });
  }, [items, requestTypeLabels, search, statusFilter, typeFilter]);

  const selectedItem =
    items.find((item) => item.request.id === selectedRequestId) ?? null;

  async function handleDecision(
    item: ApprovalInboxItem,
    decision: "APPROVED" | "REJECTED",
  ) {
    const session = getSession();
    const loadingKey = `${decision}:${item.request.id}`;
    const decisionComment = decisionDrafts[item.request.id]?.trim();

    setDecisionLoadingKey(loadingKey);
    setError(null);
    setMessage(null);

    try {
      if (!session || isMockMode) {
        setItems((current) =>
          current.map((currentItem) =>
            currentItem.request.id === item.request.id
              ? applyDecisionToItem(currentItem, decision, decisionComment)
              : currentItem,
          ),
        );
        setDecisionDrafts((current) => ({
          ...current,
          [item.request.id]: "",
        }));
        setMessage(
          decision === "APPROVED" ? ui.approveSuccess : ui.rejectSuccess,
        );
        return;
      }

      await apiRequest(
        `/requests/${item.request.id}/${decision === "APPROVED" ? "approve" : "reject"}`,
        {
          method: "POST",
          token: session.accessToken,
          body: JSON.stringify(
            decisionComment ? { comment: decisionComment } : {},
          ),
        },
      );

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.request.id === item.request.id
            ? applyDecisionToItem(currentItem, decision, decisionComment)
            : currentItem,
        ),
      );
      setDecisionDrafts((current) => ({
        ...current,
        [item.request.id]: "",
      }));
      setMessage(
        decision === "APPROVED" ? ui.approveSuccess : ui.rejectSuccess,
      );
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : ui.actionFailed,
      );
    } finally {
      setDecisionLoadingKey(null);
    }
  }

  async function handleAddComment(item: ApprovalInboxItem) {
    const session = getSession();
    const body = commentDrafts[item.request.id]?.trim();
    if (!body) return;

    setCommentLoadingId(item.request.id);
    setError(null);
    setMessage(null);

    try {
      if (!session || isMockMode) {
        const comment: RequestCommentResponse = {
          id: `mock-comment-${Date.now()}`,
          body,
          createdAt: new Date().toISOString(),
          authorEmployee:
            item.request.approvalSteps.find((step) => step.sequence === item.sequence)
              ?.approverEmployee ?? {
              id: "mock-approver",
              firstName: locale === "ru" ? "Тестовый" : "Demo",
              lastName: locale === "ru" ? "Менеджер" : "Manager",
            },
        };

        setItems((current) =>
          current.map((currentItem) =>
            currentItem.request.id === item.request.id
              ? {
                  ...currentItem,
                  request: {
                    ...currentItem.request,
                    comments: [...currentItem.request.comments, comment],
                  },
                }
              : currentItem,
          ),
        );
        setCommentDrafts((current) => ({ ...current, [item.request.id]: "" }));
        setMessage(ui.commentSuccess);
        return;
      }

      const comment = await apiRequest<RequestCommentResponse>(
        `/requests/${item.request.id}/comments`,
        {
          method: "POST",
          token: session.accessToken,
          body: JSON.stringify({ body }),
        },
      );

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.request.id === item.request.id
            ? {
                ...currentItem,
                request: {
                  ...currentItem.request,
                  comments: [...currentItem.request.comments, comment],
                },
              }
            : currentItem,
        ),
      );
      setCommentDrafts((current) => ({ ...current, [item.request.id]: "" }));
      setMessage(ui.commentSuccess);
    } catch (commentError) {
      setError(
        commentError instanceof Error
          ? commentError.message
          : ui.commentFailed,
      );
    } finally {
      setCommentLoadingId(null);
    }
  }

  return (
    <main className="page-shell section-stack overflow-y-auto">
      <section className="dashboard-card space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-semibold text-[color:var(--foreground)]">
              {ui.title}
            </h2>
            <span className="text-3xl font-semibold text-[color:var(--warning)]">
              {counts.PENDING}
            </span>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-[color:rgba(21,115,71,0.14)] bg-[color:var(--soft-success)] px-4 py-3 text-sm text-[color:var(--success)]">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-[color:rgba(193,68,68,0.14)] bg-[color:var(--soft-danger)] px-4 py-3 text-sm text-[color:var(--danger)]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-fit flex-wrap overflow-hidden rounded-xl border border-border">
            {STATUS_FILTERS.map((filter) => (
              <button
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-heading font-medium transition-colors",
                  statusFilter === filter
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                key={filter}
                onClick={() =>
                  setStatusFilter((current) =>
                    current === filter ? "all" : filter,
                  )
                }
                type="button"
              >
                {requestStatusLabels[filter]}
                <span className={statusFilter === filter ? "text-white/80" : "opacity-70"}>
                  {counts[filter]}
                </span>
              </button>
            ))}
          </div>

          <div className="w-full sm:w-[280px]">
            <Select
              onValueChange={(value) =>
                setTypeFilter(value as FilterRequestType)
              }
              value={typeFilter}
            >
              <SelectTrigger>
                {(() => {
                  const selectedType =
                    requestTypeSelectOptions.find(
                      (option) => option.value === typeFilter,
                    ) ?? requestTypeSelectOptions[0];

                  return (
                    <SelectOptionText>
                      <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
                        {ui.approvalType}
                      </span>
                      <SelectOptionTitle>
                        {selectedType.label}
                      </SelectOptionTitle>
                    </SelectOptionText>
                  );
                })()}
              </SelectTrigger>
              <SelectContent>
                {requestTypeSelectOptions.map((option) => {
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <SelectOptionText>
                        <SelectOptionTitle>{option.label}</SelectOptionTitle>
                      </SelectOptionText>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
          <Input
            className="pl-11"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={ui.search}
            value={search}
          />
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-[color:var(--border)] bg-[color:var(--panel-muted)] text-sm text-[color:var(--muted-foreground)]">
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              {ui.loading}
            </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const typeMeta = requestTypeConfig[item.request.requestType];
              const displayStatus = getRequestStatusLabel(
                item,
                requestStatusLabels,
                ui.requestFlowStatus,
              );
              const TypeIcon = typeMeta.icon;
              const StatusIcon = displayStatus.icon;
              const quickApproveBusy =
                decisionLoadingKey === `APPROVED:${item.request.id}`;
              const quickRejectBusy =
                decisionLoadingKey === `REJECTED:${item.request.id}`;

              return (
                <article
                  className="request-card animate-fade-in flex-col items-stretch gap-4 md:flex-row md:items-center"
                  key={item.id}
                  onClick={() => setSelectedRequestId(item.request.id)}
                  role="button"
                  style={{ animationDelay: `${index * 45}ms` }}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedRequestId(item.request.id);
                    }
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                        typeMeta.iconWrapClass,
                      )}
                    >
                      <TypeIcon className={cn("size-5", typeMeta.iconClass)} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="text-left text-lg font-semibold text-[color:var(--foreground)] transition hover:text-[color:var(--accent)]"
                          onClick={() => setSelectedRequestId(item.request.id)}
                          type="button"
                        >
                          {item.request.title}
                        </button>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                            displayStatus.badgeClass,
                          )}
                        >
                          <StatusIcon className="size-3.5" />
                          {displayStatus.label}
                        </span>
                        <span className="rounded-full bg-[color:var(--panel-muted)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--muted-foreground)]">
                          {requestTypeLabels[item.request.requestType]}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[color:var(--muted-foreground)]">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="size-4" />
                          {item.request.employee.firstName}{" "}
                          {item.request.employee.lastName}
                        </span>
                        <span>#{item.request.employee.employeeNumber}</span>
                        <span>
                          {ui.stepShort} {item.sequence}
                        </span>
                        <span>
                          {item.request.approvalSteps.length} {ui.approvers}
                        </span>
                      </div>

                      <p className="line-clamp-2 text-sm text-[color:var(--foreground)]/80">
                        {item.request.reason?.trim() || ui.commentMissing}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
                        <span className="rounded-full bg-[color:var(--panel-muted)] px-2.5 py-1">
                          {ui.period}:{" "}
                          {formatPeriod(
                            item.request.startsOn,
                            item.request.endsOn,
                            localeTag,
                          )}
                        </span>
                        <span className="rounded-full bg-[color:var(--panel-muted)] px-2.5 py-1">
                          {ui.days}: {item.request.requestedDays}
                        </span>
                        <span className="rounded-full bg-[color:var(--panel-muted)] px-2.5 py-1">
                          {ui.comments}: {item.request.comments.length}
                        </span>
                        <span className="rounded-full bg-[color:var(--panel-muted)] px-2.5 py-1">
                          {ui.attachments}: {item.request.attachments.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {item.status === "PENDING" ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                      <Button
                        className="rounded-xl"
                        disabled={Boolean(decisionLoadingKey)}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDecision(item, "REJECTED");
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {quickRejectBusy ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <X className="size-4" />
                        )}
                        {ui.reject}
                      </Button>
                      <Button
                        className="rounded-xl"
                        disabled={Boolean(decisionLoadingKey)}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDecision(item, "APPROVED");
                        }}
                        size="sm"
                        type="button"
                      >
                        {quickApproveBusy ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        {ui.approve}
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--foreground)]"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedRequestId(item.request.id);
                      }}
                      type="button"
                    >
                      {ui.details}
                    </button>
                  )}
                </article>
              );
            })
          ) : (
            <div className="px-1 py-8 text-center text-sm text-[color:var(--muted-foreground)]">
              {items.length === 0
                ? ui.noInbox
                : ui.noFiltered}
            </div>
          )}
        </div>
      </section>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequestId(null);
          }
        }}
        open={Boolean(selectedItem)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-[760px]">
          {selectedItem ? (
            <>
              <div className="border-b border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(40,75,255,0.12)_0%,rgba(255,255,255,0.98)_78%)] px-6 pb-5 pt-6">
                <DialogHeader className="gap-3">
                  <div className="flex flex-wrap items-start gap-4">
                    <div
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-[20px]",
                        requestTypeConfig[selectedItem.request.requestType]
                          .iconWrapClass,
                      )}
                    >
                      {(() => {
                        const Icon =
                          requestTypeConfig[selectedItem.request.requestType]
                            .icon;
                        return (
                          <Icon
                            className={cn(
                              "size-6",
                              requestTypeConfig[
                                selectedItem.request.requestType
                              ].iconClass,
                            )}
                          />
                        );
                      })()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <DialogTitle className="text-[28px]">
                        {selectedItem.request.title}
                      </DialogTitle>
                      <DialogDescription className="mt-2">
                        {requestTypeLabels[selectedItem.request.requestType]}
                        {" · "}
                        {formatPeriod(
                          selectedItem.request.startsOn,
                          selectedItem.request.endsOn,
                          localeTag,
                        )}
                      </DialogDescription>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
                            getRequestStatusLabel(
                              selectedItem,
                              requestStatusLabels,
                              ui.requestFlowStatus,
                            ).badgeClass,
                          )}
                        >
                          {(() => {
                            const Icon =
                              getRequestStatusLabel(
                                selectedItem,
                                requestStatusLabels,
                                ui.requestFlowStatus,
                              ).icon;
                            return <Icon className="size-3.5" />;
                          })()}
                          {
                            getRequestStatusLabel(
                              selectedItem,
                              requestStatusLabels,
                              ui.requestFlowStatus,
                            ).label
                          }
                        </span>
                        <span className="rounded-full bg-[rgba(255,255,255,0.82)] px-3 py-1 text-xs text-[color:var(--muted-foreground)] shadow-[inset_0_0_0_1px_var(--border)]">
                          {ui.requestStatusLabel}:{" "}
                          {requestStatusLabels[
                            selectedItem.request.status as keyof typeof requestStatusLabels
                          ] ?? selectedItem.request.status}
                        </span>
                        <span className="rounded-full bg-[rgba(255,255,255,0.82)] px-3 py-1 text-xs text-[color:var(--muted-foreground)] shadow-[inset_0_0_0_1px_var(--border)]">
                          {ui.stepLabel} {selectedItem.sequence} {ui.ofLabel}{" "}
                          {selectedItem.request.approvalSteps.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="space-y-6 px-6 py-6">
                <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="rounded-[24px] bg-[color:var(--panel-muted)] p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-[color:var(--foreground)] shadow-[inset_0_0_0_1px_var(--border)]">
                        {getInitials(
                          selectedItem.request.employee.firstName,
                          selectedItem.request.employee.lastName,
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">
                          {selectedItem.request.employee.firstName}{" "}
                          {selectedItem.request.employee.lastName}
                        </p>
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {ui.employeeNumber} #
                          {selectedItem.request.employee.employeeNumber}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--muted-foreground)]">
                          {ui.period}
                        </p>
                        <p className="mt-1 text-sm font-medium text-[color:var(--foreground)]">
                          {formatPeriod(
                            selectedItem.request.startsOn,
                            selectedItem.request.endsOn,
                            localeTag,
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--muted-foreground)]">
                          {ui.days}
                        </p>
                        <p className="mt-1 text-sm font-medium text-[color:var(--foreground)]">
                          {selectedItem.request.requestedDays}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--muted-foreground)]">
                        {ui.reason}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                        {selectedItem.request.reason?.trim() || ui.noReason}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-[24px] bg-[color:var(--panel-muted)] p-5">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--muted-foreground)]">
                        {ui.attachments}
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">
                        {selectedItem.request.attachments.length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--muted-foreground)]">
                        {ui.comments}
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">
                        {selectedItem.request.comments.length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--muted-foreground)]">
                        {ui.progress}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[color:var(--foreground)]">
                        {
                          selectedItem.request.approvalSteps.filter(
                            (step) => step.status === "APPROVED",
                          ).length
                        }
                        /{selectedItem.request.approvalSteps.length} {ui.stepsWord}
                      </p>
                    </div>
                  </div>
                </section>

                {selectedItem.request.attachments.length > 0 ? (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-foreground)]">
                      {ui.attachments}
                    </h3>
                    <div className="grid gap-3">
                      {selectedItem.request.attachments.map((attachment) => (
                        <a
                          className="flex items-center justify-between rounded-[20px] border border-[color:var(--border)] bg-white px-4 py-3 text-sm transition hover:border-[color:var(--border-strong)]"
                          href={attachment.storageKey}
                          key={attachment.id}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <Paperclip className="size-4 shrink-0 text-[color:var(--muted-foreground)]" />
                            <span className="truncate">
                              {attachment.fileName}
                            </span>
                          </span>
                          <span className="text-xs text-[color:var(--muted-foreground)]">
                            {Math.max(
                              1,
                              Math.round(attachment.sizeBytes / 1024),
                            )}{" "}
                            KB
                          </span>
                        </a>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-foreground)]">
                    {ui.approvalChain}
                  </h3>
                  <div className="grid gap-3">
                    {selectedItem.request.approvalSteps.map((step) => {
                      const stepStatus =
                        step.status === "SKIPPED"
                          ? {
                              label: ui.skipped,
                              className:
                                "border-[color:var(--border)] bg-[color:var(--panel-muted)] text-[color:var(--muted-foreground)]",
                            }
                          : {
                              label:
                                requestStatusLabels[
                                  step.status as keyof typeof requestStatusLabels
                                ],
                              className:
                                statusConfig[
                                  step.status as keyof typeof statusConfig
                                ].badgeClass,
                            };

                      return (
                        <article
                          className="rounded-[20px] border border-[color:var(--border)] bg-white px-4 py-4"
                          key={step.id}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                                {ui.stepLabel} {step.sequence}.{" "}
                                {step.approverEmployee.firstName}{" "}
                                {step.approverEmployee.lastName}
                              </p>
                              <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                                {step.actedAt
                                  ? `${ui.processedAt} ${formatDateTime(step.actedAt, localeTag)}`
                                  : ui.waitingAction}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-medium",
                                stepStatus.className,
                              )}
                            >
                              {stepStatus.label}
                            </span>
                          </div>

                          {step.comment ? (
                            <p className="mt-3 rounded-2xl bg-[color:var(--panel-muted)] px-3 py-3 text-sm text-[color:var(--foreground)]">
                              {step.comment}
                            </p>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-foreground)]">
                      {ui.comments}
                    </h3>
                    <span className="text-xs text-[color:var(--muted-foreground)]">
                      {selectedItem.request.comments.length} {ui.messagesCount}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {selectedItem.request.comments.length > 0 ? (
                      selectedItem.request.comments.map((comment) => (
                        <article
                          className="rounded-[20px] border border-[color:var(--border)] bg-white px-4 py-4"
                          key={comment.id}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[color:var(--foreground)]">
                              {comment.authorEmployee.firstName}{" "}
                              {comment.authorEmployee.lastName}
                            </p>
                            <span className="text-xs text-[color:var(--muted-foreground)]">
                              {formatDateTime(comment.createdAt, localeTag)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
                            {comment.body}
                          </p>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-[20px] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--panel-muted)] px-4 py-8 text-center text-sm text-[color:var(--muted-foreground)]">
                        {ui.noComments}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[24px] bg-[color:var(--panel-muted)] p-4">
                    <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                      {ui.newComment}
                    </label>
                    <Textarea
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [selectedItem.request.id]: event.target.value,
                        }))
                      }
                      placeholder={ui.newCommentPlaceholder}
                      rows={4}
                      value={commentDrafts[selectedItem.request.id] ?? ""}
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        disabled={
                          commentLoadingId === selectedItem.request.id ||
                          !commentDrafts[selectedItem.request.id]?.trim()
                        }
                        onClick={() => void handleAddComment(selectedItem)}
                        type="button"
                        variant="secondary"
                      >
                        {commentLoadingId === selectedItem.request.id ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <MessageSquare className="size-4" />
                        )}
                        {ui.sendComment}
                      </Button>
                    </div>
                  </div>
                </section>
              </div>

              {selectedItem.status === "PENDING" ? (
                <DialogFooter className="border-t border-[color:var(--border)] px-6 py-5">
                  <div className="w-full space-y-3">
                    <Textarea
                      onChange={(event) =>
                        setDecisionDrafts((current) => ({
                          ...current,
                          [selectedItem.request.id]: event.target.value,
                        }))
                      }
                      placeholder={ui.decisionPlaceholder}
                      rows={3}
                      value={decisionDrafts[selectedItem.request.id] ?? ""}
                    />
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        className="rounded-xl"
                        disabled={Boolean(decisionLoadingKey)}
                        onClick={() =>
                          void handleDecision(selectedItem, "REJECTED")
                        }
                        type="button"
                        variant="outline"
                      >
                        {decisionLoadingKey ===
                        `REJECTED:${selectedItem.request.id}` ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <X className="size-4" />
                        )}
                        {ui.reject}
                      </Button>
                      <Button
                        className="rounded-xl"
                        disabled={Boolean(decisionLoadingKey)}
                        onClick={() =>
                          void handleDecision(selectedItem, "APPROVED")
                        }
                        type="button"
                      >
                        {decisionLoadingKey ===
                        `APPROVED:${selectedItem.request.id}` ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        {ui.approve}
                      </Button>
                    </div>
                  </div>
                </DialogFooter>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
