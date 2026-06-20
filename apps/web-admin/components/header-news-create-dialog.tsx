"use client";

import type { AnnouncementItem } from "@smart/types";
import { Bell, Newspaper } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api";
import type { AuthSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

type HeaderNewsCreateDialogProps = {
  onCreated?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  session: AuthSession | null;
};

function localize(locale: "ru" | "en", ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

export function HeaderNewsCreateDialog({
  onCreated,
  onOpenChange,
  open,
  session,
}: HeaderNewsCreateDialogProps) {
  const { locale } = useI18n();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notifyParticipants, setNotifyParticipants] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle("");
    setBody("");
    setNotifyParticipants(false);
    setError(null);
  }, [open]);

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }

    if (!title.trim() || !body.trim()) {
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
      await apiRequest<AnnouncementItem>("/collaboration/announcements", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({
          audience: "ALL",
          title: title.trim(),
          body: body.trim(),
          isPinned: false,
          notifyParticipants,
        }),
      });

      onOpenChange(false);
      onCreated?.();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : localize(locale, "Не удалось создать новость.", "Failed to create news."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="w-[min(640px,calc(100vw-2rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)]">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(37,99,235,0.1)] text-[color:var(--accent)]">
            <Newspaper className="h-5 w-5" />
          </div>
          <DialogTitle className="font-heading text-2xl">
            {localize(locale, "Создать новость", "Create news")}
          </DialogTitle>
          <DialogDescription className="font-heading">
            {localize(
              locale,
              "Новость будет опубликована для всех сотрудников текущей компании.",
              "The news item will be published for all employees in the current company.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-heading">
            <span>{localize(locale, "Заголовок", "Title")}</span>
            <Input
              onChange={(event) => setTitle(event.target.value)}
              placeholder={localize(locale, "Например, График на неделю", "For example, Weekly schedule")}
              value={title}
            />
          </label>

          <label className="grid gap-2 text-sm font-heading">
            <span>{localize(locale, "Текст", "Body")}</span>
            <Textarea
              className="min-h-[170px]"
              onChange={(event) => setBody(event.target.value)}
              placeholder={localize(
                locale,
                "Напишите текст новости для команды.",
                "Write the news text for the team.",
              )}
              value={body}
            />
          </label>

          <label className="inline-flex cursor-pointer items-center gap-3 justify-self-start text-sm font-heading">
            <Checkbox
              checked={notifyParticipants}
              onCheckedChange={(checked) => setNotifyParticipants(checked === true)}
            />
            <span className="inline-flex items-center gap-2">
              <Bell className="h-4 w-4 text-[color:var(--accent)]" />
              {localize(locale, "Отправить уведомление", "Send notification")}
            </span>
          </label>

          {error ? <div className="error-box">{error}</div> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              className="rounded-xl font-heading"
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              {localize(locale, "Отмена", "Cancel")}
            </Button>
            <Button
              className="rounded-xl font-heading"
              disabled={submitting || !title.trim() || !body.trim()}
              onClick={() => void handleSubmit()}
              type="button"
            >
              {submitting
                ? localize(locale, "Публикуем...", "Publishing...")
                : localize(locale, "Опубликовать", "Publish")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
