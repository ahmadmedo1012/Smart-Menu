// round92-C1: كان جزء منه مرآة — الآن يستورد الإنتاج الحقيقي.
// التغييرات الموثّقة في هذه الجولة (الوكيل 3-a):
//   1) قسم auth.ts: كان يحاكم mockRequireAuth/mockRequireAdmin/
//      mockRequirePermission محلية — الآن يستورد requireAuth/requireAdmin/
//      requirePermission الحقيقية من src/lib/auth.ts بـmock للجلسة
//      (validateSession) وgetUserById (نفس نمط auth.test.ts الناضج).
//   2) قسم telegram-admin: كان mockًا محليًا (تغطية src/lib/telegram-admin.ts
//      كانت 0%) — الآن يستورد getAdminTelegramIds الحقيقية بـprisma مزيّف.
//   3) قسم subscription-decisions: كان mockResolveSubscriptionPayment
//      محليًا — الآن resolveSubscriptionPayment الحقيقية بنمط tx-mock.
//   4) قسم csrf-client: كان فعليًا (استورداد حقيقية) — بقي، ونُظّفت تحذيرات
//      no-explicit-any الـ12 عبر harness مطبوع للـfetch mock.
//   5) حذف موثّق (الاستثناء الوحيد المصرّح به): قسم «Mock JWT» (8 اختبارات)
//      — كان يختبر مكتبة JWT وهمية محلية والإنتاج لا يستخدم JWT أصلًا
//      (جلسات DB عبر session.ts؛ لا وجود لـjsonwebtoken/jose في src —
//      0 مراجع). اختبارات بلا مقابل إنتاج = حبر أخضر بلا معنى منقول.
//   6) حذف موثّق: قسم «hash.ts» المكرر (14 اختبارًا بنفس أسماء اختبارات
//      auth.test.ts) — توحيدًا للجهد: PBKDF2 600k كان يُدفع مرتين
//      (13.6 ث من أصل 25.9 ث). قارنا القسمين assertion-by-assertion:
//      كل توكيد موجود في auth.test.ts بمساوى أو أقوى (شكل v2 + ITERATIONS
//      + salt/hash hex/length + round-trip + فشول النسخ الفاسدة + salt
//      فريد) — لا توكيد فُقد؛ نسخة auth.test.ts هي المرجع الوحيد الآن.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ═════════════════════════════════════════════════════════════════
// Hoisted mocks — نمط المشروع (auth.test.ts / subscription-decisions)
// ═════════════════════════════════════════════════════════════════

vi.mock("@/lib/session", () => ({ validateSession: vi.fn() }));

const mockGetUserById = vi.hoisted(() => vi.fn());
const mockApproverFindMany = vi.hoisted(() => vi.fn());
const mockPaymentFindUnique = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
        subscriptionPayment: { update: vi.fn(), updateMany: vi.fn() },
        subscriptionPlan: { findUnique: vi.fn(), findFirst: vi.fn() },
        restaurant: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
        userRestaurant: { create: vi.fn(), count: vi.fn() },
        menuCategory: { createMany: vi.fn() },
        user: { update: vi.fn(), updateMany: vi.fn() },
        systemEvent: { create: vi.fn() },
        $queryRaw: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
        telegramApprover: { findMany: mockApproverFindMany },
        subscriptionPayment: { findUnique: mockPaymentFindUnique },
        $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma, getUserById: mockGetUserById }));
