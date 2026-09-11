// round92-C1: كان مرآة — الآن يستورد الإنتاج الحقيقي.
// كل قسم كان يختبر نسخًا محلية (verifyWebhookGate، simulateCrossRace،
// SimMemLimiter/SimDbLimiter، simulateAtomicTransaction، resolveAdminIds،
// serializeApprover/validateTelegramId المحليتان، createRestaurantInTransaction،
// simulateHandleError) فيمرّ أخضر مهما انكسر الإنتاج. الآن:
//   - بوابة webhook → POST الحقيقي في src/app/api/telegram/webhook/route.ts
//   - سباقات approve/cancel → resolveSubscriptionPayment الحقيقية
//   - ذرية المعاملة → مسار handleCancelled الحقيقي داخل $transaction واحدة
//   - ترتيب أحداث SSE → GET /api/user/events الحقيقي (البديل الرسمي للبث)
//   - محدد المعدل → createDbRateLimiter الحقيقية فوق جدول prisma مزيّف أمين
//   - معرفات أدمن تيليغرام → getAdminTelegramIds + checkAdminPermission الحقيقيتان
//   - BigInt تيليغرام → GET/POST الحقيقيان في admin/telegram/approvers/route.ts
//     (التسلسل serializeApprover + تحقق /^\d{1,20}$/ + findFirst لا findUnique)
//   - تصادم slug → POST /api/restaurants الحقيقي + resolveSubscriptionPayment
//     (SLUG_TAKEN) + handleError الحقيقية
//   - حساسية حالة handleError → handleError الحقيقية من src/lib/api-helpers.ts
// ملاحظة تحويل موثّقة: متغير TELEGRAM_ALLOW_UNVERIFIED لا وجود له في
// الإنتاج (0 مراجع في src) — اختبارات «allowUnverified» حُوِّلت إلى السلوك
// الفعلي: fail-closed بلا أي التفاف.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ═════════════════════════════════════════════════════════════════
// Hoisted mocks — نمط المشروع (vi.mock('@/lib/db') + vi.hoisted)
// ═════════════════════════════════════════════════════════════════

const mockTelegramApproverFindMany = vi.hoisted(() => vi.fn());
const mockTelegramApproverFindFirst = vi.hoisted(() => vi.fn());
const mockTelegramApproverCreate = vi.hoisted(() => vi.fn());
// نمذجة قيد Prisma الموثّق في الإنتاج: findUnique لا يدعم مفاتيح BigInt
// المركّبة — المسار يستخدم findFirst، وهذا الاستدعاء يرمي لو استُخدم أبدًا.
const mockTelegramApproverFindUnique = vi.hoisted(() =>
        vi.fn(() => {
                throw new Error("BigInt not supported in findUnique");
        }),
);
const mockSystemEventFindMany = vi.hoisted(() => vi.fn());
const mockPaymentFindUnique = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
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
        telegramApprover: {
                findMany: mockTelegramApproverFindMany,
                findFirst: mockTelegramApproverFindFirst,
                create: mockTelegramApproverCreate,
                findUnique: mockTelegramApproverFindUnique,
        },
        systemEvent: { findMany: mockSystemEventFindMany },
        subscriptionPayment: { findUnique: mockPaymentFindUnique, findFirst: vi.fn().mockResolvedValue(null) },
        user: { findUnique: mockUserFindUnique, update: vi.fn() },
        restaurant: { findUnique: vi.fn() },
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
        requirePermissionResult: { authorized: false, error: "غير مصرح", status: 401 } as
                | { authorized: false; error: string; status: number }
                | { authorized: true; userId: number; role: string; restaurantId: number | null; subscriptionStatus: string | null; permissions: string[] },
}));
vi.mock("@/lib/auth", () => ({
        requireAuth: vi.fn(async () => ({
                authorized: true, userId: 10, role: "owner", restaurantId: 1,
                subscriptionStatus: "active", permissions: [],
        })),
        requirePermission: vi.fn(async () => authState.requirePermissionResult),
}));

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
import { GET as approversGet, POST as approversPost } from "@/app/api/admin/telegram/approvers/route";
import { getAdminTelegramIds } from "@/lib/telegram-admin";
import { checkAdminPermission } from "@/lib/telegram-callback";
import { resolveSubscriptionPayment } from "@/lib/subscription-decisions";
import { handleError } from "@/lib/api-helpers";

