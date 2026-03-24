import * as FileSystem from 'expo-file-system/legacy';
import { getDemoSession } from './api';
import { getCurrentDeviceFingerprint } from './device';

type OnboardingState = {
  locationByUserAndDevice: Record<string, true | undefined>;
};

const ONBOARDING_STATE_PATH = `${FileSystem.documentDirectory ?? ''}smart-onboarding-state.json`;

function getDefaultState(): OnboardingState {
  return {
    locationByUserAndDevice: {},
  };
}

async function readState(): Promise<OnboardingState> {
  if (!FileSystem.documentDirectory) {
    return getDefaultState();
  }

  try {
    const info = await FileSystem.getInfoAsync(ONBOARDING_STATE_PATH);
    if (!info.exists) {
      return getDefaultState();
    }

    const raw = await FileSystem.readAsStringAsync(ONBOARDING_STATE_PATH);
    if (!raw.trim()) {
      return getDefaultState();
    }

    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      locationByUserAndDevice: parsed.locationByUserAndDevice ?? {},
    };
  } catch {
    return getDefaultState();
  }
}

async function writeState(state: OnboardingState) {
  if (!FileSystem.documentDirectory) {
    return;
  }

  await FileSystem.writeAsStringAsync(ONBOARDING_STATE_PATH, JSON.stringify(state));
}

async function buildLocationKey() {
  const session = await getDemoSession();
  const deviceFingerprint = await getCurrentDeviceFingerprint();
  return `${session.user.id}:${deviceFingerprint}`;
}

export async function hasCompletedLocationOnboarding() {
  const [state, key] = await Promise.all([readState(), buildLocationKey()]);
  return state.locationByUserAndDevice[key] === true;
}

export async function markLocationOnboardingComplete() {
  const [state, key] = await Promise.all([readState(), buildLocationKey()]);
  state.locationByUserAndDevice[key] = true;
  await writeState(state);
}

export async function resetLocationOnboarding() {
  const [state, key] = await Promise.all([readState(), buildLocationKey()]);
  delete state.locationByUserAndDevice[key];
  await writeState(state);
}