vi.mock("@/lib/telegram", () => ({
        sendTelegramNotification: vi.fn(async () => ({ sent: 0, failed: [] })),
        notifyEvent: vi.fn(async () => ({ sent: 0, failed: [] })),
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/config", () => ({ getDecryptedBotToken: vi.fn(async () => null) }));
vi.mock("@/lib/logger", () => ({
        error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(),
}));

// ── استيراد الإنتاج الحقيقي (بعد vi.mock المرفوعة تلقائيًا) ───────────
import { requireAuth, requireAdmin, requirePermission } from "@/lib/auth";
import * as session from "@/lib/session";
import { getUserById } from "@/lib/db";
import type { Role, Permission, SubscriptionStatus } from "@/generated/prisma/enums";
import { getAdminTelegramIds } from "@/lib/telegram-admin";
import { resolveSubscriptionPayment } from "@/lib/subscription-decisions";
import { csrfFetch } from "@/lib/csrf-client";
import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf";

// ═════════════════════════════════════════════════════════════════
// Fixtures
// ═════════════════════════════════════════════════════════════════

// نفس شكل select getUserById الحقيقي (src/lib/db.ts) — أنواع prisma الحقيقية
// (Role/Permission/SubscriptionStatus) لا string سائبة.
type UserRow = {
        id: number;
        role: Role;
        restaurantId: number | null;
        subscriptionStatus: SubscriptionStatus;
        permissions: Permission[];
};

const userRow = (overrides: Partial<UserRow> = {}): UserRow => ({
        id: 1,
        role: "admin",
        restaurantId: 5,
        subscriptionStatus: "PAID",
        permissions: [],
        ...overrides,
});

const validSession = { valid: true as const, userId: 1 };
const badSession = { valid: false as const, userId: null };

const admin: UserRow = userRow({ role: "admin" });
const superAdmin: UserRow = userRow({ role: "super_admin", id: 2, restaurantId: null });
const subYes: UserRow = userRow({ role: "sub_admin", id: 3, restaurantId: 10, permissions: ["APPROVE_ORDERS"] });
const subNo: UserRow = userRow({ role: "sub_admin", id: 4, restaurantId: 10, permissions: [] });
// «member» المرآة = دور غير إداري في الإنتاج → USER (دور الزبون)
const member: UserRow = userRow({ role: "USER", id: 5, restaurantId: null });

const PAYMENT = {
        id: 50, userId: 42, phone: "0912345678", amount: 99, provider: "bank",
        planId: 2, planName: "الخطة المدفوعة", status: "pending",
        metadata: null as Record<string, unknown> | null,
        user: { id: 42, telegramChatId: null as string | null },
};

const ORIGINAL_ADMIN_IDS = process.env.TELEGRAM_ADMIN_IDS;

beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.TELEGRAM_ADMIN_IDS;

        // tx افتراضي ناجح لمسار resolveSubscriptionPayment
        mockPrisma.$transaction.mockImplementation(
                async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock),
        );
        txMock.subscriptionPayment.update.mockResolvedValue({ id: 50, status: "verified" });
        txMock.subscriptionPayment.updateMany.mockResolvedValue({ count: 1 });
        txMock.restaurant.findUnique.mockResolvedValue(null);
        txMock.restaurant.create.mockResolvedValue({ id: 91, name: "مطعم", slug: "restaurant-50" });
        txMock.subscriptionPlan.findUnique.mockResolvedValue({ maxMenus: 5, maxItems: 50, maxOrders: 500 });
        txMock.userRestaurant.count.mockResolvedValue(0);
        txMock.user.update.mockResolvedValue({ id: 42, username: "u", role: "owner", subscriptionStatus: "PAID", restaurantId: 91 });
        txMock.user.updateMany.mockResolvedValue({ count: 1 });
        txMock.systemEvent.create.mockResolvedValue({});
        txMock.menuCategory.createMany.mockResolvedValue({ count: 4 });
        txMock.userRestaurant.create.mockResolvedValue({});
        txMock.$queryRaw.mockResolvedValue([]);

        mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT });
        mockApproverFindMany.mockResolvedValue([]);
});

afterEach(() => {
        if (ORIGINAL_ADMIN_IDS === undefined) delete process.env.TELEGRAM_ADMIN_IDS;
        else process.env.TELEGRAM_ADMIN_IDS = ORIGINAL_ADMIN_IDS;
});

