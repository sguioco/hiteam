import * as Haptics from 'expo-haptics';

function fire(promise: Promise<void>) {
  void promise.catch(() => undefined);
}

export function hapticSelection() {
  fire(Haptics.selectionAsync());
}

export function hapticPress() {
  fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticMedium() {
  fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticHeavy() {
  fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

export function hapticSuccess() {
  fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function hapticWarning() {
  fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function hapticError() {
  fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
