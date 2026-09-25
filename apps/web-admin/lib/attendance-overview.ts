export type AttendanceOverviewRow = {
  hasSession: boolean;
  isActive: boolean;
  isLate: boolean;
};

export function summarizeAttendance(rows: AttendanceOverviewRow[]) {
  return {
    active: rows.filter((row) => row.isActive).length,
    checked: rows.filter((row) => row.hasSession).length,
    late: rows.filter((row) => row.hasSession && row.isLate).length,
    missing: rows.filter((row) => !row.hasSession).length,
  };
}