// ═════════════════════════════════════════════════════════════════
// 1. csrf-client.ts — fetch wrapper adds CSRF header to mutations
//    (كان فعليًا؛ التنظيف: typed mock harness بلا any)
// ═════════════════════════════════════════════════════════════════

describe("csrf-client.ts", () => {
        // round92-C1: shim مطبوع (بلا any) — globalThis.document في lib.dom
        // هو Document؛ نستبدله مؤقتًا بكائن { cookie } كما يفعل csrf-client.
        type DocumentShim = { cookie: string };
        type GlobalsShim = { document?: DocumentShim; fetch: typeof globalThis.fetch };
        type RecordedCall = { input: RequestInfo | URL; init?: RequestInit };
        const calls: RecordedCall[] = [];
        let origFetch: typeof globalThis.fetch;
        let origDocument: DocumentShim | undefined;

        beforeEach(() => {
                origFetch = globalThis.fetch;
                const g = globalThis as unknown as GlobalsShim;
                origDocument = g.document;
                calls.length = 0;
                g.document = { cookie: `${CSRF_COOKIE}=mock-token` };
                globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
                        calls.push({ input, init });
                        return Promise.resolve(new Response(null, { status: 200 }));
                };
        });

        afterEach(() => {
                globalThis.fetch = origFetch;
                (globalThis as unknown as GlobalsShim).document = origDocument;
        });

        function lastHeaders(): Record<string, string> {
                const headers = calls[0]?.init?.headers;
                return (headers ?? {}) as Record<string, string>;
        }

        it("GET — no CSRF header added", async () => {
                await csrfFetch("/api/test");
                expect(calls).toHaveLength(1);
                expect(CSRF_HEADER in lastHeaders()).toBe(false);
        });

        it("POST adds CSRF header", async () => {
                await csrfFetch("/api/test", { method: "POST" });
                expect(lastHeaders()[CSRF_HEADER]).toBe("mock-token");
        });

        it("PUT adds CSRF header", async () => {
                await csrfFetch("/api/test", { method: "PUT" });
                expect(lastHeaders()[CSRF_HEADER]).toBe("mock-token");
        });

        it("DELETE adds CSRF header", async () => {
                await csrfFetch("/api/test", { method: "DELETE" });
                expect(lastHeaders()[CSRF_HEADER]).toBe("mock-token");
        });

        it("PATCH adds CSRF header", async () => {
                await csrfFetch("/api/test", { method: "PATCH" });
                expect(lastHeaders()[CSRF_HEADER]).toBe("mock-token");
        });

        it("preserves original headers while adding CSRF", async () => {
                await csrfFetch("/api/test", { method: "POST", headers: { "Content-Type": "application/json" } });
                expect(lastHeaders()["Content-Type"]).toBe("application/json");
                expect(lastHeaders()[CSRF_HEADER]).toBe("mock-token");
        });

        it("lowercase POST still adds header", async () => {
                await csrfFetch("/api/test", { method: "post" });
                expect(lastHeaders()[CSRF_HEADER]).toBe("mock-token");
        });
});

// ═════════════════════════════════════════════════════════════════
// 2. auth.ts — requireAuth / requireAdmin / requirePermission الحقيقية
//    (src/lib/auth.ts) بـvalidateSession وgetUserById مزيّفين.
// ═════════════════════════════════════════════════════════════════

