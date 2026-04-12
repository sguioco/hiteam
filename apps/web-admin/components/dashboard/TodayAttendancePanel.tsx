"use client";

type TodayAttendancePanelProps = {
  locale: "ru" | "en";
};

export function TodayAttendancePanel({
  locale,
}: TodayAttendancePanelProps) {
  return (
    <div className="dashboard-card today-attendance-panel">
      <div className="today-attendance-head">
        <h2>Today Attendance</h2>
      </div>

      <div className="today-attendance-body">
        <div className="today-attendance-placeholder" aria-hidden="true" />
      </div>
    </div>
  );
}
