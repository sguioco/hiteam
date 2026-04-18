import { NextRequest, NextResponse } from "next/server";
import type { AuthSession } from "@/lib/auth";
import { isDemoAccessToken } from "@/lib/demo-mode";
import { serverApiRequest } from "@/lib/server-api";
import {
  decodeSessionCookie,
  encodeSessionCookie,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
} from "@/lib/session-cookie";

export const runtime = "edge";

function shouldUseSecureCookies(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }

  return request.nextUrl.protocol === "https:";
}

function normalizeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  return value;
}

function buildLoginResponse(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login?force=1", request.url));
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    expires: new Date(0),
  });
  return response;
}

export async function GET(request: NextRequest) {
  const session = decodeSessionCookie(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  if (!session?.refreshToken) {
    return buildLoginResponse(request);
  }

  const returnTo = normalizeReturnTo(request.nextUrl.searchParams.get("next"));

  if (isDemoAccessToken(session.accessToken)) {
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  try {
    const nextSession = await serverApiRequest<AuthSession>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    const response = NextResponse.redirect(new URL(returnTo, request.url));

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: encodeSessionCookie(nextSession),
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookies(request),
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  } catch {
    return buildLoginResponse(request);
  }
}