describe("auth.ts (real requireAuth/requireAdmin/requirePermission)", () => {
  describe("requireAuth", () => {
    it("invalid session -> unauthorized", async () => {
      vi.mocked(session.validateSession).mockResolvedValue(badSession);
      expect((await requireAuth()).authorized).toBe(false);
    });
    it("user null -> unauthorized", async () => {
      vi.mocked(session.validateSession).mockResolvedValue(validSession);
      vi.mocked(getUserById).mockResolvedValue(null);
      expect((await requireAuth()).authorized).toBe(false);
    });
    it("valid session + user -> authorized", async () => {
      vi.mocked(session.validateSession).mockResolvedValue(validSession);
      vi.mocked(getUserById).mockResolvedValue(admin);
      const r = await requireAuth();
      expect(r.authorized).toBe(true);
      if (r.authorized) {
        expect(r.userId).toBe(1);
        expect(r.role).toBe("admin");
        expect(r.restaurantId).toBe(5);
        expect(r.subscriptionStatus).toBe("PAID");
      }
    });
    it("requireRestaurant blocks null restaurantId", async () => {
      vi.mocked(session.validateSession).mockResolvedValue(validSession);
      vi.mocked(getUserById).mockResolvedValue({ ...member, restaurantId: null });
      expect((await requireAuth({ requireRestaurant: true })).authorized).toBe(false);
    });
    it("requireRestaurant allows with restaurantId", async () => {
      vi.mocked(session.validateSession).mockResolvedValue(validSession);
      vi.mocked(getUserById).mockResolvedValue({ ...member, restaurantId: 7 });
      expect((await requireAuth({ requireRestaurant: true })).authorized).toBe(true);
    });
    it("expired session -> unauthorized", async () => {
      vi.mocked(session.validateSession).mockResolvedValue({ valid: false, userId: 1 });
      vi.mocked(getUserById).mockResolvedValue(admin);
      expect((await requireAuth()).authorized).toBe(false);
    });
    it("valid but no userId -> unauthorized", async () => {
      vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: null });
      vi.mocked(getUserById).mockResolvedValue(admin);
      expect((await requireAuth()).authorized).toBe(false);
    });
  });

  describe("requireAdmin", () => {
    it("admin role -> authorized", async () => {
      vi.mocked(session.validateSession).mockResolvedValue(validSession);
      vi.mocked(getUserById).mockResolvedValue(admin);
      expect((await requireAdmin()).authorized).toBe(true);
    });
    it("super_admin role -> authorized", async () => {
      vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 2 });
      vi.mocked(getUserById).mockResolvedValue(superAdmin);
      expect((await requireAdmin()).authorized).toBe(true);
    });
    it("sub_admin role -> authorized", async () => {
      vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 3 });
      vi.mocked(getUserById).mockResolvedValue(subYes);
      expect((await requireAdmin()).authorized).toBe(true);
    });
    it("member role -> unauthorized (round91-F-B: 403 + Arabic error for wrong role)", async () => {
      vi.mocked(session.validateSession).mockResolvedValue(validSession);
      vi.mocked(getUserById).mockResolvedValue(member);
      const r = await requireAdmin();
      expect(r.authorized).toBe(false);
      if (!r.authorized) {
        expect(r.status).toBe(403);
        expect(r.error).toBe("لا تملك الصلاحية");
      }
    });
    it("unauthenticated -> unauthorized (401 + «غير مصرح»)", async () => {
      vi.mocked(session.validateSession).mockResolvedValue(badSession);
      const r = await requireAdmin();
      expect(r.authorized).toBe(false);
      if (!r.authorized) {
        expect(r.status).toBe(401);
        expect(r.error).toBe("غير مصرح");
      }
    });
  });

  describe("requirePermission", () => {
    it("unauthenticated -> 401", async () => {
      vi.mocked(session.validateSession).mockResolvedValue(badSession);
      const r = await requirePermission("APPROVE_ORDERS");
      expect(r.authorized).toBe(false);
      if (!r.authorized) expect(r.status).toBe(401);
    });
    it("super_admin bypasses permission", async () => {
      vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 2 });
      vi.mocked(getUserById).mockResolvedValue(superAdmin);
      expect((await requirePermission("anything")).authorized).toBe(true);
    });
    it("admin bypasses permission", async () => {
      vi.mocked(session.validateSession).mockResolvedValue(validSession);
      vi.mocked(getUserById).mockResolvedValue(admin);
      expect((await requirePermission("anything")).authorized).toBe(true);
    });
    it("sub_admin matching permission -> allowed", async () => {
      vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 3 });
      vi.mocked(getUserById).mockResolvedValue(subYes);
      expect((await requirePermission("APPROVE_ORDERS")).authorized).toBe(true);
    });
    it("sub_admin missing permission -> 403", async () => {
      vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 4 });
      vi.mocked(getUserById).mockResolvedValue(subNo);
      const r = await requirePermission("APPROVE_ORDERS");
      expect(r.authorized).toBe(false);
      if (!r.authorized) expect(r.status).toBe(403);
    });
    it("sub_admin wrong permission -> 403", async () => {
      vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 3 });
      vi.mocked(getUserById).mockResolvedValue(subYes);
      const r = await requirePermission("MANAGE_USERS");
      expect(r.authorized).toBe(false);
      if (!r.authorized) expect(r.status).toBe(403);
    });
    it("member -> 403", async () => {
      vi.mocked(session.validateSession).mockResolvedValue(validSession);
      vi.mocked(getUserById).mockResolvedValue(member);
      const r = await requirePermission("anything");
      expect(r.authorized).toBe(false);
      if (!r.authorized) expect(r.status).toBe(403);
    });
    it("super_admin with no-restaurant check passes", async () => {
      vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 2 });
      vi.mocked(getUserById).mockResolvedValue(superAdmin);
      expect((await requirePermission("anything")).authorized).toBe(true);
    });
    it("403 error message is string and non-empty", async () => {
      vi.mocked(session.validateSession).mockResolvedValue({ valid: true, userId: 4 });
      vi.mocked(getUserById).mockResolvedValue(subNo);
      const r = await requirePermission("APPROVE_ORDERS");
      expect(r.authorized).toBe(false);
      if (!r.authorized) {
        expect(typeof r.error).toBe("string");
        expect(r.error.length).toBeGreaterThan(0);
      }
    });
    it("401 error message is string and non-empty", async () => {
      vi.mocked(session.validateSession).mockResolvedValue(badSession);
      const r = await requirePermission("x");
      expect(r.authorized).toBe(false);
      if (!r.authorized) {
        expect(typeof r.error).toBe("string");
        expect(r.error.length).toBeGreaterThan(0);
      }
    });
  });
});

