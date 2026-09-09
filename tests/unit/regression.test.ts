// round92-C1: كان مرآة — الآن يستورد الإنتاج الحقيقي.
// كل قسم كان يختبر نسخة محلية من منطق الإنتاج (checkWebhookGate،
// simulateCancelRace، SimDbLimiter، simulateUserSse،
// simulateGetAdminTelegramIds…) فيمرّ أخضر مهما انكسر الإنتاج. الآن:
//   - بوابة webhook → POST الحقيقي في src/app/api/telegram/webhook/route.ts
//   - سباقات الدفع → resolveSubscriptionPayment الحقيقية
//   - محدد المعدل → createDbRateLimiter الحقيقية فوق جدول prisma مزيّف أمين
//   - ترتيب أحداث SSE/الاستقصاء → GET /api/user/events الحقيقي (البديل الرسمي
//     للبث SSE منذ round84/round87-B6)
//   - معرفات أدمن تيليغرام → getAdminTelegramIds الحقيقية (src/lib/telegram-admin.ts)
//   - حارس نموذج التسجيل → الحدود الخادمية الحقيقية التي يحرسها الحوار
//     (/api/subscriptions/validate + /api/restaurants) — منطق الواجهة مضمن في
//     page.tsx (مكوّن عميل لا يُصيَّر في الوحدة)، فتُختبر البوابة التي يعتمد عليها.
// مسارات الأصول العامة (القسم 6) كانت فعلية أصلًا (existsSync) وبقيت كما هي.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";

// ═════════════════════════════════════════════════════════════════
// Hoisted mocks — نمط المشروع (orders-create / subscription-decisions):
// عزل كامل عبر vi.mock('@/lib/db') + vi.hoisted، لا اتصال DB حقيقي.
// ═════════════════════════════════════════════════════════════════

const mockTelegramApproverFindMany = vi.hoisted(() => vi.fn());
const mockSystemEventFindMany = vi.hoisted(() => vi.fn());
const mockPaymentFindUnique = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockPaymentFindFirst = vi.hoisted(() => vi.fn());
const mockRateLimitUpsert = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
        subscriptionPayment: { update: vi.fn(), updateMany: vi.fn() },
        subscriptionPlan: { findUnique: vi.fn(), findFirst: vi.fn() },
        restaurant: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
        userRestaurant: { create: vi.fn(), count: vi.fn() },
        menuCategory: { createMany: vi.fn() },
        user: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
        systemEvent: { create: vi.fn() },
        $queryRaw: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
        telegramApprover: { findMany: mockTelegramApproverFindMany },
        systemEvent: { findMany: mockSystemEventFindMany },
        subscriptionPayment: { findUnique: mockPaymentFindUnique, findFirst: mockPaymentFindFirst },
        user: { findUnique: mockUserFindUnique, update: vi.fn() },
        restaurant: { findUnique: mockRestaurantFindUnique },
        rateLimitEntry: {
                upsert: mockRateLimitUpsert,
                findUnique: vi.fn(),
                findMany: vi.fn(async () => []),
                deleteMany: vi.fn(async () => ({ count: 0 })),
                create: vi.fn(),
        },
        $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

// مسارات limiters تُبنى عند نطاق الوحدة — نغذّيها محددًا قابلًا للتحكم
const rlState = vi.hoisted(() => ({ allowed: true, calls: 0, keys: [] as string[] }));
vi.mock("@/lib/rate-limit", () => ({
        createDbRateLimiter: () => ({
                check: async (key: string) => {
                        rlState.calls += 1;
                        rlState.keys.push(key);
                        return { success: rlState.allowed, remaining: 0, reset: 0 };
                },
                destroy: () => {},
        }),
}));

