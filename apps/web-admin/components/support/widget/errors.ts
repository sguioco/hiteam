import { normalizeWidgetLocale } from "./locale";

const MESSAGES = {
  unavailable: { ru: "Поддержка временно недоступна. Попробуйте позже.", en: "Support is temporarily unavailable. Please try again later.", de: "Der Support ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut." },
  timeout: { ru: "Ответ занимает больше времени, чем обычно. Попробуйте позже.", en: "The response is taking longer than usual. Please try again later.", de: "Die Antwort dauert länger als üblich. Bitte versuchen Sie es später erneut." },
  unauthorized: { ru: "Не удалось подтвердить доступ к поддержке. Войдите в систему заново.", en: "Could not verify support access. Please sign in again.", de: "Der Supportzugang konnte nicht bestätigt werden. Bitte melden Sie sich erneut an." },
  imageType: { ru: "Поддерживаются изображения PNG, JPEG, WebP и GIF.", en: "Only PNG, JPEG, WebP and GIF images are supported.", de: "Es werden nur PNG-, JPEG-, WebP- und GIF-Bilder unterstützt." },
  imageSize: { ru: "Изображение слишком большое (максимум 4 МБ).", en: "The image is too large (maximum 4 MB).", de: "Das Bild ist zu groß (maximal 4 MB)." },
  imageRead: { ru: "Не удалось прочитать изображение.", en: "Could not read the image.", de: "Das Bild konnte nicht gelesen werden." },
} as const;

export class SupportClientError extends Error {
  constructor(public readonly code: keyof typeof MESSAGES, public readonly diagnostic?: unknown) {
    super(code);
  }
}

export function supportErrorText(error: unknown, locale: string): string {
  const code = error instanceof SupportClientError ? error.code : "unavailable";
  return MESSAGES[code][normalizeWidgetLocale(locale)];
}

export async function responseError(response: Response): Promise<SupportClientError> {
  return new SupportClientError(
    response.status === 401 || response.status === 403 ? "unauthorized" : "unavailable",
    { status: response.status, body: await response.text() },
  );
}
