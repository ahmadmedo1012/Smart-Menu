import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { error as logError } from '@/lib/logger';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Converts expired subscriptions (planEnd < now, status=PAID) to EXPIRED.
// Called by an external cron (e.g. Vercel Cron) with a bearer secret.
export async function GET(request: NextRequest) {
	const authHeader = request.headers.get('authorization');
	const expected = process.env.CRON_SECRET;
	// CRON_SECRET is REQUIRED — without it the endpoint refuses to run.
	// Otherwise anyone could flip subscriptions to EXPIRED (DoS).
	if (!expected || authHeader !== `Bearer ${expected}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const now = new Date();

	try {
		// Users with status=PAID whose earliest menu planEnd has passed.
		const users = await prisma.user.findMany({
			where: {
				subscriptionStatus: 'PAID',
				restaurants: {
					some: { restaurant: { planEnd: { lt: now } } },
				},
			},
			select: { id: true },
		});

		if (users.length > 0) {
			await prisma.user.updateMany({
				where: { id: { in: users.map((u) => u.id) } },
				data: { subscriptionStatus: 'EXPIRED' },
			});
		}

		return NextResponse.json({ expired: users.length });
	} catch (e) {
		logError('cron: subscription expiry', { error: String(e) });
		return NextResponse.json({ error: 'Expiry job failed' }, { status: 500 });
	}
}