vi.mock("@/lib/logger", () => ({
        error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(),
}));
vi.mock("@/lib/telegram", () => ({
        sendTelegramNotification: vi.fn(async () => ({ sent: 0, failed: [] })),
        notifyEvent: vi.fn(async () => ({ sent: 0, failed: [] })),
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/config", () => ({ getDecryptedBotToken: vi.fn(async () => null) }));
vi.mock("@/lib/telegram-api", () => ({
        editMessageReplyMarkup: vi.fn(async () => {}),
        editMessageText: vi.fn(async () => {}),
        answerCallbackQuery: vi.fn(async () => {}),
        sendMessageWithKeyboard: vi.fn(async () => null),
}));

const authState = vi.hoisted(() => ({
        requireAuthResult: {
                authorized: true, userId: 10, role: "owner", restaurantId: 1,
                subscriptionStatus: "active", permissions: [],
        },
        requirePermissionResult: { authorized: false, error: "غير مصرح", status: 401 } as
                | { authorized: false; error: string; status: number }
                | { authorized: true; userId: number; role: string; restaurantId: number | null; subscriptionStatus: string | null; permissions: string[] },
}));
vi.mock("@/lib/auth", () => ({
        requireAuth: vi.fn(async () => authState.requireAuthResult),
        requirePermission: vi.fn(async () => authState.requirePermissionResult),
}));

// PBKDF2 600k ثقيل — المسار ي HashPassword عبر import ديناميكي داخل المعاملة
vi.mock("@/lib/hash", () => ({
        hashPassword: vi.fn(() => "unit-hash"),
        verifyHash: vi.fn(() => false),
        needsRehash: vi.fn(() => false),
        ITERATIONS: 600_000,
}));

// ── استيراد الإنتاج الحقيقي (بعد vi.mock المرفوعة تلقائيًا) ───────────
import { POST as webhookPost } from "@/app/api/telegram/webhook/route";
import { GET as userEventsGet } from "@/app/api/user/events/route";
import { POST as restaurantsPost } from "@/app/api/restaurants/route";
import { POST as validatePost } from "@/app/api/subscriptions/validate/route";
import { getAdminTelegramIds } from "@/lib/telegram-admin";
import { resolveSubscriptionPayment } from "@/lib/subscription-decisions";

// ═════════════════════════════════════════════════════════════════
// Fixtures + helpers
// ═════════════════════════════════════════════════════════════════

/** دفعة الدفع المعيارية (نفس شكل include user في loadPayment). */
const PAYMENT = {
        id: 50, userId: 42, phone: "0912345678", amount: 99, provider: "bank",
        planId: 2, planName: "الخطة المدفوعة", status: "pending",
        metadata: null as Record<string, unknown> | null,
        user: { id: 42, telegramChatId: null as string | null },
};

/** جدول SystemEvent أمين (مخزّن مبعثرًا — الترتيب يجب أن يأتي من استعلام المسار). */
type EventRow = { id: number; eventType: string; message: string; severity: string; metadata: { userId: number } | null };
const EVENTS_TABLE: EventRow[] = [
        { id: 2, eventType: "payment", message: "payment 2", severity: "info", metadata: { userId: 20 } },
        { id: 5, eventType: "subscription_approved", message: "approved 2", severity: "info", metadata: { userId: 10 } },
        { id: 1, eventType: "payment", message: "payment 1", severity: "info", metadata: { userId: 10 } },
        { id: 4, eventType: "subscription_rejected", message: "rejected", severity: "warning", metadata: { userId: 30 } },
        { id: 3, eventType: "subscription_approved", message: "approved 1", severity: "info", metadata: { userId: 10 } },
];

type EventsQuery = {
        where?: { id?: { gt?: number }; metadata?: { path?: string[]; equals?: number } };
        orderBy?: { id?: "asc" | "desc" };
        take?: number;
};

/** جدول RateLimitEntry أمين — upsert بزيادة العدد كما يفعل Prisma. */
type UpsertArgs = {
        where: { key_windowEnd: { key: string; windowEnd: Date } };
        create: { key: string; windowEnd: Date; count: number };
        update: { count: { increment: number } };
};
const rlTable = new Map<string, number>();
const ORIGINAL_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const ORIGINAL_ALLOW_UNVERIFIED = process.env.TELEGRAM_ALLOW_UNVERIFIED;
const ORIGINAL_ADMIN_IDS = process.env.TELEGRAM_ADMIN_IDS;

function makeWebhookRequest(secretHeader: string | null): NextRequest {
        const headers: Record<string, string> = {};
        if (secretHeader !== null) headers["x-telegram-bot-api-secret-token"] = secretHeader;
        return new NextRequest("http://localhost/api/telegram/webhook", {
                method: "POST",
                headers: { "Content-Type": "text/plain", ...headers },
                body: "probe",
        });
}

function makePostRequest(path: string, body: unknown): NextRequest {
        return new NextRequest(`http://localhost${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
        });
}

function makeEventsRequest(query = ""): NextRequest {
        return new NextRequest(`http://localhost/api/user/events${query}`);
}

beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.TELEGRAM_WEBHOOK_SECRET;
        delete process.env.TELEGRAM_ALLOW_UNVERIFIED;
        delete process.env.TELEGRAM_ADMIN_IDS;

        rlState.allowed = true;
        rlState.calls = 0;
        rlState.keys = [];

        authState.requireAuthResult = {
                authorized: true, userId: 10, role: "owner", restaurantId: 1,
                subscriptionStatus: "active", permissions: [],
        };
        authState.requirePermissionResult = { authorized: false, error: "غير مصرح", status: 401 };

        // جدول الأحداث الأمين: يطبّق where/orderBy/take كما يستعلمها المسار فقط
        mockSystemEventFindMany.mockImplementation(async (q: EventsQuery) => {
                let rows = [...EVENTS_TABLE];
                if (q.where?.id?.gt !== undefined) rows = rows.filter((r) => r.id > q.where!.id!.gt!);
                if (q.where?.metadata?.equals !== undefined)
                        rows = rows.filter((r) => r.metadata?.userId === q.where!.metadata!.equals);
                if (q.orderBy?.id === "asc") rows.sort((a, b) => a.id - b.id);
                else if (q.orderBy?.id === "desc") rows.sort((a, b) => b.id - a.id);
                return rows.slice(0, q.take ?? Number.POSITIVE_INFINITY);
        });

        // جدول RateLimitEntry الأمين
        rlTable.clear();
        mockRateLimitUpsert.mockImplementation(async (args: UpsertArgs) => {
                const k = `${args.create.key}@${args.create.windowEnd.getTime()}`;
                if (rlTable.has(k)) rlTable.set(k, rlTable.get(k)! + (args.update?.count?.increment ?? 1));
                else rlTable.set(k, args.create.count);
                return { count: rlTable.get(k)! };
        });

        // tx افتراضي ناجح (كلا مساري subscription-decisions وrestaurants)
        mockPrisma.$transaction.mockImplementation(
                async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock),
        );
        txMock.subscriptionPayment.update.mockResolvedValue({ id: 50, status: "verified" });
        txMock.subscriptionPayment.updateMany.mockResolvedValue({ count: 1 });
        txMock.restaurant.findUnique.mockResolvedValue(null);
        txMock.restaurant.create.mockResolvedValue({ id: 91, name: "مطعم 0912345678", slug: "restaurant-50" });
        txMock.subscriptionPlan.findUnique.mockResolvedValue({ maxMenus: 5, maxItems: 50, maxOrders: 500 });
        txMock.subscriptionPlan.findFirst.mockResolvedValue({ maxItems: 10, maxOrders: 100 });
        txMock.userRestaurant.count.mockResolvedValue(0);
        txMock.user.update.mockResolvedValue({ id: 42, username: "u", role: "owner", subscriptionStatus: "PAID", restaurantId: 91 });
        txMock.user.updateMany.mockResolvedValue({ count: 1 });
        txMock.user.create.mockResolvedValue({ id: 43, username: "owner1" });
        txMock.user.findUniqueOrThrow.mockResolvedValue({ id: 43 });
        txMock.systemEvent.create.mockResolvedValue({});
        txMock.menuCategory.createMany.mockResolvedValue({ count: 4 });
        txMock.userRestaurant.create.mockResolvedValue({});
        txMock.$queryRaw.mockResolvedValue([]);

        mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT });
        mockUserFindUnique.mockResolvedValue(null);
        mockRestaurantFindUnique.mockResolvedValue(null);
        mockPaymentFindFirst.mockResolvedValue(null);
        mockTelegramApproverFindMany.mockResolvedValue([]);
});

