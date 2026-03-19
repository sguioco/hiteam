import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  UserX,
  FileText,
  Check,
  Inbox,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const issues = [
  { id: 1, type: "absence", employee: "Иванов А.С.", message: "Не отметился на входе", time: "09:15", icon: UserX },
  { id: 2, type: "late", employee: "Петрова М.В.", message: "Опоздание на 23 мин", time: "09:23", icon: Clock },
  { id: 3, type: "absence", employee: "Козлов Д.И.", message: "Отсутствует без уведомления", time: "—", icon: UserX },
  { id: 4, type: "late", employee: "Сидоров К.Л.", message: "Опоздание на 45 мин", time: "09:45", icon: Clock },
];

const documents = [
  { id: 1, title: "Заявление на отпуск", from: "Петрова М.В.", date: "10 мар" },
  { id: 2, title: "Акт выполненных работ", from: "Козлов Д.И.", date: "09 мар" },
  { id: 3, title: "Дополнительное соглашение", from: "Иванов А.С.", date: "08 мар" },
];

const requests = [
  { id: 1, type: "Отпуск", from: "Сидоров К.Л.", dates: "15–22 мар", status: "pending" },
  { id: 2, type: "Больничный", from: "Андреева Е.П.", dates: "10–14 мар", status: "pending" },
  { id: 3, type: "Удалённая работа", from: "Морозов И.В.", dates: "12 мар", status: "pending" },
];

export const ActionsPanel = () => {
  const [issuesExpanded, setIssuesExpanded] = useState(true);

  return (
    <div className="dashboard-card h-full flex flex-col overflow-y-auto scrollbar-hide">
      {/* Issues section */}
      <div className="mb-4">
        <button
          onClick={() => setIssuesExpanded(!issuesExpanded)}
          className="flex items-center justify-between w-full mb-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent" />
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wider text-foreground">
              Проблемы, требующие реакции
            </h2>
            <span className="bg-accent/10 text-accent text-[10px] font-heading font-medium px-1.5 py-0.5 rounded-full">
              {issues.length}
            </span>
          </div>
          {issuesExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>

        {issuesExpanded && (
          <div className="space-y-1.5">
            {issues.map((issue, i) => (
              <div
                key={issue.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    issue.type === "absence" ? "bg-destructive/10" : "bg-warning/10"
                  }`}>
                    <issue.icon className={`w-3.5 h-3.5 ${
                      issue.type === "absence" ? "text-destructive" : "text-warning"
                    }`} />
                  </div>
                  <div>
                    <p className="text-xs font-heading font-medium text-foreground">{issue.employee}</p>
                    <p className="text-[10px] text-muted-foreground">{issue.message}</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground font-heading">{issue.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border my-2" />

      {/* Documents section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-info" />
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wider text-foreground">
              Документы на подтверждение
            </h2>
            <span className="bg-info/10 text-info text-[10px] font-heading font-medium px-1.5 py-0.5 rounded-full">
              {documents.length}
            </span>
          </div>
          <a href="#" className="text-[10px] text-accent hover:underline font-heading">
            Открыть всё
          </a>
        </div>

        <div className="space-y-1.5">
          {documents.map((doc, i) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 animate-fade-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div>
                <p className="text-xs font-heading font-medium text-foreground">{doc.title}</p>
                <p className="text-[10px] text-muted-foreground">{doc.from} · {doc.date}</p>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl text-[10px] font-heading h-7 gap-1 hover:bg-accent hover:text-accent-foreground hover:border-accent px-2">
                <Check className="w-3 h-3" />
                Подтвердить
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border my-2" />

      {/* Requests section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-warning" />
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wider text-foreground">
              Запросы в ожидании
            </h2>
            <span className="bg-warning/10 text-warning text-[10px] font-heading font-medium px-1.5 py-0.5 rounded-full">
              {requests.length}
            </span>
          </div>
          <a href="#" className="text-[10px] text-accent hover:underline font-heading flex items-center gap-1">
            Перейти <ArrowRight className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-1.5">
          {requests.map((req, i) => (
            <div
              key={req.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 animate-fade-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div>
                <p className="text-xs font-heading font-medium text-foreground">{req.type}</p>
                <p className="text-[10px] text-muted-foreground">{req.from} · {req.dates}</p>
              </div>
              <span className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded-full font-heading">
                Ожидание
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
