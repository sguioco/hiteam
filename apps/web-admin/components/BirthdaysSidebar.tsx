import { Cake } from "lucide-react";

const birthdays = [
  { name: "Волкова Ольга Александровна", department: "Маркетинг", date: "12 марта" },
  { name: "Никитин Павел Романович", department: "Разработка", date: "14 марта" },
  { name: "Андреева Елена Павловна", department: "HR", date: "18 марта" },
  { name: "Морозов Игорь Валерьевич", department: "Продажи", date: "21 марта" },
];

export const BirthdaysSidebar = () => {
  return (
    <div className="dashboard-card">
      <div className="flex items-center gap-2 mb-4">
        <Cake className="w-4 h-4 text-accent" />
        <h2 className="font-heading font-semibold text-sm text-foreground">Дни рождения</h2>
      </div>

      <div className="space-y-2.5">
        {birthdays.map((b, i) => (
          <div
            key={i}
            className="flex items-center justify-between animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div>
              <p className="text-sm font-heading font-medium text-foreground leading-tight">{b.name}</p>
              <p className="text-[10px] text-muted-foreground">{b.department}</p>
            </div>
            <span className="text-xs text-accent font-heading font-medium whitespace-nowrap">{b.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
