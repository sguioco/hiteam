"use client";

import { useEffect, useState } from "react";
import { EmployeeShell } from "@/components/employee-shell";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Clock3, MapPin } from "lucide-react";

type AttendanceSession = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  totalMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  status: string;
  shift?: {
    startsAt: string;
    endsAt: string;
  };
};

type HistoryResponse = {
  items: AttendanceSession[];
  total: number;
};

export default function EmployeeAttendancePage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    apiRequest<HistoryResponse>(`/attendance/me/history?limit=30`, {
      token: session.accessToken,
    })
      .then((data) => setSessions(data.items || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }

  return (
    <EmployeeShell>
      <div className="panel panel-large">
        <div className="panel-header">
          <div>
            <span className="section-kicker">Attendance</span>
            <h2>My Work History</h2>
            <p className="text-sm text-[color:var(--muted-foreground)]">Your recent check-ins and check-outs.</p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[color:var(--muted-foreground)]">Loading history...</div>
        ) : error ? (
          <div className="error-box">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">No attendance records found.</div>
        ) : (
          <div className="divide-y divide-[color:var(--border)]">
            {sessions.map((session) => {
              const dateObj = new Date(session.startedAt);
              return (
                <div key={session.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <strong className="text-lg block mb-1">
                      {dateObj.toLocaleDateString("ru-RU", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </strong>
                    <div className="flex items-center gap-4 text-sm text-[color:var(--muted-foreground)]">
                      <span className="flex items-center gap-1">
                        <Clock3 className="size-4" />
                        {dateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        {" - "}
                        {session.endedAt
                          ? new Date(session.endedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
                          : "Active"}
                      </span>
                      {session.shift && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-4" />
                          Shift: {new Date(session.shift.startsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} - {new Date(session.shift.endsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-[color:var(--muted-foreground)]">Duration</div>
                      <strong>{formatDuration(session.totalMinutes)}</strong>
                    </div>
                    {session.lateMinutes > 0 && <Badge variant="danger">Late: {session.lateMinutes}m</Badge>}
                    {session.earlyLeaveMinutes > 0 && <Badge variant="warning">Early leave: {session.earlyLeaveMinutes}m</Badge>}
                    {session.status === "OPEN" && <Badge variant="success">Active</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </EmployeeShell>
  );
}
