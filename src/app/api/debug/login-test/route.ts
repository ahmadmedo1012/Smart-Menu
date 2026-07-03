import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  const steps: string[] = [];
  try {
    steps.push("prisma: starting");
    const user = await prisma.user.findUnique({
      where: { username: "admin" },
      select: { id: true, username: true, role: true, password: true },
    });
    steps.push(`prisma: user=${user?.id} role=${user?.role} pw_len=${user?.password.length}`);
    if (!user) return Response.json({ steps, error: "user not found" });

    steps.push("verifyHash: starting");
    const { verifyHash } = await import("@/lib/hash");
    const valid = verifyHash("admin123", user.password);
    steps.push(`verifyHash: ${valid}`);

    steps.push("createSession: starting");
    // test just creating session without actually doing it
    const { createSession } = await import("@/lib/session");
    steps.push("createSession: imported OK");

    steps.push("cookies: starting");
    const c = await cookies();
    steps.push(`cookies: OK`);

    return Response.json({ steps, success: true });
  } catch (e: any) {
    return Response.json({ steps, error: e?.message || String(e), stack: e?.stack?.substring(0, 2000) }, { status: 500 });
  }
}
