"use client";

import Link from "next/link";
import {
  CalendarRange,
  ListTodo,
  Newspaper,
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
  onCreateEmployee?: () => void;
  onCreateNews?: () => void;
  onCreateShift?: () => void;
  onCreateTask?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const CreateDialog = ({
  actions,
  onCreateEmployee,
  onCreateNews,
  onCreateShift,
  onCreateTask,
  open,
  onOpenChange,
}: CreateDialogProps) => {
  const { locale } = useI18n();
  const defaultActions: CreateDialogAction[] = [
    {
      id: "task",
      title: locale === "ru" ? "Добавить задачу" : "Add task",
      description:
        locale === "ru"
          ? "Выбрать сотрудника и назначить новую задачу"
          : "Choose an employee and assign a new task",
      icon: ListTodo,
      onSelect: onCreateTask,
      href: onCreateTask ? undefined : toAdminHref("/tasks"),
    },
    {
      id: "employee",
      title: locale === "ru" ? "Сотрудник" : "Employee",
      description:
        locale === "ru"
          ? "Открыть окно добавления сотрудника"
          : "Open the add employee dialog",
      icon: UsersRound,
      onSelect: onCreateEmployee,
      href: onCreateEmployee ? undefined : toAdminHref("/employees"),
    },
    {
      id: "shift",
      href: onCreateShift ? undefined : toAdminHref("/schedule"),
      title: locale === "ru" ? "Смена" : "Shift",
      description:
        onCreateShift
          ? locale === "ru"
            ? "Открыть окно создания смены"
            : "Open the create shift dialog"
          : locale === "ru"
            ? "Перейти в расписание для создания смены или шаблона"
            : "Open schedule to create a shift or template",
      icon: CalendarRange,
      onSelect: onCreateShift,
    },
    {
      id: "news",
      title: locale === "ru" ? "Добавить новость" : "Add news",
      description:
        locale === "ru"
          ? "Открыть окно создания новости"
          : "Open the create news dialog",
      icon: Newspaper,
      onSelect: onCreateNews,
      href: onCreateNews ? undefined : toAdminHref("/news?create=1"),
    },
  ];
  const actionHandlers: Record<string, (() => void) | undefined> = {
    employee: onCreateEmployee,
    news: onCreateNews,
    shift: onCreateShift,
    task: onCreateTask,
  };
  const items = (actions ?? defaultActions).map((action) => {
    const onSelect = action.onSelect ?? actionHandlers[action.id];

    return onSelect
      ? {
          ...action,
          href: undefined,
          onSelect,
        }
      : action;
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {locale === "ru" ? "Создать" : "Create"}
          </DialogTitle>
          <DialogDescription>
            {locale === "ru"
              ? "Выберите, что хотите создать"
              : "Choose what you want to create"}
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
                  <Icon className="size-5 text-[color:var(--accent)]" />
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
                <Icon className="size-5 text-[color:var(--accent)]" />
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
