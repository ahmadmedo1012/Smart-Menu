/**
 * r121 IMPL-6 (G-5 + H-5 ride-along) — /subscribe SSR shell contract.
 *
 * G-5 (X3-V1 CONFIRMED): /subscribe was 100% client-gated — the SSR body was
 * a spinner, the H1 «انضم إلى» appeared 0× in the raw server HTML, and the
 * page held the site's worst LCP (4.47s live) despite being its smallest
 * doc. The fix is the pricing twin (round86-B5): a server wrapper bakes the
 * plans into the SSR shell. These tests pin the contract so a future
 * refactor cannot silently regress the page back to a client-only fetch:
 *
 *   - SubscribeClient renders the H1 + plan cards + prices in the server
 *     HTML when seeded with initialPlans (the r92-hero-ssr pattern —
 *     react-dom/server, the same path Next SSR takes for the island);
 *   - the pre-G-5 spinner is NOT the SSR body any more;
 *   - the fallback path survives: initialPlans=null (server DB hiccup)
 *     still renders the loading state, and the client fetch effect only
 *     runs in that case;
 *   - page.tsx is a server component wired to the shared plans helper
 *     (lib/plans-server.ts — the pricing page's exact fetch/mapping);
 *   - H-5: the upgrade-mode + unresolvable-?plan= dead-end escape exists
 *     (was a blank step — none of the three render branches matched).
 */
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plan } from '@/lib/plan-types';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/* next/navigation is a runtime dependency of the client island — stub it the
 * way the SSR renderer would (no plan param → step='plan' → PlanSelector). */
vi.mock('next/navigation', () => ({
        useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
        useSearchParams: () => new URLSearchParams(),
        usePathname: () => '/subscribe',
}));

/* next/image needs the Next runtime loader; under plain renderToString it
 * cannot resolve one — swap it for a plain <img> (the Header's brand mark is
 * not what these tests pin). */
vi.mock('next/image', () => ({
        default: ({ priority: _p, ...props }: Record<string, unknown> & { priority?: boolean }) =>
                createElement('img', props),
}));

import { SubscribeClient } from '@/app/(protected)/subscribe/SubscribeClient';

const PLANS: Plan[] = [
        {
                id: 1,
                name: 'Free',
                nameAr: 'مجاني',
                price: 0,
                periodDays: 30,
                features: ['منيو رقمي تفاعلي', '10 أصناف'],
                maxMenus: 1,
                maxItems: 10,
                maxOrders: 100,
                sortOrder: 1,
        },
        {
                id: 2,
                name: 'Premium',
                nameAr: 'المدفوعة',
                price: 29,
                periodDays: 30,
                features: ['جميع ميزات المجانية', 'أصناف حتى 9999'],
                maxMenus: 9999,
                maxItems: 9999,
                maxOrders: 99999,
                sortOrder: 2,
        },
];

const render = (initialPlans: Plan[] | null) =>
        renderToString(createElement(SubscribeClient, { initialPlans }));

describe('r121 G-5 — /subscribe SSR shell (pricing twin)', () => {
        const html = render(PLANS);

        it('renders the H1 in the server HTML (was 0× in the raw doc pre-fix)', () => {
                expect(html).toContain('انضم إلى الربط الذكي');
                expect(html).toMatch(/<h1[^>]*>/);
        });

        it('renders the plan cards + prices in the server HTML', () => {
                // plan names (PlanSelector h3) + the free-plan label + the monthly unit
                expect(html).toContain('اختر خطة تناسب مطعمك');
                expect(html).toContain('مجاني');
                expect(html).toContain('المدفوعة');
                expect(html).toContain('د.ل/شهر');
        });

        it('the pre-G-5 spinner-only SSR body is gone', () => {
                expect(html).not.toContain('جاري تحميل صفحة الاشتراك');
                expect(html).not.toContain('animate-spin');
        });

        it('H1 carries no pre-hydration hidden style (r92-A7 regression guard)', () => {
                const h1 = html.match(/<h1[^>]*>/);
                expect(h1).not.toBeNull();
                expect(h1![0]).not.toMatch(/opacity:\s*0/);
                expect(h1![0]).not.toContain('style=');
        });
});

describe('r121 G-5 — fallback path preserved (round86-B5 contract)', () => {
        it('initialPlans=null → the loading state still renders (client fetch takes over)', () => {
                const html = render(null);
                // r131 استبدلت مؤشر الدوران بهياكل skeleton (موجة loading.tsx ×16)
                // — الدبوس لحق بالعائلة r132: نفس عقد fallback (الحالة + المنطقة
                // الحية للقارئ) بشراسة skeleton بدل animate-spin. LoadingAnnouncer's
                // text itself is effect-driven, so it never appears in any SSR HTML.
                expect(html).toContain('skeleton');
                expect(html).toMatch(/role="status"/);
        });

        it('the client /api/plans fetch runs ONLY when the server data was missing', () => {
                const s = src('src/app/(protected)/subscribe/SubscribeClient.tsx');
                expect(s).toContain('if (initialPlans !== null) return;');
                expect(s).toContain("fetchJson<{ data?: Plan[] }>('/api/plans')");
        });
});

describe('r121 G-5 — server wrapper wiring (source contract)', () => {
        it('page.tsx is a server component (no "use client") that awaits the shared plans helper', () => {
                const s = src('src/app/(protected)/subscribe/page.tsx');
                expect(s).not.toMatch(/^['"]use client['"]/m);
                expect(s).toContain("from '@/lib/plans-server'");
                expect(s).toContain('await getActivePlans()');
                expect(s).toContain('<SubscribeClient initialPlans={initialPlans} />');
        });

        it('the pricing page and subscribe use the SAME helper (one data layer, not a second one)', () => {
                const pricing = src('src/app/(public)/pricing/page.tsx');
                expect(pricing).toContain("from '@/lib/plans-server'");
                // the explicit plain-object RSC mapping (F-D/round91) lives in the helper
                const helper = src('src/lib/plans-server.ts');
                expect(helper).toContain('price: Number(p.price)');
                expect(helper).toContain('isActive: true');
                expect(helper).toContain('return null'); // client fallback stays alive on DB failure
        });

        it('the /api/auth/me upgrade-mode probe stays client-side (X3 verdict)', () => {
                const s = src('src/app/(protected)/subscribe/SubscribeClient.tsx');
                expect(s).toContain("fetch('/api/auth/me')");
        });
});

describe('r121 H-5 — upgrade-mode dead-?plan escape (X3-V1 ride-along)', () => {
        it('the blank-step branch is closed: the escape card renders when no plan resolved', () => {
                const s = src('src/app/(protected)/subscribe/SubscribeClient.tsx');
                // the branch condition: past step 1, auth resolved, upgrade mode, no plan
                expect(s).toContain("step !== 'plan' && authLoaded && upgradeMode && !currentPlan");
                // the r120 SubscribeForm escape copy, mirrored
                expect(s).toContain('تعذر تحميل الخطة المحددة');
                expect(s).toContain('تصفح جميع الباقات');
        });
});
