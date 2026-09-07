import { NextResponse } from "next/server";
import { dbHealth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
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
