import { Inbox, ArrowRight } from "lucide-react";

const requests = [
  { id: 1, type: "Отпуск", from: "Сидоров К.Л.", dates: "15–22 мар", status: "pending" },
  { id: 2, type: "Больничный", from: "Андреева Е.П.", dates: "10–14 мар", status: "pending" },
  { id: 3, type: "Удалённая работа", from: "Морозов И.В.", dates: "12 мар", status: "pending" },
];

export const RequestsPanel = () => {
  return (
    <div className="dashboard-card flex-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-warning" />
          <h2 className="font-heading font-semibold text-sm text-foreground">
            Запросы в ожидании
          </h2>
          <span className="bg-warning/10 text-warning text-xs font-heading font-medium px-2 py-0.5 rounded-full">
            {requests.length}
          </span>
        </div>
        <a href="#" className="text-xs text-accent hover:underline font-heading flex items-center gap-1">
          Перейти <ArrowRight className="w-3 h-3" />
        </a>
      </div>

      <div className="space-y-2">
        {requests.map((req, i) => (
          <div
            key={req.id}
            className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div>
              <p className="text-sm font-heading font-medium text-foreground">{req.type}</p>
              <p className="text-xs text-muted-foreground">{req.from} · {req.dates}</p>
            </div>
            <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full font-heading">
              Ожидание
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
