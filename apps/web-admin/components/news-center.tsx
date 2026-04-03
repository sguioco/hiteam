"use client";

import {
  AnnouncementImageAspectRatio,
  WorkGroupItem,
  AnnouncementItem,
  AnnouncementReadReceipt,
} from "@smart/types";
import {
  ChevronDown,
  Eye,
  FileText,
  ImagePlus,
  Pencil,
  Pin,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageAdjustField } from "@/components/image-adjust-field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AppSelectField } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toAdminHref } from "@/lib/admin-routes";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import { Locale, useI18n } from "@/lib/i18n";
import { localizePersonName } from "@/lib/transliteration";

type NewsCenterProps = {
  mode: "manager" | "employee";
};

type NewsDraft = {
  title: string;
  body: string;
  isPinned: boolean;
  limitParticipants: boolean;
  participantScope: "GROUP" | "EMPLOYEE";
  groupIds: string[];
  targetEmployeeIds: string[];
  imageDataUrl: string | null;
  imageAspectRatio: AnnouncementImageAspectRatio;
  imageFileName: string;
};

const EMPTY_DRAFT: NewsDraft = {
  title: "",
  body: "",
  isPinned: false,
  limitParticipants: false,
  participantScope: "GROUP",
  groupIds: [],
  targetEmployeeIds: [],
  imageDataUrl: null,
  imageAspectRatio: "16:9",
  imageFileName: "",
};

const NEWS_CACHE_TTL_MS = 60_000;

type NewsCenterCachePayload = {
  items: AnnouncementItem[];
  employees: Array<{
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  }>;
  groups: WorkGroupItem[];
};

export type NewsCenterInitialData = NewsCenterCachePayload;

function buildNewsCacheKey(
  session: ReturnType<typeof getSession>,
  mode: NewsCenterProps["mode"],
) {
  return session ? `news-center:${mode}:${session.user.id}` : null;
}

function localize(locale: Locale, ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function formatDate(value: string, locale: Locale) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  const diffMs = Date.now() - parsed.getTime();
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < dayMs) {
    if (diffMs < hourMs) {
      const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
      return locale === "ru" ? `${minutes} МИН назад` : `${minutes} MIN AGO`;
    }

    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return locale === "ru" ? `${hours} Ч назад` : `${hours} H AGO`;
  }

  const includeYear = parsed.getFullYear() !== new Date().getFullYear();

  return parsed.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeYear ? { year: "numeric" as const } : {}),
  });
}

