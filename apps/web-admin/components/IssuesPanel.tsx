import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Clock, UserX } from "lucide-react";

const issues = [
  { id: 1, type: "absence", employee: "Иванов А.С.", message: "Не отметился на входе", time: "09:15", icon: UserX },
  { id: 2, type: "late", employee: "Петрова М.В.", message: "Опоздание на 23 мин", time: "09:23", icon: Clock },
  { id: 3, type: "absence", employee: "Козлов Д.И.", message: "Отсутствует без уведомления", time: "—", icon: UserX },
  { id: 4, type: "late", employee: "Сидоров К.Л.", message: "Опоздание на 45 мин", time: "09:45", icon: Clock },
];

export const IssuesPanel = () => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="dashboard-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-accent" />
          <h2 className="font-heading font-semibold text-sm text-foreground">
            Проблемы, требующие реакции
          </h2>
          <span className="bg-accent/10 text-accent text-xs font-heading font-medium px-2 py-0.5 rounded-full">
            {issues.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-2">
          {issues.map((issue, i) => (
            <div
              key={issue.id}
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  issue.type === "absence" ? "bg-destructive/10" : "bg-warning/10"
                }`}>
                  <issue.icon className={`w-4 h-4 ${
                    issue.type === "absence" ? "text-destructive" : "text-warning"
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-heading font-medium text-foreground">{issue.employee}</p>
                  <p className="text-xs text-muted-foreground">{issue.message}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-heading">{issue.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
