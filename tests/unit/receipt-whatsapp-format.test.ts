/**
 * round85-D4 — unit coverage for the customer-facing text pipeline:
 * money formatting, Arabic normalization, WhatsApp phone normalization,
 * receipt/share-text builders, and the timing-safe bearer comparison.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ── format.ts ───────────────────────────────────────────────────────────
import { formatPrice, toArabicNumber, formatDate, normalizeArabic } from '@/lib/format';

describe('formatPrice', () => {
        it('integer → 0 decimals + د.ل suffix', () => {
                expect(formatPrice(25)).toBe('25 د.ل');
        });
        it('float → 1 decimal by default', () => {
                expect(formatPrice(12.5)).toBe('12.5 د.ل');
        });
        it('explicit decimals override', () => {
                expect(formatPrice(25, { decimals: 2 })).toBe('25.00 د.ل');
        });
        it('custom suffix', () => {
                expect(formatPrice(3, { suffix: '$' })).toBe('3$');
        });
        it('null/undefined → 0 د.ل (never NaN)', () => {
                expect(formatPrice(null)).toBe('0 د.ل');
                expect(formatPrice(undefined)).toBe('0 د.ل');
        });
        it('non-numeric string → 0 د.ل (graceful)', () => {
                expect(formatPrice('abc')).toBe('0 د.ل');
        });
        it('numeric string passes through Number()', () => {
                /* r120 (U1-P2-2 + U5-F-13): القيمة القديمة «7.3» كانت تدويرًا ماليًا
                   خاطئًا (منزلة واحدة إجبارية) — الافتراضي الذكي يعرض الكسر الحقيقي
                   بمنزلتين كحد أقصى بلا أصفار زائدة. */
                expect(formatPrice('7.25')).toBe('7.25 د.ل');
                expect(formatPrice('7.2')).toBe('7.2 د.ل');
                expect(formatPrice(12)).toBe('12 د.ل');
        });
        it('negative floats keep the sign', () => {
                expect(formatPrice(-4.5)).toBe('-4.5 د.ل');
        });
});

describe('toArabicNumber', () => {
        it('numbers → Western digit string (no Arabic-Indic)', () => {
                expect(toArabicNumber(123456)).toBe('123456');
                expect(toArabicNumber(12.75)).toBe('12.75');
        });
        it('strings pass through unchanged', () => {
                expect(toArabicNumber('0912')).toBe('0912');
        });
});

describe('formatDate', () => {
        it('renders Western digits + Arabic month + HH:mm', () => {
                const d = new Date(2026, 8, 5, 9, 7); // months are 0-based: 8 = September
                const out = formatDate(d);
                expect(out).toContain('5 سبتمبر 2026');
                expect(out).toContain('09:07');
                expect(out).not.toMatch(/[\u0660-\u0669]/); // no Arabic-Indic digits
        });
});

describe('normalizeArabic', () => {
        it('strips tashkeel + tatweel', () => {
                expect(normalizeArabic('مَطْعَمـــ')).toBe('مطعم');
        });
        it('folds alef variants', () => {
                expect(normalizeArabic('أحمد إبراهيم آدم')).toBe('احمد ابراهيم ادم');
        });
        it('folds alef maqsura + ta marbuta', () => {
                expect(normalizeArabic('على شاهية')).toBe('علي شاهيه');
        });
        it('lowercases Latin', () => {
                expect(normalizeArabic('Pizza ROMA')).toBe('pizza roma');
        });
});

// ── whatsapp.ts ─────────────────────────────────────────────────────────
import { normalizeWaNumber } from '@/lib/whatsapp';

describe('normalizeWaNumber', () => {
        it('null/empty/whitespace → null', () => {
                expect(normalizeWaNumber(null)).toBeNull();
                expect(normalizeWaNumber(undefined)).toBeNull();
                expect(normalizeWaNumber('')).toBeNull();
                expect(normalizeWaNumber('   ')).toBeNull();
        });
        it('strips separators (spaces, dashes, parens)', () => {
                expect(normalizeWaNumber('+218 91-234 (5678)')).toBe('218912345678');
        });
        it('leading 00 → stripped (country code remains)', () => {
                expect(normalizeWaNumber('00218911234567')).toBe('218911234567');
        });
        it('leading + stripped for wa.me format', () => {
                expect(normalizeWaNumber('+2189112345678')).toBe('2189112345678');
        });
        it('too short (<8 digits) → null', () => {
                expect(normalizeWaNumber('091234')).toBeNull();
        });
        it('too long (>15 digits) → null', () => {
                expect(normalizeWaNumber('218911234567890123')).toBeNull();
        });
        it('valid 8-15 digits pass', () => {
                expect(normalizeWaNumber('218911234567')).toBe('218911234567');
        });
        it('r109-F2: local LY trunk format (leading 0) → 218-prefixed international', () => {
                expect(normalizeWaNumber('0912345678')).toBe('218912345678');
        });
        it('r109-F2: local LY landline trunk format also converts', () => {
                expect(normalizeWaNumber('0211234567')).toBe('218211234567');
        });
        it('r109-F2: already-international numbers never get double-prefixed', () => {
                expect(normalizeWaNumber('218912345678')).toBe('218912345678');
                expect(normalizeWaNumber('+218 91 234 5678')).toBe('218912345678');
        });
});

