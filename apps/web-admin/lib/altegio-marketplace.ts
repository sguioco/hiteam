const STORAGE_KEY = "hiteam.altegioMarketplaceConnect";

export type AltegioMarketplaceConnectPayload = {
  locationId: string;
  applicationId: string | null;
  capturedAt: number;
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
    return parsed;
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
  } catch {
    // ignore
  }
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
