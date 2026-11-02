/**
 * W2-MEN-1 (P42-W2، تدقيق W2 — «تحميل الكل» كان N تنزيلات PNG متتالية):
 * بانٍ ZIP نقي بلا اعتماديات — طريقة STORE (بلا ضغط).
 *
 * لماذا بلا مكتبة: الرموز payloads بصيغة PNG المضغوطة أصلًا (deflate داخل
 * PNG) فأي ضغط ثانٍ مكسبه صفر وتعقيده كبير؛ وبانٍ STORE هو ~150 سطرًا
 * محددة المواصفة (APPNOTE.TXT) قابلة للاختبار البنيوي الحتمي — نفس فلسفة
 * r106-N2 (QR مُستضاف محليًا بدل api.qrserver.com): لا اعتمادية خارجية
 * لمهمة يستطيع المصدر فهمها والتحقق منها.
 *
 * نطاق العمد: أرشيف بلا مجلدات، بلا تعليقات، بلا حقول extra — ملفات
 * مسطحة بأسماء ASCII (أسماء الرموز: qr-<slug>-table-<n>.png). حدود
 * تنسيق ZIP32 محفوظة تلقائيًا: الدفعة ≤ 40 رمزًا (سقف MAX_BATCH في
 * lib/table-qr.ts) والملف الواحد كيلوبايتات — بعيد عن سقف 4GB بمقادير.
 *
 * التنسيق (كل الأعداد little-endian):
 *   [ترويسة محلية 30B + اسم + بيانات] × N
 *   [ترويسة مركزية 46B + اسم] × N
 *   [EOCD 22B]
 */

/** جدول CRC-32 (IEEE 802.3 — كثير الحدود المنعكس 0xEDB88320). */
const CRC_TABLE: Uint32Array = (() => {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
                let c = n;
                for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
                t[n] = c >>> 0;
        }
        return t;
})();

/** CRC-32 لسلسلة بايتات — متجه الاختبار المعروف: «123456789» → 0xCBF43926. */
export function crc32(data: Uint8Array): number {
        let c = 0xffffffff;
        for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
        return (c ^ 0xffffffff) >>> 0;
}

/** تاريخ/وقت DOS (ثانيتان دقة) — قيم 16-بت للحقول 10-11/12-13. */
export function dosDateTime(d: Date): { time: number; date: number } {
        const year = Math.min(Math.max(d.getFullYear(), 1980), 2107);
        return {
                time: ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() >> 1) & 0x1f),
                date: (((year - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f),
        };
}

export interface ZipEntry {
        /** اسم الملف داخل الأرشيف — أسماء ASCII فقط (عقد هذا البانِ). */
        name: string;
        data: Uint8Array;
}

/**
 * بناء أرشيف ZIP كامل (STORE) من مدخلات مسطحة. حتمي تمامًا لنفس
 * المدخلات + نفس الطابع الزمني (يُمرَّر ثابتًا في الاختبارات).
 * قائمة فارغة → أرشيف EOCD-only صالح (0 مدخلات) — العقد العلوي
 * (زر الواجهة) لا يستدعيه بلا مدخلات أصلًا.
 *
 * نوع الإرجاع `Uint8Array<ArrayBuffer>` (TS 5.7+): المخزن مملوك حصريًا
 * (مُنشأ هنا بـ new ArrayBuffer) — يقبله BlobPart مباشرة بلا تحويل.
 */
export function buildZip(entries: ZipEntry[], now: Date = new Date()): Uint8Array<ArrayBuffer> {
        const names = entries.map((e) => new TextEncoder().encode(e.name));

        // الحجم الكلي مقدمًا — مخزن واحد بلا إلحاق متكرر.
        const localSize = entries.reduce((s, e, i) => s + 30 + names[i]!.length + e.data.length, 0);
        const centralSize = entries.reduce((s, _e, i) => s + 46 + names[i]!.length, 0);
        const total = localSize + centralSize + 22;
        const buf = new ArrayBuffer(total);
        const view = new DataView(buf);
        const bytes = new Uint8Array(buf);
        let off = 0;

        const u16 = (v: number) => {
                view.setUint16(off, v & 0xffff, true);
                off += 2;
        };
        const u32 = (v: number) => {
                view.setUint32(off, v >>> 0, true);
                off += 4;
        };
        const raw = (b: Uint8Array) => {
                bytes.set(b, off);
                off += b.length;
        };

        const { time, date } = dosDateTime(now);
        const offsets: number[] = [];

        // 1) الترويسات المحلية + البيانات
        entries.forEach((entry, i) => {
                offsets.push(off);
                const name = names[i]!;
                u32(0x04034b50); // PK\x03\x04
                u16(20); // الإصدار المطلوب 2.0
                u16(hasNonAscii(entry.name) ? 0x0800 : 0); // راية UTF-8 عند الحاجة فقط
                u16(0); // STORE
                u16(time);
                u16(date);
                u32(crc32(entry.data));
                u32(entry.data.length); // المضغوط = الأصلي (STORE)
                u32(entry.data.length);
                u16(name.length);
                u16(0); // لا extra
                raw(name);
                raw(entry.data);
        });

        // 2) الدليل المركزي
        const centralStart = off;
        entries.forEach((entry, i) => {
                const name = names[i]!;
                u32(0x02014b50); // PK\x01\x02
                u16(20); // صُنع بإصدار 2.0
                u16(20); // يُفتح بإصدار 2.0
                u16(hasNonAscii(entry.name) ? 0x0800 : 0);
                u16(0); // STORE
                u16(time);
                u16(date);
                u32(crc32(entry.data));
                u32(entry.data.length);
                u32(entry.data.length);
                u16(name.length);
                u16(0); // لا extra
                u16(0); // لا تعليق
                u16(0); // قرص البداية
                u16(0); // خصائص داخلية
                u32(0); // خصائص خارجية
                u32(offsets[i]!);
                raw(name);
        });

        // 3) EOCD — حجم الدليل يُلتقط قبل بدء كتابة الـEOCD: حقل الحجم
        // يُحسب من نهاية الدليل نفسها، ولو قُرئ off لحظتها لاحتسب 12 بايتًا
        // من مقدمة الـEOCD (الخطأ الذي أمسكته python zipfile ولم تمسكه
        // الاختبارات البنيوية الأولى — عُوّض بعقد EOCD صريح في الاختبارات).
        const centralEnd = off;
        u32(0x06054b50); // PK\x05\x06
        u16(0);
        u16(0);
        u16(entries.length);
        u16(entries.length);
        u32(centralEnd - centralStart); // حجم الدليل المركزي
        u32(centralStart); // إزاحته
        u16(0); // لا تعليق ختامي

        return bytes;
}

function hasNonAscii(s: string): boolean {
        for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 0x7f) return true;
        return false;
}

/**
 * فكّ data URL (مخرجات qrPngDataUrl) إلى بايتاته — جسر التوليد إلى
 * البانِ: toDataURL يعطي base64، والـZIP يريد بايتات خام.
 */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
        const comma = dataUrl.indexOf(',');
        if (comma < 0) throw new Error('data URL غير صالح');
        const bin = atob(dataUrl.slice(comma + 1));
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
}
