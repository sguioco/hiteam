import type { WorkspaceSetupStep } from './auth-flow';
import { loadBiometricPolicy } from './api';
import { getPreciseLocationAccessStatus } from './location';
import { hasCompletedLocationOnboarding } from './onboarding';

export async function resolveWorkspaceSetupStep(): Promise<WorkspaceSetupStep> {
  const biometricPolicy = await loadBiometricPolicy().catch(() => null);

  if (biometricPolicy && biometricPolicy.enrollmentStatus !== 'ENROLLED') {
    return 'biometric';
  }

  const [locationOnboardingComplete, locationStatus] = await Promise.all([
    hasCompletedLocationOnboarding().catch(() => false),
    getPreciseLocationAccessStatus({ requestIfNeeded: false }).catch(() => ({
      status: 'missing' as const,
      accuracyMeters: null,
    })),
  ]);

  if (!locationOnboardingComplete || locationStatus.status !== 'ready') {
    return 'location';
  }

  return null;
}

export function isWorkspaceSetupRoute(pathname: string) {
  return pathname.startsWith('/biometric') || pathname.startsWith('/onboarding/workspace-ready');
}

export function matchesWorkspaceSetupStep(pathname: string, step: Exclude<WorkspaceSetupStep, null>) {
  return step === 'biometric'
    ? pathname.startsWith('/biometric')
    : pathname.startsWith('/onboarding/workspace-ready');
}

export function getWorkspaceSetupHref(step: Exclude<WorkspaceSetupStep, null>) {
  if (step === 'biometric') {
    return {
      pathname: '/biometric' as const,
      params: {
        mode: 'enroll',
        returnTo: '/onboarding/workspace-ready',
      },
    };
  }

  return '/onboarding/workspace-ready' as const;
}

export async function resolveAttendanceActionHref(action: 'check-in' | 'check-out') {
  const biometricPolicy = await loadBiometricPolicy().catch(() => null);

  if (biometricPolicy?.enrollmentStatus !== 'ENROLLED') {
    return {
      pathname: '/biometric' as const,
      params: {
        mode: 'enroll',
        returnTo: '/today',
      },
    };
  }

  return action === 'check-in' ? ('/say-hi' as const) : ('/say-bye' as const);
}
