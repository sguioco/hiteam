import { FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const documents = [
  { id: 1, title: "Заявление на отпуск", from: "Петрова М.В.", date: "10 мар" },
  { id: 2, title: "Акт выполненных работ", from: "Козлов Д.И.", date: "09 мар" },
  { id: 3, title: "Дополнительное соглашение", from: "Иванов А.С.", date: "08 мар" },
];

export const DocumentsPanel = () => {
  return (
    <div className="dashboard-card flex-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-info" />
          <h2 className="font-heading font-semibold text-sm text-foreground">
            Документы на подтверждение
          </h2>
          <span className="bg-info/10 text-info text-xs font-heading font-medium px-2 py-0.5 rounded-full">
            {documents.length}
          </span>
        </div>
        <a href="#" className="text-xs text-accent hover:underline font-heading">
          Открыть всё
        </a>
      </div>

      <div className="space-y-2">
        {documents.map((doc, i) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div>
              <p className="text-sm font-heading font-medium text-foreground">{doc.title}</p>
              <p className="text-xs text-muted-foreground">{doc.from} · {doc.date}</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl text-xs font-heading h-8 gap-1 hover:bg-accent hover:text-accent-foreground hover:border-accent">
              <Check className="w-3 h-3" />
              Подтвердить
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
