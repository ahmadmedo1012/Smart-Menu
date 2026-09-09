import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { error as logError } from '@/lib/logger';
import { error as apiError } from '@/lib/api-helpers';
import { timingSafeBearer } from '@/lib/secure-compare';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Converts expired subscriptions (planEnd < now, status=PAID) to EXPIRED.
// Called by an external cron (e.g. Vercel Cron) with a bearer secret.
export async function GET(request: NextRequest) {
        const authHeader = request.headers.get('authorization');
        const expected = process.env.CRON_SECRET;
        // CRON_SECRET is REQUIRED — without it the endpoint refuses to run.
        // Otherwise anyone could flip subscriptions to EXPIRED (DoS).
        // round85-A4: constant-time comparison (was plain !==).
        if (!expected || !timingSafeBearer(authHeader, expected)) {
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
                // round97-X3: the 500 branch now uses the shared error() helper
                // ({success:false, error}) — it was the only hand-rolled envelope
                // left in the route family. The 401 below and the {expired: N}
                // body above stay as-is deliberately: cron-subscription-expiry.test.ts
                // documents them as the cron-consumer contract (Vercel Cron reads
                // the bare shape, not the app envelope), same as cron/cleanup.
                return apiError('Expiry job failed', 500);
        }
}