import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const WEB_DEVICE_STORAGE_KEY = 'smart.web.device-fingerprint';

function buildWebFingerprint() {
  if (typeof window === 'undefined') {
    return 'web-server-render';
  }

  const existing = window.localStorage.getItem(WEB_DEVICE_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const generated = `web-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  window.localStorage.setItem(WEB_DEVICE_STORAGE_KEY, generated);
  return generated;
}

export async function getCurrentDeviceFingerprint() {
  if (Platform.OS === 'ios') {
    const vendorId = await Application.getIosIdForVendorAsync();
    if (vendorId) {
      return `ios-${vendorId}`;
    }
  }

  if (Platform.OS === 'android') {
    const androidId = Application.getAndroidId();
    if (androidId) {
      return `android-${androidId}`;
    }
  }

  if (Platform.OS === 'web') {
    return buildWebFingerprint();
  }

  return `${Platform.OS}-${Device.modelId ?? Device.osBuildId ?? 'unknown-device'}`;
}

export function getCurrentDevicePlatform() {
  if (Platform.OS === 'ios') {
    return 'IOS' as const;
  }

  if (Platform.OS === 'android') {
    return 'ANDROID' as const;
  }

  return 'WEB' as const;
}

export function getCurrentDeviceName() {
  if (Platform.OS === 'web') {
    return typeof navigator === 'undefined' ? 'Web browser' : navigator.userAgent;
  }

  return Device.deviceName ?? `${Platform.OS} ${Device.modelName ?? 'device'}`;
}