// ═════════════════════════════════════════════════════════════════
// Fixtures + helpers
// ═════════════════════════════════════════════════════════════════

const PAYMENT = {
        id: 50, userId: 42, phone: "0912345678", amount: 99, provider: "bank",
        planId: 2, planName: "الخطة المدفوعة", status: "pending",
        metadata: null as Record<string, unknown> | null,
        user: { id: 42, telegramChatId: null as string | null },
};

type EventRow = { id: number; eventType: string; severity: string; metadata: { userId: number } | null };
const EVENTS_TABLE: EventRow[] = [
        { id: 12, eventType: "payment", severity: "info", metadata: { userId: 10 } },
        { id: 8, eventType: "subscription_approved", severity: "info", metadata: { userId: 10 } },
        { id: 10, eventType: "payment", severity: "info", metadata: { userId: 10 } },
];

type EventsQuery = {
        where?: { id?: { gt?: number }; metadata?: { path?: string[]; equals?: number } };
        orderBy?: { id?: "asc" | "desc" };
        take?: number;
};

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

        authState.requirePermissionResult = { authorized: false, error: "غير مصرح", status: 401 };

        mockSystemEventFindMany.mockImplementation(async (q: EventsQuery) => {
                let rows = [...EVENTS_TABLE];
                if (q.where?.id?.gt !== undefined) rows = rows.filter((r) => r.id > q.where!.id!.gt!);
                if (q.where?.metadata?.equals !== undefined)
                        rows = rows.filter((r) => r.metadata?.userId === q.where!.metadata!.equals);
                if (q.orderBy?.id === "asc") rows.sort((a, b) => a.id - b.id);
                else if (q.orderBy?.id === "desc") rows.sort((a, b) => b.id - a.id);
                return rows.slice(0, q.take ?? Number.POSITIVE_INFINITY);
        });

        rlTable.clear();
        mockRateLimitUpsert.mockImplementation(async (args: UpsertArgs) => {
                const k = `${args.create.key}@${args.create.windowEnd.getTime()}`;
                if (rlTable.has(k)) rlTable.set(k, rlTable.get(k)! + (args.update?.count?.increment ?? 1));
                else rlTable.set(k, args.create.count);
                return { count: rlTable.get(k)! };
        });

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
        txMock.user.create.mockResolvedValue({ id: 43, username: "own1" });
        txMock.user.findUniqueOrThrow.mockResolvedValue({ id: 43 });
        txMock.systemEvent.create.mockResolvedValue({});
        txMock.menuCategory.createMany.mockResolvedValue({ count: 4 });
        txMock.userRestaurant.create.mockResolvedValue({});
        txMock.$queryRaw.mockResolvedValue([]);

        mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT });
        mockUserFindUnique.mockResolvedValue(null);
        mockTelegramApproverFindMany.mockResolvedValue([]);
        mockTelegramApproverFindFirst.mockResolvedValue(null);
        mockTelegramApproverCreate.mockResolvedValue({
                id: 7, telegramId: 1111111111n, label: "موافق", addedById: 1,
                addedBy: { id: 1, name: "أ", username: "ب" },
        });
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
// 1. Race condition — approve vs cancel عبر resolveSubscriptionPayment
//    الحقيقية: الفائز يكتب أولًا، الخاسر يرى الحالة غير pending
//    عند إعادة القراءة فيُرجَع already-processed بلا أي تحوير.
// ═════════════════════════════════════════════════════════════════

