import "reflect-metadata";
import assert from "node:assert/strict";
import { validate } from "class-validator";
import { AttendanceActionDto } from "./dto/attendance-action.dto";
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
