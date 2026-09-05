/**
 * Round80 (3.5) — the FULL payment-rejection path, tested against the REAL
 * resolveSubscriptionPayment implementation (not a simulation). The cancelled
 * decision must: flip the payment to `cancelled`, flip the owner from UNPAID
 * to REJECTED, create both SystemEvents (payment_rejected for the admin feed,
 * subscription_rejected for the user feed) — atomically inside one
 * transaction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const txMock = {
  subscriptionPayment: { updateMany: vi.fn() },
  user: { updateMany: vi.fn() },
  systemEvent: { create: vi.fn() },
};

vi.mock('@/lib/db', () => ({
  prisma: {
    subscriptionPayment: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
  },
}));
vi.mock('@/lib/telegram', () => ({
  sendTelegramNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/logger', () => ({ error: vi.fn() }));
vi.mock('@/lib/config', () => ({ getDecryptedBotToken: vi.fn().mockResolvedValue(null) }));

import { prisma } from '@/lib/db';
import { resolveSubscriptionPayment } from '@/lib/subscription-decisions';

const PAYMENT = {
  id: 77,
  userId: 42,
  phone: '0912345678',
  amount: 29,
  provider: 'bank',
  planId: 2,
  planName: 'المدفوعة',
  status: 'pending' as const,
  metadata: {},
  createdAt: new Date(),
  user: { id: 42, telegramChatId: null },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveSubscriptionPayment — CANCELLED (full rejection path)', () => {
  it('happy path: payment cancelled + user REJECTED + both SystemEvents, atomically', async () => {
    (prisma.subscriptionPayment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(PAYMENT);
    txMock.subscriptionPayment.updateMany.mockResolvedValue({ count: 1 });
    txMock.user.updateMany.mockResolvedValue({ count: 1 });
    txMock.systemEvent.create.mockResolvedValue({});

    const result = await resolveSubscriptionPayment(77, 'cancelled');

    expect(result).toEqual({ ok: true, action: 'cancelled', paymentId: 77 });

    // 1) payment flipped to cancelled — guarded to pending rows only
    expect(txMock.subscriptionPayment.updateMany).toHaveBeenCalledWith({
      where: { id: 77, status: 'pending' },
      data: { status: 'cancelled' },
    });

    // 2) owner moved UNPAID → REJECTED
    expect(txMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: 42, subscriptionStatus: 'UNPAID' },
      data: { subscriptionStatus: 'REJECTED' },
    });

    // 3) both SystemEvents created with the exact event types
    const eventTypes = txMock.systemEvent.create.mock.calls.map((c) => c[0]?.data?.eventType);
    expect(eventTypes).toContain('payment_rejected');
    expect(eventTypes).toContain('subscription_rejected');
    expect(txMock.systemEvent.create).toHaveBeenCalledTimes(2);

    // 4) everything ran inside ONE transaction
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('user events skipped for anonymous payments (userId null)', async () => {
    (prisma.subscriptionPayment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...PAYMENT,
      userId: null,
      user: null,
    });
    txMock.subscriptionPayment.updateMany.mockResolvedValue({ count: 1 });
    txMock.systemEvent.create.mockResolvedValue({});

    const result = await resolveSubscriptionPayment(77, 'cancelled');

    expect(result.ok).toBe(true);
    expect(txMock.user.updateMany).not.toHaveBeenCalled();
    // only the admin payment_rejected event — no subscription_rejected (no user)
    const eventTypes = txMock.systemEvent.create.mock.calls.map((c) => c[0]?.data?.eventType);
    expect(eventTypes).toEqual(['payment_rejected']);
  });

  it('concurrent double-processing (count 0) skips user + events, still returns ok', async () => {
    (prisma.subscriptionPayment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(PAYMENT);
    txMock.subscriptionPayment.updateMany.mockResolvedValue({ count: 0 });

    const result = await resolveSubscriptionPayment(77, 'cancelled');

    expect(result).toEqual({ ok: true, action: 'cancelled', paymentId: 77 });
    expect(txMock.user.updateMany).not.toHaveBeenCalled();
    expect(txMock.systemEvent.create).not.toHaveBeenCalled();
  });

  it('already-processed payment (non-pending) is refused with the Arabic reason', async () => {
    (prisma.subscriptionPayment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...PAYMENT,
      status: 'verified',
    });
    const result = await resolveSubscriptionPayment(77, 'cancelled');
    expect(result).toEqual({ ok: false, reason: 'تمت معالجة هذا الطلب مسبقاً' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('missing payment returns not-found reason', async () => {
    (prisma.subscriptionPayment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await resolveSubscriptionPayment(999, 'cancelled');
    expect(result).toEqual({ ok: false, reason: 'الطلب غير موجود' });
  });

  it('transaction failure → controlled Arabic error, ok:false', async () => {
    (prisma.subscriptionPayment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(PAYMENT);
    (prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('db exploded')
    );
    const result = await resolveSubscriptionPayment(77, 'cancelled');
    expect(result).toEqual({ ok: false, reason: 'حدث خطأ أثناء رفض الطلب' });
  });
});
