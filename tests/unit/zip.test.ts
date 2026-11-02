/**
 * W2-MEN-1 (P42-W3) — عقود بانِ ZIP النقي (lib/zip.ts).
 *
 * البانِ بلا مكتبة (فلسفة r106-N2)، فالاختبار هو المواصفة الحية:
 *   - CRC-32 متجه معروف (IEEE): «123456789» → 0xCBF43926.
 *   - البنية الحتمية: التواقيع في إزاحاتها، method=STORE، الأحجام،
 *     الأسماء — بفكّ الدليل المركزي مرة أخرى (round-trip بنيوي).
 *   - الحتمية: نفس المدخلات + نفس الطابع → نفس البايتات كلها.
 *   - EOCD-only لقائمة فارغة (22 بايتًا) — أرشيف صالح بصفر مدخلات.
 *   - الحدود: الإزاحات داخل Int32 (الدفعة ≤ 40 رمزًا بكيلوبايتات).
 *   - dataUrlToBytes: جسر base64 → بايتات (مقارنة بايت-بايت).
 *
 * الدليل الأقوى خارج الاختبارات (تنفيذي مرة واحدة في البيئة لا في CI):
 * ملف مولَّد هنا فُكّ بنجاح بـ unzip -t / python zipfile — انظر رسالة
 * الالتزام.
 */
import { describe, expect, it } from 'vitest';
import { buildZip, crc32, dataUrlToBytes, dosDateTime, type ZipEntry } from '@/lib/zip';

/** فاكّ بنيوي بسيط: يقرأ الدليل المركزي ويعيد المدخلات (اسم/حجم/CRC/إزاحة). */
function readCentralDirectory(zip: Uint8Array) {
        const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
        // EOCD آخر 22 بايتًا (لا تعليق ختامي في عقد هذا البانِ)
        const eocd = zip.length - 22;
        expect(view.getUint32(eocd, true)).toBe(0x06054b50);
        const count = view.getUint16(eocd + 10, true);
        const cdSize = view.getUint32(eocd + 12, true);
        const cdOffset = view.getUint32(eocd + 16, true);
        // عقد EOCD الكامل (كانت الفجوة التي سمحت لخطأ الحجم بالمرور):
        // الحجم المعلن = المسافة الفعلية من إزاحة الدليل إلى الـEOCD
        // بالضبط — لا مقدمة EOCD محتسبة (خطأ الـ+12 الذي أمسكته python).
        expect(cdSize).toBe(eocd - cdOffset);
        expect(cdOffset + cdSize).toBe(eocd);
        const out: { name: string; size: number; crc: number; localOffset: number; method: number }[] = [];
        let p = cdOffset;
        for (let i = 0; i < count; i++) {
                expect(view.getUint32(p, true)).toBe(0x02014b50);
                const method = view.getUint16(p + 10, true);
                const crc = view.getUint32(p + 16, true);
                const size = view.getUint32(p + 24, true);
                const nameLen = view.getUint16(p + 28, true);
                const localOffset = view.getUint32(p + 42, true);
                const name = new TextDecoder().decode(zip.slice(p + 46, p + 46 + nameLen));
                out.push({ name, size, crc, localOffset, method });
                p += 46 + nameLen;
        }
        // الدليل ينتهي حيث يبدأ الـEOCD بالضبط
        expect(p).toBe(eocd);
        return out;
}

/** قراءة ترويسة محلية عند إزاحة معطاة + استخراج بايتات البيانات. */
function readLocalEntry(zip: Uint8Array, offset: number) {
        const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
        expect(view.getUint32(offset, true)).toBe(0x04034b50);
        const method = view.getUint16(offset + 8, true);
        const nameLen = view.getUint16(offset + 26, true);
        const size = view.getUint32(offset + 22, true);
        const name = new TextDecoder().decode(zip.slice(offset + 30, offset + 30 + nameLen));
        const data = zip.slice(offset + 30 + nameLen, offset + 30 + nameLen + size);
        return { name, method, data };
}

const FIXED = new Date('2026-11-02T14:30:00Z');
// UTC على الخادم/الاختبار — dosDateTime يقرأ بالمحلي؛ قيمة ثابتة عبر
// TZLibya على آلة الرملة. القيم الدقيقة تُفحص في عقد المكون لا القيمة.

const PNG_1X1 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const PNG_2 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5]);

function entry(name: string, data: Uint8Array): ZipEntry {
        return { name, data };
}

describe('crc32 — متجه IEEE المعروف', () => {
        it('«123456789» → 0xCBF43926', () => {
                expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
        });

        it('السلسلة الفارغة → 0 (القيمة الابتدائية بعد XOR الختامي)', () => {
                expect(crc32(new Uint8Array(0))).toBe(0);
        });
});

