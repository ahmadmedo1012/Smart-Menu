import { NextResponse } from "next/server";
import { dbHealth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await dbHealth();
  const ok = health.ok;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "0.1.0",
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
