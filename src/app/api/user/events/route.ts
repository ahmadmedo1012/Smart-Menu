import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { createDbRateLimiter } from '@/lib/rate-limit';

// round89-B4 (dx-4 #7): light per-user cap for the polling probe — the client
// cadence is 5-12 req/min (user-events + orders-count + stats polls), so
// 120/min/user keeps >=10x headroom while a single authenticated user can no
// longer hammer the DB unbounded. Keyed on userId (session-gated route),
// same createDbRateLimiter pattern as the auth/loyalty limiters.
const userEventsLimiter = createDbRateLimiter({ windowMs: 60_000, max: 120 });

// Polling replacement for the SSE user/events stream — Vercel kills
// long-lived streams at 300s. Filters server-side by userId (the stream
// version replayed every user's events and filtered client-side).
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized || !auth.userId) return error('غير مصرح', 401);

		// round89-B4: per-user limiter AFTER the auth gate (401s stay free).
		const { success: allowed } = await userEventsLimiter.check(
				`user-events:${auth.userId}`
		);
		if (!allowed) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

		const { searchParams } = new URL(request.url);
		const sinceId = Number(searchParams.get('sinceId')) || 0;

		const events = await prisma.systemEvent.findMany({
			where: {
				id: { gt: sinceId },
				metadata: { path: ['userId'], equals: auth.userId },
			},
			orderBy: { id: 'asc' },
			take: 50,
		});

		return success(events);
	} catch (e) {
		return handleError(e);
	}
}
