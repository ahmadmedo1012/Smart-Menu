/**
 * r121 IMPL-6 — perf-wave + small RTL fixes (G-6, G-7, J-4, J-7).
 *
 * Source/wiring guards (the r92-cart-aria-plural + r93-w2a + r121-cart-ux
 * pattern) pinning this wave's fixes against silent regression:
 *
 *   - G-6: the menu hero's two infinite blur orbs (blur-[120px]/[140px])
 *     must pause (animation-play-state) once the hero leaves the viewport —
 *     IntersectionObserver island, the codebase's existing pattern
 *     (ui/scroll-reveal.tsx). Pre-JS the orbs animate exactly as before
 *     (no inline style in the running state).
 *   - G-7: StickyMenuHeader must render in the SSR shell (its initial state
 *     is deterministic) — only LoyaltyWidget keeps the client mount gate.
 *     Was: header absent from first paint for the whole hydration window
 *     (2.6s header-less under throttle).
 *   - J-4: only the NUMERIC bank rows (account/IBAN) keep the dir="ltr"
 *     mono isolation; the Arabic bank NAME renders dir="auto" + start-aligned.
 *   - J-7: ReviewSheet + RestaurantFormDialog use 85dvh, not 85vh
 *     (the iOS Safari URL-bar trap; the system standardized on dvh).
 */
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/* ── G-6: orb-float viewport gating ─────────────────────────────────────── */

import { OrbField } from '@/components/menu/OrbField';

describe('r121 G-6 — OrbField viewport-gated orbs', () => {
        const html = renderToString(createElement(OrbField));

        it('renders both blurred orbs with the infinite-float classes (visual unchanged)', () => {
                expect(html).toContain('blur-[120px]');
                expect(html).toContain('blur-[140px]');
                expect(html).toContain('animate-orb-float');
                expect(html).toContain('animate-orb-float-delayed');
        });

        it('reduced-motion keeps the motion-reduce:hidden kill switch (not broken by the island)', () => {
                expect(html).toContain('motion-reduce:hidden');
        });

        it('no paused style in SSR — orbs animate on first paint exactly as before', () => {
                // the running state emits NO inline animation-play-state: pre-hydration
                // HTML is byte-identical to the pre-G-6 static markup
                expect(html).not.toContain('paused');
                expect(html).not.toMatch(/animation-play-state/i);
        });

        it('the island pauses via IntersectionObserver (the codebase pattern) + animation-play-state', () => {
                const s = src('src/components/menu/OrbField.tsx');
                expect(s).toContain('new IntersectionObserver');
                expect(s).toContain("setInView(entry.isIntersecting)");
                expect(s).toContain("animationPlayState: 'paused'");
        });

        it('MenuHero mounts the island in place of the static orbs', () => {
                const s = src('src/components/menu/MenuHero.tsx');
                expect(s).toContain('<OrbField />');
                // the raw orb divs no longer live in the server hero markup
                expect(s).not.toContain('animate-orb-float" />');
        });
});

/* ── G-7: StickyMenuHeader SSR (mount-gate narrowed to LoyaltyWidget) ───── */

vi.mock('next/navigation', () => ({
        useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
        useSearchParams: () => new URLSearchParams(),
        usePathname: () => '/menu/al-waha-cafe-demo',
}));
vi.mock('next/image', () => ({
        default: (props: Record<string, unknown>) => createElement('img', props),
}));
vi.mock('next/link', () => ({
        default: (props: Record<string, unknown>) => createElement('a', props),
}));
vi.mock('@/components/menu/MenuPageClient', () => ({
        MenuPageClient: () => createElement('div', { 'data-testid': 'menu-page-client' }),
}));
vi.mock('@/components/loyalty/LoyaltyWidget', () => ({
        LoyaltyWidget: () => createElement('div', { 'data-testid': 'loyalty-widget' }),
}));

import { MenuClientSection } from '@/components/menu/MenuClientSection';

describe('r121 G-7 — StickyMenuHeader renders in the SSR shell', () => {
        const html = renderToString(
                createElement(MenuClientSection, {
                        // r138-exec-2 (J1): phone joined the Restaurant island payload
                        // (WhatsApp-gate toast fallback) — fixture updated to the shape.
                        restaurant: { name: 'مقهى الواحة', slug: 'al-waha-cafe-demo', whatsapp: null, phone: null, id: 1, logo: '' },
                        categories: [],
                        serializedItems: [],
                })
        );

        it('the header paints with the document (was 2.6s header-less under throttle)', () => {
                // StickyMenuHeader's global links + hamburger — present in the raw HTML
                expect(html).toContain('الخطط والأسعار');
                expect(html).toContain('تسجيل الدخول');
                expect(html).toMatch(/aria-label="القائمة"/);
        });

        it('the restaurant name is in the server HTML (scrolled=false initial state is deterministic)', () => {
                expect(html).toContain('مقهى الواحة');
        });

        it('LoyaltyWidget KEEPS the mount gate (reads client-only loyalty state)', () => {
                // pre-mount the widget renders nothing — it must NOT appear in SSR HTML…
                expect(html).not.toContain('data-testid="loyalty-widget"');
                // …and the source keeps it behind the mounted guard
                const s = src('src/components/menu/MenuClientSection.tsx');
                expect(s).toContain('{mounted && (');
                expect(s).toMatch(/\{mounted && \(\s*<LoyaltyWidget/);
                expect(s).not.toMatch(/\{mounted && <StickyMenuHeader/);
        });
});

/* ── J-4: PaymentDialog bank rows — RTL-correct name, LTR-isolated numbers ─ */

describe('r121 J-4 — bank rows: only numeric fields get the LTR treatment', () => {
        it('the name row is dir="auto" + start-aligned (no mono/LTR forcing)', () => {
                const s = src('src/components/shared/PaymentDialog.tsx');
                expect(s).toContain("{ label: 'المصرف', value: BANK_NAME, numeric: false }");
                expect(s).toContain("{ label: 'رقم الحساب', value: BANK_ACCOUNT, numeric: true }");
                expect(s).toContain("{ label: 'IBAN', value: BANK_IBAN, numeric: true }");
                // the template renders dir/alignment per row type — the blanket
                // dir="ltr" text-left font-mono span is gone
                expect(s).not.toContain('className="font-mono text-sm font-bold text-left truncate" dir="ltr"');
                expect(s).toContain("dir={row.numeric ? 'ltr' : 'auto'}");
                expect(s).toContain("${row.numeric ? 'font-mono text-left' : 'text-start'}");
        });
});

/* ── J-7: vh → dvh outliers ─────────────────────────────────────────────── */

describe('r121 J-7 — bottom sheets/dialogs use dynamic viewport units', () => {
        it('ReviewSheet: max-h-[85dvh] (was 85vh — iOS Safari URL-bar trap)', () => {
                const s = src('src/components/menu/ReviewSheet.tsx');
                expect(s).toContain('max-h-[85dvh]');
                expect(s).not.toContain('max-h-[85vh]');
        });

        it('RestaurantFormDialog: max-h-[85dvh] (aligns with the base dialog 90dvh)', () => {
                const s = src('src/app/(protected)/admin/restaurants/RestaurantFormDialog.tsx');
                expect(s).toContain('max-h-[85dvh]');
                expect(s).not.toContain('max-h-[85vh]');
        });
});
