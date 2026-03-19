import { useState } from "react";
import { Building2, Plus, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateDialog } from "./CreateDialog";

export const DashboardHeader = () => {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between py-4 px-6 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
            <Building2 className="w-5 h-5 text-background" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-semibold text-foreground leading-tight">
              ООО «Форма»
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> 48 сотрудников
              </span>
              <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full font-heading font-medium">
                Администратор
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#"
            className="text-sm text-muted-foreground hover:text-accent transition-colors font-heading flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4" />
            Управление компанией
          </a>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-heading rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Создать
          </Button>
        </div>
      </header>

      <CreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
};
