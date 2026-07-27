import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPublicRequestUrl } from "@/lib/request-origin";
import { decodeSessionCookie, SESSION_COOKIE_NAME } from "@/lib/session-cookie";

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/account-deletion",
  "/cookies",
  "/create",
  "/dpa",
  "/login",
  "/mobile",
  "/privacy",
  "/privacy-en",
  "/signup",
  "/support",
  "/terms",
  "/terms-en",
]);

type LandingLocale = "en" | "ru" | "es" | "ar";

const MOBILE_BLOCK_PATH = "/mobile";
const LANDING_LOCALE_COOKIE_NAME = "hiteam-landing-locale";
const ADMIN_LOCALE_COOKIE_NAME = "smart-admin-locale";

const PUBLIC_PREFIXES = ["/join/", "/hi-team/create-organization"];

const PUBLIC_FILE_PATTERN = /\/[^/]+\.[^/]+$/;
const PHONE_USER_AGENT_PATTERN =
  /iphone|ipod|windows phone|blackberry|bb10|opera mini|iemobile|mobi/i;
const ALTEGIO_LOCATION_QUERY_KEYS = [
  "salon_id",
  "salon_ids",
  "location_id",
  "location_ids",
  "company_id",
] as const;

function isLandingLocale(
  value: string | null | undefined,
): value is LandingLocale {
  return value === "en" || value === "ru" || value === "es" || value === "ar";
}

function parsePreferredLandingLocale(
  acceptLanguageHeader: string | null,
): LandingLocale | null {
  if (!acceptLanguageHeader) {
    return null;
  }

  const tokens = acceptLanguageHeader
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  for (const token of tokens) {
    const locale = token.split(";")[0]?.trim();

    if (!locale) {
      continue;
    }

    if (locale === "ru" || locale.startsWith("ru-")) return "ru";
    if (locale === "es" || locale.startsWith("es-")) return "es";
    if (locale === "ar" || locale.startsWith("ar-")) return "ar";
    if (locale === "en" || locale.startsWith("en-")) return "en";
  }

  return null;
}

function resolveMobileBlockLocale(request: NextRequest): LandingLocale {
  const queryLocale = request.nextUrl.searchParams.get("locale");
  const landingLocale = request.cookies.get(LANDING_LOCALE_COOKIE_NAME)?.value;
  const adminLocale = request.cookies.get(ADMIN_LOCALE_COOKIE_NAME)?.value;

  if (isLandingLocale(queryLocale)) return queryLocale;
  if (isLandingLocale(landingLocale)) return landingLocale;
  if (isLandingLocale(adminLocale)) return adminLocale;

  return (
    parsePreferredLandingLocale(request.headers.get("accept-language")) ?? "en"
  );
}

function isPhoneRequest(request: NextRequest) {
  const userAgent = request.headers.get("user-agent");

  if (!userAgent) {
    return false;
  }

  return (
    PHONE_USER_AGENT_PATTERN.test(userAgent) ||
    (/android/i.test(userAgent) && /mobile/i.test(userAgent))
  );
}

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return true;
  }

  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getAltegioLocationId(searchParams: URLSearchParams) {
  for (const key of ALTEGIO_LOCATION_QUERY_KEYS) {
    const value = searchParams.get(key)?.trim();
    if (value) {
      return value.split(",")[0]?.trim() || value;
    }
  }

  return "";
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE_PATTERN.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (
    isPhoneRequest(request) &&
    pathname !== "/" &&
    pathname !== "/account-deletion" &&
    pathname !== MOBILE_BLOCK_PATH
  ) {
    const mobileUrl = getPublicRequestUrl(request, MOBILE_BLOCK_PATH);
    mobileUrl.searchParams.set("locale", resolveMobileBlockLocale(request));

    return NextResponse.redirect(mobileUrl);
  }

  const isPublicRoute = isPublicPath(pathname);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-smart-public-route", isPublicRoute ? "1" : "0");
  requestHeaders.set("x-smart-pathname", pathname);
  requestHeaders.set(
    "x-smart-return-to",
    `${pathname}${request.nextUrl.search}`,
  );

  const session = decodeSessionCookie(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  const hasSession = Boolean(session);
  const forceAuthPage = searchParams.get("force") === "1";
  const altegioLocationId = getAltegioLocationId(searchParams);
  const isAltegioEntry =
    searchParams.get("from")?.trim().toLowerCase() === "altegio" ||
    Boolean(altegioLocationId);

  if (
    hasSession &&
    isAltegioEntry &&
    altegioLocationId &&
    (pathname === "/login" || pathname === "/signup")
  ) {
    const billingUrl = getPublicRequestUrl(request, "/billing");
    billingUrl.searchParams.set("from", "altegio");
    billingUrl.searchParams.set("salon_id", altegioLocationId);

    const applicationId =
      searchParams.get("app_id")?.trim() ||
      searchParams.get("application_id")?.trim();
    if (applicationId) {
      billingUrl.searchParams.set("app_id", applicationId);
    }

    return NextResponse.redirect(billingUrl);
  }

  if (!hasSession && !isPublicRoute) {
    const loginUrl = getPublicRequestUrl(request, "/login");
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    hasSession &&
    !forceAuthPage &&
    (pathname === "/signup" || pathname === "/login")
  ) {
    return NextResponse.redirect(getPublicRequestUrl(request, "/app"));
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
