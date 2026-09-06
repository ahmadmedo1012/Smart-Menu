/**
 * Round87-D2 — resolveSubscriptionPayment tests against the REAL unit
 * (src/lib/subscription-decisions.ts). The previous version of this file
 * re-implemented the decision logic inline (testing a copy that could drift
 * — the cancelled leg is covered by payment-rejection.test.ts, this file
 * now covers the VERIFIED/approval leg + the entry gates).
 *
 * Pattern: tx-mock (prisma.$transaction captures the interactive tx object),
 * mocked telegram/logger/config — no real DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const txMock = {
  subscriptionPayment: { update: vi.fn(), updateMany: vi.fn() },
  subscriptionPlan: { findUnique: vi.fn() },
  restaurant: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  userRestaurant: { create: vi.fn() },
  menuCategory: { createMany: vi.fn() },
  user: { update: vi.fn(), updateMany: vi.fn() },
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
import { resolveSubscriptionPayment, type ResolveResult } from '@/lib/subscription-decisions';
import { sendTelegramNotification } from '@/lib/telegram';

/** Narrow the ok-branch so tsc sees the restaurant/user fields. */
function assertOk(r: ResolveResult): Extract<ResolveResult, { ok: true }> {
  if (!r.ok) throw new Error(`expected ok:true, got reason: ${r.reason}`);
  return r;
}

const PAYMENT = {
  id: 50,
  userId: 42,
  phone: '0912345678',
  amount: 99,
  provider: 'bank',
  planId: 2,
  planName: 'الخطة المدفوعة',
  status: 'pending' as const,
  metadata: null as Record<string, unknown> | null,
  createdAt: new Date(),
  user: { id: 42, telegramChatId: null },
};

function mockPayment(overrides: Record<string, unknown> = {}) {
  (prisma.subscriptionPayment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    ...PAYMENT,
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations — the tx-failure test overrides
  // $transaction with a rejection, so the happy-path implementation must be
  // re-armed for every test.
  (prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)
  );
  mockPayment();
  // shared tx defaults — individual tests override what they need
  txMock.restaurant.findUnique.mockResolvedValue(null); // slug not taken
  txMock.subscriptionPlan.findUnique.mockResolvedValue({ id: 2, nameAr: 'الاحترافية', maxItems: 100, maxOrders: 500 });
  txMock.subscriptionPayment.update.mockResolvedValue({});
  txMock.restaurant.create.mockImplementation(
    async (args: { data: { name: string; slug: string } }) => ({ id: 301, name: args.data.name, slug: args.data.slug })
  );
  txMock.restaurant.update.mockResolvedValue({ id: 88, name: 'مطعم الرائد', slug: 'raed' });
  txMock.userRestaurant.create.mockResolvedValue({});
  txMock.menuCategory.createMany.mockResolvedValue({ count: 4 });
  txMock.user.update.mockResolvedValue({
    id: 42, username: 'owner1', role: 'owner', subscriptionStatus: 'PAID', restaurantId: 301,
  });
  txMock.user.updateMany.mockResolvedValue({ count: 1 });
  txMock.systemEvent.create.mockResolvedValue({});
});

