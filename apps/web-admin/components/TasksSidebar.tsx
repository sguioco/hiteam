import { useState } from "react";
import { CheckSquare, Square, ListTodo } from "lucide-react";

type TaskFilter = "today" | "tomorrow" | "week";

const taskFilters: { key: TaskFilter; label: string; count: number }[] = [
  { key: "today", label: "Сегодня", count: 5 },
  { key: "tomorrow", label: "Завтра", count: 3 },
  { key: "week", label: "Неделя", count: 12 },
];

const tasksData = [
  { id: 1, title: "Согласовать отпуск Сидорова", deadline: "Сегодня, 12:00", done: false },
  { id: 2, title: "Подписать акт приёмки", deadline: "Сегодня, 15:00", done: false },
  { id: 3, title: "Подготовить отчёт за неделю", deadline: "Сегодня, 17:00", done: false },
  { id: 4, title: "Позвонить в HR по стажировке", deadline: "Без дедлайна", done: true },
  { id: 5, title: "Проверить табель посещаемости", deadline: "Сегодня, 18:00", done: false },
];

export const TasksSidebar = () => {
  const [filter, setFilter] = useState<TaskFilter>("today");
  const [tasks, setTasks] = useState(tasksData);

  const toggleTask = (id: number) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const activeTasks = tasks.filter((t) => !t.done).length;

  return (
    <div className="dashboard-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-foreground" />
          <h2 className="font-heading font-semibold text-sm text-foreground">Мои задачи</h2>
        </div>
        <span className="bg-accent text-accent-foreground text-xs font-heading font-bold w-6 h-6 rounded-full flex items-center justify-center">
          {activeTasks}
        </span>
      </div>

      <div className="flex gap-1.5 mb-4">
        {taskFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`filter-chip ${filter === f.key ? "filter-chip-active" : "filter-chip-inactive"}`}
          >
            {f.label} <span className="ml-1 opacity-60">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {tasks.map((task, i) => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className="flex items-start gap-2.5 p-2.5 rounded-xl w-full text-left hover:bg-secondary/50 transition-colors animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {task.done ? (
              <CheckSquare className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div>
              <p className={`text-sm font-heading leading-tight ${task.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {task.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{task.deadline}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
