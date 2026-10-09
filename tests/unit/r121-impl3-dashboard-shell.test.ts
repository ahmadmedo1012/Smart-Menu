/**
 * r121 IMPL-3 — dashboard shell + a11y + SEO fix-batch tests.
 *
 * Covers the round's test contract (M-5: tests land WITH fixes):
 *   1. B-2/A-2/E-4 — server auth gate on the (protected) owner/admin layouts
 *      (r113-F114 login pattern): role-aware redirects + session passed to the
 *      client shells (no /api/auth/me probe anywhere in the tree).
 *   2. useAccessGate context path — synchronous allow/deny from the
 *      server-resolved session; fetch fallback preserved for standalone use.
 *   3. K-1/K-2/K-3 — single <main>, no live-main, skip target moved past the nav.
 *   4. K-5 — AreaChart data-bearing aria-label.
 *   5. K-6 — deliberate new-order announce (phrase + live region).
 *   6. P-4 — UserBannerNotifier approved branch (SubscriptionEventBanner).
 *   7. P-5 — plan-days helpers behind the expiry banner.
 *   8. J-2/J-3/H-1 — RTL back arrows, ≤390px row classes, decimals sweep.
 *   9. L-1..L-5 — metadata hygiene (robots/titles/servesCuisine/print canonical).
 *
 * Source-string guards follow the repo's established r93-w2a style (DOM-level
 * asserts via renderToString where the component renders without effects).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/* ── module mocks (hoisted; the layouts must not touch a real DB) ─────────── */

const { redirectMock, requireAuthMock, pendingFindFirstMock, getUserSubscriptionStateMock } =
        vi.hoisted(() => ({
                redirectMock: vi.fn(),
                requireAuthMock: vi.fn(),
                pendingFindFirstMock: vi.fn(),
                getUserSubscriptionStateMock: vi.fn(),
        }));

