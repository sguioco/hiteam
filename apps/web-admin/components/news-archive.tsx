"use client";

import { AnnouncementArchiveEntry } from "@smart/types";
import { ArrowLeft, FileText, Pin, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toAdminHref } from "@/lib/admin-routes";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Locale, useI18n } from "@/lib/i18n";

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

function getArchiveActionLabel(action: AnnouncementArchiveEntry["action"], locale: Locale) {
  switch (action) {
    case "announcement.created":
      return localize(locale, "Создана", "Created");
    case "announcement.generated":
      return localize(locale, "Создана автоматически", "Generated");
    case "announcement.updated":
      return localize(locale, "Изменена", "Updated");
    case "announcement.deleted":
      return localize(locale, "Удалена", "Deleted");
    default:
      return action;
  }
}

function getArchiveActionTone(action: AnnouncementArchiveEntry["action"]) {
  switch (action) {
    case "announcement.created":
      return {
        dot: "bg-sky-500",
        icon: FileText,
        iconClassName: "text-sky-600",
        line: "bg-sky-100",
      };
    case "announcement.generated":
      return {
        dot: "bg-violet-500",
        icon: Sparkles,
        iconClassName: "text-violet-600",
        line: "bg-violet-100",
      };
    case "announcement.updated":
      return {
        dot: "bg-amber-500",
        icon: Sparkles,
        iconClassName: "text-amber-600",
        line: "bg-amber-100",
      };
    case "announcement.deleted":
      return {
        dot: "bg-rose-500",
        icon: Trash2,
        iconClassName: "text-rose-600",
        line: "bg-rose-100",
      };
    default:
      return {
        dot: "bg-slate-400",
        icon: FileText,
        iconClassName: "text-slate-600",
        line: "bg-slate-100",
      };
  }
}

function formatArchiveMeta(entry: AnnouncementArchiveEntry, locale: Locale) {
  const actorName = formatEmployeeName(entry.actorEmployee) ?? localize(locale, "Система", "System");
  return locale === "ru"
    ? `${formatDate(entry.createdAt, locale)} • ${actorName}`
    : `${formatDate(entry.createdAt, locale)} by ${actorName}`;
}

function getArchiveEventSummary(entry: AnnouncementArchiveEntry, locale: Locale) {
  switch (entry.action) {
    case "announcement.created":
      return localize(locale, "Новость опубликована.", "News item published.");
    case "announcement.generated":
      return localize(locale, "Новость создана автоматически.", "News item was generated automatically.");
    case "announcement.updated":
      return localize(locale, "Новость была обновлена.", "News item was updated.");
    case "announcement.deleted":
      return localize(locale, "Новость была удалена.", "News item was deleted.");
    default:
      return getArchiveActionLabel(entry.action, locale);
  }
}

type AnnouncementArchiveGroup = {
  announcementId: string;
  events: AnnouncementArchiveEntry[];
  latestTitle: string | null;
};

type AnnouncementArchiveMergedEvent = AnnouncementArchiveEntry & {
  mergedCount: number;
};

function getArchiveEventSignature(entry: AnnouncementArchiveEntry) {
  return JSON.stringify({
    action: entry.action,
    actorId: entry.actorEmployee?.id ?? null,
    createdAt: entry.createdAt,
    isPinned: entry.isPinned ?? null,
    title: entry.title ?? null,
  });
}

function mergeArchiveEvents(events: AnnouncementArchiveEntry[]) {
  return events.reduce<AnnouncementArchiveMergedEvent[]>((accumulator, entry) => {
    const previous = accumulator[accumulator.length - 1];

    if (previous && getArchiveEventSignature(previous) === getArchiveEventSignature(entry)) {
      previous.mergedCount += 1;
      return accumulator;
    }

    accumulator.push({
      ...entry,
      mergedCount: 1,
    });
    return accumulator;
  }, []);
}

