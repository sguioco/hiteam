import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type AttendanceLocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
};

export class PreciseLocationError extends Error {
  constructor(
    public readonly code:
      | 'LOCATION_PERMISSION_REQUIRED'
      | 'PRECISE_LOCATION_REQUIRED'
      | 'LOCATION_ACCURACY_TOO_LOW'
      | 'LOCATION_CAPTURE_FAILED',
  ) {
    super(code);
  }
}

export function isPreciseLocationError(error: unknown): error is PreciseLocationError {
  return error instanceof PreciseLocationError;
}

export async function capturePreciseAttendanceLocation(maxAccuracyMeters = 50): Promise<AttendanceLocationSnapshot> {
  let permission = await Location.getForegroundPermissionsAsync();

  if (!permission.granted) {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (!permission.granted) {
    throw new PreciseLocationError('LOCATION_PERMISSION_REQUIRED');
  }

  if (Platform.OS === 'android' && permission.android?.accuracy !== 'fine') {
    throw new PreciseLocationError('PRECISE_LOCATION_REQUIRED');
  }

  let location: Location.LocationObject;

  try {
    location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
      mayShowUserSettingsDialog: true,
    });
  } catch {
    throw new PreciseLocationError('LOCATION_CAPTURE_FAILED');
  }

  const accuracyMeters = Math.round(location.coords.accuracy ?? Number.POSITIVE_INFINITY);

  if (!Number.isFinite(accuracyMeters) || accuracyMeters > maxAccuracyMeters) {
    throw new PreciseLocationError('LOCATION_ACCURACY_TOO_LOW');
  }

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracyMeters,
    capturedAt: new Date(location.timestamp).toISOString(),
  };
}
