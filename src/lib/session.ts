import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

const SESSION_COOKIE = "smart-menu-session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_SESSIONS_PER_USER = 5;

// ponytail: sliding window — validateSession() extends active sessions automatically

async function trimExpiredSessions(userId: number) {
  await prisma.session.deleteMany({
    where: { userId, expiresAt: { lte: new Date() } },
  });
  const active = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (active.length > MAX_SESSIONS_PER_USER) {
    const keep = new Set(active.slice(0, MAX_SESSIONS_PER_USER).map((s) => s.id));
    await prisma.session.deleteMany({
      where: { userId, id: { notIn: [...keep] } },
    });
  }
}

export async function createSession(userId: number) {
  await trimExpiredSessions(userId);

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
    if (!/^[0-9a-f-]{36}$/i.test(token)) {
      c.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
      return;
    }
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
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      return { valid: false, userId: null };
    }
    // Sliding window: extend session TTL on every valid check
    const newExpiry = new Date(Date.now() + SESSION_TTL_MS);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiry },
    }).catch(() => {});
    c.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
    });
    return { valid: true, userId: session.userId };
  } catch {
    return { valid: false, userId: null };
  }
}
