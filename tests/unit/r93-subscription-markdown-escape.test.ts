/**
 * r93-W1a (M2 / MED-2 — تقرير التفتيش round93-inspection-b، صنف r86-A5) —
 * ترميز Markdown في رسائل قرارات الاشتراك.
 *
 * الخلل: subscription-decisions.ts كان يركّب قيمًا يتحكم بها المستخدم خامًا
 * في رسائل parse_mode=Markdown (عبر sendTelegramNotification و
 * notifyUserViaTelegram):
 *   - اسم المطعم المؤقت (tempRestaurants من metadata الدفع — يكتبه زبون
 *     الدفع عبر payment-schema)
 *   - username (من التسجيل — stripTags في register يزيل <…> لكن يُبقي
 *     «[نص](رابط)» سليمًا)
 * اسم مثل «[رابط](https://evil.example)» كان يُصيَّر رابطًا قابلًا للنقر في
 * قناة موافقة الأدمن وفي البث العام للمستخدمين المرتبطين.
 *
 * الإصلاح المُختبر هنا: escMarkdown() (نفس esc في notifyEvent — r86-A5)
 * تُطبَّق على كل قيمة نصية قبل التركيب، مع بقاء parse_mode=Markdown كما
 * هو، ومرور القيم المشروعة (بلا محارف خاصة) حرفيًا كما قبل — فلا تنكسر
 * أي رسالة قائمة.
 *
 * النمط: tx-mock (نفس subscription-decisions.test.ts) + منكَّر على دالة
 * الإرسال sendTelegramNotification + fetch منكَّر عالميًا لرسالة المستخدم
 * المرتبط (notifyUserViaTelegram تستدعي fetch مباشرة).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const txMock = {
  subscriptionPayment: { update: vi.fn(), updateMany: vi.fn() },
  subscriptionPlan: { findUnique: vi.fn() },
  restaurant: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  userRestaurant: { create: vi.fn(), count: vi.fn() },
  menuCategory: { createMany: vi.fn() },
  user: { update: vi.fn(), updateMany: vi.fn() },
  systemEvent: { create: vi.fn() },
  $queryRaw: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  prisma: {
    subscriptionPayment: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
  },
}));

// المنكَّر على دالة الإرسال (mock على دالة الإرسال — يلتقط النص المُمرَّر)
const mockSendTelegram = vi.hoisted(() => vi.fn().mockResolvedValue({ sent: 1, failed: [] }));
vi.mock('@/lib/telegram', () => ({
  sendTelegramNotification: mockSendTelegram,
  notifyEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/logger', () => ({ error: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
// توكن موجود حتى تُرسل notifyUserViaTelegram فعلًا (عبر fetch المنكَّر)
vi.mock('@/lib/config', () => ({ getDecryptedBotToken: vi.fn().mockResolvedValue('111:ABC') }));

import { prisma } from '@/lib/db';
import { resolveSubscriptionPayment } from '@/lib/subscription-decisions';

// ── أدوات مساعدة ───────────────────────────────────────────────────────

const fetchMock = vi.hoisted(() => vi.fn());

/** الحمولة الحقنة: رابط ماكر + محارف Markdown ( _ * [ ) معًا. */
const EVIL_NAME = 'مطعم [رابط](https://evil.example) _ت_ *ج [تجريبي';
const EVIL_ESCAPED = 'مطعم \\[رابط\\]\\(https://evil.example\\) \\_ت\\_ \\*ج \\[تجريبي';
const EVIL_USERNAME = 'user_*[hack](https://phish.example)';
const EVIL_USERNAME_ESCAPED = 'user\\_\\*\\[hack\\]\\(https://phish.example\\)';

function sentTexts(): string[] {
  return mockSendTelegram.mock.calls.map((c) => String(c[0]));
}