describe("Race condition: approve vs cancel cross-race (real resolveSubscriptionPayment)", () => {
  it("approve wins the race", async () => {
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

  it("cancel becomes no-op after approve won", async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, status: "verified" });
    const r = await resolveSubscriptionPayment(50, "cancelled");
    expect(r.ok).toBe(false);
    expect(txMock.subscriptionPayment.updateMany).not.toHaveBeenCalled();
  });

  it("cancel wins the race", async () => {
    const r = await resolveSubscriptionPayment(50, "cancelled");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.action).toBe("cancelled");
    expect(txMock.subscriptionPayment.updateMany).toHaveBeenCalledWith({
      where: { id: 50, status: "pending" },
      data: { status: "cancelled" },
    });
  });

  it("approve becomes no-op after cancel won", async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, status: "cancelled" });
    const r = await resolveSubscriptionPayment(50, "verified");
    expect(r.ok).toBe(false);
    expect(txMock.subscriptionPayment.update).not.toHaveBeenCalled();
  });

  it("first approve succeeds, second is no-op", async () => {
    const first = await resolveSubscriptionPayment(50, "verified");
    expect(first.ok).toBe(true);
    // الفائز كتب؛ الخاسر يعيد القراءة فيرى verified
    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, status: "verified" });
    const second = await resolveSubscriptionPayment(50, "verified");
    expect(second.ok).toBe(false);
    expect(txMock.subscriptionPayment.update).toHaveBeenCalledTimes(1);
  });
});

// ═════════════════════════════════════════════════════════════════
// 2. Telegram webhook secret — البوابة الحقيقية في POST
//    (round81: غياب السر = 403 fail-closed مطابق لمفتاح سيئ).
// ═════════════════════════════════════════════════════════════════

