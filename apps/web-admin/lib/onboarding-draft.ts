// Tab-local drafts survive reloads, but never substitute for saved server setup.
export function onboardingDraftKey(tenant: string, user: string, company?: string, location?: string) {
  return `smart:onboarding:v1:${JSON.stringify([tenant, user, company ?? null, location ?? null])}`;
}

export function encodeOnboardingDraft(draft: Record<string, unknown>, step: 1 | 2, now = Date.now()) {
  const fields = Object.fromEntries(Object.entries(draft).filter(([key, value]) =>
    key !== 'companyLogoUrl' && key !== 'details' &&
    (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && value.length <= 4096))));
  return JSON.stringify({ version: 1, savedAt: now, step, fields });
}

export function decodeOnboardingDraft<T extends Record<string, unknown>>(raw: string | null, defaults: T, now = Date.now()): { draft: T; step: 1 | 2 } | null {
  if (!raw) return null;
  let data;
  try { data = JSON.parse(raw); } catch { return null; }
  if (!data || data.version !== 1 || !Number.isFinite(data.savedAt) || data.savedAt > now || now - data.savedAt > 24 * 60 * 60 * 1000 || ![1, 2].includes(data.step) || !data.fields || typeof data.fields !== 'object' || Array.isArray(data.fields)) return null;
  const draft = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (key === 'companyLogoUrl' || key === 'details' || !Object.prototype.hasOwnProperty.call(data.fields, key)) continue;
    const value = data.fields[key];
    if (typeof value !== typeof defaults[key] || (typeof value === 'number' && !Number.isFinite(value)) || (typeof value === 'string' && value.length > 4096)) return null;
    draft[key as keyof T] = value;
  }
  return { draft, step: data.step };
}
