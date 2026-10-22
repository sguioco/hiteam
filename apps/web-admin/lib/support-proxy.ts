import { createHmac } from "node:crypto";

const ID = "[A-Za-z0-9_-]{1,128}";
const READ = new RegExp(`^sessions/${ID}(?:/turns/${ID})?$`);
const WRITE = new RegExp(`^sessions/${ID}/(?:messages|clear|turns/${ID}/feedback)$`);
const MAX_BODY = 20 * 1024 * 1024;

export function allowedSupportPath(method: string, path: string) {
  return (method === "GET" && READ.test(path)) ||
    (method === "POST" && (["sessions", "escalate"].includes(path) || WRITE.test(path)));
}

export function signedSupportIdentity(actorId: string, tenantId: string, secret: string, now = Math.floor(Date.now() / 1000)) {
  // Alphabetical keys match the Python Support service's canonical JSON contract.
  const identity = { actor_id: actorId, company_code: tenantId.toLowerCase(),
    expires_at: now + 300, issued_at: now, product_id: "hiteam" };
  const signature = createHmac("sha256", secret).update(JSON.stringify(identity)).digest("hex");
  return `v1.${Buffer.from(JSON.stringify({ identity, signature })).toString("base64url")}`;
}

type ProxyOptions = { env?: NodeJS.ProcessEnv; fetcher?: typeof fetch };

function failure(status: number, message: string) {
  return Response.json({ detail: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function proxySupportRequest(request: Request, path: string, options: ProxyOptions = {}) {
  const env = options.env ?? process.env;
  const fetcher = options.fetcher ?? fetch;
  const authorization = request.headers.get("Authorization") || "";
  if (!/^Bearer \S+$/i.test(authorization)) return failure(401, "Authentication required");
  if (!allowedSupportPath(request.method, path)) return failure(404, "Support operation not found");
  if (env.HITEAM_SUPPORT_ENABLED !== "true" || !env.HITEAM_SUPPORT_BASE_URL ||
      !env.HITEAM_SUPPORT_API_KEY || !env.HITEAM_SUPPORT_IDENTITY_SECRET) {
    return failure(503, "Support is not configured");
  }
  const apiBase = env.INTERNAL_API_URL ?? env.API_INTERNAL_URL ?? env.API_URL ?? "http://api:4000";
  let actor: { id?: unknown; tenantId?: unknown };
  try {
    const me = await fetcher(`${apiBase.replace(/\/$/, "")}/api/v1/auth/me`, {
      headers: { Authorization: authorization }, redirect: "error", cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (me.status === 401 || me.status === 403) return failure(me.status, "Authentication required");
    if (!me.ok) return failure(502, "Unable to verify Support identity");
    actor = await me.json();
  } catch {
    return failure(502, "Unable to verify Support identity");
  }
  if (typeof actor?.id !== "string" || !actor.id || typeof actor.tenantId !== "string" || !actor.tenantId) {
    return failure(502, "Invalid Support identity response");
  }
  // Client-supplied user/tenant context is not an authority. Only /auth/me is signed.
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (request.body) {
    const reader = request.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY) {
          await reader.cancel();
          return failure(413, "Support request is too large");
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  try {
    const upstream = await fetcher(`${env.HITEAM_SUPPORT_BASE_URL.replace(/\/$/, "")}/support/${path}${new URL(request.url).search}`, {
      method: request.method, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(120_000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.HITEAM_SUPPORT_API_KEY}`,
        "X-Product-Identity": signedSupportIdentity(actor.id, actor.tenantId, env.HITEAM_SUPPORT_IDENTITY_SECRET) },
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    return new Response(await upstream.arrayBuffer(), { status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch {
    return failure(502, "Support service is unavailable");
  }
}
