"use client";

import type { ElementType } from "react";
import { useMemo, useState } from "react";
import {
  UserPlus,
  FileText,
  Palmtree,
  Handshake,
  MessageSquare,
  CalendarCheck,
  Check,
  X,
  ArrowRight,
  Flame,
  Clock,
  User,
  Calendar,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { getMockAvatarDataUrl } from "@/lib/mock-avatar";

type ActionCategory =
  | "all"
  | "decisions"
  | "documents"
  | "approvals"
  | "meetings"
  | "employees";
type Priority = "urgent" | "normal" | "low";
type ExitAction = "approve" | "reject";

interface ActionItem {
  id: number;
  category: ActionCategory;
  type: string;
  title: string;
  from: string;
  avatar: string;
  avatarUrl?: string | null;
  description: string;
  detail: string;
  time: string;
  isRelativeTime?: boolean;
  priority: Priority;
  icon: ElementType;
}

export type ActionCenterItem = ActionItem;

const actions: ActionItem[] = [
  {
    id: 1,
    category: "employees",
    type: "Новый сотрудник",
    title: "Подтвердить профиль",
    from: "Смирнова А.П.",
    avatar: "СА",
    description: "Отдел разработки · Junior Frontend",
    detail:
      "Новый сотрудник прошёл все этапы найма и ожидает подтверждения профиля для получения доступа к системе. Документы загружены и проверены HR-отделом.",
    time: "10 мин",
    priority: "urgent",
    icon: UserPlus,
  },
  {
    id: 2,
    category: "approvals",
    type: "Отпуск",
    title: "Запрос на отпуск",
    from: "Сидоров К.Л.",
    avatar: "СК",
    description: "15–22 марта · 5 рабочих дней",
    detail:
      "Ежегодный оплачиваемый отпуск. Остаток дней: 18. Замещающий сотрудник: Волков А.М. Все текущие задачи будут переданы до 14 марта.",
    time: "32 мин",
    priority: "urgent",
    icon: Palmtree,
  },
  {
    id: 3,
    category: "documents",
    type: "Документ",
    title: "Заявление на отпуск",
    from: "Петрова М.В.",
    avatar: "ПМ",
    description: "Требуется подпись руководителя",
    detail:
      "Заявление на ежегодный отпуск с 20 по 27 марта. Документ сформирован автоматически и ожидает электронной подписи руководителя подразделения.",
    time: "1 ч",
    priority: "normal",
    icon: FileText,
  },
  {
    id: 4,
    category: "meetings",
    type: "Встреча",
    title: "Ревью спринта #14",
    from: "Козлов Д.И.",
    avatar: "КД",
    description: "Сегодня, 15:00 · Конференц-зал B",
    detail:
      "Демонстрация результатов спринта #14. Участники: команда разработки (6 человек). Продолжительность: 1 час. Повестка: демо новых фич, ретроспектива.",
    time: "2 ч",
    priority: "normal",
    icon: CalendarCheck,
  },
  {
    id: 5,
    category: "approvals",
    type: "Согласование",
    title: "Удалённая работа",
    from: "Морозов И.В.",
    avatar: "МИ",
    description: "12 марта · 1 день",
    detail:
      "Запрос на удалённую работу на 1 день по личным обстоятельствам. Сотрудник подтверждает доступность онлайн в рабочие часы.",
    time: "3 ч",
    priority: "normal",
    icon: Handshake,
  },
  {
    id: 6,
    category: "documents",
    type: "Документ",
    title: "Акт выполненных работ",
    from: "Козлов Д.И.",
    avatar: "КД",
    description: "Проект «Альфа» · Этап 3",
    detail:
      "Акт выполненных работ по этапу 3 проекта «Альфа». Сумма: 450 000 ₽. Требуется подпись для передачи в бухгалтерию.",
    time: "4 ч",
    priority: "low",
    icon: FileText,
  },
  {
    id: 7,
    category: "decisions",
    type: "Запрос",
    title: "Запрос на аванс",
    from: "Андреева Е.П.",
    avatar: "АЕ",
    description: "15 000 ₽ · Срочная выплата",
    detail:
      "Запрос на внеочередную выплату аванса в размере 15 000 ₽. Причина: непредвиденные расходы. Требуется согласование руководителя и бухгалтерии.",
    time: "5 ч",
    priority: "urgent",
    icon: MessageSquare,
  },
  {
    id: 8,
    category: "employees",
    type: "Новый сотрудник",
    title: "Верификация документов",
    from: "Новиков Р.С.",
    avatar: "НР",
    description: "Отдел маркетинга · Middle Designer",
    detail:
      "Необходимо проверить загруженные документы нового сотрудника: паспорт, СНИЛС, ИНН, диплом. После верификации сотрудник получит доступ к рабочим системам.",
    time: "вчера",
    priority: "low",
    icon: UserPlus,
  },
  {
    id: 9,
    category: "meetings",
    type: "Встреча",
    title: "1-on-1 с тимлидом",
    from: "Волков А.М.",
    avatar: "ВА",
    description: "Завтра, 11:00 · Онлайн",
    detail:
      "Регулярная встреча 1-on-1. Темы: прогресс по OKR, обратная связь по проекту, планы на следующий квартал. Формат: видеозвонок.",
    time: "вчера",
    priority: "low",
    icon: CalendarCheck,
  },
  {
    id: 10,
    category: "documents",
    type: "Документ",
    title: "Подписать допсоглашение",
    from: "Егорова Н.С.",
    avatar: "ЕН",
    description: "Изменение графика работы · с 1 апреля",
    detail:
      "Подготовлено дополнительное соглашение к трудовому договору по переходу на новый график работы. Документ проверен HR и ждёт подписи.",
    time: "6 ч",
    priority: "normal",
    icon: FileText,
  },
  {
    id: 11,
    category: "approvals",
    type: "Согласование",
    title: "Обмен сменами",
    from: "Зайцев П.О.",
    avatar: "ЗП",
    description: "21 марта · с Никитиной А.В.",
    detail:
      "Два сотрудника запросили обмен сменами на текущей неделе. Проверены часы, конфликтов с расписанием нет, требуется финальное подтверждение.",
    time: "7 ч",
    priority: "normal",
    icon: Handshake,
  },
  {
    id: 12,
    category: "decisions",
    type: "Запрос",
    title: "Подтвердить переработку",
    from: "Громов С.И.",
    avatar: "ГС",
    description: "4 часа · проект «Север»",
    detail:
      "Сотрудник запросил согласование переработки за выход в дополнительную смену. Основание и таймлог приложены к карточке запроса.",
    time: "8 ч",
    priority: "urgent",
    icon: MessageSquare,
  },
  {
    id: 13,
    category: "employees",
    type: "Сотрудник",
    title: "Подтвердить адаптацию",
    from: "Лебедева О.В.",
    avatar: "ЛО",
    description: "Пробный период · 2 неделя",
    detail:
      "Необходимо подтвердить завершение второй недели адаптации сотрудника и обновить статус вводного плана. Наставник оставил комментарии.",
    time: "сегодня",
    priority: "low",
    icon: User,
  },
  {
    id: 14,
    category: "meetings",
    type: "Встреча",
    title: "Планирование графика на апрель",
    from: "Орлов Д.А.",
    avatar: "ОД",
    description: "Пятница, 10:30 · Кабинет 203",
    detail:
      "Короткая встреча по согласованию отпусков и пиковых смен на следующий месяц. Нужно сверить загрузку команды и утвердить шаблон расписания.",
    time: "завтра",
    priority: "normal",
    icon: Calendar,
  },
  {
    id: 15,
    category: "documents",
    type: "Тег",
    title: "Обновить категорию инцидента",
    from: "Сервисный отдел",
    avatar: "СО",
    description: "Обращение #4812 · нужен новый тег",
    detail:
      "В карточке инцидента не выбрана итоговая категория. После обновления тега кейс уйдёт в архив и попадёт в отчётность без ручной доработки.",
    time: "2 дн",
    priority: "low",
    icon: Tag,
  },
];

const categories: { key: ActionCategory; label: string; icon?: ElementType }[] =
  [
    { key: "all", label: "Входящие" },
    { key: "decisions", label: "Срочные", icon: Flame },
    { key: "documents", label: "Документы", icon: FileText },
    { key: "approvals", label: "Согласования", icon: Handshake },
    { key: "meetings", label: "Встречи", icon: CalendarCheck },
    { key: "employees", label: "Сотрудники", icon: UserPlus },
  ];

const iconBg: Record<ActionCategory, string> = {
  all: "bg-secondary",
  decisions: "bg-accent/10",
  documents: "bg-info/10",
  approvals: "bg-warning/10",
  meetings: "bg-success/10",
  employees: "bg-accent/10",
};

const iconColor: Record<ActionCategory, string> = {
  all: "text-foreground/60",
  decisions: "text-accent",
  documents: "text-info",
  approvals: "text-warning",
  meetings: "text-success",
  employees: "text-accent",
};

const priorityLabel: Record<Priority, { text: string; cls: string }> = {
  urgent: { text: "Срочный", cls: "text-accent" },
  normal: { text: "Обычный", cls: "text-info" },
  low: { text: "Низкий", cls: "text-muted-foreground" },
};

function localize(locale: "ru" | "en", ru: string, en: string) {
  return locale === "ru" ? ru : en;
}

function getPriorityLabel(
  priority: Priority,
  locale: "ru" | "en",
): { text: string; cls: string } {
  const cls = priorityLabel[priority].cls;
  if (priority === "urgent") {
    return { text: localize(locale, "Срочный", "Urgent"), cls };
  }
  if (priority === "normal") {
    return { text: localize(locale, "Обычный", "Normal"), cls };
  }
  return { text: localize(locale, "Низкий", "Low"), cls };
}

function translateActionItem(
  action: ActionItem,
  locale: "ru" | "en",
): ActionItem {
  if (locale === "ru") return action;

  const translations: Record<number, Partial<ActionItem>> = {
    1: {
      type: "New employee",
      title: "Approve profile",
      from: "Smirnova A.P.",
      description: "Engineering · Junior Frontend",
      detail:
        "A new employee has completed all hiring steps and is waiting for profile approval to receive access to the system. Documents have been uploaded and checked by HR.",
      time: "10 min",
    },
    2: {
      type: "Vacation",
      title: "Vacation request",
      from: "Sidorov K.L.",
      description: "March 15-22 · 5 workdays",
      detail:
        "Annual paid leave. Remaining balance: 18 days. Backup employee: Volkov A.M. All current tasks will be handed over before March 14.",
      time: "32 min",
    },
    3: {
      type: "Document",
      title: "Vacation statement",
      from: "Petrova M.V.",
      description: "Manager signature required",
      detail:
        "Vacation statement for March 20-27. The document was generated automatically and is waiting for the department manager's electronic signature.",
      time: "1 h",
    },
    4: {
      type: "Meeting",
      title: "Sprint review #14",
      from: "Kozlov D.I.",
      description: "Today, 15:00 · Conference room B",
      detail:
        "Sprint #14 results review. Participants: engineering team (6 people). Duration: 1 hour. Agenda: demo of new features and retrospective.",
      time: "2 h",
    },
    5: {
      type: "Approval",
      title: "Remote work",
      from: "Morozov I.V.",
      description: "March 12 · 1 day",
      detail:
        "Request for one day of remote work due to personal reasons. The employee confirms online availability during work hours.",
      time: "3 h",
    },
    6: {
      type: "Document",
      title: "Completion certificate",
      from: "Kozlov D.I.",
      description: 'Project "Alpha" · Stage 3',
      detail:
        'Completion certificate for stage 3 of project "Alpha". Amount: 450,000 RUB. Signature is required before sending it to accounting.',
      time: "4 h",
    },
    7: {
      type: "Request",
      title: "Advance payment request",
      from: "Andreeva E.P.",
      description: "15,000 RUB · Urgent payout",
      detail:
        "Request for an off-cycle advance payment of 15,000 RUB. Reason: unexpected expenses. Manager and accounting approval is required.",
      time: "5 h",
    },
    8: {
      type: "New employee",
      title: "Document verification",
      from: "Novikov R.S.",
      description: "Marketing · Middle Designer",
      detail:
        "The uploaded documents of a new employee need to be verified: passport, insurance number, tax ID and diploma. After verification the employee will get access to work systems.",
      time: "yesterday",
    },
    9: {
      type: "Meeting",
      title: "1-on-1 with team lead",
      from: "Volkov A.M.",
      description: "Tomorrow, 11:00 · Online",
      detail:
        "Regular 1-on-1 meeting. Topics: OKR progress, project feedback and next quarter plans. Format: video call.",
      time: "yesterday",
    },
    10: {
      type: "Document",
      title: "Sign addendum",
      from: "Egorova N.S.",
      description: "Schedule change · effective April 1",
      detail:
        "An addendum to the employment contract has been prepared for the transition to a new work schedule. The document has been checked by HR and is waiting for signature.",
      time: "6 h",
    },
    11: {
      type: "Approval",
      title: "Shift swap",
      from: "Zaitsev P.O.",
      description: "March 21 · with Nikitina A.V.",
      detail:
        "Two employees requested a shift swap this week. Hours were verified, there are no schedule conflicts, and final approval is required.",
      time: "7 h",
    },
    12: {
      type: "Request",
      title: "Approve overtime",
      from: "Gromov S.I.",
      description: '4 hours · project "North"',
      detail:
        "The employee requested approval for overtime due to an extra shift. Basis and timelog are attached to the request card.",
      time: "8 h",
    },
    13: {
      type: "Employee",
      title: "Confirm onboarding progress",
      from: "Lebedeva O.V.",
      description: "Probation period · week 2",
      detail:
        "You need to confirm the completion of the employee's second onboarding week and update the onboarding plan status. The mentor left comments.",
      time: "today",
    },
    14: {
      type: "Meeting",
      title: "April schedule planning",
      from: "Orlov D.A.",
      description: "Friday, 10:30 · Room 203",
      detail:
        "A short meeting to align vacations and peak shifts for the next month. The team workload needs to be checked and the schedule template approved.",
      time: "tomorrow",
    },
    15: {
      type: "Tag",
      title: "Update incident category",
      from: "Service desk",
      description: "Case #4812 · new tag required",
      detail:
        "The final category was not selected in the incident card. After updating the tag, the case will be archived and included in reporting without manual rework.",
      time: "2 d",
    },
  };

  return {
    ...action,
    ...(translations[action.id] ?? {}),
  };
}

export function getMockActionCenterItems(locale: "ru" | "en"): ActionCenterItem[] {
  return actions.map((action) => {
    const translatedAction = translateActionItem(action, locale);
    return {
      ...translatedAction,
      avatarUrl:
        translatedAction.avatarUrl ||
        getMockAvatarDataUrl(translatedAction.from),
    };
  });
}

export const ActionCenter = ({
  items,
  locale: forcedLocale,
  useMockData = true,
}: {
  items?: ActionCenterItem[];
  locale?: "ru" | "en";
  useMockData?: boolean;
}) => {
  const { locale: activeLocale } = useI18n();
  const locale = forcedLocale ?? activeLocale;
  const [activeCategory, setActiveCategory] = useState<ActionCategory>("all");
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [exiting, setExiting] = useState<Record<number, ExitAction>>({});
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const availableActions = useMemo(
    () =>
      items?.length
        ? items
        : useMockData
          ? getMockActionCenterItems(locale)
          : [],
    [items, locale, useMockData],
  );

  const filtered = availableActions.filter((a) => {
    if (dismissed.includes(a.id)) return false;
    if (activeCategory === "all") return true;
    if (activeCategory === "decisions") return a.priority === "urgent";
    return a.category === activeCategory;
  });

  const urgentCount = availableActions.filter(
    (a) => a.priority === "urgent" && !dismissed.includes(a.id),
  ).length;
  const totalPending = availableActions.filter((a) => !dismissed.includes(a.id)).length;

  const handleDismiss = (id: number, type: ExitAction) => {
    setExiting((current) => ({ ...current, [id]: type }));
    if (selectedAction?.id === id) setSelectedAction(null);

    window.setTimeout(() => {
      setDismissed((current) => [...current, id]);
      setExiting((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }, 460);
  };

  return (
    <>
      <div className="dashboard-card actions-center-card h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="font-heading font-semibold text-base text-foreground">
              {localize(locale, "Центр действий", "Action center")}
            </h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-border pb-3">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.key;
            const count =
              cat.key === "all"
                ? totalPending
                : cat.key === "decisions"
                  ? urgentCount
                  : availableActions.filter(
                      (a) =>
                        a.category === cat.key && !dismissed.includes(a.id),
                    ).length;

            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-heading font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[color:var(--accent)] text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
                    : "text-muted-foreground hover:text-[color:var(--accent)] hover:bg-secondary/80"
                }`}
              >
                {cat.icon && <cat.icon className="w-3 h-3" />}
                {cat.key === "all"
                  ? localize(locale, "Входящие", "Inbox")
                  : cat.key === "decisions"
                    ? localize(locale, "Срочные", "Urgent")
                    : cat.key === "documents"
                      ? localize(locale, "Документы", "Documents")
                      : cat.key === "approvals"
                        ? localize(locale, "Согласования", "Approvals")
                        : cat.key === "meetings"
                          ? localize(locale, "Встречи", "Meetings")
                          : localize(locale, "Сотрудники", "Employees")}
                {count > 0 && (
                  <span
                    className={`text-[13px] font-semibold leading-none ${
                      isActive
                        ? "text-white"
                        : "text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="actions-center-scroll flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                <Check className="w-5 h-5 opacity-40" />
              </div>
              <p className="text-sm font-heading font-medium">
                {localize(locale, "Всё обработано", "All caught up")}
              </p>
              <p className="mt-1 text-xs opacity-60">
                {localize(locale, "Нет входящих действий", "No incoming actions")}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((action, i) => (
                <ActionRow
                  key={action.id}
                  action={action}
                  exitState={exiting[action.id]}
                  index={i}
                  locale={locale}
                  onApprove={handleDismiss}
                  onReject={handleDismiss}
                  onOpen={setSelectedAction}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail dialog */}
      <ActionDetailDialog
        action={selectedAction}
        locale={locale}
        onClose={() => setSelectedAction(null)}
        onApprove={handleDismiss}
        onReject={handleDismiss}
      />
    </>
  );
};

/* ─── Action Row ─── */
const ActionRow = ({
  action,
  exitState,
  index,
  locale,
  onApprove,
  onReject,
  onOpen,
}: {
  action: ActionItem;
  exitState?: ExitAction;
  index: number;
  locale: "ru" | "en";
  onApprove: (id: number, type: ExitAction) => void;
  onReject: (id: number, type: ExitAction) => void;
  onOpen: (action: ActionItem) => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const isExiting = Boolean(exitState);

  return (
    <div
      className={`actions-center-row group flex items-center gap-3.5 rounded-2xl px-3 py-3 transition-all duration-200 animate-fade-in hover:bg-secondary/50 ${
        isExiting ? "pointer-events-none" : "cursor-pointer"
      } ${
        exitState === "approve"
          ? "actions-center-row-exit-approve"
          : exitState === "reject"
            ? "actions-center-row-exit-reject"
            : ""
      }`}
      style={{ animationDelay: `${index * 30}ms` }}
      onMouseEnter={() => !isExiting && setHovered(true)}
      onMouseLeave={() => !isExiting && setHovered(false)}
      onClick={() => !isExiting && onOpen(action)}
    >
      <span className="actions-center-row-overlay" />

      {/* Avatar */}
      <div className="relative z-[1] shrink-0">
        <img
          alt={action.from}
          className="h-10 w-10 rounded-xl object-cover shadow-[0_8px_20px_rgba(40,75,255,0.12)]"
          src={action.avatarUrl || getMockAvatarDataUrl(action.from)}
        />
      </div>

      {/* Content */}
      <div className="relative z-[1] flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-heading font-medium text-foreground truncate">
            {action.title}
          </p>
          {action.priority === "urgent" && (
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          <span className="font-heading font-medium">{action.from}</span>
          <span className="mx-1 opacity-40">·</span>
          {action.description}
        </p>
      </div>

      {/* Right side */}
      <div className="relative z-[1] flex items-center gap-1 shrink-0">
        {hovered && !isExiting ? (
          <div
            className="flex items-center gap-0.5 animate-fade-in"
            style={{ animationDuration: "150ms" }}
          >
            <Button
              size="sm"
              className="h-8 px-3 rounded-xl text-[10px] font-heading gap-1 bg-[color:var(--success)] text-white shadow-[0_12px_24px_rgba(62,167,107,0.22)] hover:bg-[#348f5c]"
              onClick={(e) => {
                e.stopPropagation();
                onApprove(action.id, "approve");
              }}
            >
              <Check className="w-3 h-3" />
              {localize(locale, "Да", "Yes")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 rounded-xl text-[10px] font-heading bg-[color:var(--soft-danger)] text-[color:var(--danger)] hover:bg-[color:var(--danger)] hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onReject(action.id, "reject");
              }}
            >
              <X className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              className="h-7 w-7 p-0 rounded-full bg-accent text-accent-foreground hover:bg-accent/80"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(action);
              }}
            >
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <span className="text-[12px] text-muted-foreground/75 font-heading tabular-nums">
            {action.time}
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── Detail Dialog ─── */
const ActionDetailDialog = ({
  action,
  locale,
  onClose,
  onApprove,
  onReject,
}: {
  action: ActionItem | null;
  locale: "ru" | "en";
  onClose: () => void;
  onApprove: (id: number, type: ExitAction) => void;
  onReject: (id: number, type: ExitAction) => void;
}) => {
  if (!action) return null;

  const Icon = action.icon;
  const bg = iconBg[action.category];
  const color = iconColor[action.category];
  const prio = getPriorityLabel(action.priority, locale);

  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] rounded-3xl p-0 overflow-hidden border-border">
        <div className="p-6">
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}
              >
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-[11px] font-heading font-medium text-muted-foreground uppercase tracking-wider">
                  {action.type}
                </p>
                <DialogTitle className="text-base font-heading font-semibold text-foreground">
                  {action.title}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          {/* Meta info */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
              <img
                alt={action.from}
                className="h-9 w-9 rounded-full object-cover shadow-[0_8px_20px_rgba(40,75,255,0.12)]"
                src={action.avatarUrl || getMockAvatarDataUrl(action.from)}
              />
              <span className="font-heading font-semibold text-[14px] text-foreground">
                {action.from}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-[12px] text-muted-foreground">
              <Tag className="w-3.5 h-3.5" />
              <span>{action.description}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[12px] text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {locale === "ru" && action.isRelativeTime !== false
                  ? `${action.time} назад`
                  : action.time}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-[12px]">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={`text-[12px] font-heading font-semibold ${prio.cls}`}>
                {prio.text}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-secondary/50 rounded-2xl p-4 mb-6">
            <p className="text-[13px] text-foreground/80 leading-relaxed">
              {action.detail}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              className="flex-1 h-11 rounded-2xl font-heading text-sm gap-2 bg-[color:var(--success)] text-white shadow-[0_16px_32px_rgba(62,167,107,0.2)] hover:bg-[#348f5c]"
              onClick={() => onApprove(action.id, "approve")}
            >
              <Check className="w-4 h-4" />
              {localize(locale, "Подтвердить", "Approve")}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl border-[color:var(--danger)]/20 font-heading text-sm gap-2 bg-[color:var(--soft-danger)] text-[color:var(--danger)] hover:border-[color:var(--danger)] hover:bg-[color:var(--danger)] hover:text-white"
              onClick={() => onReject(action.id, "reject")}
            >
              <X className="w-4 h-4" />
              {localize(locale, "Отклонить", "Reject")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
