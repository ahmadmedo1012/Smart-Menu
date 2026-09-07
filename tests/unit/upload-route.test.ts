/**
 * g90-F5 (T1) — تغطية وحدة لمسار الرفع src/app/api/upload/route.ts
 * (كان صفر تغطية في أي مكان — لا unit ولا e2e).
 *
 * النمط القياسي (admin-routes.test.ts): vi.hoisted + vi.mock للتبعيات
 * الخارجية (@vercel/blob · @/lib/session · @/lib/rate-limit · @/lib/db)
 * مع ترك سلّم المصادقة الحقيقي requireAuth يعمل — الحواجز الثمانية
 * نفسها هي ما يُختبر:
 *   1. content-length مبكر → 413 قبل أي شيء
 *   2. غياب BLOB_READ_WRITE_TOKEN → 500 (fail-closed قبل أي put)
 *   3. الضيف → 401 قبل المحدّد وقبل أي put
 *   4. محدد العدل 5/دقيقة → 429 بعد الخامسة
 *   5. وجود حقل File صالح → 400
 *   6. الحجم 5MB بالضبط (+1) → 413
 *   7. نوع MIME مسموح فقط → 400
 *   8. magic bytes حقيقية (jpeg/png/webp/avif) — لا نثق بنوع العميل
 * + مسار المستأجر round86-A3: اسم الـblob يحمل restaurants/{id}/ أو staff/
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockPut = vi.hoisted(() => vi.fn());
vi.mock('@vercel/blob', () => ({ put: mockPut }));

const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

// محدّد الرفع يُنشأ في نطاق الوحدة (5/دقيقة) — mock حاليّ قابل للتحكم
const rlState = vi.hoisted(() => ({ calls: 0, limit: Infinity, keys: [] as string[] }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: async (key: string) => {
                        rlState.calls += 1;
                        rlState.keys.push(key);
                        return {
                                success: rlState.calls <= rlState.limit,
                                remaining: 0,
                                reset: 0,
                        };
                },
                destroy: () => {},
        }),
}));

vi.mock('@/lib/db', () => ({ prisma: {}, getUserById: vi.fn(), withRetry: vi.fn() }));

const uploadRoute = await import('@/app/api/upload/route');

// ── أدوات مساعدة ───────────────────────────────────────────────────────

interface Persona {
        id: number;
        role: string;
        restaurantId: number | null;
        subscriptionStatus: string | null;
        permissions: string[];
}

const OWNER = { id: 10, role: 'owner', restaurantId: 7, subscriptionStatus: 'active', permissions: [] };
const STAFF = { id: 30, role: 'admin', restaurantId: null, subscriptionStatus: 'active', permissions: [] };
const GUEST = { valid: false as const, userId: null };

const setSession = (user: Persona | null) => {
        mockValidateSession.mockResolvedValue(
                user ? { valid: true as const, userId: user.id, user } : GUEST,
        );
};

function uploadRequest(file: File | string): NextRequest {
        const fd = new FormData();
        fd.append('file', file as File);
        return new NextRequest('http://localhost/api/upload', { method: 'POST', body: fd });
}

const emptyFormRequest = () =>
        new NextRequest('http://localhost/api/upload', { method: 'POST', body: new FormData() });

const JPEG = Buffer.from('ffd8ffe000104a464946', 'hex'); // SOI + JFIF
const PNG = Buffer.from('89504e470d0a1a0a', 'hex');
const WEBP = Buffer.concat([
        Buffer.from('52494646', 'hex'), // RIFF
        Buffer.from([0x24, 0x00, 0x00, 0x00]),
        Buffer.from('57454250', 'hex'), // WEBP
]);
const AVIF = Buffer.from('0000001c6674797061766966', 'hex'); // ftyp box + avif

const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

beforeEach(() => {
        vi.clearAllMocks();
        process.env.BLOB_READ_WRITE_TOKEN = 'blob-token-for-test';
        rlState.calls = 0;
        rlState.limit = Infinity;
        rlState.keys = [];
        setSession(OWNER);
        mockPut.mockResolvedValue({ url: 'https://x.vercel-storage.com/mock-path' });
});

afterEach(() => {
        if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
        else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
});

// ── الحاجز 1: content-length مبكر ──────────────────────────────────────

describe('POST /api/upload — الحواجز الثمانية', () => {
        it('content-length أكبر من 5MB → 413 قبل فحص التوكن والمصادقة (الحاجز المبكر)', async () => {
                delete process.env.BLOB_READ_WRITE_TOKEN; // لو تجاوز الحجمُ فحصَ التوكن فهذا يثبت الأسبقية
                const req = new NextRequest('http://localhost/api/upload', {
                        method: 'POST',
                        headers: { 'content-length': String(5 * 1024 * 1024 + 1) },
                        body: 'x',
                });
                const res = await uploadRoute.POST(req);
                expect(res.status).toBe(413);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toContain('5MB');
                expect(mockPut).not.toHaveBeenCalled();
                expect(mockValidateSession).not.toHaveBeenCalled();
        });

        it('غياب BLOB_READ_WRITE_TOKEN → 500 فشلًا مغلقًا قبل أي put', async () => {
                delete process.env.BLOB_READ_WRITE_TOKEN;
                const res = await uploadRoute.POST(uploadRequest(new File([JPEG], 'a.jpg', { type: 'image/jpeg' })));
                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toContain('BLOB_READ_WRITE_TOKEN');
                expect(mockPut).not.toHaveBeenCalled();
        });

        it('الضيف → 401 قبل المحدّد وقبل أي put', async () => {
                setSession(null);
                const res = await uploadRoute.POST(uploadRequest(new File([JPEG], 'a.jpg', { type: 'image/jpeg' })));
                expect(res.status).toBe(401);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('غير مصرح');
                expect(mockPut).not.toHaveBeenCalled();
                expect(rlState.calls).toBe(0); // المصادقة قبل المحدّد
        });

        it('حد 5 طلبات/دقيقة → الطلب السادس 429 ولم يُستدعَ put إطلاقًا', async () => {
                rlState.limit = 5;
                // الطلبات 1..5 تعبر المحدّد ثم ترتد على «الملف غير صالح» (form فارغ)
                for (let i = 0; i < 5; i++) {
                        const res = await uploadRoute.POST(emptyFormRequest());
                        expect(res.status).toBe(400);
                }
                const res = await uploadRoute.POST(uploadRequest(new File([JPEG], 'a.jpg', { type: 'image/jpeg' })));
                expect(res.status).toBe(429);
                const json = await res.json();
                expect(json.error).toContain('طلبات كثيرة');
                expect(mockPut).not.toHaveBeenCalled();
                // مفتاح المحدّد يجمع IP+userId معًا (لا يمكن لمستخدم واحد حرق حصة IP مشترك)
                expect(rlState.keys[0]).toBe('upload:unknown:10');
        });

        it('حقل file ليس ملفًا (نص) أو ملف فارغ → 400 «الملف غير صالح»', async () => {
                const asText = await uploadRoute.POST(uploadRequest('ليس ملفًا'));
                expect(asText.status).toBe(400);

                const empty = await uploadRoute.POST(uploadRequest(new File([new Uint8Array(0)], 'empty.jpg', { type: 'image/jpeg' })));
                expect(empty.status).toBe(400);
                const json = await empty.json();
                expect(json.error).toBe('الملف غير صالح');
                expect(mockPut).not.toHaveBeenCalled();
        });

        it('حجم 5MB+1 → 413 (فحص حجم الملف الفعلي لا الترويسة فقط)', async () => {
                const oversized = new File([Buffer.alloc(5 * 1024 * 1024 + 1, 0xff)], 'big.jpg', { type: 'image/jpeg' });
                const res = await uploadRoute.POST(uploadRequest(oversized));
                expect(res.status).toBe(413);
                expect(mockPut).not.toHaveBeenCalled();
        });

        it('نوع MIME غير مسموح → 400 قبل فحص المحتوى', async () => {
                const res = await uploadRoute.POST(uploadRequest(new File([JPEG], 'a.txt', { type: 'text/plain' })));
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toContain('JPG');
                expect(mockPut).not.toHaveBeenCalled();
        });

        it('magic-bytes مزيفة: ترويسة image/jpeg مزعومة ومحتوى HTML → 400 ولا يثق المسار بنوع العميل', async () => {
                const fake = new File([Buffer.from('<html><body>phish</body></html>')], 'invoice.jpg', { type: 'image/jpeg' });
                const res = await uploadRoute.POST(uploadRequest(fake));
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toContain('محتويات الملف');
                expect(mockPut).not.toHaveBeenCalled();
        });

        it('magic-bytes صحيحة لكل صيغة مسموحة → 201 (jpeg/png/avif)', async () => {
                const cases: Array<[Buffer, string, string]> = [
                        [JPEG, 'image/jpeg', 'a.jpg'],
                        [PNG, 'image/png', 'a.png'],
                        [AVIF, 'image/avif', 'a.avif'],
                ];
                for (const [buf, mime, name] of cases) {
                        // round90-المنسق: تحويل Buffer→Uint8Array (TS 5.7 يرفض Buffer كBlobPart)
                        const res = await uploadRoute.POST(uploadRequest(new File([new Uint8Array(buf)], name, { type: mime })));
                        expect(res.status, `${mime} يجب أن يُقبل`).toBe(201);
                }
                expect(mockPut).toHaveBeenCalledTimes(3);
        });

        // علة حقيقية اكتشفها هذا الاختبار (g90-F5) وأصلحها المنسق (round90):
        // route.ts:43 كان يفحص hex.slice(8,16) — أي بايتات 4..7 (حقل حجم RIFF)
        // بدل العلامة «WEBP» في بايتات 8..11. كان كل ملف webp حقيقي يُرفض 400
        // بينما ملف بترويسة RIFF يتهجّى فيها حقل الحجم «WEBP» يُقبل.
        // الإصلاح: slice(16,24) — والاختباران أدناه يثبتان السلوك الصحيح بعد الإصلاح.
        it('ترويسة webp حقيقية (RIFF+حجم+WEBP) → 201 بعد إصلاح round90', async () => {
                const realWebp = new File([new Uint8Array(WEBP)], 'real.webp', { type: 'image/webp' });
                const res = await uploadRoute.POST(uploadRequest(realWebp));
                expect(res.status).toBe(201); // العلامة في موضعها الصحيح (16,24)
        });

        it('بعد الإصلاح: RIFF يليها «WEBP» في موضع حقل الحجم (ملف غير صالح) → 400', async () => {
                const quirky = Buffer.concat([Buffer.from('52494646', 'hex'), Buffer.from('57454250', 'hex')]);
                const res = await uploadRoute.POST(uploadRequest(new File([new Uint8Array(quirky)], 'quirky.webp', { type: 'image/webp' })));
                expect(res.status).toBe(400); // round90: العلامة في موضع الحجم ليست webp صالحًا
        });

        it('الفحص على التوقيع فقط (أول 12 بايت): رأس JPEG صحيح يليه محتوى HTML → 201 (عقد مقصود: فحص توقيع لا فحص ملف)', async () => {
                // رأس JPEG صحيح لكن جسم HTML بعده: magic bytes تنظر لأول 12 بايت فقط →
                // هذا السلوك مقصود (فحص التوقيع لا فحص الملف كاملًا) — نثبته كعقد
                const hybrid = Buffer.concat([JPEG, Buffer.from('<html>rest')]);
                const res = await uploadRoute.POST(uploadRequest(new File([hybrid], 'h.jpg', { type: 'image/jpeg' })));
                expect(res.status).toBe(201);
        });
});

// ── مسار المستأجر (round86-A3) ─────────────────────────────────────────

describe('POST /api/upload — اسم الـblob يحمل مسار المستأجر', () => {
        it('مالك بمطعم (restaurantId=7) → اسم الـblob يبدأ بـ restaurants/7/ مع خيارات الوصول العام', async () => {
                const res = await uploadRoute.POST(uploadRequest(new File([JPEG], 'a.jpg', { type: 'image/jpeg' })));
                expect(res.status).toBe(201);
                const filename = mockPut.mock.calls[0][0] as string;
                expect(filename).toMatch(/^restaurants\/7\//);
                expect(filename).not.toContain('..'); // لا اجتياز مسار
                const [, buffer, opts] = mockPut.mock.calls[0] as [string, Buffer, Record<string, unknown>];
                expect(Buffer.isBuffer(buffer)).toBe(true);
                expect(opts).toMatchObject({ access: 'public', contentType: 'image/jpeg' });
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data.url).toBe('https://x.vercel-storage.com/mock-path');
                expect(json.data.size).toBe(JPEG.length);
        });

        it('مستخدم بلا مطعم → المجلد staff/', async () => {
                setSession(STAFF);
                const res = await uploadRoute.POST(uploadRequest(new File([PNG], 'a.png', { type: 'image/png' })));
                expect(res.status).toBe(201);
                expect(mockPut.mock.calls[0][0] as string).toMatch(/^staff\//);
        });
});

// ── round91-F-E (D2-#6): عائلة AVIF الموسعة — توسيع مع البقاء فاشلًا-مغلقًا ──
// كان الفحص يقبل فقط صناديق ftyp بحجم 0x1c/0x20 بعلامة «avif» الرئيسية (التقطيع
// القديم: upload/route.ts:47)، فترتد ملفات AVIF قانونية برسالة 400 خاطئة (fail-closed
// false-negative): صور avis المتحركة، علامات mif1/miaf الرئيسية/المتوافقة، أحجام
// 0x18/0x24. الإصلاح: صندوق ftyp في موضعه + علامة رئيسية أو متوافقة من
// {avif, avis, mif1, miaf} داخل حدود الصندوق المعلنة. هذا التمديد لا يحذف شيئًا —
// الاختبارات الأصلية أعلاه (بما فيها عقد الـ12 بايت والـWEBP) تبقى كما هي.

describe('POST /api/upload — round91-F-E: عائلة AVIF الموسعة (كانت تُرفض 400 قبل الإصلاح)', () => {
        // باني صناديق ftyp حقيقي البايتات: حجم(4) + «ftyp»(4) + رئيسية(4) + إصدار(4) + متوافقة(4×N)
        const ftypBox = (major: string, compat: string[] = [], declaredSize?: number) => {
                const box = Buffer.concat([
                        Buffer.alloc(4), // حجم الصندوق — يُملأ أدناه
                        Buffer.from('ftyp', 'latin1'),
                        Buffer.from(major, 'latin1'),
                        Buffer.alloc(4), // minor version
                        ...compat.map((b) => Buffer.from(b, 'latin1')),
                ]);
                box.writeUInt32BE(declaredSize ?? box.length, 0);
                return box;
        };
        const avifUpload = (buf: Buffer) =>
                uploadRoute.POST(uploadRequest(new File([new Uint8Array(buf)], 'a.avif', { type: 'image/avif' })));

        it('رؤوس AVIF قانونية متنوعة (أحجام 0x18/0x1c/0x20/0x24 · avif/avis/mif1/miaf · رئيسية أو متوافقة) → 201', async () => {
                const cases: Buffer[] = [
                        ftypBox('avif', ['mif1', 'miaf', 'avif']),                 // 0x1c — الشكل القياسي
                        ftypBox('avif', ['mif1', 'miaf', 'avif', 'MA1B']),         // 0x20 — الشكل القياسي الموسع
                        ftypBox('avif', ['mif1', 'miaf', 'avif', 'MA1B', 'mp41']), // 0x24 — حجم كان مرفوضًا قبل الإصلاح
                        ftypBox('avis', ['avif', 'mif1', 'miaf']),                 // الصور المتحركة — العلامة avis
                        ftypBox('mif1', ['miaf', 'avif']),                         // علامة رئيسية mif1 (أساس HEIF)
                        ftypBox('miaf', ['mif1']),                                 // 0x18 — علامة miaf الرئيسية
                        ftypBox('MA1B', ['mif1', 'miaf']),                         // الرئيسية خارج المجموعة والمتوافقة داخلها
                        Buffer.from('000000206674797061766966', 'hex'),            // مقطوع عند 12 بايت (حجم 0x20) — مقبول كما قبل
                ];
                for (const buf of cases) {
                        const head = `${buf.subarray(0, 4).toString('hex')} ftyp ${buf.subarray(8, 12).toString('latin1')}`;
                        const res = await avifUpload(buf);
                        expect(res.status, `${head}… يجب أن يُقبل كـAVIF`).toBe(201);
                }
                expect(mockPut).toHaveBeenCalledTimes(cases.length);
        });

        it('علامة رئيسية غير معروفة (junk) أو عائلة فيديو (isom/mp41) أو خردة غير ftyp أو حجم مشوّه → 400 (فشل مغلق محفوظ)', async () => {
                const cases: Buffer[] = [
                        ftypBox('junk'), // رئيسية غير معروفة بلا متوافقة
                        ftypBox('junk', ['junk', 'junk']), // متوافقة خردة أيضًا
                        ftypBox('isom', ['isom', 'iso2', 'mp41']), // MP4 فيديو حقيقي — ليس عائلة صور
                        Buffer.from('0000000c6674797061766966', 'hex'), // حجم صندوق مشوّه (0x0c < 16) بعلامة avif
                        Buffer.from('ftypavif', 'latin1'), // «ftyp» في الموضع الخطأ (بايتات 0..3)
                        Buffer.alloc(48, 0x6a), // خردة ثنائية خالصة
                ];
                for (const buf of cases) {
                        const res = await avifUpload(buf);
                        expect(res.status).toBe(400);
                }
                expect(mockPut).not.toHaveBeenCalled();
        });

        it('علامة «avif» خارج حدود صندوق ftyp المعلنة لا تُحتسب → 400 (المسح مقيّد بحجم الصندوق — فشل مغلق ضد التزوير)', async () => {
                // صندوق معلن 0x14 (20 بايتًا: رئيسية junk + متوافقة junk) تليها «avif»
                // خارجه — التوسيع لا يجعلها مقبولة.
                const forged = Buffer.concat([ftypBox('junk', ['junk'], 20), Buffer.from('avif', 'latin1')]);
                const res = await avifUpload(forged);
                expect(res.status).toBe(400);
                expect(mockPut).not.toHaveBeenCalled();
        });

        it('فروع JPEG/PNG/WEBP لم تتأثر بالتوسيع (قراءة 48 بايت بدل 12): webp حقيقي 201 وquirky 400 كما كانا', async () => {
                const real = await uploadRoute.POST(
                        uploadRequest(new File([new Uint8Array(WEBP)], 'real.webp', { type: 'image/webp' })),
                );
                expect(real.status).toBe(201);
                const quirky = Buffer.concat([Buffer.from('52494646', 'hex'), Buffer.from('57454250', 'hex')]);
                const bad = await uploadRoute.POST(
                        uploadRequest(new File([new Uint8Array(quirky)], 'quirky.webp', { type: 'image/webp' })),
                );
                expect(bad.status).toBe(400);
        });
});