// ── receipt.ts ──────────────────────────────────────────────────────────
import { buildReceiptMessage, buildOrderShareText } from '@/lib/receipt';

describe('buildReceiptMessage', () => {
        const base = {
                restaurantName: 'مقهى الواحة',
                items: [
                        { name: 'لاتيه', qty: 2, price: 8.5 },
                        { name: 'كرواسون', qty: 1, price: 6, notes: 'بدون سكر' },
                ],
                totalPrice: 23,
        };

        it('header includes the restaurant name and invoice label', () => {
                const out = buildReceiptMessage(base);
                expect(out).toContain('🏪 *مقهى الواحة*');
                expect(out).toContain('📋 *فاتورة طلب*');
        });

        it('items render with qty × price = line total (Western digits)', () => {
                const out = buildReceiptMessage(base);
                expect(out).toContain('*لاتيه*');
                expect(out).toContain('2 × 8.50 د.ل  =  17.00 د.ل');
                expect(out).toContain('1 × 6.00 د.ل  =  6.00 د.ل');
        });

        it('item notes render as italic', () => {
                expect(buildReceiptMessage(base)).toContain('📝 _بدون سكر_');
        });

        it('total renders with 2 decimals + د.ل', () => {
                expect(buildReceiptMessage(base)).toContain('23.00 د.ل');
        });

        it('customer block only when name/phone provided', () => {
                const without = buildReceiptMessage(base);
                expect(without).not.toContain('👤 *بيانات العميل*');
                const withCustomer = buildReceiptMessage({ ...base, customerName: 'أحمد', customerPhone: '0912' });
                expect(withCustomer).toContain('👤 *بيانات العميل*');
                expect(withCustomer).toContain('أحمد');
        });

        it('pickup type labels map (inside/takeaway/delivery) + unknown passthrough', () => {
                expect(buildReceiptMessage({ ...base, pickupType: 'delivery' })).toContain('توصيل');
                expect(buildReceiptMessage({ ...base, pickupType: 'takeaway' })).toContain('سفري');
                expect(buildReceiptMessage({ ...base, pickupType: 'inside' })).toContain('داخل المكان');
                expect(buildReceiptMessage({ ...base, pickupType: 'vip' })).toContain('vip');
        });

        it('order number and menu URL included when passed', () => {
                const out = buildReceiptMessage({ ...base, orderNo: 'ORD-7', menuUrl: 'https://menu.smart-link.ly/x' });
                expect(out).toContain('ORD-7');
                expect(out).toContain('https://menu.smart-link.ly/x');
        });
});

describe('buildOrderShareText', () => {
        const order = {
                orderNo: 'ORD-42',
                customerName: 'سارة',
                customerPhone: '0911111111',
                pickupType: 'delivery',
                total: 57.5,
                items: [
                        { item: { nameAr: 'بيتزا مارجريتا', name: 'Margherita' }, quantity: 2, price: 20 },
                        { item: { nameAr: null, name: 'Cola' }, quantity: 1, price: 17.5 },
                ],
        };

        it('header carries the order number and customer line', () => {
                const out = buildOrderShareText(order);
                expect(out).toContain('📋 طلب ORD-42');
                expect(out).toContain('سارة | 0911111111');
        });

        it('prefers nameAr, falls back to name', () => {
                const out = buildOrderShareText(order);
                expect(out).toContain('بيتزا مارجريتا');
                expect(out).toContain('Cola');
                expect(out).not.toContain('Margherita');
        });

        it('line totals and grand total match the receipt document precision (decimals 2 — r121 H-1)', () => {
                const out = buildOrderShareText(order);
                expect(out).toContain('×2 = 40.00 د.ل');
                expect(out).toContain('×1 = 17.50 د.ل');
                expect(out).toContain('💰 الإجمالي: 57.50 د.ل');
                // the old «.0»-forcing must not come back
                expect(out).not.toContain('40.0 د.ل');
        });

        it('pickup labels: delivery → توصيل, takeaway → سفري, else داخل المكان', () => {
                expect(buildOrderShareText({ ...order, pickupType: 'takeaway' })).toContain('سفري');
                expect(buildOrderShareText({ ...order, pickupType: 'inside' })).toContain('داخل المكان');
                expect(buildOrderShareText({ ...order, pickupType: 'delivery' })).toContain('توصيل');
        });

        it('null phone renders empty (not null string)', () => {
                const out = buildOrderShareText({ ...order, customerPhone: null });
                expect(out).toContain('سارة | ');
                expect(out).not.toContain('null');
        });
});


