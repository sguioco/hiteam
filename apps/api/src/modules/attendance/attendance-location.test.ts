import "reflect-metadata";
import assert from "node:assert/strict";
import { validate } from "class-validator";
import { AttendanceActionDto } from "./dto/attendance-action.dto";
import { AttendanceService } from "./attendance.service";
import {
  isAcceptableAttendanceLocationAccuracy,
  MAX_ATTENDANCE_LOCATION_ACCURACY_METERS,
} from "./location-accuracy";

function buildDto(accuracyMeters: number) {
  return Object.assign(new AttendanceActionDto(), {
    accuracyMeters,
    deviceFingerprint: "test-device",
    latitude: 55.0302,
    longitude: 82.9204,
  });
}

async function run() {
  const now = new Date();
  const session = {
    id: 'session', employeeId: 'employee', status: 'OPEN', startedAt: now, endedAt: null,
    totalMinutes: 0, breakMinutes: 0, paidBreakMinutes: 0, lateMinutes: 0, earlyLeaveMinutes: 0,
    employee: { id: 'employee', firstName: 'Test', lastName: 'Employee', employeeNumber: '1', workMode: 'STATIONARY', department: { name: 'Team' }, primaryLocation: { name: 'New location' } },
    checkInEvent: { locationId: 'original-location', location: { name: 'Original location' }, occurredAt: now },
    checkOutEvent: null, shift: null, breaks: [],
  };
  const service = Object.assign(Object.create(AttendanceService.prototype), {
    prisma: { attendanceSession: { findMany: async (query: any) => {
      assert.ok(query.include.checkInEvent);
      assert.equal(query.where.tenantId, 'tenant');
      return [session];
    } } },
  }) as AttendanceService;
  const live = await service.liveTeam('tenant');
  const history = await service.teamHistory('tenant', {});
  for (const row of [live[0], history.rows[0]]) {
    assert.equal(row.locationId, 'original-location');
    assert.equal(row.location, 'Original location', 'Moving an employee must not move historical attendance');
  }

  assert.equal(MAX_ATTENDANCE_LOCATION_ACCURACY_METERS, 50);
  assert.equal(isAcceptableAttendanceLocationAccuracy(0), true);
  assert.equal(isAcceptableAttendanceLocationAccuracy(50), true);
  assert.equal(isAcceptableAttendanceLocationAccuracy(50.1), false);
  assert.equal(isAcceptableAttendanceLocationAccuracy(Number.NaN), false);

  const negativeAccuracyErrors = await validate(buildDto(-1));
  assert.equal(
    negativeAccuracyErrors.some((error) => error.property === "accuracyMeters"),
    true,
  );

  console.log("attendance location accuracy tests passed");
}

void run();
