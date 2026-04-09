import { NextRequest, NextResponse } from "next/server";
import type { AuthSession } from "@/lib/auth";
import {
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

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as {
    session?: AuthSession;
  } | null;

  if (!payload?.session) {
    return NextResponse.json(
      { message: "Session payload is required." },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ ok: true });
  const secure = shouldUseSecureCookies(request);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: encodeSessionCookie(payload.session),
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const secure = shouldUseSecureCookies(request);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: new Date(0),
  });
  return response;
}
