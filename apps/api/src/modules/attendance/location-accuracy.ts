export const MAX_ATTENDANCE_LOCATION_ACCURACY_METERS = 50;

export function isAcceptableAttendanceLocationAccuracy(value: number) {
  return (
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_ATTENDANCE_LOCATION_ACCURACY_METERS
  );
}
