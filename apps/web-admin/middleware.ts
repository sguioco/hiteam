import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeSessionCookie, SESSION_COOKIE_NAME } from "@/lib/session-cookie";

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/login",
  "/signup",
]);

const PUBLIC_PREFIXES = [
  "/join/",
  "/hi-team/create-organization",
];

const PUBLIC_FILE_PATTERN = /\/[^/]+\.[^/]+$/;

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return true;
  }

  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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

  if (!hasSession && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    hasSession &&
    !forceAuthPage &&
    (pathname === "/signup" || pathname === "/login")
  ) {
    return NextResponse.redirect(new URL("/app", request.url));
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