afterEach(() => {
        if (ORIGINAL_WEBHOOK_SECRET === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
        else process.env.TELEGRAM_WEBHOOK_SECRET = ORIGINAL_WEBHOOK_SECRET;
        if (ORIGINAL_ALLOW_UNVERIFIED === undefined) delete process.env.TELEGRAM_ALLOW_UNVERIFIED;
        else process.env.TELEGRAM_ALLOW_UNVERIFIED = ORIGINAL_ALLOW_UNVERIFIED;
        if (ORIGINAL_ADMIN_IDS === undefined) delete process.env.TELEGRAM_ADMIN_IDS;
        else process.env.TELEGRAM_ADMIN_IDS = ORIGINAL_ADMIN_IDS;
});

// ═════════════════════════════════════════════════════════════════
// 1. Telegram webhook secret check — البوابة الحقيقية في POST
//    src/app/api/telegram/webhook/route.ts (round81: fail-closed 403).
//    ملاحظة تحويل: المرآة كانت تحاكي متغير TELEGRAM_ALLOW_UNVERIFIED —
//    لا وجود له في الإنتاج (0 مراجع في src)، فحوِّل اختبارا «allowUnverified»
//    إلى السلوك الفعلي: لا التفاف إطلاقًا عند غياب السر (fail-closed).
// ═════════════════════════════════════════════════════════════════

describe("Telegram webhook secret check (real POST gate)", () => {
  it(".trim() handles trailing whitespace in env var", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "  my-secret  ";
    const res = await webhookPost(makeWebhookRequest("my-secret"));
    expect(res.status).toBe(200); // عبر البوابة → إشعار غير-JSON بـ200
  });

  it("exact match without whitespace still works", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "my-secret";
    const res = await webhookPost(makeWebhookRequest("my-secret"));
    expect(res.status).toBe(200);
  });

  it("missing incoming header -> forbidden even without allowUnverified", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "my-secret";
    const res = await webhookPost(makeWebhookRequest(null));
    expect(res.status).toBe(403);
  });

  it("no secret, no allowUnverified -> fail-closed forbidden (403)", async () => {
    const res = await webhookPost(makeWebhookRequest(null));
    expect(res.status).toBe(403);
  });

  it("no secret set -> garbage header still 403 (production has NO allowUnverified bypass — 0 refs; converted from the mirror's bypass case)", async () => {
    process.env.TELEGRAM_ALLOW_UNVERIFIED = "true"; // الإنتاج يتجاهله تمامًا
    const res = await webhookPost(makeWebhookRequest("garbage"));
    expect(res.status).toBe(403);
  });

  it("bypass env var does NOT matter when secret IS set (wrong header -> 403)", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "real-secret";
    process.env.TELEGRAM_ALLOW_UNVERIFIED = "true";
    const res = await webhookPost(makeWebhookRequest("wrong"));
    expect(res.status).toBe(403);
  });

  it("empty string env var treated as unset -> fail-closed forbidden", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "";
    const res = await webhookPost(makeWebhookRequest(null));
    expect(res.status).toBe(403);
  });

  it("empty bypass env treated as nothing -> fail-closed forbidden", async () => {
    process.env.TELEGRAM_ALLOW_UNVERIFIED = "";
    const res = await webhookPost(makeWebhookRequest(null));
    expect(res.status).toBe(403);
    // ترتيب البوابة (round81): التحقق قبل المحدد — مفتاح سيئ لا يحرق ميزانية
    expect(rlState.calls).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// 2. Subscription payment race — resolveSubscriptionPayment الحقيقية
//    (src/lib/subscription-decisions.ts): السباق يُحسم بإعادة قراءة الحالة +
//    where { id, status: "pending" } على التحديثات.
// ═════════════════════════════════════════════════════════════════

describe("Subscription payment race condition (real resolveSubscriptionPayment)", () => {
  it("normal cancel succeeds when pending", async () => {
    const r = await resolveSubscriptionPayment(50, "cancelled");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.action).toBe("cancelled");
    expect(txMock.subscriptionPayment.updateMany).toHaveBeenCalledWith({
      where: { id: 50, status: "pending" },
      data: { status: "cancelled" },
    });
  });

  it("concurrent verify wins -> cancel is no-op (re-read sees verified, no mutation)", async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, status: "verified" });
    const r = await resolveSubscriptionPayment(50, "cancelled");
    expect(r.ok).toBe(false); // الدفع بقي مدفوعًا — المستخدم لم يُسحب منه شيء
    if (!r.ok) expect(r.reason).toBe("تمت معالجة هذا الطلب مسبقاً");
    expect(txMock.subscriptionPayment.updateMany).not.toHaveBeenCalled();
  });

  it("already cancelled -> no-op", async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, status: "cancelled" });
    const r = await resolveSubscriptionPayment(50, "cancelled");
    expect(r.ok).toBe(false);
    expect(txMock.subscriptionPayment.updateMany).not.toHaveBeenCalled();
  });

  it("first verify succeeds when status=pending", async () => {
    const r = await resolveSubscriptionPayment(50, "verified");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.action).toBe("verified");
      expect(r.paymentId).toBe(50);
    }
    expect(txMock.subscriptionPayment.update).toHaveBeenCalledWith({
      where: { id: 50, status: "pending" },
      data: { status: "verified" },
    });
  });

  it("second verify sees non-pending -> already_processed", async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, status: "verified" });
    const r = await resolveSubscriptionPayment(50, "verified");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("تمت معالجة هذا الطلب مسبقاً");
    expect(txMock.subscriptionPayment.update).not.toHaveBeenCalled();
  });

  it("status check catches already_verified before update", async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, status: "verified" });
    const r = await resolveSubscriptionPayment(50, "cancelled");
    expect(r.ok).toBe(false);
    expect(txMock.subscriptionPayment.update).not.toHaveBeenCalled();
    expect(txMock.subscriptionPayment.updateMany).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════
