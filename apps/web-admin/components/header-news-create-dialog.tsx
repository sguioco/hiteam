"use client";

import type {
  AnnouncementAttachmentItem,
  AnnouncementAttachmentLocation,
  AnnouncementImageAspectRatio,
  AnnouncementItem,
  NewsBootstrapResponse,
  WorkGroupItem,
} from "@smart/types";
import {
  Bell,
  CalendarClock,
  FileText,
  ImagePlus,
  Link2,
  MapPin,
  Paperclip,
  Users,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Toggle } from "@/components/base/toggle/toggle";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageAdjustField } from "@/components/image-adjust-field";
import { Input } from "@/components/ui/input";
import { LocationMapPicker } from "@/components/location-map-picker";
import { AppSelectField } from "@/components/ui/select";
import {
  TaskDatePicker,
  TaskTimePicker,
} from "@/components/task-schedule-pickers";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api";
import type { AuthSession } from "@/lib/auth";
import { type Locale, useI18n } from "@/lib/i18n";

type HeaderNewsCreateDialogProps = {
  onCreated?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  session: AuthSession | null;
};

type NewsAttachmentDraft = Pick<
  AnnouncementAttachmentItem,
  "contentType" | "fileName" | "sizeBytes"
> & {
  dataUrl: string;
};

type NewsLocationDraft = Omit<
  AnnouncementAttachmentLocation,
  "latitude" | "longitude" | "placeId"
> & {
  latitude: string;
  longitude: string;
  placeId: string;
};

type NewsDraft = {
  attachmentLocation: NewsLocationDraft | null;
  attachments: NewsAttachmentDraft[];
  title: string;
  body: string;
  linkUrl: string;
  isPinned: boolean;
  notifyParticipants: boolean;
  limitParticipants: boolean;
  participantScope: "GROUP" | "EMPLOYEE";
  groupIds: string[];
  targetEmployeeIds: string[];
  imageDataUrl: string | null;
  imageAspectRatio: AnnouncementImageAspectRatio;
  imageFileName: string;
  scheduleEnabled: boolean;
  scheduledDate: string;
  scheduledTime: string;
};

type CreateOptionalSection = "link" | "documents" | "location";
type CreateOptionalSections = Record<CreateOptionalSection, boolean>;

type NewsCenterEmployeeItem = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
};

const EMPTY_DRAFT: NewsDraft = {
  attachmentLocation: null,
  attachments: [],
  title: "",
  body: "",
  linkUrl: "",
  isPinned: false,
  notifyParticipants: false,
  limitParticipants: false,
  participantScope: "GROUP",
  groupIds: [],
  targetEmployeeIds: [],
  imageDataUrl: null,
  imageAspectRatio: "16:9",
  imageFileName: "",
  scheduleEnabled: false,
  scheduledDate: "",
  scheduledTime: "09:00",
};

const EMPTY_CREATE_OPTIONAL_SECTIONS: CreateOptionalSections = {
  documents: false,
  link: false,
  location: false,
};

const ANNOUNCEMENT_ATTACHMENT_LIMIT = 5;
const ANNOUNCEMENT_DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip,.rar,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/x-zip-compressed";

