"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, CheckCircle2, Circle, Filter, ListTodo } from "lucide-react";
import { TaskItem } from "@smart/types";
import Radio, { type RadioItem } from "@/components/ui/Radio";
import { parseTaskMeta } from "@/lib/task-meta";

type TaskFilter = "today" | "tomorrow" | "week";

type TasksSidebarProps = {
  onTaskToggle?: (taskId: string, nextDone: boolean) => void;
  tasks: TaskItem[];
};

function getTaskKind(task: TaskItem): "task" | "meeting" {
  const meta = parseTaskMeta(task.description);
  return meta.meeting || task.title.startsWith("Встреча:") ? "meeting" : "task";
}

function getTaskTitle(task: TaskItem) {
  return getTaskKind(task) === "meeting"
    ? task.title.replace(/^Встреча:\s*/i, "").trim()
    : task.title;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function shouldShowCompletedTask(task: TaskItem, referenceDay: Date) {
  if (task.status !== "DONE") return false;
  const completedAt = task.completedAt ?? task.updatedAt;
  if (!completedAt) return false;
  const completedDate = new Date(completedAt);
  if (Number.isNaN(completedDate.getTime())) return false;
  return isSameDay(startOfDay(completedDate), referenceDay);
}

function formatDeadline(task: TaskItem) {
  if (!task.dueAt) return "Без срока";
  const dueDate = new Date(task.dueAt);
  if (Number.isNaN(dueDate.getTime())) return "Без срока";

  return dueDate.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortTasks(tasks: TaskItem[]) {
  return [...tasks].sort((left, right) => {
    if (left.status === "DONE" && right.status !== "DONE") return 1;
    if (left.status !== "DONE" && right.status === "DONE") return -1;
    if (!left.dueAt && !right.dueAt) return 0;
    if (!left.dueAt) return 1;
    if (!right.dueAt) return -1;
    return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
  });
}

function toggleVisibleKind(
  current: { meeting: boolean; task: boolean },
  key: "meeting" | "task",
  checked: boolean,
) {
  const next = { ...current, [key]: checked };
  if (!next.task && !next.meeting) {
    return current;
  }
  return next;
}

export const TasksSidebar = ({ onTaskToggle, tasks }: TasksSidebarProps) => {
  const [filter, setFilter] = useState<TaskFilter>("today");
  const [showOverdue, setShowOverdue] = useState(false);
  const [showKindFilter, setShowKindFilter] = useState(false);
  const [visibleKinds, setVisibleKinds] = useState<{
    meeting: boolean;
    task: boolean;
  }>({
    task: true,
    meeting: true,
  });
  const kindFilterRef = useRef<HTMLDivElement | null>(null);
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const taskWindowItems: RadioItem[] = [
    { key: "today", label: "Сегодня", value: 0 },
    { key: "tomorrow", label: "Завтра", value: 0 },
    { key: "week", label: "Неделя", value: 0 },
  ];

  const overdueTasks = useMemo(
    () =>
      sortTasks(
        tasks.filter((task) => {
          if (task.status === "DONE" || !task.dueAt) return false;
          const dueDate = new Date(task.dueAt);
          return !Number.isNaN(dueDate.getTime()) && dueDate < new Date();
        }),
      ),
    [tasks],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!kindFilterRef.current) return;
      if (!kindFilterRef.current.contains(event.target as Node)) {
        setShowKindFilter(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  taskWindowItems[0].value = tasks.filter((task) => {
    if (task.status === "DONE" || !task.dueAt) return false;
    return isSameDay(startOfDay(new Date(task.dueAt)), today);
  }).length;
  taskWindowItems[1].value = tasks.filter((task) => {
    if (task.status === "DONE" || !task.dueAt) return false;
    return isSameDay(startOfDay(new Date(task.dueAt)), tomorrow);
  }).length;
  taskWindowItems[2].value = tasks.filter((task) => {
    if (task.status === "DONE" || !task.dueAt) return false;
    const dueDay = startOfDay(new Date(task.dueAt));
    return dueDay >= today && dueDay < weekEnd;
  }).length;

  const visibleTasks = useMemo(() => {
    const baseTasks = showOverdue
      ? overdueTasks
      : tasks.filter((task) => {
          const isDone = task.status === "DONE";
          const showCompleted = shouldShowCompletedTask(task, today);

          if (isDone && !showCompleted) return false;
          if (!task.dueAt) return filter === "today";

          const dueDate = new Date(task.dueAt);
          if (Number.isNaN(dueDate.getTime())) return false;
          const dueDay = startOfDay(dueDate);

          switch (filter) {
            case "today":
              return isSameDay(dueDay, today);
            case "tomorrow":
              return isSameDay(dueDay, tomorrow);
            case "week":
              return dueDay >= today && dueDay < weekEnd;
            default:
              return true;
          }
        });

    return sortTasks(
      baseTasks.filter((task) => {
        const kind = getTaskKind(task);
        return visibleKinds[kind];
      }),
    );
  }, [filter, overdueTasks, showOverdue, tasks, visibleKinds]);

  return (
    <div className="dashboard-card tasks-sidebar-card h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4" />
          <h2 className="tasks-sidebar-title">Задачи</h2>
        </div>
        <div className="tasks-filter-dropdown" ref={kindFilterRef}>
          <button
            className={`tasks-filter-trigger${showKindFilter ? " is-open" : ""}`}
            onClick={() => setShowKindFilter((current) => !current)}
            type="button"
          >
            <Filter className="h-4 w-4" />
          </button>
          {showKindFilter ? (
            <div className="tasks-filter-menu">
              <label className="tasks-filter-option">
                <input
                  checked={visibleKinds.task}
                  onChange={(event) =>
                    setVisibleKinds((current) =>
                      toggleVisibleKind(current, "task", event.target.checked),
                    )
                  }
                  type="checkbox"
                />
                <span>Задачи</span>
              </label>
              <label className="tasks-filter-option">
                <input
                  checked={visibleKinds.meeting}
                  onChange={(event) =>
                    setVisibleKinds((current) =>
                      toggleVisibleKind(current, "meeting", event.target.checked),
                    )
                  }
                  type="checkbox"
                />
                <span>Встречи</span>
              </label>
            </div>
          ) : null}
        </div>
      </div>

      {!showOverdue ? (
        <Radio
          ariaLabel="Фильтр задач"
          className="tasks-radio mb-4 shrink-0"
          items={taskWindowItems}
          name="task-filter"
          onValueChange={(value) => {
            setShowOverdue(false);
            setFilter(value as TaskFilter);
          }}
          value={filter}
        />
      ) : null}

      <div className="space-y-1.5 flex-1 overflow-y-auto scrollbar-hide">
        {visibleTasks.length ? (
          visibleTasks.map((task, index) => {
            const isDone = task.status === "DONE";
            const taskKind = getTaskKind(task);
            const isOverdue =
              !isDone &&
              Boolean(task.dueAt) &&
              !Number.isNaN(new Date(task.dueAt as string).getTime()) &&
              new Date(task.dueAt as string) < new Date();
            return (
              <button
                className={`flex items-start gap-2.5 p-2.5 rounded-xl w-full text-left hover:bg-[var(--panel-muted)] transition-colors animate-fade-in${isOverdue ? " is-overdue" : ""}`}
                key={task.id}
                onClick={() => onTaskToggle?.(task.id, !isDone)}
                style={{ animationDelay: `${index * 40}ms` }}
                type="button"
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-[var(--muted-foreground)] mt-0.5 shrink-0" />
                )}
                <div>
                  <p
                    className={`text-sm leading-tight ${
                      isDone
                        ? "line-through text-[var(--muted-foreground)]"
                        : isOverdue
                          ? "text-[var(--danger)]"
                          : ""
                    }`}
                  >
                    {getTaskTitle(task)}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${isOverdue ? "text-[var(--danger)]" : "text-[var(--muted-foreground)]"}`}>
                    <span className={`tasks-kind-label is-${taskKind}`}>
                      {taskKind === "meeting" ? "Встреча" : "Задача"}
                    </span>
                    <span> · {formatDeadline(task)}</span>
                  </p>
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-[color:var(--border)] px-3 py-6 text-center text-xs text-[var(--muted-foreground)]">
            {showOverdue ? "Просроченных задач нет." : "Задач на этот период нет"}
          </div>
        )}
      </div>

      <div className="mt-4 shrink-0">
        <button
          className="tasks-overdue-switch"
          onClick={() => setShowOverdue((current) => !current)}
          type="button"
        >
          <ArrowLeftRight className="h-4 w-4" />
          <span>
            {showOverdue
              ? "Текущие задачи"
              : `Просроченные задачи${overdueTasks.length ? ` (${overdueTasks.length})` : ""}`}
          </span>
        </button>
      </div>
    </div>
  );
};