// 3. Rate limiter — createDbRateLimiter الحقيقية (src/lib/rate-limit.ts)
//    فوق جدول prisma مزيّف أمين (upsert بزيادة العدد). الحالة تسكن
//    الجدول لا نسخة الذاكرة — هذا هو إصلاح THE BUG الأصلي.
// ═════════════════════════════════════════════════════════════════

describe("Rate limiter (in-memory vs DB-backed — real createDbRateLimiter)", () => {
  it("in-memory separate instances don't share state — a FRESH instance inherits the DB-table count (THE BUG stays fixed)", async () => {
    const { createDbRateLimiter } = await vi.importActual<
      typeof import("@/lib/rate-limit")
    >("@/lib/rate-limit");
    const limiter1 = createDbRateLimiter({ windowMs: 60_000, max: 3 });

    expect((await limiter1.check("key-x")).success).toBe(true);
    expect((await limiter1.check("key-x")).success).toBe(true);
    expect((await limiter1.check("key-x")).success).toBe(true);
    expect((await limiter1.check("key-x")).success).toBe(false);
    // النسخة الثانية الطازجة كانت تتجاوز الحد قبل الإصلاح (ذاكرة منفصلة) —
    // العدّ يسكن الجدول المشترك فتبقى محجوبة
    const limiter2 = createDbRateLimiter({ windowMs: 60_000, max: 3 });
    expect((await limiter2.check("key-x")).success).toBe(false);
    limiter1.destroy();
    limiter2.destroy();
  });

  it("DB-backed instances share state -> limit enforced across both", async () => {
    const { createDbRateLimiter } = await vi.importActual<
      typeof import("@/lib/rate-limit")
    >("@/lib/rate-limit");
    const dbLim1 = createDbRateLimiter({ windowMs: 60_000, max: 3 });
    const dbLim2 = createDbRateLimiter({ windowMs: 60_000, max: 3 });

    expect((await dbLim1.check("key-y")).success).toBe(true);
    expect((await dbLim1.check("key-y")).success).toBe(true);
    expect((await dbLim2.check("key-y")).success).toBe(true); // مشترك
    expect((await dbLim2.check("key-y")).success).toBe(false); // محجوب
    dbLim1.destroy();
    dbLim2.destroy();
  });
});