describe("Telegram webhook secret (real POST gate)", () => {
  it(".trim() fixes trailing whitespace mismatch", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "my-secret  ";
    const res = await webhookPost(makeWebhookRequest("my-secret"));
    expect(res.status).toBe(200);
  });

  it(".trim() fixes leading whitespace mismatch", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "  my-secret";
    const res = await webhookPost(makeWebhookRequest("my-secret"));
    expect(res.status).toBe(200);
  });

  it("no secret + no allow -> fail-closed 403", async () => {
    const res = await webhookPost(makeWebhookRequest(null));
    expect(res.status).toBe(403);
  });

  it("no bypass exists in production: unset secret + any env flag -> 403 (converted from mirror's allowUnverified=true case — 0 refs in src)", async () => {
    process.env.TELEGRAM_ALLOW_UNVERIFIED = "true";
    const res = await webhookPost(makeWebhookRequest(null));
    expect(res.status).toBe(403);
  });

  it("allowUnverified does NOT bypass when secret IS set", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "real";
    process.env.TELEGRAM_ALLOW_UNVERIFIED = "true";
    const res = await webhookPost(makeWebhookRequest("wrong"));
    expect(res.status).toBe(403);
  });

  it("exact secret+header match passes", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "exact-match";
    const res = await webhookPost(makeWebhookRequest("exact-match"));
    expect(res.status).toBe(200);
    // البوابة تسبق المحدد — الرحلة الناجحة فقط تستهلك الميزانية
    expect(rlState.calls).toBe(1);
  });

  it("empty env var treated as unset -> fail-closed 403", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "";
    const res = await webhookPost(makeWebhookRequest(null));
    expect(res.status).toBe(403);
    expect(rlState.calls).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════
// 3. SSE event ordering/atomicity — handleCancelled الحقيقي داخل
//    $transaction واحدة (كل الطفرات على نفس كائن tx) + GET
//    /api/user/events الحقيقي للترتيب/الاستئناف.
// ═════════════════════════════════════════════════════════════════

describe("SSE event ordering/atomicity", () => {
  it("all steps succeed -> committed (all mutations inside ONE $transaction)", async () => {
    const r = await resolveSubscriptionPayment(50, "cancelled");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.action).toBe("cancelled");
    // الذرية: كل الطفرات جرت على نفس كائن tx الذي مرّرته المعاملة
    expect(txMock.subscriptionPayment.updateMany).toHaveBeenCalledTimes(1);
    expect(txMock.user.updateMany).toHaveBeenCalledTimes(1);
    expect(txMock.systemEvent.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("core mutation fail -> rolled back (tx failure surfaces as error, never as success)", async () => {
    txMock.systemEvent.create.mockRejectedValue(new Error("db write failed mid-transaction"));
    const r = await resolveSubscriptionPayment(50, "cancelled");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("حدث خطأ أثناء رفض الطلب");
  });

  describe("SSE query ordering (real GET /api/user/events)", () => {
    it("all events > lastEventId, sorted ascending", async () => {
      const res = await userEventsGet(makeEventsRequest("?sinceId=7"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(3);
      expect(json.data.map((e: { id: number }) => e.id)).toEqual([8, 10, 12]);
    });

    it("last-event-id resumption", async () => {
      const res = await userEventsGet(makeEventsRequest("?sinceId=10"));
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe(12);
    });
  });
});

// ═════════════════════════════════════════════════════════════════
// 4. Rate limiter — createDbRateLimiter الحقيقية فوق جدول prisma
//    مزيّف أمين: العدّ يسكن الجدول لا ذاكرة النسخة (THE BUG fixed).
// ═════════════════════════════════════════════════════════════════

describe("Rate limiter (in-memory vs DB-backed — real createDbRateLimiter)", () => {
  it("in-memory separate instances bypassed each other (THE BUG) — a fresh instance over the shared table does NOT reset the count", async () => {
    const { createDbRateLimiter } = await vi.importActual<
      typeof import("@/lib/rate-limit")
    >("@/lib/rate-limit");
    const inst1 = createDbRateLimiter({ windowMs: 60_000, max: 3 });

    expect((await inst1.check("api:subs")).success).toBe(true);
    expect((await inst1.check("api:subs")).success).toBe(true);
    expect((await inst1.check("api:subs")).success).toBe(true);
    expect((await inst1.check("api:subs")).success).toBe(false);
    // نسخة ثانية طازجة كانت تتجاوز (ذاكرة منفصلة) — الجدول المشترك يمنعها
    const inst2 = createDbRateLimiter({ windowMs: 60_000, max: 3 });
    expect((await inst2.check("api:subs")).success).toBe(false);
    inst1.destroy();
    inst2.destroy();
  });

  it("DB-backed shared state enforces limit across instances", async () => {
    const { createDbRateLimiter } = await vi.importActual<
      typeof import("@/lib/rate-limit")
    >("@/lib/rate-limit");
    const db1 = createDbRateLimiter({ windowMs: 60_000, max: 5 });
    const db2 = createDbRateLimiter({ windowMs: 60_000, max: 5 });

    expect((await db1.check("api:subs")).success).toBe(true);
    expect((await db1.check("api:subs")).success).toBe(true);
    expect((await db2.check("api:subs")).success).toBe(true);
    expect((await db2.check("api:subs")).success).toBe(true);
    expect((await db2.check("api:subs")).success).toBe(true);
    expect((await db2.check("api:subs")).success).toBe(false);
    db1.destroy();
    db2.destroy();
  });
});

// ═════════════════════════════════════════════════════════════════
// 5. Admin permission checks — getAdminTelegramIds الحقيقية +
//    checkAdminPermission الحقيقية (src/lib/telegram-callback.ts).
// ═════════════════════════════════════════════════════════════════

describe("Admin permission checks (real getAdminTelegramIds + checkAdminPermission)", () => {
  it("BigInt admin ID converted to Number", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "1111,2222";
    mockTelegramApproverFindMany.mockResolvedValue([{ telegramId: 8949246746n }]);
    const admins = await getAdminTelegramIds();
    expect(admins).toContain(8949246746);
  });

  it("env+DB deduplicated to 3 IDs", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "100,200";
    mockTelegramApproverFindMany.mockResolvedValue([{ telegramId: 200n }, { telegramId: 300n }]);
    const deduped = await getAdminTelegramIds();
    expect(deduped).toHaveLength(3);
    expect(deduped).toEqual([100, 200, 300]);
  });

  it("NaN env values filtered", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "abc,100,xyz,200";
    mockTelegramApproverFindMany.mockResolvedValue([]);
    expect(await getAdminTelegramIds()).toEqual([100, 200]);
  });

  it("zero/neg filtered from both", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "0,-5,300";
    mockTelegramApproverFindMany.mockResolvedValue([{ telegramId: 0n }, { telegramId: -10n }, { telegramId: 400n }]);
    expect(await getAdminTelegramIds()).toEqual([300, 400]);
  });

  it("admin 1111 recognized, non-admin 9999 rejected", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "1111,2222,3333";
    mockTelegramApproverFindMany.mockResolvedValue([]);
    const allAdmins = await getAdminTelegramIds();
    expect(checkAdminPermission(1111, allAdmins)).toBe(true);
    expect(checkAdminPermission(9999, allAdmins)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════
// 6. BigInt telegram ID handling — GET/POST الحقيقيان في
//    src/app/api/admin/telegram/approvers/route.ts: التسلسل
//    BigInt→String، تحقق /^\d{1,20}$/ مع رفض "0"، وfindFirst (ليس
//    findUnique — المزيف يرمي لو استُدعي).
// ═════════════════════════════════════════════════════════════════

describe("BigInt telegram ID handling (real approvers route)", () => {
  beforeEach(() => {
    authState.requirePermissionResult = {
      authorized: true, userId: 1, role: "super_admin", restaurantId: null,
      subscriptionStatus: null, permissions: [],
    };
  });

  it("BigInt serialized as string (GET)", async () => {
    mockTelegramApproverFindMany.mockResolvedValue([
      { id: 1, telegramId: 8949246746n, label: "test", createdAt: new Date(), addedBy: { id: 2, name: "أ", username: "ب" } },
    ]);
    const res = await approversGet();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    const serialized = json.data[0];
    expect(typeof serialized.telegramId).toBe("string");
    expect(serialized.telegramId).toBe("8949246746");
    expect(serialized.id).toBe(1);
    expect(serialized.label).toBe("test");
  });

  it("valid 10-digit ID passes", async () => {
    const res = await approversPost(makePostRequest("/api/admin/telegram/approvers", { telegramId: "1111111111", label: "x" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.telegramId).toBe("1111111111");
    expect(mockTelegramApproverCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ telegramId: 1111111111n, label: "x" }),
    }));
  });

  it("non-numeric rejected", async () => {
    const res = await approversPost(makePostRequest("/api/admin/telegram/approvers", { telegramId: "abc" }));
    expect(res.status).toBe(400);
    expect(mockTelegramApproverCreate).not.toHaveBeenCalled();
  });

  it("zero rejected", async () => {
    const res = await approversPost(makePostRequest("/api/admin/telegram/approvers", { telegramId: "0" }));
    expect(res.status).toBe(400);
  });

  it("decimal rejected", async () => {
    const res = await approversPost(makePostRequest("/api/admin/telegram/approvers", { telegramId: "12.5" }));
    expect(res.status).toBe(400);
  });

  it("20-digit max allowed", async () => {
    const res = await approversPost(makePostRequest("/api/admin/telegram/approvers", { telegramId: "12345678901234567890" }));
    expect(res.status).toBe(200);
    expect(mockTelegramApproverCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ telegramId: 12345678901234567890n }),
    }));
  });

  it("21-digit rejected", async () => {
    const res = await approversPost(makePostRequest("/api/admin/telegram/approvers", { telegramId: "123456789012345678901" }));
    expect(res.status).toBe(400);
  });

  it("findFirst works with BigInt, findUnique throws (route must never call findUnique)", async () => {
    const res = await approversPost(makePostRequest("/api/admin/telegram/approvers", { telegramId: "1111111111" }));
    // findUnique المزيّف يرمي دائمًا (قيد Prisma الموثّق في الإنتاج) —
    // النجاح يثبت أن المسار يستخدم findFirst حصرًا
    expect(res.status).toBe(200);
    expect(mockTelegramApproverFindFirst).toHaveBeenCalledWith({ where: { telegramId: 1111111111n } });
  });
});

