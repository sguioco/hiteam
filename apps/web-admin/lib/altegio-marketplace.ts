const STORAGE_KEY = "hiteam.altegioMarketplaceConnect";
const PREVIEW_STORAGE_KEY = "hiteam.altegioMarketplacePreview";
const CONNECT_WINDOW_MS = 60 * 60 * 1000;

export type AltegioMarketplaceConnectPayload = {
  locationId: string;
  applicationId: string | null;
  capturedAt: number;
};

export type AltegioOnboardingPreview = {
  applicationId: string;
  connectionStatus: string;
  location: {
    id: string;
    name: string;
    publicName: string | null;
    address: string;
    country: string | null;
    city: string | null;
    timezone: string;
    latitude: number;
    longitude: number;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
  };
};

const LOCATION_KEYS = [
  "salon_id",
  "salon_ids",
  "location_id",
  "location_ids",
  "company_id",
  "locationId",
] as const;

const APP_KEYS = ["app_id", "application_id", "appId"] as const;

function firstParam(search: URLSearchParams, keys: readonly string[]) {
  for (const key of keys) {
    const value = String(search.get(key) || "").trim();
    if (value) {
      return value.split(",")[0]?.trim() || value;
    }
  }
  return "";
}

export function readAltegioMarketplaceParams(
  search: string | URLSearchParams = typeof window !== "undefined" ? window.location.search : "",
): AltegioMarketplaceConnectPayload | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const fromAltegio = String(params.get("from") || "").trim().toLowerCase() === "altegio";
  const locationId = firstParam(params, LOCATION_KEYS);
  const applicationId = firstParam(params, APP_KEYS) || null;

  if (!locationId && !fromAltegio) {
    return null;
  }
  if (!locationId) {
    return null;
  }

  return {
    locationId,
    applicationId,
    capturedAt: Date.now(),
  };
}

export function captureAltegioMarketplaceParams(
  search: string | URLSearchParams = typeof window !== "undefined" ? window.location.search : "",
) {
  const payload = readAltegioMarketplaceParams(search);
  if (!payload || typeof window === "undefined") {
    return payload;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
  return payload;
}

export function peekAltegioMarketplaceParams(): AltegioMarketplaceConnectPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const fromUrl = readAltegioMarketplaceParams();
  if (fromUrl) {
    return fromUrl;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AltegioMarketplaceConnectPayload;
    if (!parsed?.locationId) {
      return null;
    }
    if (!parsed.capturedAt || Date.now() - parsed.capturedAt > CONNECT_WINDOW_MS) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveAltegioOnboardingPreview(preview: AltegioOnboardingPreview) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(preview));
  } catch {
    // ignore
  }
}

export function peekAltegioOnboardingPreview(): AltegioOnboardingPreview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PREVIEW_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AltegioOnboardingPreview) : null;
  } catch {
    return null;
  }
}

export function clearAltegioMarketplaceParams() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function buildAltegioMarketplaceAppUrl(locationId: string, applicationId: string) {
  const salon = locationId.trim();
  const application = applicationId.trim();
  if (!/^\d+$/.test(salon) || !/^\d+$/.test(application)) {
    return null;
  }
  const query = new URLSearchParams({
    utm_source: "hiteam",
    utm_medium: "integration",
    utm_campaign: "connect_altegio",
  });
  return `https://app.alteg.io/appstore/${salon}/applications/${application}/info?${query.toString()}`;
}

export function extractAltegioSalonId(value: string) {
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) {
    return normalized;
  }
  const patterns = [
    /\/appstore\/(\d+)\/applications\//i,
    /\/compan(?:y|ies)\/(\d+)/i,
    /[?&#](?:salon_id|location_id|company_id)=(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

export function resolvePostLoginRouteWithAltegio(defaultRoute: string) {
  const pending = peekAltegioMarketplaceParams();
  if (!pending?.locationId) {
    return defaultRoute;
  }
  const params = new URLSearchParams({
    from: "altegio",
    salon_id: pending.locationId,
  });
  if (pending.applicationId) {
    params.set("app_id", pending.applicationId);
  }
  return `/billing?${params.toString()}`;
}