/** أجسام رسائل المستخدم المرتبط (notifyUserViaTelegram → fetch مباشر). */
function userBodies(): Array<Record<string, unknown>> {
  return (fetchMock.mock.calls as unknown as [string, RequestInit][]).map(([, init]) =>
    JSON.parse(String(init.body)),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
  (prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)
  );
  // clearAllMocks يُبقي implementations — إعادة تسليح الدفعة الافتراضية
  // كل اختبار (نمط subscription-decisions.test.ts) حتى لا يتسرب override
  // اختبار سابق إلى الذي يليه.
  mockPayment();
  // مسار المستخدم الجديد: defaults سعيدة (نمط subscription-decisions.test.ts)
  txMock.restaurant.findUnique.mockResolvedValue(null);
  txMock.subscriptionPlan.findUnique.mockResolvedValue({ id: 2, nameAr: 'الاحترافية', maxMenus: 3, maxItems: 100, maxOrders: 500 });
  txMock.userRestaurant.count.mockResolvedValue(0);
  txMock.$queryRaw.mockResolvedValue([]);
  txMock.subscriptionPayment.update.mockResolvedValue({});
  txMock.restaurant.create.mockImplementation(
    async (args: { data: { name: string; slug: string } }) => ({ id: 301, name: args.data.name, slug: args.data.slug })
  );
  txMock.restaurant.update.mockResolvedValue({ id: 88, name: 'مطعم الرائد', slug: 'raed' });
  txMock.userRestaurant.create.mockResolvedValue({});
  txMock.menuCategory.createMany.mockResolvedValue({ count: 4 });
  txMock.user.update.mockResolvedValue({
    id: 42, username: 'owner1', role: 'owner', subscriptionStatus: 'PAID', restaurantId: 301,
  });
  txMock.systemEvent.create.mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** دفعة pending قياسية (مع chatId للمستخدم حتى تُرسل رسالة المستخدم). */
function mockPayment(overrides: Record<string, unknown> = {}) {
  (prisma.subscriptionPayment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: 50,
    userId: 42,
    phone: '0912345678',
    amount: 99,
    provider: 'bank',
    planId: 2,
    planName: 'الخطة المدفوعة',
    status: 'pending' as const,
    metadata: null as Record<string, unknown> | null,
    createdAt: new Date(),
    user: { id: 42, telegramChatId: '555' },
    ...overrides,
  });
}

// ── المسار 1: مستخدم جديد (verified) — قناة الموافقة + بث المستخدم ───────

describe('r93-W1a — مسار «مستخدم جديد»: ترميز Markdown في رسائل الموافقة', () => {
  it('اسم مطعم مؤقت حقين → يصل مرمّزًا إلى sendTelegramMessage ولا يبقى تركيب الرابط خامًا', async () => {
    mockPayment({ metadata: { tempRestaurants: [{ name: EVIL_NAME, slug: 'rest-1' }] } });

    await resolveSubscriptionPayment(50, 'verified');

    expect(mockSendTelegram).toHaveBeenCalledTimes(1);
    const text = sentTexts()[0];
    // الرابط الماكر مكسور: القوسان المربعان والدائريون مرمّزون — لا يوجد
    // تركيب «[نص](رابط)» قابل للتصيير كرابط
    expect(text).toContain(EVIL_ESCAPED);
    expect(text).not.toContain('[رابط](https://evil.example)');
    expect(text).not.toContain('(https://evil.example)');
    // الأحرف الخاصة الأخرى مرمّزة أيضًا
    expect(text).toContain('\\_ت\\_');
    expect(text).toContain('\\*ج');
    expect(text).toContain('\\[تجريبي');
  });

  it('username حقين → يصل مرمّزًا في سطر «المستخدم»', async () => {
    mockPayment({ metadata: { tempRestaurants: [{ name: 'مطعم سليم', slug: 'rest-1' }] } });
    txMock.user.update.mockResolvedValue({
      id: 42, username: EVIL_USERNAME, role: 'owner', subscriptionStatus: 'PAID', restaurantId: 301,
    });

    await resolveSubscriptionPayment(50, 'verified');

    const text = sentTexts()[0];
    expect(text).toContain(`• المستخدم: ${EVIL_USERNAME_ESCAPED}`);
    expect(text).not.toContain(EVIL_USERNAME);
  });

  it('parse_mode بقيت Markdown كما هي (الترميز لا يغيّر وضع التصيير)', async () => {
    mockPayment({ metadata: { tempRestaurants: [{ name: 'مطعم سليم', slug: 'rest-1' }] } });

    await resolveSubscriptionPayment(50, 'verified');

    expect(mockSendTelegram.mock.calls[0][1]).toEqual({ parseMode: 'Markdown' });
  });

  it('قيم مشروعة بلا محارف خاصة → تمر حرفيًا كما قبل (لا تنكسر الرسائل القائمة)', async () => {
    mockPayment({ metadata: { tempRestaurants: [{ name: 'مطعم النخيل', slug: 'alnakheel' }] } });

    await resolveSubscriptionPayment(50, 'verified');

    const text = sentTexts()[0];
    expect(text).toContain('• مطعم النخيل → /menu/alnakheel');
    expect(text).toContain('• الخطة: الخطة المدفوعة');
    // لا شرطات خلفية أُقحمت على قيمة سليمة
    expect(text).not.toContain('\\م');
    expect(text).not.toContain('\\\\');
  });

  it('رسالة المستخدم المرتبط (notifyUserViaTelegram عبر fetch) تحمل قائمة المنيوهات المرمّزة', async () => {
    mockPayment({ metadata: { tempRestaurants: [{ name: EVIL_NAME, slug: 'rest-1' }] } });

    await resolveSubscriptionPayment(50, 'verified');
    // fire-and-forget: ننتظر اكتمال الميكروتاسك حتى يُستدعى fetch
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const body = userBodies()[0];
    expect(body.chat_id).toBe('555');
    expect(body.parse_mode).toBe('Markdown');
    expect(String(body.text)).toContain(EVIL_ESCAPED);
    expect(String(body.text)).not.toContain('[رابط](https://evil.example)');
  });

  it('حمولة حقن في slug المنيو → تُرمّز أيضًا (لا يُركّب رابط ماكر بعد /menu/)', async () => {
    mockPayment({ metadata: { tempRestaurants: [{ name: 'مطعم سليم', slug: 'x](https://evil.example)' }] } });

    await resolveSubscriptionPayment(50, 'verified');

    const text = sentTexts()[0];
    expect(text).toContain('/menu/x\\]\\(https://evil.example\\)');
    expect(text).not.toContain('/menu/x](https://evil.example)');
  });
});