function formatEmployeeName(
  employee:
    | {
        firstName: string;
        lastName: string;
      }
    | null
    | undefined,
  locale: Locale,
) {
  if (!employee) {
    return null;
  }

  return localizePersonName(
    [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim(),
    locale,
  );
}

function formatNewsMetaLine(
  item: Pick<AnnouncementItem, "authorEmployee" | "createdAt">,
  locale: Locale,
) {
  const authorName =
    formatEmployeeName(item.authorEmployee, locale) ??
    (locale === "ru" ? "Неизвестно" : "Unknown");
  const relativeOrDate = formatDate(item.createdAt, locale);

  return locale === "ru"
    ? `${relativeOrDate} • ${authorName}`
    : `${relativeOrDate} by ${authorName}`;
}

function getEmployeeInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

type ReaderGroupSummary = {
  id: string;
  members: AnnouncementReadReceipt[];
  name: string;
  readCount: number;
  status: "allRead" | "allUnread" | "mixed";
  unreadCount: number;
};

function getAnnouncementTargetGroupIds(item: AnnouncementItem) {
  const ids = new Set<string>();

  item.groupIds?.forEach((groupId) => ids.add(groupId));
  if (item.group?.id) {
    ids.add(item.group.id);
  }

  return ids;
}

function buildReaderGroupSummaries(
  item: AnnouncementItem,
  readers: AnnouncementReadReceipt[],
  groups: WorkGroupItem[],
): ReaderGroupSummary[] {
  if (item.audience !== "GROUP") {
    return [];
  }

  const targetGroupIds = getAnnouncementTargetGroupIds(item);
  if (!targetGroupIds.size) {
    return [];
  }

  const readersByEmployeeId = new Map(
    readers
      .filter((reader): reader is AnnouncementReadReceipt & { employeeId: string } => Boolean(reader.employeeId))
      .map((reader) => [reader.employeeId, reader]),
  );

  return groups
    .filter((group) => targetGroupIds.has(group.id))
    .map((group) => {
      const members = group.memberships.map((membership) => {
        const existingReader = readersByEmployeeId.get(membership.employeeId);

        if (existingReader) {
          return existingReader;
        }

        return {
          notificationId: `group-fallback:${group.id}:${membership.employeeId}`,
          userId: membership.employeeId,
          employeeId: membership.employeeId,
          firstName: membership.employee.firstName,
          lastName: membership.employee.lastName,
          employeeNumber: membership.employee.employeeNumber,
          avatarUrl: null,
          isRead: false,
          readAt: null,
        } satisfies AnnouncementReadReceipt;
      });
      const readCount = members.filter((member) => member.isRead).length;
      const unreadCount = Math.max(0, members.length - readCount);

      return {
        id: group.id,
        members,
        name: group.name,
        readCount,
        status:
          readCount === members.length
            ? "allRead"
            : readCount === 0
              ? "allUnread"
              : "mixed",
        unreadCount,
      };
    });
}

function getNewsErrorMessage(error: unknown, locale: Locale, fallbackRu: string, fallbackEn: string) {
  if (error instanceof Error) {
    if (error.message.includes("/collaboration/announcements/archive")) {
      return localize(
        locale,
        "Архив недоступен в текущей версии API. Нужно обновить backend.",
        "Archive is unavailable in the current API version. Backend update is required.",
      );
    }

    if (error.message.includes("/collaboration/announcements/") && error.message.includes("/readers")) {
      return localize(
        locale,
        "Статистика прочтения недоступна в текущей версии API. Нужно обновить backend.",
        "Reader statistics are unavailable in the current API version. Backend update is required.",
      );
    }

    return error.message;
  }

  return localize(locale, fallbackRu, fallbackEn);
}

function getAnnouncementImageAspectRatioStyle(value?: AnnouncementImageAspectRatio | null) {
  switch (value) {
    case "1:1":
      return "1 / 1";
    case "4:3":
      return "4 / 3";
    case "16:9":
    default:
      return "16 / 9";
  }
}

function getAnnouncementImageAspectRatioValue(value?: AnnouncementImageAspectRatio | null) {
  switch (value) {
    case "1:1":
      return 1;
    case "4:3":
      return 4 / 3;
    case "16:9":
    default:
      return 16 / 9;
  }
}

function UnreadPulseDot() {
  return (
    <span className="relative inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center">
      <span className="absolute inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-sky-300/80" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
    </span>
  );
}

function resolveAnnouncementAspectRatio(width: number, height: number): AnnouncementImageAspectRatio {
  if (!width || !height) {
    return "16:9";
  }

  const ratio = width / height;

  if (ratio < 1.15) {
    return "1:1";
  }

  if (ratio < 1.56) {
    return "4:3";
  }

  return "16:9";
}

function getAnnouncementImageOutputDimensions(value: AnnouncementImageAspectRatio) {
  const outputWidth = 1600;
  const aspectRatio = getAnnouncementImageAspectRatioValue(value);

  return {
    outputHeight: Math.max(1, Math.round(outputWidth / aspectRatio)),
    outputWidth,
  };
}

export function NewsCenter({
  mode,
  initialData,
}: NewsCenterProps & {
  initialData?: NewsCenterInitialData | null;
}) {
  const { locale } = useI18n();
  const session = getSession();
  const cacheKey = buildNewsCacheKey(session, mode);
  const [items, setItems] = useState<AnnouncementItem[]>(initialData?.items ?? []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementItem | null>(null);
  const [draft, setDraft] = useState<NewsDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<NewsDraft>(EMPTY_DRAFT);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [readersLoadingId, setReadersLoadingId] = useState<string | null>(null);
  const [readerMap, setReaderMap] = useState<Record<string, AnnouncementReadReceipt[]>>({});
  const [readerDialogItem, setReaderDialogItem] = useState<AnnouncementItem | null>(null);
  const [expandedReaderGroupKeys, setExpandedReaderGroupKeys] = useState<string[]>([]);
  const [employees, setEmployees] = useState<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
    }>
  >(initialData?.employees ?? []);
  const [groups, setGroups] = useState<WorkGroupItem[]>(initialData?.groups ?? []);
  const isManagerView = mode === "manager";
  const didUseInitialData = useRef(Boolean(initialData));
  const didUseInitialDirectory = useRef(
    Boolean(initialData) && mode === "manager",
  );

  function applyCachedSnapshot(snapshot: NewsCenterCachePayload) {
    setItems(snapshot.items);
    setEmployees(snapshot.employees);
    setGroups(snapshot.groups);
  }

  async function loadItems() {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const path = isManagerView
        ? "/collaboration/announcements"
        : "/collaboration/announcements/me";
      const nextItems = await apiRequest<AnnouncementItem[]>(path, {
        token: session.accessToken,
      });
      setItems(nextItems);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : localize(locale, "Не удалось загрузить новости.", "Unable to load news."),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (didUseInitialData.current && initialData) {
      didUseInitialData.current = false;
      setLoading(false);
      setError(null);
      return;
    }

    const cached = cacheKey
      ? readClientCache<NewsCenterCachePayload>(cacheKey, NEWS_CACHE_TTL_MS)
      : null;

    if (cached) {
      applyCachedSnapshot(cached.value);
      setLoading(false);
      if (!cached.isStale) {
        return;
      }
    }

    void loadItems();
  }, [cacheKey, initialData, isManagerView]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    if (!isManagerView) {
      return;
    }

    if (!session) {
      return;
    }

    if (didUseInitialDirectory.current) {
      didUseInitialDirectory.current = false;
      return;
    }

    let active = true;

    void apiRequest<{
      initialData: NewsCenterInitialData | null;
      mode: "admin" | "employee";
    }>("/bootstrap/news", {
        token: session.accessToken,
      }).then((snapshot) => {
      if (!active) {
        return;
      }

      if (!snapshot.initialData) {
        setEmployees([]);
        setGroups([]);
      } else {
        setEmployees(snapshot.initialData.employees);
        setGroups(snapshot.initialData.groups);
      }
    }).catch(() => {
      if (!active) {
        return;
      }

      setEmployees([]);
      setGroups([]);
    });

    return () => {
      active = false;
    };
  }, [initialData, isManagerView]);

  useEffect(() => {
    if (!cacheKey || loading) {
      return;
    }

    writeClientCache(cacheKey, {
      items,
      employees,
      groups,
    } satisfies NewsCenterCachePayload);
  }, [cacheKey, employees, groups, items, loading]);

  const orderedItems = useMemo(() => {
    return [...items].sort((left, right) => {
      if (!isManagerView && Boolean(left.isRead) !== Boolean(right.isRead)) {
        return left.isRead ? 1 : -1;
      }

      if (left.isPinned !== right.isPinned) {
        return left.isPinned ? -1 : 1;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [isManagerView, items]);

  async function handleCreate() {
    const session = getSession();
    if (!session) {
      return;
    }

    if (!draft.title.trim() || !draft.body.trim()) {
      setError(
        localize(
          locale,
          "У новости должны быть заголовок и текст.",
          "News item requires both title and body.",
        ),
      );
      return;
    }

    if (
      draft.limitParticipants &&
      ((draft.participantScope === "GROUP" && draft.groupIds.length === 0) ||
        (draft.participantScope === "EMPLOYEE" && draft.targetEmployeeIds.length === 0))
    ) {
      setError(
        localize(
          locale,
          "Выбери группу или сотрудника для этой новости.",
          "Choose a group or employee for this news item.",
        ),
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const normalizedGroupIds = Array.from(new Set(draft.groupIds));
      const normalizedTargetEmployeeIds = Array.from(new Set(draft.targetEmployeeIds));
      const created = await apiRequest<AnnouncementItem>("/collaboration/announcements", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          audience: draft.limitParticipants ? draft.participantScope : "ALL",
          title: draft.title.trim(),
          body: draft.body.trim(),
          isPinned: false,
          ...(draft.limitParticipants &&
          draft.participantScope === "GROUP" &&
          normalizedGroupIds.length === 1
            ? { groupId: normalizedGroupIds[0] }
            : {}),
          ...(draft.limitParticipants &&
          draft.participantScope === "GROUP" &&
          normalizedGroupIds.length > 1
            ? { groupIds: normalizedGroupIds }
            : {}),
          ...(draft.limitParticipants &&
          draft.participantScope === "EMPLOYEE" &&
          normalizedTargetEmployeeIds.length === 1
            ? { targetEmployeeId: normalizedTargetEmployeeIds[0] }
            : {}),
          ...(draft.limitParticipants &&
          draft.participantScope === "EMPLOYEE" &&
          normalizedTargetEmployeeIds.length > 1
            ? { targetEmployeeIds: normalizedTargetEmployeeIds }
            : {}),
          ...(draft.imageDataUrl
            ? {
                imageDataUrl: draft.imageDataUrl,
                imageAspectRatio: draft.imageAspectRatio,
              }
            : {}),
        }),
      });

      setItems((current) => [created, ...current]);
      setDraft(EMPTY_DRAFT);
      setCreateOpen(false);
      setFeedback(localize(locale, "Новость опубликована.", "News item published."));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : localize(locale, "Не удалось создать новость.", "Unable to create news item."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(item: AnnouncementItem) {
    setEditingId(item.id);
    setEditingDraft({
      title: item.title,
      body: item.body,
      isPinned: item.isPinned,
      limitParticipants: false,
      participantScope: "GROUP",
      groupIds: [],
      targetEmployeeIds: [],
      imageDataUrl: null,
      imageAspectRatio: item.imageAspectRatio ?? "16:9",
      imageFileName: "",
    });
    setExpandedId(item.id);
  }

  async function handleSaveEdit(announcementId: string) {
    const session = getSession();
    if (!session) {
      return;
    }

    if (!editingDraft.title.trim() || !editingDraft.body.trim()) {
      setError(
        localize(
          locale,
          "У новости должны быть заголовок и текст.",
          "News item requires both title and body.",
        ),
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const updated = await apiRequest<AnnouncementItem>(
        `/collaboration/announcements/${announcementId}`,
        {
          method: "PATCH",
          token: session.accessToken,
          body: JSON.stringify({
            title: editingDraft.title.trim(),
            body: editingDraft.body.trim(),
            isPinned: editingDraft.isPinned,
          }),
        },
      );

      setItems((current) =>
        current.map((item) => (item.id === announcementId ? updated : item)),
      );
      setEditingId(null);
      setFeedback(localize(locale, "Новость обновлена.", "News item updated."));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : localize(locale, "Не удалось обновить новость.", "Unable to update news item."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(announcementId: string) {
    const session = getSession();
    if (!session) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiRequest(`/collaboration/announcements/${announcementId}`, {
        method: "DELETE",
        token: session.accessToken,
      });

      setItems((current) => current.filter((item) => item.id !== announcementId));
      setReaderMap((current) => {
        const next = { ...current };
        delete next[announcementId];
        return next;
      });
      if (expandedId === announcementId) {
        setExpandedId(null);
      }
      setDeleteTarget(null);
      setFeedback(localize(locale, "Новость удалена.", "News item deleted."));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : localize(locale, "Не удалось удалить новость.", "Unable to delete news item."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function markAsRead(item: AnnouncementItem) {
    const session = getSession();
    if (!session || item.isRead) {
      return;
    }

    try {
      const response = await apiRequest<{ readAt?: string | null }>(
        `/collaboration/announcements/${item.id}/read`,
        {
          method: "POST",
          token: session.accessToken,
        },
      );

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                isRead: true,
                readAt: response.readAt ?? new Date().toISOString(),
              }
            : currentItem,
        ),
      );
    } catch {
      // Keep the feed usable even if read sync fails.
    }
  }

  async function ensureReadersLoaded(announcementId: string) {
    if (readerMap[announcementId]) {
      return;
    }

    const session = getSession();
    if (!session) {
      return;
    }

    setReadersLoadingId(announcementId);

    try {
      const readers = await apiRequest<AnnouncementReadReceipt[]>(
        `/collaboration/announcements/${announcementId}/readers`,
        {
          token: session.accessToken,
        },
      );
      setReaderMap((current) => ({ ...current, [announcementId]: readers }));
    } catch (readerError) {
      setError(
        getNewsErrorMessage(
          readerError,
          locale,
          "Не удалось загрузить статус прочтения.",
          "Unable to load readership status.",
        ),
      );
    } finally {
      setReadersLoadingId(null);
    }
  }

  async function openReaderDialog(item: AnnouncementItem) {
    setReaderDialogItem(item);
    setExpandedReaderGroupKeys([]);
    await ensureReadersLoaded(item.id);
  }

  async function handleTogglePinned(item: AnnouncementItem) {
    const session = getSession();
    if (!session) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const updated = await apiRequest<AnnouncementItem>(
        `/collaboration/announcements/${item.id}`,
        {
          method: "PATCH",
          token: session.accessToken,
          body: JSON.stringify({
            title: item.title,
            body: item.body,
            isPinned: !item.isPinned,
          }),
        },
      );

      setItems((current) =>
        current.map((currentItem) => (currentItem.id === item.id ? updated : currentItem)),
      );
      setFeedback(
        localize(
          locale,
          updated.isPinned ? "Новость закреплена." : "Новость откреплена.",
          updated.isPinned ? "News item pinned." : "News item unpinned.",
        ),
      );
    } catch (pinError) {
      setError(
        pinError instanceof Error
          ? pinError.message
          : localize(
              locale,
              "Не удалось изменить закрепление новости.",
              "Unable to update pinned state.",
            ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleExpand(item: AnnouncementItem) {
    const nextExpandedId = expandedId === item.id ? null : item.id;
    setExpandedId(nextExpandedId);

    if (!isManagerView && nextExpandedId === item.id) {
      await markAsRead(item);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      {isManagerView ? (
        <header className="animate-fade-in flex flex-col gap-4 px-1 py-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-baseline gap-5">
            <h1 className="text-[clamp(2.35rem,5.6vw,3.8rem)] font-medium uppercase leading-[0.92] tracking-[-0.07em] text-[color:var(--foreground)]">
              {localize(locale, "Новости", "News")}
            </h1>
            <span className="text-[clamp(2.35rem,5.6vw,3.8rem)] font-medium leading-[0.92] tracking-[-0.07em] text-[rgba(71,85,105,0.62)]">
              {orderedItems.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button asChild type="button" variant="outline">
              <Link href={toAdminHref("/news/archive")}>
                <FileText className="size-4" />
                {localize(locale, "Архив", "Archive")}
              </Link>
            </Button>
            <Button
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setCreateOpen(true);
              }}
              type="button"
            >
              {localize(locale, "Создать новость", "Create news")}
            </Button>
          </div>
        </header>
      ) : (
        <header className="animate-fade-in px-1 py-2 text-center">
          <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)]">
            Team news
          </h1>
        </header>
      )}

      {feedback ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {isManagerView ? (
        <Dialog
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) {
              setDraft(EMPTY_DRAFT);
              setError(null);
            }
          }}
          open={createOpen}
        >
          <DialogContent className="animate-fade-in flex h-[min(88vh,920px)] w-[min(760px,calc(100vw-1.5rem))] max-w-none flex-col overflow-hidden rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-0">
            <div
              className="min-h-0 flex-1 overflow-y-auto px-6 py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <DialogHeader className="gap-2 pr-10">
                <DialogTitle>{localize(locale, "Создать новость", "Create news")}</DialogTitle>
                <DialogDescription>
                  {localize(
                    locale,
                    "Заголовок, текст, фото, получатели и отметка важности. После публикации новость сразу появится у сотрудников.",
                    "Add a title, body, photo, recipients, and optional importance flag. After publishing, the news item will appear immediately for employees.",
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 grid gap-3">
                <Input
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder={localize(locale, "Заголовок новости", "News title")}
                  value={draft.title}
                />
                <Textarea
                  className="min-h-[180px]"
                  onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
                  placeholder={localize(
                    locale,
                    "Например: до 20 марта нужно согласовать все отпуска.",
                    "For example: approve all vacation schedules before March 20.",
                  )}
                  value={draft.body}
                />
                <ImageAdjustField
                  applyLabel={localize(locale, "Использовать фото", "Use photo")}
                  cancelLabel={localize(locale, "Отмена", "Cancel")}
                  dialogDescription={localize(
                    locale,
                    "Подгони кадр. Формат новости подберётся автоматически по самой картинке.",
                    "Adjust the frame. The news aspect ratio will be chosen automatically from the image.",
                  )}
                  dialogTitle={localize(locale, "Редактировать фото новости", "Edit news image")}
                  onChange={(nextValue) =>
                    setDraft((current) => ({
                      ...current,
                      imageDataUrl: nextValue,
                    }))
                  }
                  onError={setError}
                  onSourceReady={({ fileName, height, width }) =>
                    setDraft((current) => ({
                      ...current,
                      imageAspectRatio: resolveAnnouncementAspectRatio(width, height),
                      imageFileName: fileName,
                    }))
                  }
                  outputHeight={getAnnouncementImageOutputDimensions(draft.imageAspectRatio).outputHeight}
                  outputQuality={0.9}
                  outputWidth={getAnnouncementImageOutputDimensions(draft.imageAspectRatio).outputWidth}
                  previewAlt={draft.title || localize(locale, "Превью новости", "News preview")}
                  renderTrigger={({ chooseFile, fileName, openEditor, previewSrc }) =>
                    previewSrc ? (
                      <div className="flex flex-col gap-3 rounded-[22px] border border-[rgba(148,163,184,0.16)] bg-slate-50/70 p-4">
                        <div className="flex flex-wrap items-start gap-4">
                          <button
                            className="overflow-hidden rounded-[18px] border border-[rgba(148,163,184,0.18)] bg-white shadow-sm"
                            onClick={openEditor}
                            type="button"
                          >
                            <img
                              alt={draft.title || localize(locale, "Превью новости", "News preview")}
                              className="h-[112px] w-[168px] object-cover"
                              src={previewSrc}
                            />
                          </button>
                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <div className="text-sm font-semibold text-[color:var(--foreground)]">
                              {localize(locale, "Фото для новости", "News image")}
                            </div>
                            <div className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                              {localize(
                                locale,
                                `Формат: ${draft.imageAspectRatio}. Фото можно подвинуть и приблизить.`,
                                `Format: ${draft.imageAspectRatio}. You can reposition and zoom the image.`,
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button onClick={openEditor} size="sm" type="button" variant="outline">
                                {localize(locale, "Редактировать", "Edit photo")}
                              </Button>
                              <Button onClick={chooseFile} size="sm" type="button" variant="outline">
                                {localize(locale, "Заменить", "Replace")}
                              </Button>
                              <Button
                                className="text-rose-700"
                                onClick={() =>
                                  setDraft((current) => ({
                                    ...current,
                                    imageAspectRatio: "16:9",
                                    imageDataUrl: null,
                                    imageFileName: "",
                                  }))
                                }
                                size="sm"
                                type="button"
                                variant="ghost"
                              >
                                <X className="size-4" />
                                {localize(locale, "Убрать фото", "Remove photo")}
                              </Button>
                            </div>
                            <div className="text-xs text-[color:var(--muted-foreground)]">
                              {localize(locale, `Файл: ${fileName || draft.imageFileName}`, `File: ${fileName || draft.imageFileName}`)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="flex w-full items-center gap-3 rounded-[22px] border border-dashed border-[rgba(148,163,184,0.35)] bg-slate-50/80 px-4 py-5 text-left transition hover:border-sky-300 hover:bg-sky-50/70"
                        onClick={chooseFile}
                        type="button"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                          <ImagePlus className="size-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[color:var(--foreground)]">
                            {localize(locale, "Загрузить изображение", "Upload an image")}
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-[color:var(--muted-foreground)]">
                            {localize(
                              locale,
                              "PNG, JPG, WEBP и другие фотоформаты. Кадр и размер подготовятся в редакторе.",
                              "PNG, JPG, WEBP, and other photo formats. Framing and output size will be prepared in the editor.",
                            )}
                          </span>
                        </span>
                      </button>
                    )
                  }
                  sourceMaxSide={1600}
                  sourceQuality={0.86}
                  value={draft.imageDataUrl}
                  viewportAspectRatio={getAnnouncementImageAspectRatioValue(draft.imageAspectRatio)}
                  viewportSize={360}
                />
                <div className="rounded-[24px] border border-[rgba(148,163,184,0.16)] bg-white/80 p-4">
                  <label className="flex items-start gap-3">
                    <Checkbox
                      checked={draft.limitParticipants}
                      onCheckedChange={(checked) =>
                        setDraft((current) => ({
                          ...current,
                          limitParticipants: Boolean(checked),
                        }))
                      }
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[color:var(--foreground)]">
                        {localize(locale, "Только для выбранных участников", "Only for selected participants")}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                        {draft.limitParticipants
                          ? localize(
                              locale,
                              "Новость увидят только выбранные группы или сотрудники в одном типе выбора.",
                              "This news will be visible only to the selected groups or employees within one scope.",
                            )
                          : localize(
                              locale,
                              "По умолчанию новость увидят все сотрудники компании.",
                              "By default, this news will be visible to all employees in the company.",
                            )}
                      </div>
                    </div>
                  </label>

                  {draft.limitParticipants ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <AppSelectField
                        onValueChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            participantScope: value as "GROUP" | "EMPLOYEE",
                            groupIds: value === "GROUP" ? current.groupIds : [],
                            targetEmployeeIds: value === "EMPLOYEE" ? current.targetEmployeeIds : [],
                          }))
                        }
                        options={[
                          {
                            value: "GROUP",
                            label: localize(locale, "Группа", "Group"),
                          },
                          {
                            value: "EMPLOYEE",
                            label: localize(locale, "Сотрудник", "Employee"),
                          },
                        ]}
                        value={draft.participantScope}
                      />
                      {draft.participantScope === "GROUP" ? (
                        <div className="rounded-[20px] border border-[rgba(148,163,184,0.2)] bg-slate-50/70 p-2 sm:col-span-1">
                          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                            {groups.length ? (
                              groups.map((group) => {
                                const checked = draft.groupIds.includes(group.id);
                                return (
                                  <label
                                    key={group.id}
                                    className="flex cursor-pointer items-start gap-3 rounded-[16px] px-3 py-2 transition hover:bg-white"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(nextChecked) =>
                                        setDraft((current) => ({
                                          ...current,
                                          groupIds: nextChecked
                                            ? current.groupIds.includes(group.id)
                                              ? current.groupIds
                                              : [...current.groupIds, group.id]
                                            : current.groupIds.filter((item) => item !== group.id),
                                        }))
                                      }
                                    />
                                    <span className="min-w-0 text-sm font-medium text-[color:var(--foreground)]">
                                      {group.name}
                                    </span>
                                  </label>
                                );
                              })
                            ) : (
                              <div className="px-3 py-2 text-sm text-[color:var(--muted-foreground)]">
                                {localize(locale, "Группы пока не найдены.", "No groups found yet.")}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[20px] border border-[rgba(148,163,184,0.2)] bg-slate-50/70 p-2 sm:col-span-1">
                          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                            {employees.length ? (
                              employees.map((employee) => {
                                const checked = draft.targetEmployeeIds.includes(employee.id);
                                return (
                                  <label
                                    key={employee.id}
                                    className="flex cursor-pointer items-start gap-3 rounded-[16px] px-3 py-2 transition hover:bg-white"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(nextChecked) =>
                                        setDraft((current) => ({
                                          ...current,
                                          targetEmployeeIds: nextChecked
                                            ? current.targetEmployeeIds.includes(employee.id)
                                              ? current.targetEmployeeIds
                                              : [...current.targetEmployeeIds, employee.id]
                                            : current.targetEmployeeIds.filter((item) => item !== employee.id),
                                        }))
                                      }
                                    />
                                    <span className="min-w-0 text-sm font-medium text-[color:var(--foreground)]">
                                      {employee.firstName} {employee.lastName}
                                    </span>
                                  </label>
                                );
                              })
                            ) : (
                              <div className="px-3 py-2 text-sm text-[color:var(--muted-foreground)]">
                                {localize(locale, "Сотрудники пока не найдены.", "No employees found yet.")}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 bg-[color:var(--panel-strong)] px-6 py-4 sm:justify-between">
              <Button onClick={() => setCreateOpen(false)} type="button" variant="ghost">
                {localize(locale, "Отмена", "Cancel")}
              </Button>
              <Button disabled={submitting} onClick={() => void handleCreate()} type="button">
                {localize(locale, "Опубликовать", "Publish")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {isManagerView ? (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setReaderDialogItem(null);
              setExpandedReaderGroupKeys([]);
            }
          }}
          open={Boolean(readerDialogItem)}
        >
          <DialogContent className="animate-fade-in flex h-[min(82vh,760px)] w-[min(860px,calc(100vw-1.5rem))] max-w-none flex-col overflow-hidden rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-0">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <DialogHeader className="gap-2 pr-10">
                <div className="flex flex-wrap items-center gap-3">
                  <DialogTitle>
                    {readerDialogItem?.title ?? localize(locale, "Статус прочтения", "Read status")}
                  </DialogTitle>
                  {readerDialogItem ? (
                    <button
                      className="inline-flex items-center gap-2 font-semibold text-sky-700"
                      onClick={() => void openReaderDialog(readerDialogItem)}
                      type="button"
                    >
                      <Eye className="size-5" />
                      <span className="text-[18px] leading-none">
                        {`${readerDialogItem.readRecipients ?? 0}/${readerDialogItem.totalRecipients ?? 0}`}
                      </span>
                    </button>
                  ) : null}
                </div>
              </DialogHeader>

              <div className="mt-5">
                {readerDialogItem ? (
                  (() => {
                    const readers = readerMap[readerDialogItem.id] ?? [];
                    const groupedReaders = buildReaderGroupSummaries(readerDialogItem, readers, groups);
                    const readItems = readers.filter((reader) => reader.isRead);
                    const unreadItems = readers.filter((reader) => !reader.isRead);
                    const readCount = readerDialogItem.readRecipients ?? readItems.length;
                    const totalCount = readerDialogItem.totalRecipients ?? readers.length;
                    const unreadCount = Math.max(0, totalCount - readCount);
                    const groupedMemberIds = new Set(
                      groupedReaders.flatMap((group) =>
                        group.members
                          .map((member) => member.employeeId)
                          .filter((employeeId): employeeId is string => Boolean(employeeId)),
                      ),
                    );
                    const ungroupedReadItems = readItems.filter(
                      (reader) => !reader.employeeId || !groupedMemberIds.has(reader.employeeId),
                    );
                    const ungroupedUnreadItems = unreadItems.filter(
                      (reader) => !reader.employeeId || !groupedMemberIds.has(reader.employeeId),
                    );

                    return (
                      <div className="flex min-h-0 flex-col gap-4">
                        {readersLoadingId === readerDialogItem.id ? (
                          <div className="rounded-[22px] border border-[rgba(148,163,184,0.16)] bg-white/88 px-4 py-5 text-sm text-[color:var(--muted-foreground)]">
                            {localize(locale, "Загружаю сотрудников…", "Loading readers…")}
                          </div>
                        ) : readers.length ? (
                          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
                            <div className="flex min-h-[360px] flex-col rounded-[24px] border border-[rgba(16,185,129,0.16)] bg-emerald-50/50 p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-emerald-700">
                                  {localize(locale, "Открыли", "Opened")}
                                </div>
                                <div className="text-sm text-emerald-700/80">{readCount}</div>
                              </div>
                              <div className="min-h-0 flex-1 overflow-y-auto rounded-[18px] bg-white/78 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {groupedReaders.filter((group) => group.status === "allRead" || group.status === "mixed").map((group, index, array) => {
                                  const groupKey = `${readerDialogItem.id}:${group.id}`;
                                  const expanded = expandedReaderGroupKeys.includes(groupKey);

                                  return (
                                    <div key={group.id}>
                                      <button
                                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-emerald-50/60"
                                        onClick={() =>
                                          setExpandedReaderGroupKeys((current) =>
                                            current.includes(groupKey)
                                              ? current.filter((item) => item !== groupKey)
                                              : [...current, groupKey],
                                          )
                                        }
                                        type="button"
                                      >
                                        <div className="min-w-0">
                                          <div className="font-medium text-[color:var(--foreground)]">
                                            {localize(locale, `Группа ${group.name}`, `Group ${group.name}`)}
                                          </div>
                                          <div className="text-sm text-emerald-700/80">
                                            {group.status === "allRead"
                                              ? localize(locale, "Вся группа открыла новость", "The whole group opened the news")
                                              : localize(locale, `${group.readCount}/${group.members.length} открыли`, `${group.readCount}/${group.members.length} opened`)}
                                          </div>
                                        </div>
                                        <ChevronDown className={`size-4 text-emerald-700 transition-transform ${expanded ? "rotate-180" : ""}`} />
                                      </button>
                                      {expanded ? (
                                        <div className="bg-white/92">
                                          <Separator className="bg-emerald-100" />
                                          {group.members.filter((member) => member.isRead).map((reader, memberIndex, memberArray) => (
                                            <div key={reader.notificationId}>
                                              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                                                <div className="flex min-w-0 items-center gap-3">
                                                  {reader.avatarUrl ? (
                                                    <img
                                                      alt={formatEmployeeName(reader, locale) ?? localize(locale, "Сотрудник", "Employee")}
                                                      className="h-8 w-8 rounded-full object-cover"
                                                      src={reader.avatarUrl}
                                                    />
                                                  ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-700">
                                                      {getEmployeeInitials(reader.firstName, reader.lastName)}
                                                    </div>
                                                  )}
                                                  <div className="truncate text-sm font-medium text-[color:var(--foreground)]">
                                                    {formatEmployeeName(reader, locale) ?? localize(locale, "Без имени", "Unnamed")}
                                                  </div>
                                                </div>
                                                <div className="shrink-0 text-sm text-[color:var(--muted-foreground)]">
                                                  {reader.readAt ? formatDate(reader.readAt, locale) : localize(locale, "Открыто", "Opened")}
                                                </div>
                                              </div>
                                              {memberIndex < memberArray.length - 1 ? <Separator className="bg-emerald-100" /> : null}
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                      {index < array.length - 1 || expanded || ungroupedReadItems.length ? <Separator className="bg-emerald-100" /> : null}
                                    </div>
                                  );
                                })}

                                {ungroupedReadItems.map((reader, index, array) => (
                                  <div key={reader.notificationId}>
                                    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                                      <div className="flex min-w-0 items-center gap-3">
                                        {reader.avatarUrl ? (
                                          <img
                                            alt={formatEmployeeName(reader, locale) ?? localize(locale, "Сотрудник", "Employee")}
                                            className="h-8 w-8 rounded-full object-cover"
                                            src={reader.avatarUrl}
                                          />
                                        ) : (
                                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-700">
                                            {getEmployeeInitials(reader.firstName, reader.lastName)}
                                          </div>
                                        )}
                                        <div className="truncate text-sm font-medium text-[color:var(--foreground)]">
                                          {formatEmployeeName(reader, locale) ?? localize(locale, "Без имени", "Unnamed")}
                                        </div>
                                      </div>
                                      <div className="shrink-0 text-sm text-[color:var(--muted-foreground)]">
                                        {reader.readAt ? formatDate(reader.readAt, locale) : localize(locale, "Открыто", "Opened")}
                                      </div>
                                    </div>
                                    {index < array.length - 1 ? <Separator className="bg-emerald-100" /> : null}
                                  </div>
                                ))}

                                {!groupedReaders.filter((group) => group.status === "allRead" || group.status === "mixed").length && !ungroupedReadItems.length ? (
                                  <div className="px-4 py-4 text-sm text-emerald-700/80">
                                    {localize(locale, "Пока никто не открыл.", "No one has opened it yet.")}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex min-h-[360px] flex-col rounded-[24px] border border-[rgba(148,163,184,0.16)] bg-slate-50/70 p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-slate-700">
                                  {localize(locale, "Не открыли", "Not opened")}
                                </div>
                                <div className="text-sm text-slate-600">{unreadCount}</div>
                              </div>
                              <div className="min-h-0 flex-1 overflow-y-auto rounded-[18px] bg-white/78 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {groupedReaders.filter((group) => group.status === "allUnread" || group.status === "mixed").map((group, index, array) => {
                                  const groupKey = `${readerDialogItem.id}:${group.id}:unread`;
                                  const expanded = expandedReaderGroupKeys.includes(groupKey);

                                  return (
                                    <div key={`${group.id}-unread`}>
                                      <button
                                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50/80"
                                        onClick={() =>
                                          setExpandedReaderGroupKeys((current) =>
                                            current.includes(groupKey)
                                              ? current.filter((item) => item !== groupKey)
                                              : [...current, groupKey],
                                          )
                                        }
                                        type="button"
                                      >
                                        <div className="min-w-0">
                                          <div className="font-medium text-[color:var(--foreground)]">
                                            {localize(locale, `Группа ${group.name}`, `Group ${group.name}`)}
                                          </div>
                                          <div className="text-sm text-slate-600">
                                            {group.status === "allUnread"
                                              ? localize(locale, "Никто из группы не открыл", "Nobody in the group has opened it")
                                              : localize(locale, `${group.unreadCount}/${group.members.length} не открыли`, `${group.unreadCount}/${group.members.length} not opened`)}
                                          </div>
                                        </div>
                                        <ChevronDown className={`size-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
                                      </button>
                                      {expanded ? (
                                        <div className="bg-white/92">
                                          <Separator className="bg-slate-100" />
                                          {group.members.filter((member) => !member.isRead).map((reader, memberIndex, memberArray) => (
                                            <div key={reader.notificationId}>
                                              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                                                <div className="flex min-w-0 items-center gap-3">
                                                  {reader.avatarUrl ? (
                                                    <img
                                                      alt={formatEmployeeName(reader, locale) ?? localize(locale, "Сотрудник", "Employee")}
                                                      className="h-8 w-8 rounded-full object-cover"
                                                      src={reader.avatarUrl}
                                                    />
                                                  ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                                                      {getEmployeeInitials(reader.firstName, reader.lastName)}
                                                    </div>
                                                  )}
                                                  <div className="truncate text-sm font-medium text-[color:var(--foreground)]">
                                                    {formatEmployeeName(reader, locale) ?? localize(locale, "Без имени", "Unnamed")}
                                                  </div>
                                                </div>
                                                <div className="shrink-0 text-sm text-slate-500">
                                                  {localize(locale, "Не открывал", "Not opened")}
                                                </div>
                                              </div>
                                              {memberIndex < memberArray.length - 1 ? <Separator className="bg-slate-100" /> : null}
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                      {index < array.length - 1 || expanded || ungroupedUnreadItems.length ? <Separator className="bg-slate-100" /> : null}
                                    </div>
                                  );
                                })}

                                {ungroupedUnreadItems.map((reader, index, array) => (
                                  <div key={reader.notificationId}>
                                    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                                      <div className="flex min-w-0 items-center gap-3">
                                        {reader.avatarUrl ? (
                                          <img
                                            alt={formatEmployeeName(reader, locale) ?? localize(locale, "Сотрудник", "Employee")}
                                            className="h-8 w-8 rounded-full object-cover"
                                            src={reader.avatarUrl}
                                          />
                                        ) : (
                                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                                            {getEmployeeInitials(reader.firstName, reader.lastName)}
                                          </div>
                                        )}
                                        <div className="truncate text-sm font-medium text-[color:var(--foreground)]">
                                          {formatEmployeeName(reader, locale) ?? localize(locale, "Без имени", "Unnamed")}
                                        </div>
                                      </div>
                                      <div className="shrink-0 text-sm text-slate-500">
                                        {localize(locale, "Не открывал", "Not opened")}
                                      </div>
                                    </div>
                                    {index < array.length - 1 ? <Separator className="bg-slate-100" /> : null}
                                  </div>
                                ))}

                                {!groupedReaders.filter((group) => group.status === "allUnread" || group.status === "mixed").length && !ungroupedUnreadItems.length ? (
                                  <div className="px-4 py-4 text-sm text-slate-600">
                                    {localize(locale, "Все сотрудники уже открыли новость.", "Everyone has already opened the news.")}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-[22px] border border-[rgba(148,163,184,0.16)] bg-white/88 px-4 py-5 text-sm text-[color:var(--muted-foreground)]">
                            {localize(locale, "Получателей пока нет.", "No recipients yet.")}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : null}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {isManagerView ? (
        <Dialog onOpenChange={(open) => !open && setDeleteTarget(null)} open={Boolean(deleteTarget)}>
          <DialogContent className="animate-fade-in max-w-[480px] rounded-[28px]">
            <DialogHeader className="pr-10">
              <DialogTitle>{localize(locale, "Удалить новость?", "Delete news item?")}</DialogTitle>
              <DialogDescription>
                {deleteTarget
                  ? localize(
                      locale,
                      `Вы точно хотите удалить «${deleteTarget.title}»?`,
                      `Are you sure you want to delete "${deleteTarget.title}"?`,
                    )
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setDeleteTarget(null)} type="button" variant="ghost">
                {localize(locale, "Отмена", "Cancel")}
              </Button>
              <Button
                className="bg-rose-600 text-white hover:bg-rose-700"
                disabled={submitting || !deleteTarget}
                onClick={() => (deleteTarget ? void handleDelete(deleteTarget.id) : undefined)}
                type="button"
              >
                {localize(locale, "Удалить", "Delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <div className="flex flex-col gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              className="animate-fade-in rounded-[28px] border border-[rgba(148,163,184,0.18)] bg-white/90 px-6 py-6"
              key={`news-skeleton-${index}`}
            >
              <div className="h-4 w-28 rounded-full bg-slate-100" />
              <div className="mt-4 h-8 w-3/5 rounded-full bg-slate-100" />
              <div className="mt-3 h-4 w-full rounded-full bg-slate-100" />
              <div className="mt-2 h-4 w-4/5 rounded-full bg-slate-100" />
            </div>
          ))
        ) : orderedItems.length ? (
          <div className="overflow-hidden rounded-[28px] border border-[rgba(148,163,184,0.18)] bg-white/94 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            {orderedItems.map((item, index) => {
              const isExpanded = expandedId === item.id;
              const preview =
                item.body.length > 220 ? `${item.body.slice(0, 220).trim()}…` : item.body;
              const readCount = item.readRecipients ?? 0;
              const totalCount = item.totalRecipients ?? 0;
              const isReadMuted = !isManagerView && Boolean(item.isRead) && !isExpanded;
              const showUnreadIndicator = !isManagerView && !item.isRead;

              return (
                <div key={item.id}>
                  <article
                    className={`animate-fade-in px-6 py-6 transition-[background-color,opacity,box-shadow] duration-200 ${
                      isExpanded
                        ? "bg-[rgba(239,246,255,0.78)]"
                        : isReadMuted
                          ? "bg-slate-50/90 opacity-75"
                          : "bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <button className="min-w-0 flex-1 text-left transition-opacity duration-200 hover:opacity-95" onClick={() => void handleToggleExpand(item)} type="button">
                        <div className="min-w-0">
                          <div className={`flex flex-wrap items-center gap-2 ${!isManagerView ? "pl-6" : ""}`}>
                            {item.isPinned ? (
                              <Pin className="size-3.5 rotate-45 text-sky-600" />
                            ) : null}
                            <span className="text-sm text-[color:var(--muted-foreground)]">
                              {formatNewsMetaLine(item, locale)}
                            </span>
                          </div>
                          <div className="relative mt-2 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              {!isManagerView ? (
                                <span className="absolute left-0 top-2 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                                  {showUnreadIndicator ? <UnreadPulseDot /> : null}
                                </span>
                              ) : null}
                              <h2 className={`min-w-0 ${!isManagerView ? "pl-6" : ""} text-2xl font-semibold tracking-[-0.04em] ${isReadMuted ? "text-slate-500" : "text-[color:var(--foreground)]"}`}>
                                {item.title}
                              </h2>
                            </div>
                          </div>
                        </div>
                        {!isExpanded && isManagerView ? (
                          <p className="mt-4 pr-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                            {preview}
                          </p>
                        ) : null}
                      </button>
 
                      {isManagerView ? (
                        <div className="flex flex-wrap items-center gap-2 lg:pl-0">
                          <Button onClick={() => void handleToggleExpand(item)} size="icon" type="button" variant="ghost">
                            <ChevronDown
                              className={`size-5 text-[rgba(71,85,105,0.65)] transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                          <Button
                            className={item.isPinned ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/92" : undefined}
                            disabled={submitting}
                            onClick={() => void handleTogglePinned(item)}
                            size="sm"
                            type="button"
                            variant={item.isPinned ? "default" : "outline"}
                          >
                            <Pin className={`size-4 ${item.isPinned ? "rotate-45" : ""}`} />
                            {item.isPinned
                              ? localize(locale, "Открепить", "Unpin")
                              : localize(locale, "Закрепить", "Pin")}
                          </Button>
                          <Button onClick={() => startEditing(item)} size="sm" type="button" variant="outline">
                            <Pencil className="size-4" />
                            {localize(locale, "Изменить", "Edit")}
                          </Button>
                          <Button
                            className="text-rose-700"
                            disabled={submitting}
                            onClick={() => setDeleteTarget(item)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 className="size-4" />
                            {localize(locale, "Удалить", "Delete")}
                          </Button>
                        </div>
                      ) : (
                        <div className="hidden sm:block">
                          <ChevronDown
                            className={`size-5 text-[rgba(71,85,105,0.45)] transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      )}
                    </div>
 
                    {isExpanded ? (
                      <div className="mt-5 animate-fade-in border-t border-[rgba(148,163,184,0.16)] pt-5">
                        {editingId === item.id ? (
                          <div className="grid gap-3">
                            <Input
                              onChange={(event) => setEditingDraft((current) => ({ ...current, title: event.target.value }))}
                              value={editingDraft.title}
                            />
                            <Textarea
                              className="min-h-[144px]"
                              onChange={(event) => setEditingDraft((current) => ({ ...current, body: event.target.value }))}
                              value={editingDraft.body}
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-medium transition ${
                                  editingDraft.isPinned
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-[rgba(148,163,184,0.2)] bg-white text-[color:var(--foreground)]"
                                }`}
                                onClick={() => setEditingDraft((current) => ({ ...current, isPinned: !current.isPinned }))}
                                type="button"
                              >
                                <Pin className="mr-2 size-4" />
                                {localize(locale, "Важно", "Pinned")}
                              </button>
                              <Button disabled={submitting} onClick={() => void handleSaveEdit(item.id)} size="sm" type="button">
                                {localize(locale, "Сохранить", "Save")}
                              </Button>
                              <Button disabled={submitting} onClick={() => setEditingId(null)} size="sm" type="button" variant="ghost">
                                {localize(locale, "Отмена", "Cancel")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className={`grid gap-4 ${!isManagerView ? "pl-6" : ""}`}>
                            {item.imageUrl ? (
                              <div className="flex items-start gap-4">
                                <img
                                  alt=""
                                  className="h-[88px] w-[132px] shrink-0 rounded-[18px] object-cover"
                                  src={item.imageUrl}
                                />
                                <p className={`pt-1 text-sm leading-7 ${isReadMuted ? "text-slate-500" : "text-[color:var(--foreground)]"}`}>
                                  {item.body}
                                </p>
                              </div>
                            ) : (
                              <p className={`text-sm leading-7 ${isReadMuted ? "text-slate-500" : "text-[color:var(--foreground)]"}`}>
                                {item.body}
                              </p>
                            )}
                          </div>
                        )}
 
                        <div
                          className={`mt-5 flex flex-wrap items-center gap-3 text-sm text-[color:var(--muted-foreground)] ${
                            isManagerView ? "justify-start" : "justify-end"
                          }`}
                        >
                          {isManagerView ? (
                            <button
                              className="inline-flex items-center gap-2 rounded-full border border-[rgba(37,99,235,0.16)] bg-sky-50/70 px-3 py-1.5 font-medium text-sky-700 transition hover:bg-sky-100/80"
                              onClick={() => void openReaderDialog(item)}
                              type="button"
                            >
                              <Eye className="size-4" />
                              {`${readCount}/${totalCount}`}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </article>
                  {index < orderedItems.length - 1 ? <Separator className="bg-[rgba(148,163,184,0.16)]" /> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="animate-fade-in rounded-[28px] border border-[rgba(148,163,184,0.18)] bg-white/94 px-6 py-12 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <FileText className="size-6" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
              {localize(locale, "Пока новостей нет", "No news yet")}
            </h2>
            <p className="mx-auto mt-2 max-w-[44ch] text-sm leading-6 text-[color:var(--muted-foreground)]">
              {localize(
                locale,
                isManagerView
                  ? "Создай первую новость, и она сразу появится у сотрудников на телефоне и в вебе."
                  : "Когда менеджер опубликует новость, она появится здесь и в телефоне.",
                isManagerView
                  ? "Create the first update, and it will immediately appear on employee phones and in the web app."
                  : "When management publishes an update, it will appear here and on the phone.",
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
