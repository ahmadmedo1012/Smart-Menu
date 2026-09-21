import { NextResponse } from "next/server";
import { dbHealth } from "@/lib/db";
import { getClientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

// r118-A4-P3: /api/health was the cheapest unauthenticated DoS/cost vector —
// every hit ran a real Neon SELECT 1 (compute-hours) with no throttle. A
// DB-backed limiter is deliberately NOT used here: it would write to the very
// database whose health is being measured (and fail closed on an outage,
// hiding the true status). This is a lightweight IN-MEMORY per-IP bucket —
// per-instance only, which is an acceptable bound for an endpoint whose only
// job is honest status reporting (monitors + CI gates + keep-alive all stay
// far below it; an abusive client is capped at 30 real pings/min/IP/instance).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, { count: number; resetAt: number }>();

function allow(ip: string): boolean {
  const now = Date.now();
  const bucket = hits.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    // opportunistic sweep — keeps the map bounded under ip-spoofing pressure
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);
    }
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  bucket.count++;
  return bucket.count <= MAX_PER_WINDOW;
}

// Optional param: Next always passes the Request; unit tests call GET() bare
// (they exercise the "unknown" IP bucket).
export async function GET(request?: Request) {
  // r118-A4-P3: throttle before the DB ping; 429 carries no DB signal by
  // design (the client is abusing the endpoint, not probing health).
  // r119-S4-P3-2: unified extraction — the raw x-forwarded-for read was
  // spoofable off-Vercel (standalone/e2e), the exact class client-ip.ts
  // documents; getClientIp resolves the platform-trusted header.
  const ip = request ? getClientIp(request) : "unknown";
  if (!allow(ip)) {
    return NextResponse.json(
      { status: "rate-limited" },
      { status: 429, headers: { "retry-after": "10" } },
    );
  }

  const health = await dbHealth();
  const ok = health.ok;

  // round92 (2-c task 5 — deploy determinism): WHICH commit is actually
  // serving this response? A static version string can't answer that, and the
  // r92 closure needs a deterministic post-deploy check (see the coordinator's
  // production verification step). VERCEL_GIT_COMMIT_SHA is injected by Vercel
  // on every deployment; GIT_COMMIT_SHA is the manual/standalone fallback
  // (documented in .env.example). null when neither is set — we never
  // fabricate a fake sha. (A commit sha is public, non-secret data.)
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || null;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "0.1.0",
      commitSha,
      db: ok ? "connected" : "error",
      dbLatencyMs: health.latencyMs,
      env: process.env.NODE_ENV || "development",
    },
    { status: ok ? 200 : 503 },
  );
}

// Health probes must never be cached — a cached "ok" would mask an outage
// for the cache TTL and defeat the whole point of the endpoint.
export const revalidate = 0;
