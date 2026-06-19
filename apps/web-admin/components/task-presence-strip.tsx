import { Check, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAvatarInitials } from "@/lib/avatar-placeholder";

export type TaskPresencePerson = {
  id: string;
  name: string;
  tasks: number;
  done?: boolean;
  accent?: "neutral" | "success" | "warning";
};

export function TaskPresenceStrip({
  items,
  emptyLabel = "No assignments for this day.",
}: {
  items: TaskPresencePerson[];
  emptyLabel?: string;
}) {
  if (!items.length) {
    return <div className="empty-state">{emptyLabel}</div>;
  }

  return (
    <div className="task-presence-strip">
      {items.map((item) => (
        <div className="task-presence-pill" key={item.id}>
          <div className={`task-avatar ${item.done ? "is-complete" : ""}`}>
            <span aria-hidden="true">{getAvatarInitials(item.name || item.id)}</span>
            {item.done ? <Check className="task-avatar-check size-4" /> : null}
          </div>
          <div className="grid gap-0.5">
            <strong className="text-sm">{item.name}</strong>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {item.done
                ? "Completed for today"
                : `${item.tasks} active ${item.tasks === 1 ? "task" : "tasks"}`}
            </span>
          </div>
          <Badge
            variant={
              item.done ? "success" : item.tasks > 2 ? "warning" : "neutral"
            }
          >
            {item.done ? "Done" : `${item.tasks}`}
          </Badge>
        </div>
      ))}
    </div>
  );
}
