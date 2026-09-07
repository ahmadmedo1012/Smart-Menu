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
                logError('cron: sesion cleanup', { error: String(e) });
                results.sessionsError = String(e);
        }

        try {
                const ninetyDays = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                const { count } = await prisma.auditLog.deleteMany({
                        where: { createdAt: { lt: ninetyDays } },
                });
                results.auditLogsDeleted = count;
        } catch (e) {
                logError('cron: audit cleanup', { error: String(e) });
                results.auditLogsError = String(e);
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
                results.systemEventsError = String(e);
        }

        return NextResponse.json(results);
}
