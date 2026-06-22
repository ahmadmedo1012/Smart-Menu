/**
 * @deprecated The middleware has moved to /middleware.ts (project root).
 * This file is kept for reference only and is no longer loaded.
 * Next.js requires middleware at the project root, not in src/.
 * See: /middleware.ts
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Deprecated — use /middleware.ts instead
  return NextResponse.next();
}
