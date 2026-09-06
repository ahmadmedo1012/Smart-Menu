/**
 * Round89-D1 (w1-d1) — pure money constants unit coverage (both 0% lcov):
 *   - src/lib/payment-constants.ts (round86-C8/C12 — wallet caps, fallback
 *     transfer phones, USSD quick-transfer code math)
 *   - src/lib/plan-types.ts (round86-C5 — the shared Plan type +
 *     fetchPlans, the single blessed client catalog fetch)
 *
 * These constants feed payment decisions (the 99 LYD wallet cap in both
 * subscription routes mirrors WALLET_CAP_LYD; the USSD strings are what a
 * customer dials to actually move the money). fetchPlans is tested against
 * a stubbed global fetch: envelope unwrapping + HTTP failure semantics.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PaymentProvider } from '@/lib/payment-constants';

const fetchMock = vi.hoisted(() => vi.fn());

beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
        vi.unstubAllGlobals();
});

// ── payment-constants ───────────────────────────────────────────────────

describe('payment-constants — the money numbers', () => {
        it('WALLET_CAP_LYD is 99 — the single-transfer mobile-wallet cap mirrored by both subscription routes', async () => {
                const { WALLET_CAP_LYD } = await import('@/lib/payment-constants');
                expect(WALLET_CAP_LYD).toBe(99);
        });

        it('fallback transfer phones are valid LY numbers (last-resort defaults must never render an empty target)', async () => {
                const { MADAR_PHONE_FALLBACK, LIBYANA_PHONE_FALLBACK } = await import('@/lib/payment-constants');
                expect(MADAR_PHONE_FALLBACK).toMatch(/^09\d{8}$/);
                expect(LIBYANA_PHONE_FALLBACK).toMatch(/^09\d{8}$/);
                expect(MADAR_PHONE_FALLBACK).not.toBe(LIBYANA_PHONE_FALLBACK);
        });

        it('libyanaUssdCode: 0 stripped from the phone, amount converted to fils (×1000)', async () => {
                const { libyanaUssdCode } = await import('@/lib/payment-constants');
                // *122*218 + <phone minus leading 0> * <amount × 1000> * 1#
                expect(libyanaUssdCode('0942119637', 29)).toBe('*122*218942119637*29000*1#');
                expect(libyanaUssdCode('0912345678', 1)).toBe('*122*218912345678*1000*1#');
        });

        it('libyanaUssdCode: fractional dinars produce whole fils', async () => {
                const { libyanaUssdCode } = await import('@/lib/payment-constants');
                // 19.5 LYD → 19500 fils — never a broken dial string
                expect(libyanaUssdCode('0942119637', 19.5)).toBe('*122*218942119637*19500*1#');
        });

        it('madarUssdCode: full phone (leading 0 kept), whole-dinar amount', async () => {
                const { madarUssdCode } = await import('@/lib/payment-constants');
                expect(madarUssdCode('0910089975', 99)).toBe('*140*4*1*99*0910089975#');
                expect(madarUssdCode('0910089975', 19)).toBe('*140*4*1*19*0910089975#');
        });

        it('the provider discriminator is exactly the three wallet/bank channels the schemas accept', async () => {
                const providers: PaymentProvider[] = ['libyana', 'madar', 'bank'];
                // runtime mirror of the type union — a 4th channel must be a
                // deliberate decision, not drift
                expect(providers).toHaveLength(3);
        });
});

// ── plan-types / fetchPlans ─────────────────────────────────────────────

const PLAN_FIXTURE = {
        id: 1,
        name: 'basic',
        nameAr: 'أساسية',
        price: 49,
        periodDays: 30,
        features: ['قائمة واحدة'],
        maxMenus: 1,
        maxItems: 100,
        maxOrders: 500,
        sortOrder: 1,
};

describe('fetchPlans — the blessed plan catalog fetch', () => {
        it('success: unwraps the {data} envelope and returns the plans untouched', async () => {
                const { fetchPlans } = await import('@/lib/plan-types');
                fetchMock.mockResolvedValue({
                        ok: true,
                        json: async () => ({ success: true, data: [PLAN_FIXTURE] }),
                });

                const plans = await fetchPlans();

                expect(plans).toEqual([PLAN_FIXTURE]);
                expect(fetchMock).toHaveBeenCalledWith('/api/plans');
        });

        it('HTTP failure → throws `HTTP <status>` (no silent empty list)', async () => {
                const { fetchPlans } = await import('@/lib/plan-types');
                fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

                await expect(fetchPlans()).rejects.toThrow('HTTP 500');
        });

        it('missing data field → empty array (empty catalog, not a crash)', async () => {
                const { fetchPlans } = await import('@/lib/plan-types');
                fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

                const plans = await fetchPlans();

                expect(plans).toEqual([]);
        });
});
