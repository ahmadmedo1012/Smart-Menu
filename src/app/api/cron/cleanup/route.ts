import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { error as logError } from '@/lib/logger';
import { timingSafeBearer } from '@/lib/secure-compare';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
        const authHeader = request.headers.get('authorization');
        const expected = process.env.CRON_SECRET;
        // CRON_SECRET is REQUIRED — without it the endpoint refuses to run.
        // Otherwise anyone could wipe sessions + audit logs (security audit trail).
        // round85-A4: constant-time comparison (was plain !==).
        if (!expected || !timingSafeBearer(authHeader, expected)) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const results: Record<string, unknown> = {};

        try {
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const { count } = await prisma.session.deleteMany({
                        where: { expiresAt: { lt: weekAgo } },
                });
                results.sessionsDeleted = count;
        } catch (e) {
                // r102-A4: full raw error goes to the SERVER log only — the JSON body
                // is readable by whoever holds CRON_SECRET and shouldn't echo internal
                // driver messages (connection strings/SQL fragments) back out.
                logError('cron: sesion cleanup', { error: String(e) });
                results.sessionsError = 'cleanup failed';
        }

        try {
                const ninetyDays = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                const { count } = await prisma.auditLog.deleteMany({
                        where: { createdAt: { lt: ninetyDays } },
                });
                results.auditLogsDeleted = count;
        } catch (e) {
                logError('cron: audit cleanup', { error: String(e) });
                results.auditLogsError = 'cleanup failed';
        }

        // R91 F-C (D3 growth table): SystemEvent was the one unbounded operational
        // table — lockouts / subscription decisions / referral-conversion failures
        // accumulate with no retention (only a manual admin single-row delete),
        // unlike Session (7d) and AuditLog (90d) above. 180-day retention: events
        // are operational signals, not the financial/audit trail (AuditLog keeps
        // the compliance trail at 90d; SubscriptionPayment is retained forever as
        // financial data). createdAt + the deleteMany filter are indexed
        // (SystemEvent_createdAt_idx) — same best-effort, error-swallowing block
        // style as the two steps above so one failing step never blocks the rest.
        try {
                const hundredEightyDays = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
                const { count } = await prisma.systemEvent.deleteMany({
                        where: { createdAt: { lt: hundredEightyDays } },
                });
                results.systemEventsDeleted = count;
        } catch (e) {
                logError('cron: system events cleanup', { error: String(e) });
                results.systemEventsError = 'cleanup failed';
        }

        // round92-D8 (1-d P2 finding): RateLimitEntry was the ONLY operational
        // table outside this cron's coverage — it relied solely on the
        // probabilistic sweep (r90-F4: ~1/32 per limiter check, 512-row batches,
        // 60s retention) plus the 120s in-process interval. Both are best-effort
        // and, crucially, request-driven: during LOW-traffic stretches (weekends,
        // night) the sweep simply stops running, so expired single-use keys
        // (acct:ip:username, claim:ip, link-token:…) accumulate unchecked.
        // This weekly (Vercel cron "0 3 * * 0") block is the SAFETY NET —
        // complementary, not redundant: the sweep bounds growth during busy
        // periods, this bounds the worst case regardless of traffic. Retention
        // of 1h is deliberately conservative: the longest limiter window in the
        // app is 15min (account-lockout backstop, auth/login), so a row whose
        // windowEnd closed over an hour ago can never affect an active limit
        // decision — deleting it is always safe. windowEnd is indexed
        // (RateLimitEntry_windowEnd_idx), and the block keeps the same
        // error-swallowing style: a failure here never blocks the steps above.
        try {
                const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
                const { count } = await prisma.rateLimitEntry.deleteMany({
                        where: { windowEnd: { lt: hourAgo } },
                });
                results.rateLimitEntriesDeleted = count;
        } catch (e) {
                logError('cron: rate limit entries cleanup', { error: String(e) });
                results.rateLimitEntriesError = String(e);
        }

        return NextResponse.json(results);
}
