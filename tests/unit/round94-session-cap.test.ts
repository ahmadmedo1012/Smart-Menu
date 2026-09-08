/**
 * round94-3a (W1-a أمن — تقرير B LOW-2 §3): السقف الفعلي للجلسات
 * المتزامنة = 5 بالضبط.
 *
 * الخلل: trimExpiredSessions كان يُنفَّذ قبل session.create بشرط
 * (active.length > 5) — عند 5 جلسات نشطة لا يحذف شيئًا ثم تُنشأ سادسة،
 * وفي الدخول التالي يرى 6 فيُبقي أحدث 5 وينشئ سادسة مجددًا: الحالة
 * المستقرة 6 جلسات رغم MAX_SESSIONS_PER_USER=5. سقف الجلسات وساد دفاعي
 * على سرقة الكوكيز المتزامنة (أثر LOW — لكن العدد المعلن يجب أن يصح).
 *
 * الإصلاح المُختبر: الإنشاء ثم العدّ ثم القصّ داخل $transaction واحدة —
 * الصف الجديد يُحسب ضمن السقف (أحدث 4 أخرى + الجديد = 5)، وهو محميّ
 * بتوكنه فلا يُبعد بقصّه مهما تعادلت طوابع createdAt (id هنا cuid
 * غير رتيب — الحماية بالتوكن لا بترتيب id).
 *
 * النمط: session.test.ts نفسه (mock db + cookies) — لا DB حقيقية.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { cookieStore, db } = vi.hoisted(() => {
        const cookieStore = new Map<string, { value: string; opts: Record<string, unknown> }>();
        const db = {
                session: {
                        deleteMany: vi.fn(),
                        findMany: vi.fn(),
                        create: vi.fn(),
                        delete: vi.fn(),
                        findUnique: vi.fn(),
                        update: vi.fn(),
                },
                $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db)),
        };
        return { cookieStore, db };
});

vi.mock('next/headers', () => ({
        cookies: async () => ({
                get: (name: string) =>
                        cookieStore.has(name) ? { name, value: cookieStore.get(name)!.value } : undefined,
                set: (name: string, value: string, opts: Record<string, unknown>) => {
                        cookieStore.set(name, { value, opts });
                },
        }),
}));

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/logger', () => ({ error: vi.fn() }));
vi.mock('@/lib/csrf', () => ({ mintCsrfToken: vi.fn(async () => 'csrf') }));

import { createSession } from '@/lib/session';
import { createHash } from 'node:crypto';

const SESSION_COOKIE = 'smart-menu-session';
const hash = (t: string) => createHash('sha256').update(t).digest('hex');

/** جلسات قائمة مرتبة من الأحدث إلى الأقدم (كما يعيدها orderBy createdAt desc). */
function existing(count: number) {
        const now = Date.now();
        return Array.from({ length: count }, (_, i) => ({
                id: `old-${i}`, // old-0 = الأحدث
                token: `h${i}`,
                createdAt: new Date(now - (i + 1) * 60_000),
        }));
}

/**
 * يربط findMany بالصف الذي أنشأه للتوّ createSession — محاكاة صادقة لما
 * تراه المعاملة داخل قاعدة حقيقية: العدّ يشمل الصف الجديد.
 */
function findManyReflectsCreation(preexistingCount: number) {
        db.session.findMany.mockImplementation(async () => {
                const created = db.session.create.mock.calls.at(-1)?.[0]?.data as
                        | { token: string }
                        | undefined;
                const newest = created ? { id: 'new-row', token: created.token, createdAt: new Date() } : null;
                return newest ? [newest, ...existing(preexistingCount)] : existing(preexistingCount);
        });
}

beforeEach(() => {
        vi.clearAllMocks();
        cookieStore.clear();
        db.session.create.mockResolvedValue({});
        db.session.deleteMany.mockResolvedValue({ count: 0 });
});