// ═════════════════════════════════════════════════════════════════
// 7. Slug collision handling — POST /api/restaurants الحقيقي
//    (409 عبر handleError) + resolveSubscriptionPayment الحقيقية
//    (SLUG_TAKEN → الرسالة العربية) + handleError الحقيقية.
// ═════════════════════════════════════════════════════════════════

describe("Slug collision handling (real routes + real resolveSubscriptionPayment)", () => {
  it("first restaurant with slug created", async () => {
    const res = await restaurantsPost(makePostRequest("/api/restaurants", {
      name: "مطعم", slug: "my-restaurant", username: "own1", password: "longpass123",
    }));
    expect(res.status).toBe(201);
    expect(txMock.restaurant.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ slug: "my-restaurant" }),
    }));
  });

  it("duplicate slug throws Unique constraint failed -> 409", async () => {
    txMock.restaurant.findUnique.mockResolvedValue({ id: 1, slug: "taken-slug" });
    const res = await restaurantsPost(makePostRequest("/api/restaurants", {
      name: "مطعم", slug: "taken-slug", username: "own2", password: "longpass123",
    }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("بيانات مكررة");
    expect(txMock.restaurant.create).not.toHaveBeenCalled();
  });

  it("different slug succeeds after collision", async () => {
    txMock.restaurant.findUnique.mockResolvedValue(null);
    const res = await restaurantsPost(makePostRequest("/api/restaurants", {
      name: "مطعم", slug: "different-slug", username: "own3", password: "longpass123",
    }));
    expect(res.status).toBe(201);
  });

  it("slug taken via subscription rejected (SLUG_TAKEN -> Arabic reason)", async () => {
    txMock.restaurant.findUnique.mockResolvedValue({ id: 5, slug: "restaurant-50" });
    const r = await resolveSubscriptionPayment(50, "verified");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("محجوز");
  });

  it("available slug via subscription accepted", async () => {
    txMock.restaurant.findUnique.mockResolvedValue(null);
    const r = await resolveSubscriptionPayment(50, "verified");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.action).toBe("verified");
  });

  it("handleError returns 409 for duplicate slug", async () => {
    const res = handleError(new Error("Unique constraint failed on slug"));
    expect(res.status).toBe(409);
  });

  it("lowercase variant falls through (THE BUG — case-sensitive match pinned)", async () => {
    const res = handleError(new Error("unique constraint failed on slug"));
    expect(res.status).toBe(500);
  });
});