// ═════════════════════════════════════════════════════════════════
// 3. subscription-decisions.ts — resolveSubscriptionPayment الحقيقية
//    (بوابات الدخول + خريطة القرار؛ tx-mock بلا DB حقيقي).
// ═════════════════════════════════════════════════════════════════

describe("subscription-decisions.ts (real resolveSubscriptionPayment)", () => {
  it("null payment -> not-found reason", async () => {
    mockPaymentFindUnique.mockResolvedValue(null);
    const r = await resolveSubscriptionPayment(1, "verified");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("الطلب غير موجود");
  });

  it("non-pending payment -> already-processed reason", async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, id: 1, status: "verified", userId: 1 });
    const verified = await resolveSubscriptionPayment(1, "verified");
    expect(verified.ok).toBe(false);
    if (!verified.ok) expect(verified.reason).toBe("تمت معالجة هذا الطلب مسبقاً");

    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, id: 2, status: "cancelled", userId: 1 });
    const cancelled = await resolveSubscriptionPayment(2, "verified");
    expect(cancelled.ok).toBe(false);
  });

  it('decision "verified" -> action verified', async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, id: 10, userId: 5, status: "pending" });
    const r = await resolveSubscriptionPayment(10, "verified");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.action).toBe("verified");
      expect(r.paymentId).toBe(10);
    }
    expect(txMock.subscriptionPayment.update).toHaveBeenCalledWith({
      where: { id: 10, status: "pending" },
      data: { status: "verified" },
    });
  });

  it('decision "cancelled" -> action cancelled', async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, id: 20, userId: 6, status: "pending" });
    const r = await resolveSubscriptionPayment(20, "cancelled");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.action).toBe("cancelled");
      expect(r.paymentId).toBe(20);
    }
    expect(txMock.subscriptionPayment.updateMany).toHaveBeenCalledWith({
      where: { id: 20, status: "pending" },
      data: { status: "cancelled" },
    });
  });

  it("pending with null userId still resolves", async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, id: 30, userId: null, status: "pending", user: null });
    const r = await resolveSubscriptionPayment(30, "cancelled");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.action).toBe("cancelled");
    expect(txMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("multiple payments get independent results", async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, id: 100, userId: 1, status: "pending" });
    const a = await resolveSubscriptionPayment(100, "verified");
    mockPaymentFindUnique.mockResolvedValue({ ...PAYMENT, id: 200, userId: 2, status: "pending" });
    const b = await resolveSubscriptionPayment(200, "cancelled");
    if (a.ok && b.ok) {
      expect(a.action).toBe("verified");
      expect(b.action).toBe("cancelled");
      expect(a.paymentId).toBe(100);
      expect(b.paymentId).toBe(200);
    } else {
      expect.unreachable("both should resolve ok");
    }
  });
});