describe('round94 LOW-2 — createSession: السقف الفعلي 5', () => {
        it('4 جلسات قائمة + دخول جديد → لا قصّ (الإجمالي 5 بالضبط، حدّ السقف)', async () => {
                findManyReflectsCreation(4);

                await createSession(9);

                // deleteMany استُدعي مرة واحدة فقط (تنظيف المنتهية) — لا إبعاد
                expect(db.session.deleteMany).toHaveBeenCalledTimes(1);
                expect(db.session.deleteMany).toHaveBeenCalledWith({
                        where: { userId: 9, expiresAt: { lte: expect.any(Date) } },
                });
        });

        it('5 جلسات قائمة + دخول جديد → يُبعد الأقدم ويبقى 5 بالضبط (كانت تصير 6)', async () => {
                findManyReflectsCreation(5);

                await createSession(9);

                // الصف الجديد موجود (أنشئ قبل القصّ — لا نمط trim-ثم-create القديم)
                expect(db.session.create).toHaveBeenCalledTimes(1);
                // الإبعاد: أبقِ أحدث 4 أخرى + المحميّ الجديد، واحذف الأقدم old-4
                const eviction = db.session.deleteMany.mock.calls.find(
                        (c) => (c[0] as { where: { id?: unknown } }).where.id !== undefined,
                );
                expect(eviction).toBeDefined();
                expect(eviction![0]).toEqual({
                        where: {
                                userId: 9,
                                id: { notIn: ['old-0', 'old-1', 'old-2', 'old-3'] },
                                token: { not: hash(cookieStore.get(SESSION_COOKIE)!.value) },
                        },
                });
                // عدد الباقين بعد الإبعاد = 4 أخرى + الجديد = 5 بالضبط
                const kept = (eviction![0] as { where: { id: { notIn: string[] } } }).where.id.notIn;
                expect(kept).toHaveLength(4);
        });

        it('6 جلسات قائمة (فائض قديم من نمط الخطأ) + دخول جديد → القصّ يعيدها إلى 5', async () => {
                findManyReflectsCreation(6);

                await createSession(9);

                const eviction = db.session.deleteMany.mock.calls.find(
                        (c) => (c[0] as { where: { id?: unknown } }).where.id !== undefined,
                );
                expect(eviction).toBeDefined();
                const kept = (eviction![0] as { where: { id: { notIn: string[] } } }).where.id.notIn;
                expect(kept).toHaveLength(4); // 4 أخرى + الجديد = 5
        });

        it('الصف الجديد محميّ بتوكنه حتى لو تعادلت طوابع createdAt وظهر كالأقدم (تعادل عكسي مصطنع)', async () => {
                // السيناريو المرضي: القصّ لو رتّب بـcreatedAt فقط لربما أخرج الصف
                // الجديد من مجموعة البقاء — حارس token {not} يمنع حذفه أبدًا.
                const createdTokenHash = { value: '' };
                db.session.create.mockImplementation(async (args: { data: { token: string } }) => {
                        createdTokenHash.value = args.data.token;
                        return {};
                });
                // القائمة: 5 قديمة «أحدث» + الصف الجديد في المؤخرة (تعادل/انعكاس)
                db.session.findMany.mockImplementation(async () => [
                        ...existing(5),
                        { id: 'new-row', token: createdTokenHash.value, createdAt: new Date(Date.now() - 999_999) },
                ]);

                await createSession(9);

                const eviction = db.session.deleteMany.mock.calls.find(
                        (c) => (c[0] as { where: { id?: unknown } }).where.id !== undefined,
                );
                expect(eviction).toBeDefined();
                // الحارس موجود بالضبط: token not = توكن الصف الجديد
                expect((eviction![0] as { where: { token: { not: string } } }).where.token.not).toBe(
                        createdTokenHash.value,
                );
                // والصف الجديد ليس ضمن المُبعد المحدد بالمعرّف (old-4 الأقدم هو)
                const kept = (eviction![0] as { where: { id: { notIn: string[] } } }).where.id.notIn;
                expect(kept).toHaveLength(4);
        });

        it('القصّ والإنشاء داخل معاملة واحدة (ذرية التنفيذ)', async () => {
                findManyReflectsCreation(5);

                await createSession(9);

                expect(db.$transaction).toHaveBeenCalledTimes(1);
                // الإنشاء حدث داخل المعاملة (نفس جواسيس عميل المعاملة)
                expect(db.session.create).toHaveBeenCalledTimes(1);
                const createOrder = db.session.create.mock.invocationCallOrder[0];
                const eviction = db.session.deleteMany.mock.calls.find(
                        (c) => (c[0] as { where: { id?: unknown } }).where.id !== undefined,
                );
                expect(eviction).toBeDefined();
                const evictionOrder = db.session.deleteMany.mock.invocationCallOrder.find(
                        (_v, i) =>
                                (db.session.deleteMany.mock.calls[i][0] as { where: { id?: unknown } }).where.id !==
                                undefined,
                );
                expect(evictionOrder).toBeDefined();
                expect(createOrder).toBeLessThan(evictionOrder!);
        });
});
