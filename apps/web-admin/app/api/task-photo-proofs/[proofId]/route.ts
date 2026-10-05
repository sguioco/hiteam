import { NextRequest } from 'next/server';
import { decodeSessionCookie, SESSION_COOKIE_NAME } from '@/lib/session-cookie';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ proofId: string }> }) {
  const session = decodeSessionCookie(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'X-Content-Type-Options': 'nosniff' };
  if (!session) return new Response(null, { status: 401, headers });
  const { proofId } = await context.params;
  const base = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const upstream = await fetch(`${base.replace(/\/$/, '')}/api/v1/media/task-photo-proofs/${encodeURIComponent(proofId)}/file`, {
    headers: { Authorization: `Bearer ${session.accessToken}`, 'X-HiTeam-Client': 'web-admin-server' },
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000),
  });
  if (!upstream.ok) return new Response(null, { status: upstream.status, headers });
  return new Response(upstream.body, { headers: {
    ...headers,
    'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
    'Content-Disposition': upstream.headers.get('Content-Disposition') ?? 'inline',
    'X-Content-Type-Options': 'nosniff',
  } });
}
