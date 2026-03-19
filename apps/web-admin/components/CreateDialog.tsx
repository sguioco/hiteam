"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  CalendarRange,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toAdminHref } from "../lib/admin-routes";
import { useI18n } from "../lib/i18n";

export type CreateDialogAction = {
  description: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  id: string;
  onSelect?: () => void;
  title: string;
};

type CreateDialogProps = {
  actions?: CreateDialogAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const CreateDialog = ({
  actions,
  open,
  onOpenChange,
}: CreateDialogProps) => {
  const { locale } = useI18n();
  const defaultActions: CreateDialogAction[] = [
    {
      id: "employee",
      href: toAdminHref("/employees"),
      title: locale === "ru" ? "Сотрудник" : "Employee",
      description:
        locale === "ru"
          ? "Открыть кадровый раздел и добавить нового сотрудника."
          : "Open the people section and add a new employee.",
      icon: UsersRound,
    },
    {
      id: "shift",
      href: toAdminHref("/schedule"),
      title: locale === "ru" ? "Смена" : "Shift",
      description:
        locale === "ru"
          ? "Перейти в расписание для создания смены или шаблона."
          : "Open schedule to create a shift or template.",
      icon: CalendarRange,
    },
    {
      id: "request",
      href: toAdminHref("/requests"),
      title: locale === "ru" ? "Запрос" : "Request",
      description:
        locale === "ru"
          ? "Открыть раздел запросов и быстро оформить новый запрос."
          : "Open requests and create a new request.",
      icon: Sparkles,
    },
    {
      id: "task-or-meeting",
      href: toAdminHref("/collaboration"),
      title: locale === "ru" ? "Задача или встреча" : "Task or meeting",
      description:
        locale === "ru"
          ? "Перейти в рабочий раздел для задач, встреч и командного взаимодействия."
          : "Open the workspace for tasks, meetings, and collaboration.",
      icon: BriefcaseBusiness,
    },
  ];
  const items = actions ?? defaultActions;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {locale === "ru" ? "Быстрое создание" : "Quick create"}
          </DialogTitle>
          <DialogDescription>
            {locale === "ru"
              ? "Выберите, что хотите создать. Откроется нужный раздел с рабочими инструментами."
              : "Choose what you want to create and open the relevant workspace."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((action) => {
            const Icon = action.icon;

            if (action.href) {
              return (
              <Link
                className="grid gap-3 rounded-[24px] border border-[color:var(--border)] bg-[rgba(246,248,252,0.84)] p-4 transition duration-150 hover:-translate-y-0.5 hover:border-[rgba(40,75,255,0.18)] hover:bg-white"
                href={action.href}
                key={action.id}
                onClick={() => onOpenChange(false)}
              >
                <span className="inline-flex size-11 items-center justify-center rounded-[16px] bg-[rgba(40,75,255,0.12)] text-[color:var(--accent)]">
                  <Icon className="size-5" />
                </span>
                <span className="grid gap-1">
                  <strong className="text-base text-[color:var(--foreground)]">
                    {action.title}
                  </strong>
                  <span className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                    {action.description}
                  </span>
                </span>
              </Link>
              );
            }

            return (
              <button
                className="grid gap-3 rounded-[24px] border border-[color:var(--border)] bg-[rgba(246,248,252,0.84)] p-4 text-left transition duration-150 hover:-translate-y-0.5 hover:border-[rgba(40,75,255,0.18)] hover:bg-white"
                key={action.id}
                onClick={() => {
                  onOpenChange(false);
                  action.onSelect?.();
                }}
                type="button"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-[16px] bg-[rgba(40,75,255,0.12)] text-[color:var(--accent)]">
                  <Icon className="size-5" />
                </span>
                <span className="grid gap-1">
                  <strong className="text-base text-[color:var(--foreground)]">
                    {action.title}
                  </strong>
                  <span className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                    {action.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