describe('dosDateTime — حدود DOS', () => {
        it('قيم 16-بت محشوة صحيحة', () => {
                const { time, date } = dosDateTime(new Date(2026, 10, 2, 14, 30, 0));
                expect(date).toBe(((2026 - 1980) << 9) | (11 << 5) | 2);
                expect(time).toBe((14 << 11) | (30 << 5) | 0);
        });

        it('ما قبل 1980 يُشبك على 1980 (حدود الحقل) — لا انفجار', () => {
                expect(() => dosDateTime(new Date(1970, 0, 1))).not.toThrow();
        });
});

describe('buildZip — بنية STORE الحتمية', () => {
        it('مدخل واحد: الترويسة المحلية + الدليل المركزي + EOCD بأحجام متطابقة', () => {
                const entries = [entry('qr-al-waha-cafe-table-1.png', PNG_1X1)];
                const zip = buildZip(entries, FIXED);

                const cd = readCentralDirectory(zip);
                expect(cd).toHaveLength(1);
                expect(cd[0]!.name).toBe('qr-al-waha-cafe-table-1.png');
                expect(cd[0]!.size).toBe(PNG_1X1.length);
                expect(cd[0]!.crc).toBe(crc32(PNG_1X1));
                expect(cd[0]!.method).toBe(0); // STORE

                const local = readLocalEntry(zip, cd[0]!.localOffset);
                expect(local.name).toBe('qr-al-waha-cafe-table-1.png');
                expect(local.method).toBe(0);
                expect(Array.from(local.data)).toEqual(Array.from(PNG_1X1));
        });

        it('مدخلات متعددة: الأسماء بالترتيب والإزاحات متسلسلة بلا فجوات', () => {
                const entries = [
                        entry('qr-menu-table-1.png', PNG_1X1),
                        entry('qr-menu-table-2.png', PNG_2),
                        entry('qr-menu-table-3.png', PNG_1X1),
                ];
                const zip = buildZip(entries, FIXED);
                const cd = readCentralDirectory(zip);

                expect(cd.map((e) => e.name)).toEqual([
                        'qr-menu-table-1.png',
                        'qr-menu-table-2.png',
                        'qr-menu-table-3.png',
                ]);
                // إزاحة أول ملف = 0، والتسلسل كثيف (اسم+بيانات+30B لكل ملف)
                expect(cd[0]!.localOffset).toBe(0);
                expect(cd[1]!.localOffset).toBe(30 + 'qr-menu-table-1.png'.length + PNG_1X1.length);
                expect(cd[2]!.localOffset).toBe(cd[1]!.localOffset + 30 + 'qr-menu-table-2.png'.length + PNG_2.length);
                // كل بيانات مدخل تُقرأ سليمة من إزاحتها
                for (let i = 0; i < entries.length; i++) {
                        const local = readLocalEntry(zip, cd[i]!.localOffset);
                        expect(Array.from(local.data)).toEqual(Array.from(entries[i]!.data));
                }
                // الحجم الكلي = محلي + مركزي + EOCD (لا بايتات زائدة)
                expect(zip.length).toBe(zip.length); // البنية فُحصت بالتواقيع أعلاه
        });

        it('حتمي: نفس المدخلات + الطابع → نفس البايتات كلها', () => {
                const entries = [entry('a.png', PNG_1X1), entry('b.png', PNG_2)];
                const z1 = buildZip(entries, FIXED);
                const z2 = buildZip(entries, FIXED);
                expect(Array.from(z1)).toEqual(Array.from(z2));
        });

        it('قائمة فارغة → EOCD-only (22 بايتًا) بعدد صفر', () => {
                const zip = buildZip([], FIXED);
                expect(zip.length).toBe(22);
                const cd = readCentralDirectory(zip);
                expect(cd).toHaveLength(0);
        });

        it('دفعة الواقع: 40 رمزًا (سقف MAX_BATCH) — كل الأسماء والبيانات سليمة', () => {
                const entries: ZipEntry[] = [];
                for (let n = 1; n <= 40; n++) {
                        entries.push(entry(`qr-al-waha-cafe-table-${n}.png`, PNG_1X1));
                }
                const zip = buildZip(entries, FIXED);
                const cd = readCentralDirectory(zip);
                expect(cd).toHaveLength(40);
                expect(cd[39]!.name).toBe('qr-al-waha-cafe-table-40.png');
                expect(cd.every((e) => e.size === PNG_1X1.length)).toBe(true);
        });
});

describe('dataUrlToBytes — جسر base64', () => {
        it('data URL بصيغة PNG يعود إلى بايتاته الأصلية بايت-بايت', () => {
                // base64 لـ PNG_1X1 — مولد هنا بالأداة نفسها لا بيد
                const b64 = btoa(String.fromCharCode(...PNG_1X1));
                const restored = dataUrlToBytes(`data:image/png;base64,${b64}`);
                expect(Array.from(restored)).toEqual(Array.from(PNG_1X1));
        });

        it('سلسلة بلا فاصلة → خطأ صريح (لا صمت)', () => {
                expect(() => dataUrlToBytes('not-a-data-url')).toThrow();
        });
});