// ── r143 (Phase-4 W1 D4) — نص الفاتورة خالٍ من U+FFFD ────────────────────
// الرصد الحي (QA D4): نص wa.me لكل طلب حقيقي افتتح بـ %EF%BF%BD مكان
// الإيموجي. الحرس هنا مزدوج:
//  1) المخرَج الفعلي للبنائين لا يحمل U+FFFD أبدًا (مهما اكتملت المدخلات)؛
//  2) المصدر يحمل الإيموجي هروبات \u{...} لا حروف خام — فئة تلف إعادة
//     الترميز (أي تمريرة بترميز غير UTF-8) تصطدم بحرف ASCII لا شيء يُفسد.
describe('r143 — invoice text hygiene (no U+FFFD, escape-encoded emoji)', () => {
        const full = {
                restaurantName: 'مقهى الواحة',
                items: [
                        { name: 'لاتيه', qty: 2, price: 8.5, notes: 'بدون سكر' },
                        { name: 'كرواسون', qty: 1, price: 6 },
                ],
                totalPrice: 23,
                deliveryFee: 2,
                notes: 'الرجاء التوصيل سريعًا',
                customerName: 'أحمد',
                customerPhone: '0912345678',
                pickupType: 'delivery',
                orderNo: 'ORD-HYG1',
                menuUrl: 'https://menu.smart-link.ly/al-waha-cafe',
        };

        it('buildReceiptMessage output never contains U+FFFD', () => {
                const out = buildReceiptMessage(full);
                expect(out.length).toBeGreaterThan(0);
                expect(out).not.toContain('\uFFFD');
        });

        it('buildOrderShareText output never contains U+FFFD', () => {
                const out = buildOrderShareText({
                        orderNo: 'ORD-HYG2',
                        customerName: 'سارة',
                        customerPhone: '0911111111',
                        pickupType: 'takeaway',
                        total: 57.5,
                        items: [{ item: { nameAr: 'شاي', name: 'Tea' }, quantity: 1, price: 3 }],
                });
                expect(out.length).toBeGreaterThan(0);
                expect(out).not.toContain('\uFFFD');
        });

        it('emoji survive as the intended codepoints (escapes decode identically)', () => {
                const out = buildReceiptMessage(full);
                expect(out).toContain('\u{1F3EA}'); // 🏪
                expect(out).toContain('\u{1F4CB}'); // 📋
                expect(out).toContain('\u{1F4B5}'); // 💵
        });

        it('the source keeps the escape-encoded emoji law (no raw astral literals)', () => {
                for (const f of ['src/lib/receipt.ts', 'src/app/api/whatsapp/generate/route.ts']) {
                        const src = readFileSync(fileURLToPath(new URL(`../../${f}`, import.meta.url)), 'utf8');
                        // أي حرف > U+2FFF (نطاق الإيموجي المستخدم في الفواتير) حاضر = انكسار القانون
                        const raw = [...src].filter((c) => c.codePointAt(0)! > 0x2fff);
                        expect(`${f}: ${raw.join('')}`).toBe(`${f}: `);
                }
        });
});

// ── secure-compare.ts (round85-A4) ─────────────────────────────────────
import { timingSafeBearer } from '@/lib/secure-compare';

describe('timingSafeBearer', () => {
        const secret = 's3cr3t-cron-value';
        it('correct Bearer token → true', () => {
                expect(timingSafeBearer(`Bearer ${secret}`, secret)).toBe(true);
        });
        it('wrong token → false', () => {
                expect(timingSafeBearer('Bearer wrong', secret)).toBe(false);
        });
        it('missing header/secret → false (fail closed)', () => {
                expect(timingSafeBearer(null, secret)).toBe(false);
                expect(timingSafeBearer(`Bearer ${secret}`, undefined)).toBe(false);
        });
        it('raw token without Bearer prefix → false', () => {
                expect(timingSafeBearer(secret, secret)).toBe(false);
        });
        it('length mismatch never throws', () => {
                expect(timingSafeBearer('Bearer short', 'a-much-longer-secret-value')).toBe(false);
        });
});