// ═════════════════════════════════════════════════════════════════
// 8. handleError case sensitivity — handleError الحقيقية من
//    src/lib/api-helpers.ts (كل فرع مطابق للسلوك المثبّت).
// ═════════════════════════════════════════════════════════════════

describe("handleError case sensitivity (real handleError)", () => {
  it("exact casing 'Unique constraint' -> 409", async () => {
    const res = handleError(new Error("Unique constraint failed on slug"));
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.error).toBe("بيانات مكررة — هذا الاسم موجود مسبقاً");
  });

  it("lowercase 'unique constraint' -> 500 (THE BUG — pinned current behavior)", async () => {
    const res = handleError(new Error("unique constraint failed on slug"));
    expect(res.status).toBe(500);
  });

  it("'Foreign key constraint' -> 400", async () => {
    const res = handleError(new Error("Foreign key constraint failed"));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("بيانات مرتبطة لا يمكن حذفها");
  });

  it("lowercase 'foreign key' -> 500 (THE BUG — pinned current behavior)", async () => {
    const res = handleError(new Error("foreign key constraint failed"));
    expect(res.status).toBe(500);
  });

  it("'Record to update not found' -> 404", async () => {
    const res = handleError(new Error("Record to update not found: User"));
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toBe("السجل غير موجود");
  });

  it("'Invalid `' -> 400", async () => {
    const res = handleError(new Error("Invalid `prisma.user.create()` invocation"));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("بيانات غير صالحة");
  });

  it("'connection' caught via toLowerCase -> 503", async () => {
    const res = handleError(new Error("Can not reach database: Connection refused"));
    const json = await res.json();
    expect(res.status).toBe(503);
    expect(json.error).toBe("خطأ في الاتصال بقاعدة البيانات. حاول مرة أخرى");
  });

  it("'Connection' also caught (case-insensitive)", async () => {
    const res = handleError(new Error("Connection timed out"));
    expect(res.status).toBe(503);
  });

  it("unknown error falls through to 500", async () => {
    const res = handleError(new Error("some random error"));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBe("حدث خطأ داخلي. حاول مرة أخرى");
  });

  it("thrown string falls through to 500", async () => {
    const res = handleError("string error");
    expect(res.status).toBe(500);
  });
});
