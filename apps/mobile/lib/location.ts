import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type AttendanceLocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
};

export type PreciseLocationAccessStatus = {
  status: 'missing' | 'imprecise' | 'ready';
  accuracyMeters: number | null;
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

export async function getPreciseLocationAccessStatus(options?: {
  requestIfNeeded?: boolean;
}): Promise<PreciseLocationAccessStatus> {
  const requestIfNeeded = options?.requestIfNeeded ?? true;
  let permission = await Location.getForegroundPermissionsAsync();
  const isExpoGoAndroid =
    Platform.OS === 'android' &&
    (__DEV__ || Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient');

  if (!permission.granted && permission.canAskAgain && requestIfNeeded) {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (!permission.granted) {
    return {
      status: 'missing',
      accuracyMeters: null,
    };
  }

  try {
    if (Platform.OS === 'android' && permission.android?.accuracy !== 'fine' && requestIfNeeded) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (Platform.OS === 'android') {
      if (isExpoGoAndroid && permission.granted) {
        return {
          status: 'ready',
          accuracyMeters: null,
        };
      }

      if (permission.android?.accuracy === 'fine') {
        return {
          status: 'ready',
          accuracyMeters: null,
        };
      }

      return {
        status: 'imprecise',
        accuracyMeters: null,
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      mayShowUserSettingsDialog: false,
    });
    const accuracyMeters = Math.round(location.coords.accuracy ?? Number.POSITIVE_INFINITY);

    if (!Number.isFinite(accuracyMeters)) {
      return {
        status: 'imprecise',
        accuracyMeters: null,
      };
    }

    if (Platform.OS === 'ios' && accuracyMeters > 500) {
      return {
        status: 'imprecise',
        accuracyMeters,
      };
    }
    return {
      status: 'ready',
      accuracyMeters,
    };
  } catch {
    return {
      status: 'imprecise',
      accuracyMeters: null,
    };
  }
}

export async function capturePreciseAttendanceLocation(maxAccuracyMeters = 50): Promise<AttendanceLocationSnapshot> {
  let permission = await Location.getForegroundPermissionsAsync();

  if (!permission.granted) {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (!permission.granted) {
    throw new PreciseLocationError('LOCATION_PERMISSION_REQUIRED');
  }

  let location: Location.LocationObject;

  try {
    if (Platform.OS === 'android' && permission.android?.accuracy !== 'fine') {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      mayShowUserSettingsDialog: true,
    });
  } catch {
    throw new PreciseLocationError('LOCATION_CAPTURE_FAILED');
  }

  const accuracyMeters = Math.round(location.coords.accuracy ?? Number.POSITIVE_INFINITY);

  // Expo does not expose the iOS "Precise Location" toggle directly.
  // In practice, iOS reduced accuracy usually reports a very large uncertainty radius.
  if (Platform.OS === 'ios' && Number.isFinite(accuracyMeters) && accuracyMeters > 500) {
    throw new PreciseLocationError('PRECISE_LOCATION_REQUIRED');
  }

  if (Platform.OS === 'android') {
    const reportedFine = permission.android?.accuracy === 'fine';

    if (!reportedFine && (!Number.isFinite(accuracyMeters) || accuracyMeters > 150)) {
      throw new PreciseLocationError('PRECISE_LOCATION_REQUIRED');
    }
  }

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
