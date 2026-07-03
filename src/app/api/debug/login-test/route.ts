import { prisma } from "@/lib/db";
import { error } from "@/lib/api-helpers";
import { z } from "zod";
import { createSession } from "@/lib/session";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    // Step 1: Parse
    const body = await request.json();
    const { username, password } = body;

    // Step 2: Find user
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, password: true, name: true, role: true, restaurantId: true },
    });
    if (!user) return Response.json({ step: "findUser", error: "not found" });

    // Step 3: Verify hash
    const { verifyHash } = await import("@/lib/hash");
    const valid = verifyHash(password, user.password);
    if (!valid) return Response.json({ step: "verifyHash", valid, pw_len: user.password.length, pw_prefix: user.password.substring(0, 30) });

    // Step 4: Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Step 5: Create session
    await createSession(user.id);

    // Step 6: Set cookies
    const cookieStore = await cookies();
    cookieStore.set("test-cookie", "ok");

    return Response.json({ step: "done", success: true, role: user.role });
  } catch (e: any) {
    return Response.json({ step: "catch", error: e?.message || String(e), stack: e?.stack?.substring(0, 500) });
  }
}
