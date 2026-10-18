/**
 * W6-B3 — the two restaurant-operations features from the W6-A3 audit:
 * G-1 per-table QR generation (owner side of the r135 ?table=N capture) and
 * G-3 the kitchen ticket print on owner order detail.
 *
 * Pattern (the r121-cart-ux / r138-delivery-fee-truth family): the PURE
 * logic lives in lib modules and is tested by real import here; the page
 * wiring those suites can't reach is pinned as source contracts. The repo's
 * owner-page test convention is exactly this (no jsdom rendering harness
 * exists in the vitest army — e2e owns the browser).
 *
 * Pins:
 *   1. table-qr range parsing: Eastern/Western digits, 1..999 bounds (the
 *      r135 contract — anything outside is ignored as noise by the customer
 *      side, so a code outside the range would print dead), from ≤ to, and
 *      the batch cap (40 × 1000px PNGs is the sane print/memory budget).
 *   2. tableMenuUrl emits the exact URL shape captureTableFromUrl parses —
 *      verified by running the URL through URLSearchParams + Number() the
 *      same way table-session.ts does, on BOTH sides of the flow.
 *   3. kitchen-ticket note parsing against the BYTE EXACT composition the
 *      cart writes (cart/page.tsx: notes + «العنوان: …» + «طاولة: N»).
 *   4. modifier snapshot parsing: the r118 object format renders; the
 *      legacy bare-id format and malformed JSON degrade to silence.
 *   5. source contracts: the owner QR page (range inputs, labeled QR grid,
 *      print sheet mutual-exclusion, download), the order-detail ticket
 *      (print-only block, BIG order number, table line, Tripoli time),
 *      globals.css print rules, the landing over-claim repair, and the
 *      table-session parity of the 999 bound.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
        parseTableRange,
        tableMenuUrl,
} from '@/lib/table-qr';
import {
        parseTableFromNotes,
        notesWithoutTable,
        parseModifierNames,
        buildTicketItems,
} from '@/lib/kitchen-ticket';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

// ── 1. table-qr: the range input ─────────────────────────────────────────

describe('W6-B3 — parseTableRange', () => {
        it('builds the ascending table list for a plain range', () => {
                expect(parseTableRange('3', '7')).toEqual({ ok: true, tables: [3, 4, 5, 6, 7] });
        });

        it('a single table is a valid one-element batch', () => {
                expect(parseTableRange('12', '12')).toEqual({ ok: true, tables: [12] });
        });

        it('folds Arabic-Indic digits to Western (r138 input family)', () => {
                expect(parseTableRange('٣', '٧')).toEqual({ ok: true, tables: [3, 4, 5, 6, 7] });
        });

        it('trims surrounding whitespace', () => {
                expect(parseTableRange(' 5 ', ' 9 ')).toEqual({ ok: true, tables: [5, 6, 7, 8, 9] });
        });

        it('rejects empty fields with an Arabic actionable error', () => {
                const r = parseTableRange('', '15');
                expect(r.ok).toBe(false);
                if (!r.ok) expect(r.error).toContain('أدخل');
        });

        it('rejects non-numeric garbage (NaN)', () => {
                expect(parseTableRange('طاولة', '15').ok).toBe(false);
        });

        it('rejects non-integers', () => {
                expect(parseTableRange('2.5', '7').ok).toBe(false);
        });

        it('rejects 0 — the customer side ignores it as noise (r135 1..999)', () => {
                expect(parseTableRange('0', '5').ok).toBe(false);
        });

        it('rejects 1000+ — the customer side ignores it as noise (r135 1..999)', () => {
                expect(parseTableRange('998', '1001').ok).toBe(false);
        });

        it('rejects an inverted range with a causal Arabic error', () => {
                const r = parseTableRange('9', '4');
                expect(r.ok).toBe(false);
                if (!r.ok) expect(r.error).toContain('من');
        });

        it('caps the batch — each QR is a 1000px PNG in the DOM/print sheet', () => {
                const r = parseTableRange('1', '41');
                expect(r.ok).toBe(false);
                if (!r.ok) expect(r.error).toContain('40');
        });

        it('the cap boundary itself passes (exactly 40 codes)', () => {
                const r = parseTableRange('1', '40');
                expect(r).toEqual({ ok: true, tables: Array.from({ length: 40 }, (_, i) => i + 1) });
        });
});

// ── 2. tableMenuUrl: the r135 capture contract, both sides ───────────────

describe('W6-B3 — tableMenuUrl emits what captureTableFromUrl parses (r135)', () => {
        it('the URL shape is /menu/{slug}?table=N with Western digits', () => {
                expect(tableMenuUrl('https://menu.smart-link.ly', 'al-waha-cafe', 3)).toBe(
                        'https://menu.smart-link.ly/menu/al-waha-cafe?table=3'
                );
        });

        it('re-parsing the generated URL the table-session way returns the table', () => {
                // mirror of captureTableFromUrl (lib/table-session.ts): URLSearchParams
                // → get('table') → Number → integer in 1..999
                const url = tableMenuUrl('https://menu.smart-link.ly', 'al-waha-cafe', 27);
                const raw = new URL(url).searchParams.get('table');
                const parsed = raw ? Number(raw) : NaN;
                expect(Number.isInteger(parsed) && parsed > 0 && parsed <= 999).toBe(true);
                expect(parsed).toBe(27);
        });

        it('the path stays the plain public menu path the single QR encodes', () => {
                // the per-table code must differ from the single code ONLY by the
                // query param — otherwise the menu page would need a second route
                const single = 'https://menu.smart-link.ly/menu/al-waha-cafe';
                const table = tableMenuUrl('https://menu.smart-link.ly', 'al-waha-cafe', 5);
                expect(table.startsWith(single)).toBe(true);
                expect(table.slice(single.length)).toBe('?table=5');
        });
});

// ── 3. kitchen-ticket: notes table parsing (the cart's exact composition) ─

describe('W6-B3 — parseTableFromNotes / notesWithoutTable', () => {
        it('reads the table line the cart composes (byte-exact r135 shape)', () => {
                // cart/page.tsx: [notes, 'العنوان: …' (delivery), 'طاولة: N'].join('\n')
                const composed = 'بدون بصل إضافي\nالعنوان: شارع الجمهورية\nطاولة: 12';
                expect(parseTableFromNotes(composed)).toBe(12);
        });

        it('notes without a table line → null', () => {
                expect(parseTableFromNotes('بدون بصل إضافي')).toBeNull();
                expect(parseTableFromNotes('')).toBeNull();
        });

        it('keeps the LAST valid table line when more than one appears', () => {
                expect(parseTableFromNotes('طاولة: 4\nملاحظة\nطاولة: 7')).toBe(7);
        });

        it('a table number outside 1..999 is noise, not a table (r135 bounds)', () => {
                expect(parseTableFromNotes('طاولة: 1000')).toBeNull();
                expect(parseTableFromNotes('طاولة: 0')).toBeNull();
        });

        it('does not mistake prose mentioning tables for a table line', () => {
                expect(parseTableFromNotes('نريد طاولة قريبة من النافذة')).toBeNull();
                expect(parseTableFromNotes('الطاولة: 5 كبار')).toBeNull();
        });

        it('notesWithoutTable strips the table line and keeps the rest', () => {
                expect(notesWithoutTable('بدون بصل\nالعنوان: شارع الجمهورية\nطاولة: 12')).toBe(
                        'بدون بصل\nالعنوان: شارع الجمهورية'
                );
        });

        it('notesWithoutTable on table-only notes → empty (no ghost block)', () => {
                expect(notesWithoutTable('طاولة: 12')).toBe('');
        });
});

// ── 4. kitchen-ticket: the modifier snapshot (r118 format) ───────────────

describe('W6-B3 — parseModifierNames', () => {
        it('renders the r118 snapshot format with nameAr preferred', () => {
                const json = JSON.stringify([
                        { id: 1, nameAr: 'جبنة شيدر', name: 'Cheddar', priceDelta: 2 },
                        { id: 2, nameAr: '', name: 'Onion rings', priceDelta: 0 },
                ]);
                expect(parseModifierNames(json)).toEqual(['جبنة شيدر', 'Onion rings']);
        });

        it('legacy bare-id arrays degrade to silence (unresolvable client-side)', () => {
                expect(parseModifierNames(JSON.stringify([3, 7, 9]))).toEqual([]);
        });

        it('malformed JSON degrades to silence', () => {
                expect(parseModifierNames('{"oops')).toEqual([]);
        });

        it('null/undefined/empty → no modifiers', () => {
                expect(parseModifierNames(null)).toEqual([]);
                expect(parseModifierNames(undefined)).toEqual([]);
                expect(parseModifierNames('[]')).toEqual([]);
        });
});

describe('W6-B3 — buildTicketItems', () => {
        it('maps order rows to ticket lines with modifiers + trimmed line notes', () => {
                const lines = buildTicketItems([
                        {
                                item: { name: 'Burger', nameAr: 'برجر' },
                                quantity: 2,
                                notes: ' بدون حار ',
                                modifiersJson: JSON.stringify([
                                        { id: 1, nameAr: 'جبنة', name: 'Cheese', priceDelta: 2 },
                                ]),
                        },
                        { item: { name: 'Juice', nameAr: null }, quantity: 1, notes: '', modifiersJson: '[]' },
                ]);
                expect(lines).toEqual([
                        { name: 'برجر', quantity: 2, modifiers: ['جبنة'], notes: 'بدون حار' },
                        { name: 'Juice', quantity: 1, modifiers: [], notes: '' },
                ]);
        });

        it('missing legacy fields (undefined notes/modifiersJson) invent nothing', () => {
                const lines = buildTicketItems([{ item: { name: 'شاي', nameAr: 'شاي' }, quantity: 1 }]);
                expect(lines).toEqual([{ name: 'شاي', quantity: 1, modifiers: [], notes: '' }]);
        });
});

// ── 5a. owner QR page — per-table generation wiring (source contract) ────

describe('W6-B3 — owner/qr page wiring', () => {
        const page = src('src/app/(protected)/owner/qr/page.tsx');

        it('renders the range inputs (from/to) with numeric inputMode + labels', () => {
                expect(page).toContain('id="table-from"');
                expect(page).toContain('id="table-to"');
                expect(page).toContain('من الطاولة');
                expect(page).toContain('إلى الطاولة');
                expect((page.match(/inputMode="numeric"/g) ?? []).length).toBeGreaterThanOrEqual(2);
        });

        it('range errors surface inline with role=alert + aria-invalid inputs', () => {
                expect(page).toContain('id="table-range-error"');
                expect(page).toContain('role="alert"');
                expect(page).toContain("aria-invalid={error ? true : undefined}");
        });

        it('generation goes through the lib parser (one source of truth)', () => {
                expect(page).toContain("parseTableRange(from, to)");
                expect(page).toContain("import { parseTableRange, tableMenuUrl } from '@/lib/table-qr'");
        });

        it('each code encodes the r135 table URL via tableMenuUrl', () => {
                expect(page).toContain('tableMenuUrl(origin, slug, n)');
        });

        it('the grid renders at print crispness (1000px) with a per-table label', () => {
                expect(page).toContain('size={1000}');
                expect(page).toContain('طاولة {toArabicNumber(n)}');
        });

        it('the preview grid doubles as the print sheet (the W6-B3 classes)', () => {
                expect(page).toContain('className="print-tables-sheet"');
                expect(page).toContain('print-tables-grid');
                expect(page).toContain('qr-table-cell-qr');
        });

        it('batch actions: print + download-all with an async loading state', () => {
                expect(page).toContain('طباعة ورقة الطاولات');
                expect(page).toContain('تحميل الكل');
                expect(page).toContain('loading={downloading}');
                expect(page).toContain("qr-${slug || 'menu'}-table-${n}.png");
        });

        it('ONE print sheet at a time: the single sheet unmounts while a batch is active', () => {
                expect(page).toContain('url && tableBatch.length === 0 && (');
                expect(page).toContain('disabled={tableBatch.length > 0}');
        });

        it('switching the active restaurant voids the batch (codes encode the old slug)', () => {
                expect(page).toContain('setTableBatch([]);');
        });

        it('the body print-root stamp (round88-E5) is untouched', () => {
                expect(page).toContain("document.body.classList.add('qr-print-root')");
                expect(page).toContain("document.body.classList.remove('qr-print-root')");
        });
});

// ── 5b. owner order detail — the kitchen ticket wiring (source contract) ─

describe('W6-B3 — owner/orders/[id] kitchen ticket wiring', () => {
        const page = src('src/app/(protected)/owner/orders/[id]/page.tsx');

        it('stamps ticket-print-root while mounted (round88-E5 technique)', () => {
                expect(page).toContain("document.body.classList.add('ticket-print-root')");
                expect(page).toContain("document.body.classList.remove('ticket-print-root')");
        });

        it('the print action is a labelled 48px button in the quick-actions row', () => {
                expect(page).toContain('طباعة تذكرة المطبخ');
                expect(page).toContain('aria-label="طباعة تذكرة المطبخ"');
                expect(page).toContain('grid grid-cols-1 sm:grid-cols-3');
        });

        it('the ticket block is hidden on screen and print-only (qr-sheet pattern)', () => {
                expect(page).toContain('className="print-ticket-sheet"');
                expect(page).toContain('hidden print:block');
        });

        it('the order number renders BIG, the table line is conditional', () => {
                expect(page).toContain('text-4xl font-bold tabular-nums');
                expect(page).toContain('ticketTable != null && <> · طاولة {toArabicNumber(ticketTable)}</>');
        });

        it('items render with quantities + modifier options + line notes', () => {
                expect(page).toContain('buildTicketItems(order.items)');
                expect(page).toContain('{line.modifiers.join(\' · \')}');
                expect(page).toContain('{line.notes}');
        });

        it('the timestamp is Tripoli-bound (the repo date ruling R8)', () => {
                expect(page).toContain('formatDateTripoli(new Date(order.createdAt)');
        });

        it('customer identity appears only as already shown on the page', () => {
                expect(page).toContain('{order.customerName} — <bdi dir="ltr">{order.customerPhone}</bdi>');
        });

        it('the shared detail type carries the line snapshot fields', () => {
                const spine = src('src/components/orders/useOrderDetail.ts');
                expect(spine).toContain('notes?: string | null;');
                expect(spine).toContain('modifiersJson?: string | null;');
        });
});

// ── 5c. globals.css — the print sheets' CSS contract ─────────────────────

describe('W6-B3 — globals.css print rules', () => {
        const css = src('src/app/globals.css');

        it('the tables sheet joins the qr-print-root visibility family', () => {
                expect(css).toContain('body.qr-print-root .print-tables-sheet,');
                expect(css).toContain('body.qr-print-root .print-tables-sheet * {');
        });

        it('the tables grid paginates: absolute + 2×65mm rows + break-inside avoid', () => {
                expect(css).toContain('grid-template-columns: repeat(2, 65mm);');
                expect(css).toContain('break-inside: avoid;');
                expect(css).toContain('position: absolute;');
        });

        it('the 65mm geometry beats the on-screen inline style (belt-and-braces, r132)', () => {
                expect(css).toContain('width: 65mm !important;');
                expect(css).toContain('height: 65mm !important;');
        });

        it('the kitchen ticket gets its own print root (never leaks to other pages)', () => {
                expect(css).toContain('body.ticket-print-root .print-ticket-sheet,');
                expect(css).toContain('body.ticket-print-root .print-ticket-sheet * {');
        });
});

// ── 5d. landing over-claim repair (the honesty doctrine, r82) ────────────

describe('W6-B3 — landing claims are now backed (per-table QR shipped)', () => {
        it.each([
                ['RolesSection', 'src/components/landing/RolesSection.tsx'],
                ['JourneySection', 'src/components/landing/JourneySection.tsx'],
        ])('%s: no more unbacked colors/logo claim', (_name, p) => {
                const file = src(p);
                expect(file).not.toContain('بألوان مطعمك');
                expect(file).not.toContain('شعاره');
        });

        it.each([
                ['RolesSection', 'src/components/landing/RolesSection.tsx'],
                ['JourneySection', 'src/components/landing/JourneySection.tsx'],
        ])('%s: the per-table promise is the shipped one', (_name, p) => {
                const file = src(p);
                expect(file).toContain('لكل طاولة');
                // the claim chain ends with the r135 capture: the order arrives
                // signed with the table number
                expect(file).toMatch(/برقم طاولته|برقم الطاولة/);
        });
});

// ── 5e. r135 parity — the 999 bound lives in both places ─────────────────

describe('W6-B3 — table bound parity (owner generator ↔ customer capture)', () => {
        it('table-session and table-qr agree on the 1..999 range', () => {
                const session = src('src/lib/table-session.ts');
                const generator = src('src/lib/table-qr.ts');
                expect(session).toContain('const TABLE_MAX = 999;');
                expect(generator).toContain('const TABLE_MAX = 999;');
        });

        it('the cart still composes the exact table line the ticket parses', () => {
                const cart = src('src/app/(protected)/cart/page.tsx');
                expect(cart).toContain("tableNumber !== null ? `طاولة: ${tableNumber}` : ''");
        });
});
