import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { error as logError } from '@/lib/logger';

const SESSION_COOKIE = 'smart-menu-session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_SESSIONS_PER_USER = 5;

// ponytail: sliding window — validateSession() extends active sessions automatically

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

async function trimExpiredSessions(userId: number) {
	await prisma.session.deleteMany({
		where: { userId, expiresAt: { lte: new Date() } },
	});
	const active = await prisma.session.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
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
	const tokenHash = hashToken(token);
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

	await prisma.session.create({
		data: { userId, token: tokenHash, expiresAt },
	});

	const c = await cookies();
	c.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: SESSION_TTL_MS / 1000,
	});
}

export async function destroySession() {
	const c = await cookies();
	const token = c.get(SESSION_COOKIE)?.value;
	if (token) {
		if (!/^[0-9a-f-]{36}$/i.test(token)) {
			c.set(SESSION_COOKIE, '', {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				path: '/',
				maxAge: 0,
			});
			return;
		}
		const tokenHash = hashToken(token);
		// Retry once: a transient Neon connection error must not leave the
		// session row alive server-side (silent .catch left it resurrectable).
		try {
			await prisma.session.deleteMany({ where: { token: tokenHash } });
		} catch (e) {
			logError('session.destroy failed (retrying)', { error: String(e) });
			await new Promise((r) => setTimeout(r, 300));
			await prisma.session
				.deleteMany({ where: { token: tokenHash } })
				.catch((e2) => logError('session.destroy failed twice', { error: String(e2) }));
		}
	}
	c.set(SESSION_COOKIE, '', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: 0,
	});
}

export async function validateSession(): Promise<{ valid: boolean; userId: number | null }> {
	const c = await cookies();
	const token = c.get(SESSION_COOKIE)?.value;
	if (!token) return { valid: false, userId: null };

	try {
		const tokenHash = hashToken(token);
		const session = await prisma.session.findUnique({ where: { token: tokenHash } });
		if (!session || session.expiresAt < new Date()) {
			if (session) {
				await prisma.session
					.delete({ where: { id: session.id } })
					.catch((e) => logError('session.validate deletion', { error: String(e) }));
			}
			return { valid: false, userId: null };
		}
		// Sliding window: extend session TTL on every valid check — DB-side ONLY.
		// Do NOT re-send Set-Cookie here: an in-flight response arriving after
		// logout would resurrect the just-cleared cookie (observed in e2e as a
		// "resurrected session": events-poll response landed post-logout and
		// re-minted the cookie). The browser refreshes its own cookie expiry on
		// each login; mid-session re-minting adds nothing but this race.
		const newExpiry = new Date(Date.now() + SESSION_TTL_MS);
		await prisma.session
			.update({
				where: { id: session.id },
				data: { expiresAt: newExpiry },
			})
			.catch((e) => logError('session.extend failed', { error: String(e) }));
		return { valid: true, userId: session.userId };
	} catch (e) {
		logError('session.validate crash', { error: String(e) });
		return { valid: false, userId: null };
	}
}
