import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                const { searchParams } = new URL(request.url);
                const id = searchParams.get('id');
                const pid = Number(id);
                if (!id || !Number.isInteger(pid) || pid <= 0) return error('معرّف الدفع مطلوب', 400); // round90-F6

                const payment = await prisma.subscriptionPayment.findFirst({
                        where: { id: pid, userId: auth.userId },
                        select: { id: true, status: true },
                });

                if (!payment) return error('طلب الدفع غير موجود', 404); // round90-F6
                return success(payment);
        } catch (e) {
                return handleError(e);
        }
}
