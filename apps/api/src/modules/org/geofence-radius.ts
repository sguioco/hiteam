export const MIN_GEOFENCE_RADIUS_METERS = 50;
export const DEFAULT_GEOFENCE_RADIUS_METERS = 100;

export function normalizeGeofenceRadius(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_GEOFENCE_RADIUS_METERS;
  }

  return Math.max(MIN_GEOFENCE_RADIUS_METERS, value);
}
