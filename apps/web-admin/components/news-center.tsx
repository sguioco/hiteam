"use client";

import {
  AnnouncementItem,
  AnnouncementReadReceipt,
} from "@smart/types";
import {
  BarChart3,
  ChevronDown,
  FileText,
  Pencil,
  Pin,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toAdminHref } from "@/lib/admin-routes";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Locale, useI18n } from "@/lib/i18n";

type NewsCenterProps = {
  mode: "manager" | "employee";
};

type NewsDraft = {
  title: string;
  body: string;
  isPinned: boolean;
};

const EMPTY_DRAFT: NewsDraft = {
  title: "",
  body: "",
  isPinned: false,
};

function localize(locale: Locale, ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function formatDate(value: string, locale: Locale) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
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
) {
  if (!employee) {
    return null;
  }

  return [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim() || null;
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

export function NewsCenter({ mode }: NewsCenterProps) {
  const { locale } = useI18n();
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementItem | null>(null);
  const [draft, setDraft] = useState<NewsDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<NewsDraft>(EMPTY_DRAFT);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [readersOpenId, setReadersOpenId] = useState<string | null>(null);
  const [readersLoadingId, setReadersLoadingId] = useState<string | null>(null);
  const [readerMap, setReaderMap] = useState<Record<string, AnnouncementReadReceipt[]>>({});
  const isManagerView = mode === "manager";

  async function loadItems() {
    const session = getSession();
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
    void loadItems();
  }, [isManagerView]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

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

    setSubmitting(true);
    setError(null);

    try {
      const created = await apiRequest<AnnouncementItem>("/collaboration/announcements", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          audience: "ALL",
          title: draft.title.trim(),
          body: draft.body.trim(),
          isPinned: draft.isPinned,
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
      if (readersOpenId === announcementId) {
        setReadersOpenId(null);
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

  async function toggleReaders(announcementId: string) {
    if (readersOpenId === announcementId) {
      setReadersOpenId(null);
      return;
    }

    setReadersOpenId(announcementId);
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
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)] md:text-4xl">
              {localize(locale, "Новости", "News")}
            </h1>
            <span className="text-xl font-semibold tracking-[-0.04em] text-[rgba(71,85,105,0.62)] md:text-2xl">
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
            <Button onClick={() => setStatsOpen(true)} type="button" variant="outline">
              <BarChart3 className="size-4" />
              {localize(locale, "Статистика", "Statistics")}
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
            }
          }}
          open={createOpen}
        >
          <DialogContent className="animate-fade-in w-[min(760px,calc(100vw-1.5rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-0">
            <div className="px-6 py-6">
              <DialogHeader className="gap-2 pr-10">
                <DialogTitle>{localize(locale, "Создать новость", "Create news")}</DialogTitle>
                <DialogDescription>
                  {localize(
                    locale,
                    "Заголовок, текст и отметка важности. После публикации новость сразу появится у сотрудников.",
                    "Add a title, body, and optional importance flag. After publishing, the news item will appear immediately for employees.",
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
                <button
                  className={`inline-flex h-11 w-fit items-center justify-center rounded-2xl border px-4 text-sm font-medium transition ${
                    draft.isPinned
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-[rgba(148,163,184,0.2)] bg-white text-[color:var(--foreground)]"
                  }`}
                  onClick={() => setDraft((current) => ({ ...current, isPinned: !current.isPinned }))}
                  type="button"
                >
                  <Pin className="mr-2 size-4" />
                  {localize(locale, "Важно", "Pinned")}
                </button>
              </div>
            </div>

            <DialogFooter className="border-t border-[color:var(--border)] px-6 py-4 sm:justify-between">
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
        <Dialog onOpenChange={setStatsOpen} open={statsOpen}>
          <DialogContent className="animate-fade-in w-[min(920px,calc(100vw-1.5rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-0">
            <div className="px-6 py-6">
              <DialogHeader className="gap-2 pr-10">
                <DialogTitle>{localize(locale, "Статистика новостей", "News statistics")}</DialogTitle>
                <DialogDescription>
                  {localize(
                    locale,
                    "Кто прочитал каждую новость и сколько сотрудников ещё не открыли её.",
                    "See who read each news item and how many recipients have not opened it yet.",
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 grid gap-3">
                {orderedItems.map((item) => {
                  const readers = readerMap[item.id] ?? [];
                  const readCount = item.readRecipients ?? 0;
                  const totalCount = item.totalRecipients ?? 0;
                  const authorLabel = formatEmployeeName(item.authorEmployee);

                  return (
                    <div
                      className="animate-fade-in rounded-[22px] border border-[rgba(148,163,184,0.18)] bg-white/92 px-4 py-4 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_36px_rgba(15,23,42,0.06)]"
                      key={`stats-${item.id}`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.isPinned ? (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-[0.72rem] font-semibold text-amber-700">
                                {localize(locale, "Важно", "Pinned")}
                              </span>
                            ) : null}
                            <span className="text-sm text-[color:var(--muted-foreground)]">
                              {authorLabel
                                ? localize(locale, `Автор: ${authorLabel}`, `Author: ${authorLabel}`)
                                : localize(locale, "Автор неизвестен", "Unknown author")}
                            </span>
                          </div>
                          <div className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                            {item.title}
                          </div>
                          <div className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                            {localize(
                              locale,
                              `${readCount}/${totalCount} прочитали · ${Math.max(0, totalCount - readCount)} не прочитали`,
                              `${readCount}/${totalCount} read · ${Math.max(0, totalCount - readCount)} unread`,
                            )}
                          </div>
                        </div>
                        <Button onClick={() => void toggleReaders(item.id)} size="sm" type="button" variant="outline">
                          {readersOpenId === item.id
                            ? localize(locale, "Скрыть список", "Hide list")
                            : localize(locale, "Кто прочитал", "Who read")}
                        </Button>
                      </div>

                      {readersOpenId === item.id ? (
                        <div className="mt-4 grid gap-2 border-t border-[rgba(148,163,184,0.16)] pt-4">
                          {readersLoadingId === item.id ? (
                            <div className="text-sm text-[color:var(--muted-foreground)]">
                              {localize(locale, "Загружаю сотрудников…", "Loading readers…")}
                            </div>
                          ) : readers.length ? (
                            readers.map((reader) => (
                              <div
                                className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(148,163,184,0.14)] bg-white px-4 py-3"
                                key={reader.notificationId}
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                    <UserRound className="size-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate font-medium text-[color:var(--foreground)]">
                                      {formatEmployeeName(reader) ?? localize(locale, "Без имени", "Unnamed")}
                                    </div>
                                    <div className="text-sm text-[color:var(--muted-foreground)]">
                                      {reader.employeeNumber ?? localize(locale, "Без номера", "No number")}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-sm text-[color:var(--muted-foreground)]">
                                  {reader.isRead
                                    ? localize(
                                        locale,
                                        `Прочитано ${reader.readAt ? formatDate(reader.readAt, locale) : ""}`.trim(),
                                        `Read ${reader.readAt ? formatDate(reader.readAt, locale) : ""}`.trim(),
                                      )
                                    : localize(locale, "Не открывал", "Not opened")}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-[color:var(--muted-foreground)]">
                              {localize(locale, "Получателей пока нет.", "No recipients yet.")}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
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
          orderedItems.map((item) => {
            const isExpanded = expandedId === item.id;
            const preview = item.body.length > 220 ? `${item.body.slice(0, 220).trim()}…` : item.body;
            const readCount = item.readRecipients ?? 0;
            const totalCount = item.totalRecipients ?? 0;

            return (
              <article
                className={`animate-fade-in rounded-[28px] border px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition-[transform,box-shadow,border-color,background-color,opacity] duration-200 hover:-translate-y-[1px] hover:shadow-[0_24px_52px_rgba(15,23,42,0.08)] ${
                  !isManagerView && item.isRead
                    ? "border-[rgba(203,213,225,0.7)] bg-slate-50 text-slate-500 opacity-80"
                    : "border-[rgba(148,163,184,0.18)] bg-white"
                }`}
                key={item.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <button className="min-w-0 flex-1 text-left transition-opacity duration-200 hover:opacity-95" onClick={() => void handleToggleExpand(item)} type="button">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                          isManagerView ? "bg-sky-400" : item.isRead ? "bg-emerald-500" : "bg-sky-500"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.isPinned ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-[0.72rem] font-semibold text-amber-700">
                              {localize(locale, "Важно", "Pinned")}
                            </span>
                          ) : null}
                          <span className="text-sm text-[color:var(--muted-foreground)]">
                            {isManagerView
                              ? localize(
                                  locale,
                                  `Автор: ${formatEmployeeName(item.authorEmployee) ?? "Неизвестно"} · ${formatDate(item.createdAt, locale)}`,
                                  `Author: ${formatEmployeeName(item.authorEmployee) ?? "Unknown"} · ${formatDate(item.createdAt, locale)}`,
                                )
                              : `${formatDate(item.createdAt, locale)} · ${formatEmployeeName(item.authorEmployee) ?? "Unknown"}`}
                          </span>
                          {isManagerView ? (
                            <span className="text-sm text-[color:var(--muted-foreground)]">
                              {localize(locale, `${readCount}/${totalCount} прочитали`, `${readCount}/${totalCount} read`)}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex items-start justify-between gap-3">
                          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                            {item.title}
                          </h2>
                        </div>
                      </div>
                    </div>
                    {!isExpanded && isManagerView ? (
                      <p className="mt-4 pl-[22px] pr-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                        {preview}
                      </p>
                    ) : null}
                  </button>

                  {isManagerView ? (
                    <div className="flex flex-wrap items-center gap-2 pl-[22px] lg:pl-0">
                      <Button onClick={() => void handleToggleExpand(item)} size="icon" type="button" variant="ghost">
                        <ChevronDown
                          className={`size-5 text-[rgba(71,85,105,0.65)] transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </Button>
                      <Button
                        disabled={submitting}
                        onClick={() => void handleTogglePinned(item)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Pin className="size-4" />
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
                      <div className="grid gap-4">
                        {item.imageUrl ? (
                          <img
                            alt=""
                            className="w-full rounded-[24px] object-cover"
                            src={item.imageUrl}
                            style={{
                              aspectRatio:
                                item.imageAspectRatio === "1:1"
                                  ? "1 / 1"
                                  : item.imageAspectRatio === "4:3"
                                    ? "4 / 3"
                                    : "16 / 9",
                            }}
                          />
                        ) : null}
                        <p className="text-sm leading-7 text-[color:var(--foreground)]">{item.body}</p>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--muted-foreground)]">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-2">
                          <FileText className="size-4" />
                          {formatDate(item.createdAt, locale)}
                        </span>
                        <span>
                          {localize(
                            locale,
                            `Автор: ${item.authorEmployee.firstName} ${item.authorEmployee.lastName}`,
                            `Author: ${item.authorEmployee.firstName} ${item.authorEmployee.lastName}`,
                          )}
                        </span>
                      </div>
                      {!isManagerView && item.readAt ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[0.72rem] font-semibold text-emerald-700">
                          {localize(locale, `Открыто ${formatDate(item.readAt, locale)}`, `Opened ${formatDate(item.readAt, locale)}`)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
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
