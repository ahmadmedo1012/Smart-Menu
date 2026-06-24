import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

const SESSION_COOKIE = "smart-menu-session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function deleteExistingSessions(userId: number) {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function createSession(userId: number) {
  // Rotate — delete any old sessions for this user
  await deleteExistingSessions(userId);

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  c.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export async function validateSession(): Promise<{ valid: boolean; userId: number | null }> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return { valid: false, userId: null };

  try {
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        // Clean up expired
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      return { valid: false, userId: null };
    }
    return { valid: true, userId: session.userId };
  } catch {
    return { valid: false, userId: null };
  }
}
