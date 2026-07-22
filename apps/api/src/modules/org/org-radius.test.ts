import "reflect-metadata";
import assert from "node:assert/strict";
import { validate } from "class-validator";
import { UpsertOrgSetupDto } from "./dto/upsert-org-setup.dto";
import {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  MIN_GEOFENCE_RADIUS_METERS,
  normalizeGeofenceRadius,
} from "./geofence-radius";

function buildDto(geofenceRadiusMeters: number) {
  return Object.assign(new UpsertOrgSetupDto(), {
    companyName: "HiTeam",
    address: "Test address",
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: "Asia/Dubai",
    geofenceRadiusMeters,
  });
}

async function hasRadiusValidationError(value: number) {
  const errors = await validate(buildDto(value));
  return errors.some((error) => error.property === "geofenceRadiusMeters");
}

async function run() {
  assert.equal(MIN_GEOFENCE_RADIUS_METERS, 50);
  assert.equal(DEFAULT_GEOFENCE_RADIUS_METERS, 100);
  assert.equal(normalizeGeofenceRadius(undefined), 100);
  assert.equal(normalizeGeofenceRadius(49), 50);
  assert.equal(normalizeGeofenceRadius(50), 50);
  assert.equal(normalizeGeofenceRadius(250), 250);
  assert.equal(await hasRadiusValidationError(49), true);
  assert.equal(await hasRadiusValidationError(50), false);

  console.log("organization geofence radius tests passed");
}

void run();
