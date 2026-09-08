/**
 * round94-3a (W1-a أمن — تقرير B LOW-5 §6): تقييد قراءة /api/config.
 *
 * الخلل: requireAuth() فقط ثم كل الإعدادات غير السرية — التسجيل الذاتي
 * المجاني (USER) جعل «وجود جلسة» بلا قيمة حصرية، فأي حساب مجاني يعدّد
 * الإعدادات التشغيلية الداخلية (رسوم، قواعد سحب...).
 *
 * تعارض موثّق مع الكود (قرار التنفيذ): اقتراح التقرير (requireAdmin
 * كاملًا) يكسر مستهلكًا حقيقيًا — useConfig (hooks/useConfig.ts:46) يقرأ
 * المسار من PaymentDialog في رحلة الاشتراك/الدفع، ومفاتيح قنوات الدفع
 * (balance_transfer_phone_1/2 + bank_transfer_*) لا بديل ثابتًا لها كله
 * (البنكي بلا بديل إطلاقًا) — حجبها عن المشتركين يفرغ تعليمات الدفع.
 * لذا: غير حاملي EDIT_SETTINGS يرون قائمة بيضاء لقنوات الدفع فقط
 * (هي أصلًا ما يعرضه حوار الدفع لكل دافع)، والداخلية صارت أدمن فقط.
 *
 * النمط: whatsapp-generate.test.ts (mock @/lib/session فيعمل سلّم
 * requirePermission الحقيقي — خلايا RBAC حقيقية لا غلاف مزيّف) — لا DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockValidateSession = vi.hoisted(() => vi.fn());

const mockConfigFindMany = vi.hoisted(() => vi.fn());
const mockConfigFindUnique = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
        systemConfig: { findMany: mockConfigFindMany, findUnique: mockConfigFindUnique },
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock, getUserById: vi.fn(), withRetry: vi.fn() }));
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

// ── Personas (تُمرّر لسلّم requirePermission الحقيقي) ─────────────────────

interface Persona {
        id: number;
        role: string;
        restaurantId: number | null;
        subscriptionStatus: string | null;
        permissions: string[];
}

const persona = (o: Partial<Persona>): Persona => ({
        id: 1,
        role: 'USER',
        restaurantId: null,
        subscriptionStatus: 'active',
        permissions: [],
        ...o,
});

const GUEST = { valid: false as const, userId: null };
const ADMIN = persona({ id: 2, role: 'admin' });
const SUPER_ADMIN = persona({ id: 1, role: 'super_admin' });
const SUB_ADMIN_WITH_PERM = persona({ id: 5, role: 'sub_admin', permissions: ['EDIT_SETTINGS'] });
const SUB_ADMIN_NO_PERM = persona({ id: 6, role: 'sub_admin', permissions: ['APPROVE_ORDERS'] });
const OWNER = persona({ id: 10, role: 'owner', restaurantId: 7 });
const USER_PLAIN = persona({ id: 55, role: 'USER' });

const setSession = (user: Persona | null) => {
        mockValidateSession.mockResolvedValue(
                user ? { valid: true as const, userId: user.id, user } : GUEST,
        );
};

// ── Fixtures ────────────────────────────────────────────────────────────

const PAYMENT_ROWS = [
        { key: 'balance_transfer_phone_1', value: '0910089975', category: 'payment' },
        { key: 'bank_transfer_bank_name', value: 'بنك الجمهورية', category: 'payment' },
];

const INTERNAL_ROWS = [
        { key: 'platform_fee_percent', value: 5, category: 'general' },
        { key: 'withdrawal_min_lyd', value: 100, category: 'general' },
];

const ALL_ROWS = [...PAYMENT_ROWS, ...INTERNAL_ROWS];

beforeEach(() => {
        vi.clearAllMocks();
        setSession(ADMIN);
        // الافتراضي: القائمة الكاملة (كما يعيدها فرع الأدمن)
        mockConfigFindMany.mockImplementation(async (args: { where: { key?: unknown } }) =>
                args.where.key ? PAYMENT_ROWS : ALL_ROWS,
        );
        mockConfigFindUnique.mockImplementation(async (args: { where: { key: string } }) =>
                ALL_ROWS.find((r) => r.key === args.where.key) ?? null,
        );
});

async function getConfig(query = '') {
        const { GET } = await import('@/app/api/config/route');
        return GET(new NextRequest(`http://localhost/api/config${query}`));
}

// ── السلّم ──────────────────────────────────────────────────────────────

describe('round94 LOW-5 — GET /api/config: بوابة القراءة', () => {
        it('المجهول → 401 (كما كان — الجلسة شرط الدخول)', async () => {
                setSession(null);

                const res = await getConfig();

                expect(res.status).toBe(401);
                expect(mockConfigFindMany).not.toHaveBeenCalled();
        });

        it('admin → 200 بكل الإعدادات غير السرية (يشمل الداخلية) — الاستعلام بلا قيد مفاتيح', async () => {
                const res = await getConfig();

                expect(res.status).toBe(200);
                expect(mockConfigFindMany).toHaveBeenCalledWith({
                        where: { isSecret: false },
                        select: { key: true, value: true, category: true },
                });
                const json = await res.json();
                expect(json.data).toHaveLength(4);
                expect(json.data.map((c: { key: string }) => c.key)).toContain('platform_fee_percent');
        });

        it('super_admin → 200 كامل (أعلى الدرجات)', async () => {
                setSession(SUPER_ADMIN);

                const res = await getConfig();

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data).toHaveLength(4);
        });

        it('sub_admin مع EDIT_SETTINGS → 200 كامل', async () => {
                setSession(SUB_ADMIN_WITH_PERM);

                const res = await getConfig();

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data).toHaveLength(4);
        });

        it('owner → 200 لكن قنوات الدفع فقط — المفاتيح الداخلية مفقودة (LOW-5 مسدود)', async () => {
                setSession(OWNER);

                const res = await getConfig();

                expect(res.status).toBe(200);
                expect(mockConfigFindMany).toHaveBeenCalledWith({
                        where: { isSecret: false, key: { in: expect.arrayContaining([
                                'balance_transfer_phone_1',
                                'balance_transfer_phone_2',
                                'bank_transfer_bank_name',
                                'bank_transfer_account_number',
                                'bank_transfer_iban',
                        ]) } },
                        select: { key: true, value: true, category: true },
                });
                const json = await res.json();
                const keys = json.data.map((c: { key: string }) => c.key);
                expect(keys).toContain('balance_transfer_phone_1');
                expect(keys).not.toContain('platform_fee_percent');
                expect(keys).not.toContain('withdrawal_min_lyd');
        });

        it('USER (التسجيل المجاني) → قنوات الدفع فقط — لا تعداد للداخلية', async () => {
                setSession(USER_PLAIN);

                const res = await getConfig();

                expect(res.status).toBe(200);
                const json = await res.json();
                const keys = json.data.map((c: { key: string }) => c.key);
                expect(keys).toContain('bank_transfer_bank_name');
                expect(keys).not.toContain('platform_fee_percent');
        });

        it('sub_admin بلا EDIT_SETTINGS → قنوات الدفع فقط', async () => {
                setSession(SUB_ADMIN_NO_PERM);

                const res = await getConfig();

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.map((c: { key: string }) => c.key)).not.toContain('withdrawal_min_lyd');
        });
});

// ── المسار بمفتاح واحد ?key= ───────────────────────────────────────────

describe('round94 LOW-5 — GET /api/config?key=: مفتاح واحد بنفس السياسة', () => {
        it('owner ?key=<مفتاح داخلي> → 403 (الأدمن فقط)', async () => {
                setSession(OWNER);

                const res = await getConfig('?key=platform_fee_percent');

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe('لا تملك الصلاحية');
                expect(mockConfigFindUnique).not.toHaveBeenCalled();
        });

        it('owner ?key=balance_transfer_phone_1 → 200 قيمة القناة (تعليمات الدفع سليمة)', async () => {
                setSession(OWNER);

                const res = await getConfig('?key=balance_transfer_phone_1');

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.value).toBe('0910089975');
        });

        it('admin ?key=<داخلي> → 200 كما قبل', async () => {
                const res = await getConfig('?key=withdrawal_min_lyd');

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.value).toBe(100);
        });

        it('مفتاح سري → 404 دائمًا حتى للأدمن (isSecret محفوظ كما كان)', async () => {
                mockConfigFindUnique.mockResolvedValue({ key: 'telegram_bot_token', value: 'xxx', isSecret: true });

                const res = await getConfig('?key=telegram_bot_token');

                expect(res.status).toBe(404);
        });

        it('مفتاح غير موجود → 404', async () => {
                const res = await getConfig('?key=nope');

                expect(res.status).toBe(404);
        });
});
