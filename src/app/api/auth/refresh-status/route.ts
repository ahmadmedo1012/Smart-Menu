import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * Refresh the subscription-status cookie from DB.
 * Called after admin approves a payment so the middleware
 * doesn't redirect the newly-PAID user back to /subscribe.
 */
export async function POST() {
  const auth = await requireAuth();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }

  const c = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const SEVEN_DAYS = 60 * 60 * 24 * 7;

  c.set("smart-menu-subscription-status", auth.subscriptionStatus ?? "UNPAID", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS,
  });

  return NextResponse.json({ success: true, status: auth.subscriptionStatus });
}
