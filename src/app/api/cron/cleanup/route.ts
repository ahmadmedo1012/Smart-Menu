import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { error as logError } from '@/lib/logger';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
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

  return NextResponse.json(results);
}