// ═════════════════════════════════════════════════════════════════
// 4. telegram-admin.ts — getAdminTelegramIds الحقيقية
//    (src/lib/telegram-admin.ts — كانت تغطيتها 0%): تحليل env + دمج DB
//    + إزالة التكرار + تحويل BigInt.
// ═════════════════════════════════════════════════════════════════

describe("telegram-admin.ts — getAdminTelegramIds (real)", () => {
  it("single env ID parsed", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "123456";
    mockApproverFindMany.mockResolvedValue([]);
    expect(await getAdminTelegramIds()).toEqual([123456]);
  });
  it("multiple env IDs parsed", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "111,222,333";
    mockApproverFindMany.mockResolvedValue([]);
    expect(await getAdminTelegramIds()).toEqual([111, 222, 333]);
  });
  it("DB BigInt ID included", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "";
    mockApproverFindMany.mockResolvedValue([{ telegramId: 999n }]);
    expect(await getAdminTelegramIds()).toEqual([999]);
  });
  it("env + DB merged", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "100";
    mockApproverFindMany.mockResolvedValue([{ telegramId: 200n }, { telegramId: 300n }]);
    expect(await getAdminTelegramIds()).toEqual([100, 200, 300]);
  });
  it("overlapping IDs deduplicated", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "500,600";
    mockApproverFindMany.mockResolvedValue([{ telegramId: 600n }, { telegramId: 700n }]);
    const r = await getAdminTelegramIds();
    expect(r).toEqual([500, 600, 700]);
    expect(r).toHaveLength(3);
  });
  it("empty env + empty DB -> []", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "";
    mockApproverFindMany.mockResolvedValue([]);
    expect(await getAdminTelegramIds()).toEqual([]);
  });
  it("invalid env IDs filtered out", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "abc,0,-5,42,NaN";
    mockApproverFindMany.mockResolvedValue([]);
    expect(await getAdminTelegramIds()).toEqual([42]);
  });
  it("invalid DB IDs filtered out", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "";
    mockApproverFindMany.mockResolvedValue([{ telegramId: 0n }, { telegramId: -1n }, { telegramId: 77n }]);
    expect(await getAdminTelegramIds()).toEqual([77]);
  });
  it("whitespace in env var handled", async () => {
    process.env.TELEGRAM_ADMIN_IDS = " 10 , 20 ,30";
    mockApproverFindMany.mockResolvedValue([]);
    expect(await getAdminTelegramIds()).toEqual([10, 20, 30]);
  });
  it("large safe integer passes", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "9007199254740991";
    mockApproverFindMany.mockResolvedValue([]);
    expect(await getAdminTelegramIds()).toEqual([9007199254740991]);
  });
  it("duplicates within env var deduplicated", async () => {
    process.env.TELEGRAM_ADMIN_IDS = "1,2,2,3";
    mockApproverFindMany.mockResolvedValue([]);
    expect(await getAdminTelegramIds()).toEqual([1, 2, 3]);
  });
});
