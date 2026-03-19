export const ATTENDANCE_REDIS_CHANNEL = 'smart:attendance-live';

export type AttendanceRealtimeEnvelope = {
  tenantId: string;
  sessions: unknown;
};