// ═════════════════════════════════════════════════════════════════
// 4. SSE event ordering — GET /api/user/events الحقيقي (البديل الرسمي
//    لبث SSE: where id>sinceId + فلترة userId خادميًا + orderBy asc).
//    الجدول الأمين يطبّق ما يستعلمه المسار حرفيًا — لو سقط الفلتر أو
//    الترتيب من الاستعلام لانكسر الاختبار.
// ═════════════════════════════════════════════════════════════════

describe("SSE event ordering (real GET /api/user/events)", () => {
  it("user 10 sees 3 of 5 events (filtered)", async () => {
    const res = await userEventsGet(makeEventsRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(3);
    expect(json.data.map((e: { id: number }) => e.id)).toEqual([1, 3, 5]);
  });

  it("last-event-id resumption", async () => {
    const res = await userEventsGet(makeEventsRequest("?sinceId=3"));
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe(5);
  });

  it("shuffled input produces correct order (orderBy asc comes from the route's query)", async () => {
    const res = await userEventsGet(makeEventsRequest());
    const json = await res.json();
    expect(json.data).toHaveLength(3);
    expect(json.data[0].id).toBe(1);
    expect(json.data[1].id).toBe(3);
    expect(json.data[2].id).toBe(5);
  });

  it("user 30 sees 1 event (rejected)", async () => {
    authState.requireAuthResult = {
      authorized: true, userId: 30, role: "owner", restaurantId: 1,
      subscriptionStatus: "active", permissions: [],
    };
    const res = await userEventsGet(makeEventsRequest());
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe(4);
  });

  it("unknown user sees 0 events", async () => {
    authState.requireAuthResult = {
      authorized: true, userId: 99, role: "owner", restaurantId: 1,
      subscriptionStatus: "active", permissions: [],
    };
    const res = await userEventsGet(makeEventsRequest());
    const json = await res.json();
    expect(json.data).toHaveLength(0);
  });

  it("last-event-id past latest -> empty", async () => {
    const res = await userEventsGet(makeEventsRequest("?sinceId=999"));
    const json = await res.json();
    expect(json.data).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// 5. Admin permission checks — getAdminTelegramIds الحقيقية
//    (src/lib/telegram-admin.ts) بـprisma مزيّف + متغير بيئة حقيقي.
// ═════════════════════════════════════════════════════════════════

describe("Admin permission checks (real getAdminTelegramIds)", () => {
  it("BigInt DB IDs converted to Number", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "100,200";
    mockTelegramApproverFindMany.mockResolvedValue([{ telegramId: 300n }]);
    expect(await getAdminTelegramIds()).toEqual([100, 200, 300]);
  });

  it("env + DB combined + dedup", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "100,200";
    mockTelegramApproverFindMany.mockResolvedValue([{ telegramId: 200n }, { telegramId: 300n }]);
    expect(await getAdminTelegramIds()).toEqual([100, 200, 300]);
  });

  it("NaN env values filtered", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "100,abc,200";
    mockTelegramApproverFindMany.mockResolvedValue([]);
    expect(await getAdminTelegramIds()).toEqual([100, 200]);
  });

  it("zero/neg filtered from env and DB", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "100,0,-5";
    mockTelegramApproverFindMany.mockResolvedValue([{ telegramId: 0n }, { telegramId: -10n }, { telegramId: 200n }]);
    expect(await getAdminTelegramIds()).toEqual([100, 200]);
  });

  it("empty env -> only DB IDs", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "";
    mockTelegramApproverFindMany.mockResolvedValue([{ telegramId: 300n }, { telegramId: 400n }]);
    expect(await getAdminTelegramIds()).toEqual([300, 400]);
  });

  it("both empty -> empty array", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "";
    mockTelegramApproverFindMany.mockResolvedValue([]);
    expect(await getAdminTelegramIds()).toEqual([]);
  });

  it("whitespace in env var parsed", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "  100 , 200 ";
    mockTelegramApproverFindMany.mockResolvedValue([]);
    expect(await getAdminTelegramIds()).toEqual([100, 200]);
  });
});