describe('resolveSubscriptionPayment — entry gates', () => {
  it('payment not found → ok:false with the Arabic not-found reason, no transaction', async () => {
    (prisma.subscriptionPayment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await resolveSubscriptionPayment(999, 'verified');

    expect(result).toEqual({ ok: false, reason: 'الطلب غير موجود' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['verified', 'cancelled', 'expired'])('already-processed payment (status %s) → idempotent rejection', async (status) => {
    mockPayment({ status });

    const result = await resolveSubscriptionPayment(50, 'verified');

    expect(result).toEqual({ ok: false, reason: 'تمت معالجة هذا الطلب مسبقاً' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('resolveSubscriptionPayment — verified, NEW-USER branch', () => {
  it('fresh pending payment: payment marked verified (pending-guarded), restaurant + link + seed categories + user promoted, both events, one transaction', async () => {
    const result = assertOk(await resolveSubscriptionPayment(50, 'verified'));

    expect(result.ok).toBe(true);
    expect(result.action).toBe('verified');
    expect(result.paymentId).toBe(50);
    expect(result.restaurant).toEqual({ id: 301, name: 'مطعم 0912345678', slug: 'restaurant-50' });
    expect(result.user).toMatchObject({ id: 42, role: 'owner', subscriptionStatus: 'PAID', restaurantId: 301 });

    // everything ran inside ONE interactive transaction
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    // 1) payment flipped to verified — guarded to pending rows only
    expect(txMock.subscriptionPayment.update).toHaveBeenCalledWith({
      where: { id: 50, status: 'pending' },
      data: { status: 'verified' },
    });

    // 2) plan caps applied to the created restaurant (30-day window)
    expect(txMock.restaurant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'مطعم 0912345678', // no metadata → default name from phone
        slug: 'restaurant-50', // no metadata → default slug from payment id
        phone: '0912345678',
        planId: 2,
        maxItems: 100,
        maxOrders: 500,
        isActive: true,
      }),
    });

    // 3) user linked to the restaurant (primary) + promoted to PAID owner
    //    (the real call also selects a user projection — objectContaining
    //    keeps this assertion robust to select-shape tweaks)
    expect(txMock.userRestaurant.create).toHaveBeenCalledWith({
      data: { userId: 42, restaurantId: 301, isPrimary: true },
    });
    expect(txMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42 },
        data: { role: 'owner', subscriptionStatus: 'PAID', planId: 2, restaurantId: 301 },
      })
    );

    // 4) fresh menu auto-seeded with the 4 default categories
    expect(txMock.menuCategory.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'مشروبات ساخنة', restaurantId: 301, sortOrder: 1 }),
        expect.objectContaining({ name: 'حلويات', restaurantId: 301, sortOrder: 3 }),
      ]),
    });

    // 5) both SystemEvents inside the same transaction
    const eventTypes = txMock.systemEvent.create.mock.calls.map((c) => c[0]?.data?.eventType);
    expect(eventTypes).toEqual(['payment', 'subscription_approved']);

    // 6) admin telegram notification fired post-commit (fire-and-forget)
    expect(sendTelegramNotification).toHaveBeenCalledTimes(1);
  });

  it('multi-menu metadata (tempRestaurants[]): every menu created, first is primary, user points at the first', async () => {
    mockPayment({
      metadata: {
        tempRestaurants: [
          { name: 'فرع المدينة', slug: 'madina' },
          { name: 'فرع الساحل', slug: 'sahel' },
        ],
      },
    });
    let seq = 0;
    txMock.restaurant.create.mockImplementation(async (args: { data: { name: string; slug: string } }) => {
      seq += 1;
      return { id: 300 + seq, name: args.data.name, slug: args.data.slug };
    });

    const result = assertOk(await resolveSubscriptionPayment(50, 'verified'));

    expect(result.ok).toBe(true);
    expect(txMock.restaurant.create).toHaveBeenCalledTimes(2);
    expect(result.restaurant).toEqual({ id: 301, name: 'فرع المدينة', slug: 'madina' });
    // primary flag: true for the first menu, false for the rest
    expect(txMock.userRestaurant.create).toHaveBeenNthCalledWith(1, {
      data: { userId: 42, restaurantId: 301, isPrimary: true },
    });
    expect(txMock.userRestaurant.create).toHaveBeenNthCalledWith(2, {
      data: { userId: 42, restaurantId: 302, isPrimary: false },
    });
    // user.restaurantId follows the PRIMARY menu
    expect(txMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ restaurantId: 301 }) })
    );
  });

  it('legacy single tempRestaurantName/Slug metadata is honored (backward compat)', async () => {
    mockPayment({ metadata: { tempRestaurantName: 'مطعم النخيل', tempRestaurantSlug: 'alnakheel' } });

    const result = assertOk(await resolveSubscriptionPayment(50, 'verified'));

    expect(result.ok).toBe(true);
    expect(txMock.restaurant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'مطعم النخيل', slug: 'alnakheel' }),
    });
    expect(result.restaurant).toEqual({ id: 301, name: 'مطعم النخيل', slug: 'alnakheel' });
  });

  it('anonymous payment (userId null): nothing is created or promoted — only the admin payment event', async () => {
    mockPayment({ userId: null, user: null });

    const result = assertOk(await resolveSubscriptionPayment(50, 'verified'));

    // documented actual behavior: with no user, the whole provisioning loop
    // is skipped (no restaurant, no link, no user update) — the payment is
    // still marked verified and the admin event is written.
    expect(result.ok).toBe(true);
    expect(result.restaurant).toBeUndefined();
    expect(result.user).toBeUndefined();
    expect(txMock.restaurant.create).not.toHaveBeenCalled();
    expect(txMock.userRestaurant.create).not.toHaveBeenCalled();
    expect(txMock.user.update).not.toHaveBeenCalled();
    const eventTypes = txMock.systemEvent.create.mock.calls.map((c) => c[0]?.data?.eventType);
    expect(eventTypes).toEqual(['payment']);
  });

  it('slug taken → Arabic slug-conflict reason, ok:false', async () => {
    txMock.restaurant.findUnique.mockResolvedValue({ id: 9, slug: 'restaurant-50' });

    const result = await resolveSubscriptionPayment(50, 'verified');

    expect(result).toEqual({
      ok: false,
      reason: 'رابط المطعم محجوز مسبقاً. يُرجى إبلاغ العميل باختيار رابط آخر.',
    });
  });

  it('unexpected transaction failure → generic Arabic error, ok:false', async () => {
    (prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('db exploded')
    );

    const result = await resolveSubscriptionPayment(50, 'verified');

    expect(result).toEqual({ ok: false, reason: 'حدث خطأ أثناء معالجة الطلب' });
  });
});