// ── المسار 2: ترقية (upgrade) ──────────────────────────────────────────

describe('r93-W1a — مسار «الترقية»: اسم المطعم واسم الخطة مرمّزان', () => {
  it('اسم مطعم الترقية (يضعه المالك) + اسم الخطة → يصلان مرمّزين إلى قناة الموافقة', async () => {
    mockPayment({ metadata: { upgradeRestaurantId: 88 } });
    txMock.restaurant.update.mockResolvedValue({ id: 88, name: EVIL_NAME, slug: 'raed' });
    txMock.subscriptionPlan.findUnique.mockResolvedValue({ id: 2, nameAr: 'خطة_[غريبة](u)', maxItems: 100, maxOrders: 500 });

    await resolveSubscriptionPayment(50, 'verified');

    expect(mockSendTelegram).toHaveBeenCalledTimes(1);
    const text = sentTexts()[0];
    expect(text).toContain(`• المطعم: ${EVIL_ESCAPED}`);
    expect(text).toContain('• الخطة: خطة\\_\\[غريبة\\]\\(u\\)');
    expect(text).not.toContain('[رابط](https://evil.example)');
    // المبلغ رقم — يظهر كما هو دون ترميز
    expect(text).toContain('• المبلغ: 99 د.ل');
  });

  it('اسم ترقية سليم → يمر حرفيًا (الرسالة القائمة لا تنكسر)', async () => {
    mockPayment({ metadata: { upgradeRestaurantId: 88 } });

    await resolveSubscriptionPayment(50, 'verified');

    const text = sentTexts()[0];
    expect(text).toContain('• المطعم: مطعم الرائد');
    expect(text).toContain('• الخطة: الاحترافية');
  });
});

// ── المسار 3: رفض (cancelled) ──────────────────────────────────────────

describe('r93-W1a — مسار «الرفض»: الهاتف والخطة مرمّزان', () => {
  it('هاتف/خطة يحملان محارف Markdown → يصلان مرمّزين', async () => {
    mockPayment({ phone: '0912_34*[56]', planName: 'خطة_[غريبة](u)' });
    txMock.subscriptionPayment.updateMany.mockResolvedValue({ count: 1 });
    txMock.user.updateMany.mockResolvedValue({ count: 1 });

    await resolveSubscriptionPayment(50, 'cancelled');

    expect(mockSendTelegram).toHaveBeenCalledTimes(1);
    const text = sentTexts()[0];
    expect(text).toContain('• الهاتف: 0912\\_34\\*\\[56\\]');
    expect(text).toContain('• الخطة: خطة\\_\\[غريبة\\]\\(u\\)');
    expect(text).toContain('• المبلغ: 99 د.ل');
  });

  it('رفض بهاتف/خطة سليمين → الرسالة كما كانت تمامًا', async () => {
    txMock.subscriptionPayment.updateMany.mockResolvedValue({ count: 1 });
    txMock.user.updateMany.mockResolvedValue({ count: 1 });

    await resolveSubscriptionPayment(50, 'cancelled');

    const text = sentTexts()[0];
    expect(text).toBe(
      '❌ *تم رفض طلب الدفع*\n• الهاتف: 0912345678\n• المبلغ: 99 د.ل\n• الخطة: الخطة المدفوعة',
    );
  });
});
