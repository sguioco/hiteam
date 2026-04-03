import { NextRequest, NextResponse } from "next/server";
import type { AuthSession } from "@/lib/auth";
import {
  encodeSessionCookie,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
} from "@/lib/session-cookie";

export const runtime = "edge";

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
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: encodeSessionCookie(payload.session),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