describe('resolveSubscriptionPayment — verified, UPGRADE branch', () => {
  it('upgrade payment: restaurant re-planned (caps + 30-day window), user set PAID, both events — no new restaurant created', async () => {
    mockPayment({ metadata: { upgradeRestaurantId: 88 } });

    const result = await resolveSubscriptionPayment(50, 'verified');

    expect(result).toEqual({ ok: true, action: 'verified', paymentId: 50 });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.subscriptionPayment.update).toHaveBeenCalledWith({
      where: { id: 50, status: 'pending' },
      data: { status: 'verified' },
    });

    // plan caps looked up for the upgrade
    expect(txMock.subscriptionPlan.findUnique).toHaveBeenCalledWith({
      where: { id: 2 },
      select: { id: true, nameAr: true, maxItems: true, maxOrders: true },
    });

    // the EXISTING restaurant is re-planned, never a new one
    expect(txMock.restaurant.create).not.toHaveBeenCalled();
    expect(txMock.userRestaurant.create).not.toHaveBeenCalled();
    const updateArg = txMock.restaurant.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 88 });
    expect(updateArg.data.planId).toBe(2);
    expect(updateArg.data.maxItems).toBe(100);
    expect(updateArg.data.maxOrders).toBe(500);
    expect(updateArg.data.planStart instanceof Date).toBe(true);
    expect(updateArg.data.planEnd instanceof Date).toBe(true);
    expect(updateArg.data.planEnd.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);

    // user upgraded to PAID on the same plan
    expect(txMock.user.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { planId: 2, subscriptionStatus: 'PAID' },
    });

    const eventTypes = txMock.systemEvent.create.mock.calls.map((c) => c[0]?.data?.eventType);
    expect(eventTypes).toEqual(['payment', 'subscription_approved']);
    expect(sendTelegramNotification).toHaveBeenCalledTimes(1);
  });

  it('upgrade when the plan row vanished: caps fall back to undefined (server defaults win)', async () => {
    mockPayment({ metadata: { upgradeRestaurantId: 88 } });
    txMock.subscriptionPlan.findUnique.mockResolvedValue(null);

    const result = await resolveSubscriptionPayment(50, 'verified');

    expect(result.ok).toBe(true);
    const updateArg = txMock.restaurant.update.mock.calls[0][0];
    expect(updateArg.data.maxItems).toBeUndefined();
    expect(updateArg.data.maxOrders).toBeUndefined();
  });
});
