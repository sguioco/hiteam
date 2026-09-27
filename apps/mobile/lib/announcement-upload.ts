// Matches the existing JSON request limit in apps/api/src/main.ts.
export const ANNOUNCEMENT_REQUEST_LIMIT_BYTES = 8 * 1024 * 1024;
export const ANNOUNCEMENT_MAX_BINARY_BYTES = ANNOUNCEMENT_REQUEST_LIMIT_BYTES / 4 * 3;

export function utf8ByteLength(value: string) {
  let bytes = 0;
  for (const character of value) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export function announcementSizeError(language: string) {
  return language === 'ru'
    ? 'Новость с вложениями слишком большая. Уменьшите размер фото или документов: их общий размер должен быть меньше 6 МБ.'
    : 'This news item and its attachments are too large. Reduce the photo or documents: their combined size must be below 6 MB.';
}

export function serializeAnnouncement(payload: unknown, language: string) {
  const body = JSON.stringify(payload);
  if (utf8ByteLength(body) > ANNOUNCEMENT_REQUEST_LIMIT_BYTES) {
    throw new Error(announcementSizeError(language));
  }
  return body;
}