function localize(locale: Locale, ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatAbsoluteDateTime(value: string, locale: Locale) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    year: parsed.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function formatAttachmentSize(sizeBytes: number | null, locale: Locale) {
  if (!sizeBytes || sizeBytes <= 0) {
    return null;
  }

  if (sizeBytes < 1024 * 1024) {
    const value = Math.max(1, Math.round(sizeBytes / 1024));
    return locale === "ru" ? `${value} КБ` : `${value} KB`;
  }

  const value = sizeBytes / (1024 * 1024);
  return locale === "ru"
    ? `${value.toFixed(1)} МБ`
    : `${value.toFixed(1)} MB`;
}

function normalizeAnnouncementLink(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
}

function buildScheduledAnnouncementIso(dateValue: string, timeValue: string) {
  if (!dateValue) {
    return null;
  }

  const parsed = new Date(`${dateValue}T${timeValue || "09:00"}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read file."));
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
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

type NewsComposeOptionProps = {
  action?: ReactNode;
  children?: ReactNode;
  checked: boolean;
  description?: ReactNode;
  icon: ReactNode;
  onCheckedChange: (checked: boolean) => void;
  title: string;
};

function NewsComposeOption({
  action,
  children,
  checked,
  description,
  icon,
  onCheckedChange,
  title,
}: NewsComposeOptionProps) {
  return (
    <section className="py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Toggle
            aria-label={title}
            className="shrink-0"
            isSelected={checked}
            onChange={onCheckedChange}
            size="sm"
            slim
          />
          <span className="flex size-5 shrink-0 items-center justify-center text-sky-700">
            {icon}
          </span>
          <div className="min-w-0 text-sm font-semibold text-[color:var(--foreground)]">
            {title}
          </div>
        </div>
        {checked && action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {checked && (description || children) ? (
        <div className="mt-3 grid gap-3 pl-[68px] max-sm:pl-0">
          {description ? (
            <div className="text-sm leading-6 text-[color:var(--muted-foreground)]">
              {description}
            </div>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function HeaderNewsCreateDialog({
  onCreated,
  onOpenChange,
  open,
  session,
}: HeaderNewsCreateDialogProps) {
  const { locale } = useI18n();
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [draft, setDraft] = useState<NewsDraft>(EMPTY_DRAFT);
  const [createOptionalSections, setCreateOptionalSections] =
    useState<CreateOptionalSections>(EMPTY_CREATE_OPTIONAL_SECTIONS);
  const [employees, setEmployees] = useState<NewsCenterEmployeeItem[]>([]);
  const [groups, setGroups] = useState<WorkGroupItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setDraft(EMPTY_DRAFT);
    setCreateOptionalSections(EMPTY_CREATE_OPTIONAL_SECTIONS);
    setError(null);
    setSubmitting(false);
  }

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !session?.accessToken) {
      return;
    }

    let active = true;
    setDirectoryLoading(true);

    void apiRequest<NewsBootstrapResponse<NewsCenterEmployeeItem>>(
      "/bootstrap/news",
      {
        token: session.accessToken,
        skipClientCache: true,
      },
    )
      .then((snapshot) => {
        if (!active) return;
        setEmployees(snapshot.initialData.employees ?? []);
        setGroups(snapshot.initialData.groups ?? []);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : localize(locale, "Не удалось загрузить получателей.", "Unable to load recipients."),
        );
      })
      .finally(() => {
        if (active) {
          setDirectoryLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [locale, open, session?.accessToken]);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  }

  function toggleCreateOptionalSection(section: CreateOptionalSection, checked: boolean) {
    setCreateOptionalSections((current) => ({
      ...current,
      [section]: checked,
    }));

    if (checked) {
      return;
    }

    setDraft((current) => {
      if (section === "link") {
        return { ...current, linkUrl: "" };
      }

      if (section === "documents") {
        return { ...current, attachments: [] };
      }

      return { ...current, attachmentLocation: null };
    });
  }

  async function handleDraftAttachmentSelection(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    const remainingSlots = Math.max(
      0,
      ANNOUNCEMENT_ATTACHMENT_LIMIT - draft.attachments.length,
    );
    if (remainingSlots === 0) {
      setError(
        localize(
          locale,
          `Можно прикрепить максимум ${ANNOUNCEMENT_ATTACHMENT_LIMIT} документов.`,
          `You can attach up to ${ANNOUNCEMENT_ATTACHMENT_LIMIT} documents.`,
        ),
      );
      return;
    }

    const selectedFiles = Array.from(fileList).slice(0, remainingSlots);

    try {
      const nextAttachments = await Promise.all(
        selectedFiles.map(async (file) => ({
          contentType: file.type || null,
          dataUrl: await readFileAsDataUrl(file),
          fileName: file.name,
          sizeBytes: Number.isFinite(file.size) ? file.size : null,
        })),
      );

      setDraft((current) => ({
        ...current,
        attachments: [...current.attachments, ...nextAttachments].slice(
          0,
          ANNOUNCEMENT_ATTACHMENT_LIMIT,
        ),
      }));

      if (selectedFiles.length !== fileList.length) {
        setError(
          localize(
            locale,
            `Лишние файлы пропущены. Лимит: ${ANNOUNCEMENT_ATTACHMENT_LIMIT}.`,
            `Extra files were skipped. Limit: ${ANNOUNCEMENT_ATTACHMENT_LIMIT}.`,
          ),
        );
      }
    } catch (attachmentError) {
      setError(
        attachmentError instanceof Error
          ? attachmentError.message
          : localize(
              locale,
              "Не удалось прочитать выбранные файлы.",
              "Unable to read the selected files.",
            ),
      );
    }
  }

  async function handleCreate() {
    if (!session?.accessToken) {
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

    if (draft.scheduleEnabled && !draft.scheduledDate) {
      setError(
        localize(
          locale,
          "Укажи дату запланированной публикации.",
          "Choose a scheduled publication date.",
        ),
      );
      return;
    }

    const scheduledFor = draft.scheduleEnabled
      ? buildScheduledAnnouncementIso(draft.scheduledDate, draft.scheduledTime)
      : null;
    if (draft.scheduleEnabled && !scheduledFor) {
      setError(
        localize(
          locale,
          "Не удалось распознать дату или время публикации.",
          "Unable to parse the selected publication date or time.",
        ),
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const normalizedGroupIds = Array.from(new Set(draft.groupIds));
      const normalizedTargetEmployeeIds = Array.from(
        new Set(draft.targetEmployeeIds),
      );

      await apiRequest<AnnouncementItem>("/collaboration/announcements", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          audience: draft.limitParticipants ? draft.participantScope : "ALL",
          title: draft.title.trim(),
          body: draft.body.trim(),
          isPinned: false,
          notifyParticipants: draft.notifyParticipants,
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
          ...(normalizeAnnouncementLink(draft.linkUrl)
            ? {
                linkUrl: normalizeAnnouncementLink(draft.linkUrl),
              }
            : {}),
          ...(draft.attachmentLocation
            ? {
                attachmentLocation: {
                  address: draft.attachmentLocation.address,
                  latitude: Number(draft.attachmentLocation.latitude),
                  longitude: Number(draft.attachmentLocation.longitude),
                  ...(draft.attachmentLocation.placeId
                    ? { placeId: draft.attachmentLocation.placeId }
                    : {}),
                },
              }
            : {}),
          ...(draft.attachments.length
            ? {
                attachments: draft.attachments.map((attachment) => ({
                  dataUrl: attachment.dataUrl,
                  fileName: attachment.fileName,
                })),
              }
            : {}),
          ...(scheduledFor ? { scheduledFor } : {}),
        }),
      });

      handleOpenChange(false);
      onCreated?.();
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

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="animate-fade-in flex h-[min(88vh,920px)] w-[min(760px,calc(100vw-1.5rem))] max-w-none flex-col overflow-hidden rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-0">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <DialogHeader className="gap-2 pr-10">
            <DialogTitle>{localize(locale, "Создать новость", "Create news")}</DialogTitle>
            <DialogDescription>
              {localize(
                locale,
                "Добавь заголовок, текст, фото, документы, ссылку, геолокацию, получателей и при необходимости отложенную публикацию.",
                "Add a title, body, photo, documents, a link, geolocation, recipients, and an optional scheduled publication.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid gap-3">
            <Input
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder={localize(locale, "Заголовок новости", "News title")}
              value={draft.title}
            />
            <Textarea
              className="min-h-[180px]"
              onChange={(event) =>
                setDraft((current) => ({ ...current, body: event.target.value }))
              }
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

            <div className="divide-y divide-[rgba(148,163,184,0.22)] border-y border-[rgba(148,163,184,0.22)]">
              <NewsComposeOption
                checked={createOptionalSections.link}
                icon={<Link2 className="size-4" />}
                onCheckedChange={(checked) => toggleCreateOptionalSection("link", checked)}
                title={localize(locale, "Ссылка", "Link")}
              >
                <Input
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      linkUrl: event.target.value,
                    }))
                  }
                  placeholder={localize(
                    locale,
                    "https://example.com или домен без https",
                    "https://example.com or a domain without https",
                  )}
                  value={draft.linkUrl}
                />
              </NewsComposeOption>

              <NewsComposeOption
                checked={createOptionalSections.documents}
                icon={<Paperclip className="size-4" />}
                onCheckedChange={(checked) => toggleCreateOptionalSection("documents", checked)}
                title={localize(locale, "Документы", "Documents")}
              >
                <label className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-dashed border-[rgba(148,163,184,0.35)] bg-slate-50/70 px-4 py-4 transition hover:border-sky-300 hover:bg-sky-50/70">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sky-700 shadow-sm">
                    <FileText className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[color:var(--foreground)]">
                      {localize(locale, "Добавить файлы", "Add files")}
                    </span>
                    <span className="mt-1 block text-sm text-[color:var(--muted-foreground)]">
                      {localize(
                        locale,
                        "PDF, Excel, Word, CSV, TXT, ZIP и другие документы.",
                        "PDF, Excel, Word, CSV, TXT, ZIP, and other documents.",
                      )}
                    </span>
                  </span>
                  <input
                    accept={ANNOUNCEMENT_DOCUMENT_ACCEPT}
                    className="hidden"
                    multiple
                    onChange={(event) => {
                      void handleDraftAttachmentSelection(event.target.files);
                      event.currentTarget.value = "";
                    }}
                    type="file"
                  />
                </label>

                {draft.attachments.length ? (
                  <div className="grid gap-2">
                    {draft.attachments.map((attachment, index) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(148,163,184,0.16)] bg-slate-50/70 px-3 py-3"
                        key={`${attachment.fileName}-${index}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-[color:var(--foreground)]">
                            {attachment.fileName}
                          </div>
                          <div className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                            {formatAttachmentSize(attachment.sizeBytes, locale) ??
                              localize(locale, "Документ", "Document")}
                          </div>
                        </div>
                        <Button
                          className="text-rose-700"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              attachments: current.attachments.filter(
                                (_, attachmentIndex) => attachmentIndex !== index,
                              ),
                            }))
                          }
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <X className="size-4" />
                          {localize(locale, "Убрать", "Remove")}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </NewsComposeOption>

              <NewsComposeOption
                action={
                  draft.attachmentLocation ? (
                    <Button
                      className="text-rose-700"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          attachmentLocation: null,
                        }))
                      }
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <X className="size-4" />
                      {localize(locale, "Очистить", "Clear")}
                    </Button>
                  ) : null
                }
                checked={createOptionalSections.location}
                description={localize(
                  locale,
                  "Можно выбрать адрес через Google Maps или поставить точку по текущему местоположению.",
                  "Pick an address via Google Maps or place a point using the current location.",
                )}
                icon={<MapPin className="size-4" />}
                onCheckedChange={(checked) => toggleCreateOptionalSection("location", checked)}
                title={localize(locale, "Геолокация", "Geolocation")}
              >
                <div className="[&_.org-map-canvas]:min-h-[260px]">
                  <LocationMapPicker
                    address={draft.attachmentLocation?.address ?? ""}
                    apiKey={mapsApiKey}
                    latitude={draft.attachmentLocation?.latitude ?? ""}
                    locale={locale}
                    longitude={draft.attachmentLocation?.longitude ?? ""}
                    onSelect={(next) =>
                      setDraft((current) => ({
                        ...current,
                        attachmentLocation: {
                          address:
                            next.address ??
                            next.details?.formattedAddress ??
                            current.attachmentLocation?.address ??
                            "",
                          latitude: next.latitude,
                          longitude: next.longitude,
                          placeId:
                            next.googlePlaceId ??
                            current.attachmentLocation?.placeId ??
                            "",
                        },
                      }))
                    }
                    searchLabel={localize(locale, "Точка для новости", "News location")}
                    searchPlaceholder={localize(
                      locale,
                      "Например, Новосибирск, Красный проспект 25",
                      "For example, Novosibirsk, Krasny Avenue 25",
                    )}
                    showCopy={false}
                  />
                </div>
              </NewsComposeOption>

              <NewsComposeOption
                checked={draft.scheduleEnabled}
                description={localize(
                  locale,
                  "Новость появится у сотрудников в выбранные дату и время.",
                  "The news will appear for employees at the selected date and time.",
                )}
                icon={<CalendarClock className="size-4" />}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    scheduleEnabled: checked,
                    scheduledDate:
                      checked && !current.scheduledDate
                        ? formatDateInput(new Date())
                        : current.scheduledDate,
                  }))
                }
                title={localize(
                  locale,
                  "Запланированная публикация",
                  "Scheduled publication",
                )}
              >
                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  <TaskDatePicker
                    buttonClassName="h-11 rounded-[16px] px-4"
                    locale={locale}
                    minToday
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        scheduledDate: value,
                      }))
                    }
                    placeholder={localize(locale, "Выбери дату", "Choose date")}
                    value={draft.scheduledDate}
                  />
                  <TaskTimePicker
                    buttonClassName="h-11 rounded-[16px] px-4"
                    locale={locale}
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        scheduledTime: value,
                      }))
                    }
                    placeholder={localize(locale, "Выбери время", "Choose time")}
                    value={draft.scheduledTime}
                  />
                </div>

                {draft.scheduledDate ? (
                  <div className="text-xs text-[color:var(--muted-foreground)]">
                    {localize(locale, "Публикация:", "Publish at:")}{" "}
                    {formatAbsoluteDateTime(
                      buildScheduledAnnouncementIso(
                        draft.scheduledDate,
                        draft.scheduledTime,
                      ) ?? new Date().toISOString(),
                      locale,
                    )}
                  </div>
                ) : null}
              </NewsComposeOption>

              <NewsComposeOption
                checked={draft.notifyParticipants}
                description={localize(
                  locale,
                  "Отправим push всем сотрудникам, которые увидят эту новость.",
                  "Send a push notification to every employee who can see this news item.",
                )}
                icon={<Bell className="size-4" />}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    notifyParticipants: checked,
                  }))
                }
                title={localize(locale, "Уведомить участников", "Notify participants")}
              />

              <NewsComposeOption
                checked={draft.limitParticipants}
                description={localize(
                  locale,
                  "Новость увидят только выбранные группы или сотрудники в одном типе выбора.",
                  "This news will be visible only to the selected groups or employees within one scope.",
                )}
                icon={<Users className="size-4" />}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    limitParticipants: checked,
                  }))
                }
                title={localize(locale, "Только для выбранных участников", "Only for selected participants")}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <AppSelectField
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        participantScope: value as "GROUP" | "EMPLOYEE",
                        groupIds: value === "GROUP" ? current.groupIds : [],
                        targetEmployeeIds:
                          value === "EMPLOYEE" ? current.targetEmployeeIds : [],
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
                        {directoryLoading ? (
                          <div className="px-3 py-2 text-sm text-[color:var(--muted-foreground)]">
                            {localize(locale, "Загружаем группы...", "Loading groups...")}
                          </div>
                        ) : groups.length ? (
                          groups.map((group) => {
                            const checked = draft.groupIds.includes(group.id);
                            return (
                              <label
                                className="flex cursor-pointer items-start gap-3 rounded-[16px] px-3 py-2 transition hover:bg-white"
                                key={group.id}
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
                        {directoryLoading ? (
                          <div className="px-3 py-2 text-sm text-[color:var(--muted-foreground)]">
                            {localize(locale, "Загружаем сотрудников...", "Loading employees...")}
                          </div>
                        ) : employees.length ? (
                          employees.map((employee) => {
                            const checked = draft.targetEmployeeIds.includes(employee.id);
                            return (
                              <label
                                className="flex cursor-pointer items-start gap-3 rounded-[16px] px-3 py-2 transition hover:bg-white"
                                key={employee.id}
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
              </NewsComposeOption>
            </div>

            {error ? (
              <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="shrink-0 bg-[color:var(--panel-strong)] px-6 py-4 sm:justify-between">
          <Button onClick={() => handleOpenChange(false)} type="button" variant="ghost">
            {localize(locale, "Отмена", "Cancel")}
          </Button>
          <Button
            disabled={submitting || !draft.title.trim() || !draft.body.trim()}
            onClick={() => void handleCreate()}
            type="button"
          >
            {submitting
              ? localize(locale, "Публикуем...", "Publishing...")
              : localize(locale, "Опубликовать", "Publish")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