vi.mock('next/navigation', () => ({
        redirect: redirectMock,
        useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/auth', () => ({ requireAuth: requireAuthMock }));
vi.mock('@/lib/db', () => ({
        prisma: { subscriptionPayment: { findFirst: pendingFindFirstMock } },
}));
vi.mock('@/lib/subscription-guard', () => ({ getUserSubscriptionState: getUserSubscriptionStateMock }));

import OwnerLayout from '@/app/(protected)/owner/layout';
import AdminLayout from '@/app/(protected)/admin/layout';
import { OwnerShell, getPlanDaysRemaining, daysLeftPhrase } from '@/app/(protected)/owner/OwnerShell';
import { AdminShell } from '@/app/(protected)/admin/AdminShell';
import { useAccessGate, AccessGateMeProvider } from '@/hooks/useAccessGate';
import { AreaChart } from '@/components/shared/AreaChart';
import { SubscriptionEventBanner } from '@/components/owner/UserBannerNotifier';
import { newOrdersArrivalPhrase } from '@/components/orders/NewOrdersBar';

beforeEach(() => {
        vi.clearAllMocks();
        redirectMock.mockImplementation((to: string) => {
                throw new Error(`REDIRECT:${to}`);
        });
});

/* ── 1. server auth gates (B-2/A-2/E-4) ──────────────────────────────────── */

describe('r121 B-2/A-2/E-4 — owner layout server gate', () => {
        it('no session → redirect /login (server-side; no null shell, no client /me probe)', async () => {
                requireAuthMock.mockResolvedValue({ authorized: false });
                await expect(OwnerLayout({ children: null })).rejects.toThrow('REDIRECT:/login');
                expect(redirectMock).toHaveBeenCalledWith('/login');
        });

        it('admin-family role → /admin (super_admin routing preserved)', async () => {
                requireAuthMock.mockResolvedValue({
                        authorized: true,
                        userId: 1,
                        role: 'sub_admin',
                        restaurantId: null,
                        subscriptionStatus: null,
                        permissions: ['MANAGE_USERS'],
                });
                await expect(OwnerLayout({ children: null })).rejects.toThrow('REDIRECT:/admin');
        });

        it('USER role → /subscribe (old client-gate ladder preserved verbatim)', async () => {
                requireAuthMock.mockResolvedValue({
                        authorized: true,
                        userId: 2,
                        role: 'USER',
                        restaurantId: null,
                        subscriptionStatus: null,
                        permissions: [],
                });
                await expect(OwnerLayout({ children: null })).rejects.toThrow('REDIRECT:/subscribe');
        });

        it('owner → renders OwnerShell with server-resolved planEnd + pendingPaymentSince (P-4/P-5 wiring)', async () => {
                requireAuthMock.mockResolvedValue({
                        authorized: true,
                        userId: 7,
                        role: 'owner',
                        restaurantId: null,
                        subscriptionStatus: 'PAID',
                        permissions: [],
                });
                getUserSubscriptionStateMock.mockResolvedValue({
                        subscriptionStatus: 'PAID',
                        planEnd: new Date('2026-10-05T00:00:00Z'),
                });
                pendingFindFirstMock.mockResolvedValue({ createdAt: new Date('2026-09-25T10:30:00Z') });

                const el = await OwnerLayout({ children: 'PAGE' });
                expect(el.type).toBe(OwnerShell);
                // r121-ADV1-2: the shell now receives planDays (whole days,
                // server-resolved ONCE — no SSR/hydration clock mismatch) instead
                // of a raw planEnd ISO string.
                expect(typeof el.props.planDays).toBe('number');
                expect(el.props.pendingPaymentSince).toBe('2026-09-25T10:30:00.000Z');
                expect(el.props.children).toBe('PAGE');
                // P-5 planEnd comes from the EXISTING helper — zero API change:
                expect(getUserSubscriptionStateMock).toHaveBeenCalledWith(7);
        });

        it('owner without a pending payment passes null (honest dead-end branch data)', async () => {
                requireAuthMock.mockResolvedValue({
                        authorized: true,
                        userId: 8,
                        role: 'owner',
                        restaurantId: 3,
                        subscriptionStatus: 'PAID',
                        permissions: [],
                });
                getUserSubscriptionStateMock.mockResolvedValue({ subscriptionStatus: 'PAID', planEnd: null });
                pendingFindFirstMock.mockResolvedValue(null);

                const el = await OwnerLayout({ children: null });
                expect(el.props.planDays).toBeNull();
                expect(el.props.pendingPaymentSince).toBeNull();
        });
});

describe('r121 B-2/A-2/E-4 — admin layout server gate', () => {
        it('no session → redirect /login', async () => {
                requireAuthMock.mockResolvedValue({ authorized: false });
                await expect(AdminLayout({ children: null })).rejects.toThrow('REDIRECT:/login');
        });

        it('owner role → /owner; USER role → /subscribe (old client-gate ladder preserved)', async () => {
                requireAuthMock.mockResolvedValue({
                        authorized: true,
                        userId: 5,
                        role: 'owner',
                        restaurantId: 1,
                        subscriptionStatus: 'PAID',
                        permissions: [],
                });
                await expect(AdminLayout({ children: null })).rejects.toThrow('REDIRECT:/owner');

                requireAuthMock.mockResolvedValue({
                        authorized: true,
                        userId: 6,
                        role: 'USER',
                        restaurantId: null,
                        subscriptionStatus: null,
                        permissions: [],
                });
                await expect(AdminLayout({ children: null })).rejects.toThrow('REDIRECT:/subscribe');
        });

        it('sub_admin → AdminShell fed role + permissions (sub_admin permission gating preserved)', async () => {
                requireAuthMock.mockResolvedValue({
                        authorized: true,
                        userId: 9,
                        role: 'sub_admin',
                        restaurantId: null,
                        subscriptionStatus: null,
                        permissions: ['VIEW_ANALYTICS', 'APPROVE_ORDERS'],
                });
                const el = await AdminLayout({ children: 'PAGE' });
                expect(el.type).toBe(AdminShell);
                expect(el.props.role).toBe('sub_admin');
                expect(el.props.permissions).toEqual(['VIEW_ANALYTICS', 'APPROVE_ORDERS']);
                expect(el.props.children).toBe('PAGE');
        });
});

describe('r121 A-2 — the dashboard tree fires ZERO /api/auth/me probes', () => {
        it('shells + sidebar consume the server-resolved session (source guard)', () => {
                const owner = src('src/app/(protected)/owner/OwnerShell.tsx');
                const admin = src('src/app/(protected)/admin/AdminShell.tsx');
                const sidebar = src('src/components/layout/AdminSidebar.tsx');
                for (const s of [owner, admin, sidebar]) {
                        expect(s).not.toContain("/api/auth/me");
                }
                expect(admin).toContain('AccessGateMeProvider');
                expect(sidebar).toContain('role: string | null;');
        });
});

/* ── 2. useAccessGate context path ───────────────────────────────────────── */

function GateProbe() {
        const status = useAccessGate((me) => me.role === 'super_admin' || me.permissions.includes('MANAGE_USERS'));
        return createElement('p', { 'data-status': status }, status);
}

describe('r121 A-2 — useAccessGate consumes the provider session synchronously', () => {
        it('provider + allowed predicate → "allowed" in first render (no probe round-trip)', () => {
                const html = renderToString(
                        createElement(
                                AccessGateMeProvider,
                                { value: { role: 'sub_admin', permissions: ['MANAGE_USERS'] } },
                                createElement(GateProbe)
                        )
                );
                expect(html).toContain('>allowed<');
        });

        it('provider + failing predicate → "denied" (fail-closed, still synchronous)', () => {
                const html = renderToString(
                        createElement(
                                AccessGateMeProvider,
                                { value: { role: 'sub_admin', permissions: [] as string[] } },
                                createElement(GateProbe)
                        )
                );
                expect(html).toContain('>denied<');
        });

        it('no provider → "checking" + fetch fallback preserved for standalone use', () => {
                const html = renderToString(createElement(GateProbe));
                expect(html).toContain('>checking<');
                // The fallback branch stays intact (source guard):
                expect(src('src/hooks/useAccessGate.ts')).toContain("fetch('/api/auth/me')");
        });
});

/* ── 3. K-1/K-2/K-3 landmarks ────────────────────────────────────────────── */

describe('r121 K-1/K-2 — one main landmark per page, no live-main', () => {
        it('owner/admin shells render a content <div>, not a nested <main> (no aria-live)', () => {
                const owner = src('src/app/(protected)/owner/OwnerShell.tsx');
                const admin = src('src/app/(protected)/admin/AdminShell.tsx');
                for (const s of [owner, admin]) {
                        expect(s).not.toContain('<main');
                        expect(s).not.toContain('aria-live');
                }
        });

        it('order-confirmed no longer nests a second <main> inside the group main', () => {
                const oc = src('src/app/(protected)/order-confirmed/page.tsx');
                expect(oc).not.toContain('<main');
                expect(oc).not.toContain('</main>');
        });

        it('the (protected) group main keeps the landmark but no longer owns the skip id', () => {
                const layout = src('src/app/(protected)/layout.tsx');
                expect(layout).toContain('<main>');
                expect(layout).not.toContain('main id=');
        });

        it('LayoutHeader chrome is a span, not a duplicate page h1', () => {
                const header = src('src/components/layout/LayoutHeader.tsx');
                expect(header).not.toContain('<h1');
                expect(header).toContain('<span className="hidden text-sm font-semibold');
        });
});

describe('r121 K-3 — skip-link target is the first real content AFTER the nav', () => {
        it('each (protected) sub-layout owns id="main-content" on its content root', () => {
                for (const p of [
                        'src/app/(protected)/owner/OwnerShell.tsx',
                        'src/app/(protected)/admin/AdminShell.tsx',
                        'src/app/(protected)/order-confirmed/page.tsx',
                        'src/app/(protected)/login/layout.tsx',
                        'src/app/(protected)/subscribe/layout.tsx',
                        'src/app/(protected)/cart/layout.tsx',
                ]) {
                        const s = src(p);
                        expect(s).toContain('id="main-content"');
                        expect(s).toContain('tabIndex={-1}');
                }
        });
});

/* ── 4. K-5 admin charts ─────────────────────────────────────────────────── */

describe('r121 K-5 — AreaChart exposes data to screen readers', () => {
        it('ariaLabel prop renders on the svg role=img', () => {
                const html = renderToString(
                        createElement(AreaChart, {
                                data: [
                                        { label: '09-01', value: 3 },
                                        { label: '09-02', value: 7 },
                                ],
                                ariaLabel: 'اتجاه الإيرادات آخر 30 يومًا: من 3 إلى 7 د.ل',
                        })
                );
                expect(html).toContain('اتجاه الإيرادات آخر 30 يومًا');
        });

        it('without the prop the legacy generic label remains (back-compat)', () => {
                const html = renderToString(createElement(AreaChart, { data: [{ label: 'x', value: 1 }] }));
                expect(html).toContain('مخطط مساحي');
        });

        it('the admin dashboard passes data-bearing labels to both charts', () => {
                const admin = src('src/app/(protected)/admin/page.tsx');
                expect(admin).toContain('ariaLabel={`اتجاه الإيرادات آخر 30 يومًا');
                expect(admin).toContain('ariaLabel={`حجم الطلبات آخر 30 يومًا');
        });
});

/* ── 5. K-6 new-order announcement ───────────────────────────────────────── */

describe('r121 K-6 — deliberate new-order announce on /owner/orders', () => {
        it('newOrdersArrivalPhrase — 1/2/5/11/103 (r92 plural discipline)', () => {
                expect(newOrdersArrivalPhrase(1)).toBe('وصل طلب جديد');
                expect(newOrdersArrivalPhrase(2)).toBe('وصل طلبان جديدان');
                expect(newOrdersArrivalPhrase(5)).toBe('وصلت 5 طلبات جديدة');
                expect(newOrdersArrivalPhrase(11)).toBe('وصل 11 طلبًا جديدًا');
                expect(newOrdersArrivalPhrase(103)).toBe('وصلت 103 طلبات جديدة'); // 103 % 100 = 3 → جمع
        });

        it('the sr-only live region renders even while the bar itself is hidden', () => {
                const bar = src('src/components/orders/NewOrdersBar.tsx');
                expect(bar).toContain('role="status"');
                expect(bar).toContain('aria-live="polite"');
        });
});

/* ── 6. P-4 approval banner ──────────────────────────────────────────────── */

describe('r121 P-4 — subscription_approved branch in the owner banner', () => {
        it('approved banner: role=status + success copy + refresh action', () => {
                const html = renderToString(
                        createElement(SubscriptionEventBanner, { kind: 'approved', message: '', onDismiss: () => {} })
                );
                expect(html).toContain('تم تفعيل اشتراكك بنجاح!');
                expect(html).toContain('role="status"');
                expect(html).toContain('تحديث لوحة التحكم');
        });

        it('rejected banner keeps its assertive alert semantics (no regression)', () => {
                const html = renderToString(
                        createElement(SubscriptionEventBanner, { kind: 'rejected', message: 'سبب', onDismiss: () => {} })
                );
                expect(html).toContain('تم رفض طلب التفعيل');
                expect(html).toContain('role="alert"');
        });

        it('the notifier poll handles subscription_approved (zero API change)', () => {
                expect(src('src/components/owner/UserBannerNotifier.tsx')).toContain(
                        "ev.eventType === 'subscription_approved'"
                );
        });
});

/* ── 7. P-5 expiry helpers ───────────────────────────────────────────────── */

describe('r121 P-5 — plan-days helpers behind the expiry banner', () => {
        const NOW = new Date('2026-09-28T12:00:00Z');

        it('getPlanDaysRemaining — null/invalid → null; rounds up to whole days; <=0 means past', () => {
                expect(getPlanDaysRemaining(null, NOW)).toBeNull();
                expect(getPlanDaysRemaining('not-a-date', NOW)).toBeNull();
                expect(getPlanDaysRemaining('2026-10-05T12:00:00Z', NOW)).toBe(7);
                expect(getPlanDaysRemaining('2026-09-28T12:00:01Z', NOW)).toBe(1); // 1s → whole day up
                expect(getPlanDaysRemaining('2026-09-28T11:59:00Z', NOW)).toBe(0); // just expired
                expect(getPlanDaysRemaining('2026-09-20T00:00:00Z', NOW)).toBe(-8); // 8.5d past → ceil toward +∞
        });

        it('daysLeftPhrase — 1/2/5/11 (Arabic plural)', () => {
                expect(daysLeftPhrase(1)).toBe('يوم واحد');
                expect(daysLeftPhrase(2)).toBe('يومين');
                expect(daysLeftPhrase(5)).toBe('5 أيام');
                expect(daysLeftPhrase(11)).toBe('11 يومًا');
        });

        it('the owner shell renders the ≤7-day banner with a renewal CTA', () => {
                const shell = src('src/app/(protected)/owner/OwnerShell.tsx');
                expect(shell).toContain('EXPIRY_WARN_DAYS = 7');
                expect(shell).toContain('اشتراكك ينتهي خلال');
                expect(shell).toContain('انتهى اشتراكك');
                expect(shell).toContain('href="/subscribe"');
        });

        it('blocked category save surfaces the server reason (menu-page catch aligned to use-item-save)', () => {
                const menu = src('src/app/(protected)/owner/menu/page.tsx');
                // r131 غيّرت الفعل «فشل» إلى «تعذر» (مسح الفعل على مستوى العائلة) —
                // الدبوس لحق بالعائلة r132؛ العقد نفسه (getErrorMessage يمرر سبب
                // الخادم) بلا تغيير.
                expect(menu).toContain("getErrorMessage(e, 'تعذر الحفظ')");
        });
});

/* ── 8. J-2 / J-3 / H-1 ──────────────────────────────────────────────────── */

describe('r121 J-2 — RTL back arrows (IMPL-3 half)', () => {
        it('order-confirmed: both back CTAs point right (RTL)', () => {
                const oc = src('src/app/(protected)/order-confirmed/page.tsx');
                expect(oc).toContain('MotionArrowRight');
                expect(oc).not.toContain('MotionArrowLeft');
        });

        it('owner order detail: back-to-orders chevron points right (RTL)', () => {
                const detail = src('src/app/(protected)/owner/orders/[id]/page.tsx');
                expect(detail).toContain('MotionChevronRight');
                expect(detail).not.toContain('MotionChevronLeft');
        });
});

describe('r121 J-3 — owner menu rows ≤390px', () => {
        it('status word hidden below sm; drag grip hidden below md (~92px back to the name)', () => {
                const cl = src('src/app/(protected)/owner/menu/CategoriesList.tsx');
                expect(cl).toContain("'text-xs w-14 hidden sm:inline'");
                expect(cl).toContain('hidden md:block');
        });
});

describe('r121 H-1 — owner/admin display sites use the smart formatPrice default', () => {
        const SITES = [
                'src/app/(protected)/owner/orders/[id]/page.tsx',
                'src/app/(protected)/owner/orders/OrdersTable.tsx',
                'src/app/(protected)/owner/OwnerOrdersList.tsx',
                'src/app/(protected)/owner/OwnerKpiGrid.tsx',
                'src/app/(protected)/owner/menu/CategoriesList.tsx',
                'src/app/(protected)/admin/orders/[id]/page.tsx',
        ];

        it.each(SITES)('%s: no forced decimals on display', (p) => {
                expect(src(p)).not.toContain('decimals: 1');
        });

        it('admin AOV KPI keeps its deliberate decimals:2 precision (X3: defensible)', () => {
                expect(src('src/app/(protected)/admin/page.tsx')).toContain('decimals: 2');
        });

        it('receipts keep decimals:2 (document contract, untouched)', () => {
                const receipt = src('src/lib/receipt.ts');
                expect(receipt).toContain('decimals: 2');
        });
});

/* ── 9. L-1..L-5 metadata hygiene ────────────────────────────────────────── */

describe('r121 L-batch — robots/titles/JSON-LD hygiene', () => {
        it('L-1: (protected) group defaults to noindex,follow', () => {
                const layout = src('src/app/(protected)/layout.tsx');
                expect(layout).toContain('index: false');
                expect(layout).toContain('follow: true');
        });

        it('L-2: print page serves noindex + self-canonical; robots.ts no longer blocks crawling it', () => {
                const print = src('src/app/(public)/menu/[slug]/print/page.tsx');
                expect(print).toContain('robots: { index: false, follow: false }');
                expect(print).toContain('alternates: { canonical:');
                const robots = src('src/app/robots.ts');
                expect(robots).not.toContain('/menu/*/print');
                // L-6 cart/order-confirmed trim is a SEPARATE batch — still disallowed:
                expect(robots).toContain('"/cart"');
        });

        it('L-3: servesCuisine removed from the Restaurant JSON-LD', () => {
                expect(src('src/app/(public)/menu/[slug]/page.tsx')).not.toContain('servesCuisine');
        });

        it('L-4: page-level brand suffixes stripped; dead login layout title deleted', () => {
                expect(src('src/app/(public)/pricing/layout.tsx')).toContain('title: "الباقات والأسعار"');
                expect(src('src/app/(public)/pricing/layout.tsx')).not.toContain('| Smart Menu"');
                expect(src('src/app/(protected)/login/page.tsx')).toContain("title: 'تسجيل الدخول'");
                expect(src('src/app/(protected)/login/page.tsx')).not.toContain('| الربط الذكي');
                expect(src('src/app/(protected)/login/layout.tsx')).not.toContain('title:');
                expect(src('src/app/(protected)/subscribe/layout.tsx')).toContain('title: "اشترك الآن"');
                expect(src('src/app/(protected)/cart/layout.tsx')).toContain('title: "سلة الطلبات"');
                expect(src('src/app/(public)/menu/page.tsx')).toContain('title: "المنيو الرقمي"');
                // og:title suffix drift: pricing joins terms/privacy on «الربط الذكي»
                expect(src('src/app/(public)/pricing/layout.tsx')).toContain('| الربط الذكي"');
        });

        it('L-5: (public) layout no longer emits the redundant default robots meta', () => {
                const layout = src('src/app/(public)/layout.tsx');
                expect(layout).not.toContain('index: true');
                expect(layout).not.toContain('robots:');
        });
});

/* ── 10. P-4 honest pre-activation state ─────────────────────────────────── */

describe('r121 P-4 — owner dashboard pre-activation dead-end is honest', () => {
        it('pending card shows the review state + resubmission block; no-payment shows the /subscribe CTA', () => {
                const page = src('src/app/(protected)/owner/page.tsx');
                expect(page).toContain('طلب الدفع قيد المراجعة');
                expect(page).toContain('لا يمكن إرسال طلب دفع جديد قبل البت');
                expect(page).toContain('إكمال الدفع');
                expect(page).toContain("useOwnerSession");
                // The dishonest 24h promise is gone from the funnel:
                expect(src('src/app/(protected)/order-confirmed/page.tsx')).not.toContain('خلال 24');
        });
});
