/**
 * r121 (IMPL-2) — cart/checkout/menu client UX batch pins.
 *
 * Source/wiring-guard contracts (the r92-cart-aria-plural + r93-w2a pattern)
 * + one composed-cart render pin for the money-display smart default. These
 * pin the r121 fixes against silent regression:
 *
 *   - J-1: the floating z-band (WhatsApp / scroll / cart FAB) must sit BELOW
 *     the modal band (overlay z-40 / panel z-50) — 60/61/63 hijacked taps on
 *     money CTAs inside open dialogs/sheets (Q browser-proven).
 *   - G-1: SelfHostedQR must load `qrcode` dynamically (static import pulled
 *     a ~127KB-gz crypto-browserify/Buffer polyfill chunk into 28 routes).
 *   - H-2: the composed-notes >500 guard must run BEFORE the submit latch —
 *     previously a guard return inside the try left isSubmitting latched and
 *     bricked checkout until a full reload.
 *   - H-3: /cart must gate its empty-state branch on the store's hydration
 *     (false «السلة فارغة» painted up to ~2.3s on hard load, Q-measured).
 *   - H-1: cart-family money display uses the r120 smart default — integer
 *     prices never show a bare «.0», real fractions are never rounded.
 *   - J-2: RTL back affordances point RIGHT (the repo's documented
 *     convention, print/page.tsx:150 + BackButton).
 *   - Q-3: the mobile OrderDialog sheet's money CTA must fit the initial
 *     fold at 375×667 (taller sheet cap + slimmer mobile image header).
 *   - Q-1: @vercel/analytics mounts through the Vercel-gated wrapper —
 *     no /_vercel/insights 404 noise outside Vercel.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { CartSummaryCard } from '@/app/(protected)/cart/CartSummaryCard';
import { CartLineItem } from '@/app/(protected)/cart/CartLineItem';
import type { CartItem } from '@/store/cart';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

const line = (over: Partial<CartItem>): CartItem =>
        ({ id: 'c1', itemId: 1, name: 'إسبريسو', price: 12, quantity: 2, notes: '', ...over }) as CartItem;

// ── J-1: floating z-band below the modal band ────────────────────────────

describe('r121 J-1 — floats sit below the modal band (z 40/50)', () => {
        it('FloatingWhatsApp is z-30, not the old z-[60]', () => {
                const s = src('src/components/shared/FloatingWhatsApp.tsx');
                expect(s).toContain('end-4 sm:end-6 z-30');
                expect(s).not.toContain('sm:end-6 z-[60]');
        });

        it('ScrollToTop is z-31, not the old z-[61]', () => {
                const s = src('src/components/shared/ScrollToTop.tsx');
                expect(s).toContain('start-4 sm:start-6 z-31');
                expect(s).not.toContain('sm:start-6 z-[61]');
        });

        it('CartSlideOver FAB is z-33, not the old z-[63]', () => {
                const s = src('src/components/menu/CartSlideOver.tsx');
                expect(s).toContain('end-4 sm:end-6 z-33');
                expect(s).not.toContain('sm:end-6 z-[63]');
        });

        it('the modal band itself stays z-40/z-50 (dialog overlay + panel)', () => {
                const s = src('src/components/ui/dialog.tsx');
                expect(s).toMatch(/z-40/);
                expect(s).toMatch(/z-50/);
        });
});

// ── G-1: SelfHostedQR dynamic qrcode import ──────────────────────────────

describe('r121 G-1 — SelfHostedQR loads qrcode dynamically', () => {
        it('no static value import of qrcode (the polyfill-chunk root cause)', () => {
                const s = src('src/components/shared/SelfHostedQR.tsx');
                expect(s).not.toMatch(/^\s*import\s+QRCode\s+from\s+'qrcode';\s*$/m);
                expect(s).toContain("import type QRCodeLib from 'qrcode'");
        });

        it('both call sites go through import(\'qrcode\')', () => {
                const s = src('src/components/shared/SelfHostedQR.tsx');
                const dynamicImports = s.match(/import\('qrcode'\)/g) ?? [];
                expect(dynamicImports.length).toBe(2); // render effect + qrPngDataUrl
        });

        it('ROOT CAUSE pin: csrf-client must not import from ./csrf (node:crypto edge)', () => {
                // The ~127KB-gz polyfill chunk shipped on 28 routes because the
                // "use client" csrf-client pulled constants from csrf.ts, whose
                // secure-compare import resolved node:crypto into the CLIENT
                // graph. The constants leaf (csrf-shared) breaks that edge.
                const s = src('src/lib/csrf-client.ts');
                expect(s).toContain('from "./csrf-shared"');
                expect(s).not.toMatch(/from\s+"\.\/csrf"/);
                // the leaf itself must stay import-free (no route back to node:)
                const leaf = src('src/lib/csrf-shared.ts');
                expect(leaf).not.toMatch(/^import\s/m);
                expect(leaf).toContain("export const CSRF_COOKIE = 'csrf-token'");
        });
});

// ── H-2: composed-notes guard runs PRE-latch ─────────────────────────────

describe('r121 H-2 — checkout guard ordering (no bricked «جاري...» state)', () => {
        const page = src('src/app/(protected)/cart/page.tsx');

        it('the >500 guard fires BEFORE the submit latch engages', () => {
                const guardIdx = page.indexOf('composedNotes.length > 500');
                const latchIdx = page.indexOf('submittingRef.current = true');
                expect(guardIdx).toBeGreaterThan(-1);
                expect(latchIdx).toBeGreaterThan(-1);
                // guard strictly before the FIRST latch (pre-try position)
                expect(guardIdx).toBeLessThan(latchIdx);
        });

        it('the guard no longer lives inside the try block (its old latched position)', () => {
                // the try's first statement region starts at the referral read; the
                // guard must precede even that
                const tryIdx = page.indexOf('try {');
                const guardIdx = page.indexOf('composedNotes.length > 500');
                expect(guardIdx).toBeLessThan(tryIdx);
        });

        it('the POST body still carries the composed notes (server contract intact)', () => {
                expect(page).toContain('notes: composedNotes,');
        });
});

// ── H-3: cart empty-state gated on store hydration ───────────────────────

describe('r121 H-3 — /cart empty state waits for store rehydration', () => {
        const page = src('src/app/(protected)/cart/page.tsx');
        const store = src('src/store/cart.ts');

        it('the page gates the empty branch on useCartHydrated + renders a skeleton', () => {
                expect(page).toContain('useCartHydrated');
                expect(page).toMatch(/if \(!cartHydrated\)/);
                expect(page).toContain('<DefaultLoading />');
                // gate fires before the empty-state render (CartEmptyState comes after)
                expect(page.indexOf('!cartHydrated')).toBeLessThan(page.indexOf('<CartEmptyState'));
        });

        it('the hook subscribes to zustand persist hydration (hasHydrated + onFinishHydration)', () => {
                expect(store).toContain('export function useCartHydrated');
                expect(store).toContain('useCart.persist.hasHydrated()');
                expect(store).toContain('useCart.persist.onFinishHydration');
        });

        it('the beforeunload guard still keys on the live store items (unaffected)', () => {
                expect(page).toMatch(/if \(items\.length === 0 \|\| confirmed\) return;/);
                expect(page).toMatch(/window\.addEventListener\('beforeunload', handler\)/);
        });
});

// ── H-1: smart-default money display on the cart family ──────────────────

describe('r121 H-1 — cart money display uses the r120 smart default', () => {
        it('CartSummaryCard: integer prices carry no bare «.0» and fractions are kept', () => {
                const html = renderToString(
                        createElement(CartSummaryCard, {
                                items: [line({ price: 12, quantity: 1 }), line({ id: 'c2', price: 7.25, quantity: 1 })],
                                total: 19.25,
                        }),
                );
                expect(html).toContain('12 د.ل'); // was «12.0 د.ل» under decimals:1
                expect(html).not.toContain('12.0');
                expect(html).toContain('7.25 د.ل'); // was rounded to «7.3»
                expect(html).toContain('19.25'); // grand total, suffix '' + adjacent د.ل span
                expect(html).not.toContain('19.3');
        });

        it('CartLineItem: unit price renders 12 → «12 د.ل» not «12.0 د.ل»', () => {
                const html = renderToString(
                        createElement(CartLineItem, {
                                item: line({ price: 12 }),
                                index: 0,
                                animateItems: true,
                                onUpdateQuantity: () => {},
                                onRemove: () => {},
                                onUpdateNotes: () => {},
                        }),
                );
                expect(html).toContain('12 د.ل');
                expect(html).toContain('/ للواحد');
                expect(html).not.toContain('12.0');
        });

        it('no cart-family display site still forces decimals:1', () => {
                for (const p of [
                        'src/app/(protected)/cart/CartSummaryCard.tsx',
                        'src/app/(protected)/cart/CartLineItem.tsx',
                        'src/components/menu/OrderDialog.tsx',
                        'src/components/menu/menu-types.ts',
                ]) {
                        expect(src(p), p).not.toContain('decimals: 1');
                }
        });

        it('receipts keep their sanctioned decimals:2 (documents stay precise)', () => {
                const receipt = src('src/lib/receipt.ts');
                expect(receipt).toContain("formatPrice(item.price, { decimals: 2, suffix: \"\" })");
                // the owner share-text now matches the receipt's own precision
                expect(receipt).toContain("formatPrice(oi.price * oi.quantity, { decimals: 2 })");
                expect(receipt).not.toContain('decimals: 1');
        });
});

// ── J-2: RTL back arrows point RIGHT ─────────────────────────────────────

describe('r121 J-2 — back/close affordances point right (RTL convention)', () => {
        it('cart page header + empty state use MotionArrowRight', () => {
                const header = src('src/app/(protected)/cart/CartPageHeader.tsx');
                const empty = src('src/app/(protected)/cart/CartEmptyState.tsx');
                expect(header).toContain('<MotionArrowRight');
                expect(header).not.toContain('<MotionArrowLeft');
                expect(empty).toContain('<MotionArrowRight');
                expect(empty).not.toContain('<MotionArrowLeft');
        });

        it('CartSlideOver close button uses MotionArrowRight (one dismissal language)', () => {
                const s = src('src/components/menu/CartSlideOver.tsx');
                expect(s).toContain('<MotionArrowRight');
                expect(s).not.toContain('<MotionArrowLeft');
        });
});

// ── Q-3: mobile sheet money CTA above the initial fold ───────────────────

describe('r121 Q-3 — OrderDialog mobile sheet fits the CTA at open', () => {
        it('mobile image header is slimmed (h-28) while desktop keeps h-52', () => {
                const s = src('src/components/menu/OrderDialog.tsx');
                expect(s).toContain('h-28 sm:h-52');
                expect(s).not.toContain('h-44 sm:h-52');
        });

        it('bottom sheet caps at 94dvh (mobile path; desktop dialog keeps its own 90dvh)', () => {
                const s = src('src/components/menu/OrderDialog.tsx');
                expect(s).toContain('gap-0 p-0 max-h-[94dvh] overflow-y-auto rounded-t-2xl');
                expect(s).toContain('p-4 sm:p-5 space-y-3 sm:space-y-4');
        });
});

// ── Q-1: Vercel-gated analytics mount ────────────────────────────────────

describe('r121 Q-1 — analytics script only loads on Vercel', () => {
        it('the wrapper gates on Vercel env markers', () => {
                const s = src('src/components/shared/VercelAnalytics.tsx');
                expect(s).toContain('process.env.VERCEL');
                expect(s).toContain('process.env.NEXT_PUBLIC_VERCEL_ENV');
        });

        it('the public layout mounts the gated wrapper (no bare <Analytics />)', () => {
                const layout = src('src/app/(public)/layout.tsx');
                expect(layout).toContain('<VercelAnalytics />');
                expect(layout).not.toMatch(/<Analytics\s*\/>/);
        });
});

// ── r138-exec-3 (J9): quick notes never leave a hanging «،» ──────────────

describe('r138 J9 — quick-note toggle composes cleanly (no dangling comma)', () => {
        it('every add/remove path via the real toggleQuickNoteValue (r138-a finding #9)', async () => {
                // Dynamic import (route-test pattern): keeps a hypothetical import
                // hiccup scoped to this test, not the whole r121 pin file.
                const { toggleQuickNoteValue } = await import('@/components/menu/OrderDialog');

                // add onto an empty field
                expect(toggleQuickNoteValue('', 'حار')).toBe('حار');
                // add onto an existing value → exactly one «، » separator
                expect(toggleQuickNoteValue('بدون سكر', 'حار')).toBe('بدون سكر، حار');
                // remove the LAST note → no TRAILING comma (the old replace() left «بدون سكر،»)
                expect(toggleQuickNoteValue('بدون سكر، حار', 'حار')).toBe('بدون سكر');
                // remove the FIRST note → no LEADING comma (the old path left «، حار»)
                expect(toggleQuickNoteValue('بدون سكر، حار', 'بدون سكر')).toBe('حار');
                // remove the ONLY note → the field empties completely
                expect(toggleQuickNoteValue('حار', 'حار')).toBe('');
                // re-adding heals a legacy value that still carries a hanging comma
                expect(toggleQuickNoteValue('بدون سكر،', 'بارد')).toBe('بدون سكر، بارد');
                // a free-text segment is never gutted by an unrelated toggle
                expect(toggleQuickNoteValue('حار', 'بدون سكر')).toBe('حار، بدون سكر');
        });

        it('the old substring-replace composition is gone from the component', () => {
                const s = src('src/components/menu/OrderDialog.tsx');
                expect(s).not.toContain('prev.replace(note');
                expect(s).toContain("prev.split('،')");
        });
});

// ── r138-exec-3 (J13): header title is one clamped line ──────────────────

describe('r138 J13 — OrderDialog image-header item name is a single clamped line', () => {
        it('the header h3 carries line-clamp-1 + title (MenuItemCard name pattern)', () => {
                const s = src('src/components/menu/OrderDialog.tsx');
                expect(s).toContain('text-xl drop-shadow-lg line-clamp-1');
                expect(s).toContain('title={displayName}');
                // the r121 Q-3 mobile-header pin stays intact (height unchanged)
                expect(s).toContain('h-28 sm:h-52');
        });
});