function getArchiveErrorMessage(error: unknown, locale: Locale) {
  if (error instanceof Error && error.message.includes("/collaboration/announcements/archive")) {
    return localize(
      locale,
      "Архив недоступен в текущей версии API. Нужно обновить backend.",
      "Archive is unavailable in the current API version. Backend update is required.",
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return localize(locale, "Не удалось загрузить архив.", "Unable to load archive.");
}

export function NewsArchive() {
  const { locale } = useI18n();
  const [items, setItems] = useState<AnnouncementArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const groupedItems = useMemo<AnnouncementArchiveGroup[]>(() => {
    const groups = new Map<string, AnnouncementArchiveGroup>();

    items.forEach((entry) => {
      const existing = groups.get(entry.announcementId);

      if (existing) {
        existing.events.push(entry);
        if (!existing.latestTitle && entry.title) {
          existing.latestTitle = entry.title;
        }
        return;
      }

      groups.set(entry.announcementId, {
        announcementId: entry.announcementId,
        events: [entry],
        latestTitle: entry.title,
      });
    });

    return Array.from(groups.values());
  }, [items]);

  useEffect(() => {
    async function loadArchive() {
      const session = getSession();
      if (!session) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextArchive = await apiRequest<AnnouncementArchiveEntry[]>(
          "/collaboration/announcements/archive",
          {
            token: session.accessToken,
          },
        );
        setItems(nextArchive);
      } catch (loadError) {
        setError(getArchiveErrorMessage(loadError, locale));
      } finally {
        setLoading(false);
      }
    }

    void loadArchive();
  }, [locale]);

  return (
    <section className="flex flex-col gap-5">
      <header className="animate-fade-in flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)] md:text-4xl">
              {localize(locale, "Архив новостей", "News archive")}
            </h1>
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {localize(
              locale,
              "История создания, изменений и удаления новостей.",
              "History of created, updated, and deleted news items.",
            )}
          </p>
        </div>

        <Button asChild type="button" variant="outline">
          <Link href={toAdminHref("/news")}>
            <ArrowLeft className="size-4" />
            {localize(locale, "Назад к новостям", "Back to news")}
          </Link>
        </Button>
      </header>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              className="animate-fade-in rounded-[28px] border border-[rgba(148,163,184,0.18)] bg-white/90 px-6 py-6"
              key={`archive-skeleton-${index}`}
            >
              <div className="h-4 w-28 rounded-full bg-slate-100" />
              <div className="mt-4 h-7 w-3/5 rounded-full bg-slate-100" />
              <div className="mt-3 h-4 w-2/5 rounded-full bg-slate-100" />
            </div>
          ))
        ) : groupedItems.length ? (
          <div className="overflow-hidden rounded-[28px] border border-[rgba(148,163,184,0.18)] bg-white/94 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            {groupedItems.map((group, groupIndex) => (
              <div key={group.announcementId}>
                <article className="animate-fade-in px-6 py-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                          {group.latestTitle ?? localize(locale, "Без названия", "Untitled")}
                        </div>
                        <div className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                          {localize(
                            locale,
                            `${group.events.length} событий в истории`,
                            `${group.events.length} events in history`,
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[rgba(148,163,184,0.14)] bg-slate-50/70 px-4 py-4">
                      <div className="space-y-0">
                        {mergeArchiveEvents(group.events).map((entry, eventIndex, mergedEvents) => {
                          const tone = getArchiveActionTone(entry.action);
                          const ActionIcon = tone.icon;

                          return (
                            <div key={entry.id}>
                              <div className="flex gap-4">
                                <div className="flex w-8 shrink-0 flex-col items-center">
                                  <span className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ${tone.iconClassName}`}>
                                    <ActionIcon className="size-4" />
                                  </span>
                                  {eventIndex < group.events.length - 1 ? (
                                    <span className={`mt-2 h-full min-h-[36px] w-px ${tone.line}`} />
                                  ) : null}
                                </div>

                                <div className="min-w-0 flex-1 pb-5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-[color:var(--foreground)]">
                                      {getArchiveActionLabel(entry.action, locale)}
                                    </span>
                                    {entry.mergedCount > 1 ? (
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.7rem] font-semibold text-slate-600">
                                        ×{entry.mergedCount}
                                      </span>
                                    ) : null}
                                    {entry.isPinned ? (
                                      <Pin className="size-3.5 rotate-45 text-sky-600" />
                                    ) : null}
                                  </div>

                                  <div className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                                    {formatArchiveMeta(entry, locale)}
                                  </div>

                                  <div className="mt-3 text-sm leading-6 text-[color:var(--foreground)]">
                                    {getArchiveEventSummary(entry, locale)}
                                  </div>

                                  {entry.title ? (
                                    <div className="mt-2 rounded-[18px] border border-[rgba(148,163,184,0.14)] bg-white/90 px-4 py-3 text-sm text-[color:var(--foreground)]">
                                      <span className="font-medium text-[color:var(--muted-foreground)]">
                                        {localize(locale, "Заголовок в этот момент:", "Title at that moment:")}
                                      </span>{" "}
                                      {entry.title}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              {eventIndex < mergedEvents.length - 1 ? <Separator className="my-1 bg-[rgba(148,163,184,0.14)]" /> : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </article>
                {groupIndex < groupedItems.length - 1 ? <Separator className="bg-[rgba(148,163,184,0.16)]" /> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="animate-fade-in rounded-[28px] border border-[rgba(148,163,184,0.18)] bg-white/94 px-6 py-12 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <FileText className="size-6" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
              {localize(locale, "Архив пока пуст", "Archive is empty")}
            </h2>
          </div>
        )}
      </div>
    </section>
  );
}
