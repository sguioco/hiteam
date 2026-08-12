"use client";

import type { InvitationRecord } from "@smart/types";
import { Check, Copy, ExternalLink, MailCheck, MailWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type InvitationDeliveryDialogProps = {
  invitation: InvitationRecord | null;
  locale: "ru" | "en";
  onOpenChange: (open: boolean) => void;
};

function localize(locale: "ru" | "en", ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

export function InvitationDeliveryDialog({
  invitation,
  locale,
  onOpenChange,
}: InvitationDeliveryDialogProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const invitationUrl = invitation?.invitationUrl ?? "";
  const deliveryAccepted = invitation?.emailDeliveryStatus === "accepted";

  useEffect(() => {
    setCopied(false);
    setCopyError(false);
  }, [invitation?.id, invitationUrl]);

  async function copyInvitationUrl() {
    if (!invitationUrl) return;

    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(invitation)}>
      <DialogContent className="w-[min(560px,calc(100vw-1.5rem))] max-w-none rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-5 sm:p-7">
        <DialogHeader>
          <div
            className={`mb-2 flex h-12 w-12 items-center justify-center rounded-2xl ${
              deliveryAccepted
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {deliveryAccepted ? (
              <MailCheck className="h-5 w-5" />
            ) : (
              <MailWarning className="h-5 w-5" />
            )}
          </div>
          <DialogTitle className="font-heading text-2xl">
            {localize(locale, "Приглашение готово", "Invitation is ready")}
          </DialogTitle>
          <DialogDescription className="font-heading leading-6">
            {deliveryAccepted
              ? localize(
                  locale,
                  "Почтовый сервер принял письмо. На случай фильтрации почтой отправьте сотруднику ссылку напрямую.",
                  "The mail server accepted the email. Share the direct link as a fallback in case it is filtered.",
                )
              : localize(
                  locale,
                  "Почтовый провайдер не подтвердил отправку. Передайте сотруднику прямую ссылку.",
                  "The email provider did not confirm delivery. Share the direct link with the employee.",
                )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <label className="text-sm font-heading font-semibold text-foreground">
            {localize(locale, "Ссылка для регистрации", "Registration link")}
          </label>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              aria-label={localize(locale, "Ссылка для регистрации", "Registration link")}
              className="h-11 rounded-xl bg-secondary/30 font-mono text-xs"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              value={invitationUrl}
            />
            <Button
              className="h-11 rounded-xl font-heading active:scale-[0.98]"
              disabled={!invitationUrl}
              onClick={() => void copyInvitationUrl()}
              type="button"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied
                ? localize(locale, "Скопировано", "Copied")
                : localize(locale, "Копировать", "Copy")}
            </Button>
          </div>
          {copyError ? (
            <p className="text-xs font-heading text-amber-700">
              {localize(
                locale,
                "Не удалось скопировать автоматически. Выделите ссылку в поле выше.",
                "Automatic copy failed. Select the link in the field above.",
              )}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            className="rounded-xl font-heading"
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            {localize(locale, "Готово", "Done")}
          </Button>
          {invitationUrl ? (
            <Button asChild className="rounded-xl font-heading" variant="outline">
              <a href={invitationUrl} rel="noreferrer" target="_blank">
                <ExternalLink className="h-4 w-4" />
                {localize(locale, "Проверить ссылку", "Test link")}
              </a>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
