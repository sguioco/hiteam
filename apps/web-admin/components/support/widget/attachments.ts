import { randomUUID } from "./randomId";
import { SupportClientError } from "./errors";
import type { SupportMessageAttachment } from "./types";

export const MAX_PENDING_ATTACHMENTS = 3;
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

const ALLOWED_MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export type PendingAttachment = SupportMessageAttachment & {
  previewUrl: string;
};

export function isImageFile(file: File): boolean {
  const mime = (file.type || "").toLowerCase();
  if (ALLOWED_MIMES.has(mime)) {
    return true;
  }
  const name = file.name.toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => name.endsWith(ext));
}

function normalizeMime(file: File): string {
  const mime = (file.type || "").toLowerCase();
  if (mime === "image/jpg") {
    return "image/jpeg";
  }
  if (ALLOWED_MIMES.has(mime)) {
    return mime;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new SupportClientError("imageRead", reader.error));
    reader.readAsDataURL(file);
  });
}

export async function readImageAttachment(file: File): Promise<PendingAttachment> {
  if (!isImageFile(file)) {
    throw new SupportClientError("imageType");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new SupportClientError("imageSize");
  }
  const dataUrl = await readFileAsDataUrl(file);
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) {
    throw new SupportClientError("imageRead");
  }
  const dataBase64 = dataUrl.slice(commaIndex + 1);
  const mime = normalizeMime(file);
  const id = `att_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  return {
    id,
    mime,
    name: file.name || "screenshot.png",
    data_base64: dataBase64,
    previewUrl: `data:${mime};base64,${dataBase64}`,
  };
}

export async function readImageFiles(files: FileList | File[]): Promise<PendingAttachment[]> {
  const list = Array.from(files).filter(isImageFile);
  const results: PendingAttachment[] = [];
  for (const file of list) {
    results.push(await readImageAttachment(file));
  }
  return results;
}

export function toMessageAttachments(items: PendingAttachment[]): SupportMessageAttachment[] {
  return items.map(({ id, mime, name, data_base64 }) => ({ id, mime, name, data_base64 }));
}

export function attachmentsFromMetadata(metadata: Record<string, unknown> | undefined): SupportMessageAttachment[] {
  const raw = metadata?.attachments;
  if (!Array.isArray(raw)) {
    return [];
  }
  const items: SupportMessageAttachment[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const dataBase64 = String(record.data_base64 ?? record.dataBase64 ?? "").trim();
    const mime = String(record.mime ?? "").trim();
    if (!dataBase64 || !mime) {
      continue;
    }
    items.push({
      id: String(record.id ?? `att_${items.length}`),
      mime,
      name: String(record.name ?? "screenshot"),
      data_base64: dataBase64,
    });
  }
  return items;
}

export function revokePendingAttachments(items: PendingAttachment[]): void {
  for (const item of items) {
    if (item.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }
}