// ═════════════════════════════════════════════════════════════════
// 6. Brand icon / asset path resolution (كانت فعلية — remained as-is)
// ═════════════════════════════════════════════════════════════════

describe("Brand icon/asset paths", () => {
  const publicDir = join(process.cwd(), "public");
  const assets = ["brand-icon.png", "favicon.png", "icon-192.png", "icon-512.png"];

  assets.forEach((asset) => {
    it(`public/${asset} exists`, () => {
      expect(existsSync(join(publicDir, asset))).toBe(true);
    });
  });

  it("brand-icon.png is readable", () => {
    expect(existsSync(join(publicDir, "brand-icon.png"))).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════
// 7. Telegram admin ID — env + DB merging (getAdminTelegramIds الحقيقية)
// ═════════════════════════════════════════════════════════════════

describe("Telegram admin ID config (real getAdminTelegramIds)", () => {
  it("env-only admin IDs", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "1111,2222";
    mockTelegramApproverFindMany.mockResolvedValue([]);
    const merged = await getAdminTelegramIds();
    expect(merged).toEqual([1111, 2222]);
    expect(merged).toHaveLength(2);
  });

  it("DB-only admin IDs", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "";
    mockTelegramApproverFindMany.mockResolvedValue([{ telegramId: 3333n }, { telegramId: 4444n }]);
    const merged = await getAdminTelegramIds();
    expect(merged).toEqual([3333, 4444]);
    expect(merged).toHaveLength(2);
  });

  it("both sources, no overlap", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "1111";
    mockTelegramApproverFindMany.mockResolvedValue([{ telegramId: 2222n }]);
    const merged = await getAdminTelegramIds();
    expect(merged).toHaveLength(2);
    expect(merged).toContain(1111);
    expect(merged).toContain(2222);
  });

  it("overlap deduplicated", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "1111,3333";
    mockTelegramApproverFindMany.mockResolvedValue([{ telegramId: 2222n }, { telegramId: 3333n }]);
    expect(await getAdminTelegramIds()).toEqual([1111, 3333, 2222]);
  });

  it("BigInt admin ID converted to positive Number", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "";
    mockTelegramApproverFindMany.mockResolvedValue([{ telegramId: 8949246746n }]);
    const merged = await getAdminTelegramIds();
    expect(merged[0]).toBe(8949246746);
    expect(merged[0]).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// 8. Upgrade flow registration guard — الحدود الخادمية الحقيقية.
//    المرآة كانت تحاكي مسندات الواجهة (shouldShowRegistrationForm /
//    canSubmitUpgrade) المضمّنة في subscribe/page.tsx (مكوّن عميل لا
//    يُصيَّر في بيئة الوحدة). التحويل: اختبار البوابات الخادمية التي
//    يعتمد عليها الحوار فعليًا عند الإرسال — /api/subscriptions/validate
//    (التحقق المسبق) و/api/restaurants (سياسة كلمة المرور + حراسة
//    round-76/round-77 للتسجيل الذاتي).
// ═════════════════════════════════════════════════════════════════

describe("Upgrade flow registration guard (real server-side boundaries)", () => {
  it("auth not loaded/unauthenticated -> admin path without credentials is rejected 401", async () => {
    authState.requirePermissionResult = { authorized: false, error: "غير مصرح", status: 401 };
    // r97-X4: slug "m" was fine under the old inline min(1) policy but round97-X3
    // moved /api/restaurants to the shared slugField (min 3) — createSchema.parse
    // runs BEFORE the permission gate, so the short slug 422'd before this test
    // could reach the 401 path it exists to assert. "abc" is valid under BOTH
    // policies; the auth-gate contract is what's under test here.
    const res = await restaurantsPost(makePostRequest("/api/restaurants", { name: "م", slug: "abc" }));
    expect(res.status).toBe(401);
  });

  it("auth loaded, not upgrade -> pre-flight validation passes (form can submit)", async () => {
    const res = await validatePost(makePostRequest("/api/subscriptions/validate", { username: "freshuser", slug: "fresh-slug" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.valid).toBe(true);
  });

  it("upgrade mode -> public registration cannot mass-assign a paid plan (round-76 guard)", async () => {
    const res = await restaurantsPost(makePostRequest("/api/restaurants", {
      name: "مطعم", slug: "owner-slug", username: "owner1", password: "longpass123", planId: 3,
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("لا يمكن تحديد الخطة");
  });

  it("invalid slug (below min 3) -> pre-flight rejects (form cannot advance)", async () => {
    const res = await validatePost(makePostRequest("/api/subscriptions/validate", { username: "u2", slug: "ab" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.valid).toBe(false);
  });

  it("invalid form (password below PASSWORD_MIN_LENGTH) -> cannot submit", async () => {
    const res = await restaurantsPost(makePostRequest("/api/restaurants", {
      name: "مطعم", slug: "owner-slug2", username: "owner2", password: "short",
    }));
    expect(res.status).toBe(422); // zod → validationError
    const json = await res.json();
    expect(json.error).toBe("بيانات غير صالحة");
    expect(txMock.user.create).not.toHaveBeenCalled();
  });

  it("upgrade mode -> submit blocked even with valid form (username taken blocks the pre-flight)", async () => {
    mockUserFindUnique.mockResolvedValue({ id: 5, username: "taken" });
    const res = await validatePost(makePostRequest("/api/subscriptions/validate", { username: "taken", slug: "ok-slug" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.valid).toBe(false);
    expect(json.data.errors.username).toContain("مستخدم");
  });

  it("new user, valid form, plan selected -> can submit (201)", async () => {
    const res = await restaurantsPost(makePostRequest("/api/restaurants", {
      name: "مطعم جديد", slug: "new-slug", username: "owner3", password: "newpass123",
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(txMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ username: "owner3", password: "unit-hash", role: "owner" }),
    }));
  });

  it("no plan/menu selected -> cannot submit (refine: at least one menu)", async () => {
    const res = await restaurantsPost(makePostRequest("/api/restaurants", {
      username: "owner4", password: "newpass123",
    }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe("بيانات غير صالحة");
    expect(JSON.stringify(json.details)).toContain("منيو واحد على الأقل");
  });

  it("public registration is limited to a single menu (round-77 maxMenus bypass guard)", async () => {
    const res = await restaurantsPost(makePostRequest("/api/restaurants", {
      restaurants: [
        { name: "أ", slug: "r-one" },
        { name: "ب", slug: "r-two" },
      ],
      username: "owner5", password: "newpass123",
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("منيو واحد فقط");
  });
});
