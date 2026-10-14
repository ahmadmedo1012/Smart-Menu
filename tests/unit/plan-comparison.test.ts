/**
 * Plan comparison logic for /pricing and /subscribe.
 * Quantitative cap rows (menus/items/orders) + qualitative feature matrix
 * (✓/—) derived from the plan's features list, plus Arabic plural phrasing.
 */
import { describe, it, expect } from "vitest";
import {
  formatCap,
  capRows,
  hasFeature,
  featureMatrix,
  itemsPhrase,
  filterLimitFeatures,
} from "@/components/subscribe/plan-comparison";
import type { ComparisonPlan } from "@/components/subscribe/plan-comparison";

const PLAN = (
  overrides: Partial<ComparisonPlan> = {}
): ComparisonPlan => ({
  id: 2,
  name: "Basic",
  nameAr: "أساسي",
  price: 15,
  periodDays: 30,
  features: ["منيو رقمي تفاعلي", "تصنيفات غير محدودة"],
  maxMenus: 1,
  maxItems: 50,
  maxOrders: 500,
  sortOrder: 2,
  ...overrides,
});

describe("formatCap", () => {
  it("r143 D10: names the enforced number for the sentinel caps (r92 truth law — no «غير محدود»)", () => {
    // Arrange
    const menusUnlimited = formatCap(9999, "منيو", "منيوهات");
    const ordersUnlimited = formatCap(99999, "طلب", "طلبات");
    // Act + Assert
    expect(menusUnlimited).toBe("حتى 9999 منيو");
    expect(ordersUnlimited).toBe("حتى 99999 طلب");
  });

  it("uses correct Arabic plural forms per count state", () => {
    // Arrange
    const one = formatCap(1, "صنف", "أصناف");
    const two = formatCap(2, "صنف", "أصناف");
    const few = formatCap(10, "صنف", "أصناف");
    const many = formatCap(200, "صنف", "أصناف");
    // Act + Assert
    expect(one).toContain("صنف واحد");
    expect(two).toContain("صنفان");
    expect(few).toContain("أصناف");
    expect(many).toContain("200 صنف");
  });
});

describe("capRows", () => {
  it("produces one row per quantitative cap with a value per plan", () => {
    // Arrange
    const plans = [
      PLAN({ id: 1, name: "Free", nameAr: "مجاني", maxItems: 10, maxOrders: 100 }),
      PLAN({
        id: 3,
        name: "Premium",
        nameAr: "بريميوم",
        maxItems: 200,
        maxOrders: 2000,
        maxMenus: 9999,
      }),
    ];
    // Act
    const rows = capRows(plans);
    // Assert
    expect(rows.map((r) => r.label)).toEqual([
      "المنيوهات",
      "الأصناف",
      "الطلبات الشهرية",
    ]);
    expect(rows[0].values.length).toBe(2);
    // Free: 1 menu → dual; Premium: the sentinel names its enforced number
    expect(rows[0].values[0]).toContain("منيو واحد");
    expect(rows[0].values[1]).toBe("حتى 9999 منيو");
  });
});

describe("hasFeature / featureMatrix", () => {
  it("matches feature text loosely across plan wording variants", () => {
    // Arrange
    const features = ["برنامج ولاء متكامل", "QR كود مخصص"];
    // Act + Assert
    expect(hasFeature(features, ["loyalty", "ولاء"])).toBe(true);
    expect(hasFeature(features, ["qr"])).toBe(true);
    expect(hasFeature(features, ["csv"])).toBe(false);
  });

  it("builds one boolean cell per plan per qualitative feature", () => {
    // Arrange
    const plans = [
      PLAN({
        id: 1,
        name: "Free",
        features: ["منيو رقمي تفاعلي", "طلبات واتساب"],
      }),
      PLAN({
        id: 4,
        name: "Pro",
        features: ["جميع ميزات المجانية", "طلبات واتساب", "برنامج ولاء متكامل", "إحالات", "تصدير CSV"],
      }),
    ];
    // Act
    const matrix = featureMatrix(plans);
    // Assert — every row has one cell per plan
    for (const row of matrix) {
      expect(row.values.length).toBe(plans.length);
    }
    // Loyalty: only Pro has it
    const loyaltyRow = matrix.find((row) => row.key === "loyalty");
    expect(loyaltyRow?.values).toEqual([false, true]);
    // WhatsApp ordering: both have it
    const whatsappRow = matrix.find((row) => row.key === "whatsapp");
    expect(whatsappRow?.values).toEqual([true, true]);
    // CSV export: only Pro
    const csvRow = matrix.find((row) => row.key === "csv");
    expect(csvRow?.values).toEqual([false, true]);
  });
});

describe("itemsPhrase", () => {
  it("renders the headline differentiator phrase with correct plural", () => {
    // Arrange
    const free = PLAN({ name: "Free", maxItems: 10 });
    const pro = PLAN({ name: "Pro", maxItems: 1000 });
    const ent = PLAN({ name: "Enterprise", maxItems: 9999 });
    // Act + Assert
    expect(itemsPhrase(free)).toContain("10 أصناف");
    expect(itemsPhrase(pro)).toContain("1000 صنف");
    expect(itemsPhrase(ent)).toBe("حتى 9999 صنف");
  });
});

/* P13-2b (T3) — in-card limit dedup: ONE limit surface per card. The DB
 * feature strings stay untouched (source of truth); the RENDER layer drops
 * the exact cap restatements of whatever the card already shows computed. */
describe("filterLimitFeatures", () => {
  it("drops the cap restatements of the shown caps, keeps everything else verbatim", () => {
    // Arrange — the production-ladder wording families (r92 texts + P13-2b seed)
    const pro = PLAN({
      name: "Pro",
      maxMenus: 3,
      maxItems: 9999,
      maxOrders: 99999,
      features: [
        "جميع ميزات بريميوم",
        "حتى 3 منيوهات", // menus restatement (computed style)
        "أصناف حتى 9999", // items restatement (r92-law style)
        "طلبات حتى 99999", // orders restatement (r92-law style)
        "برنامج إحالات",
      ],
    });
    // Act — a /pricing-style card shows ALL three caps computed
    const out = filterLimitFeatures(pro.features, pro, ["menus", "items", "orders"]);
    // Assert
    expect(out).toEqual(["جميع ميزات بريميوم", "برنامج إحالات"]);
  });

  it("bare-count features («10 أصناف» / «50 صنف») are deduped by the same rule (built from the plan's numbers)", () => {
    // Arrange
    const free = PLAN({ name: "Free", maxItems: 10, features: ["منيو رقمي تفاعلي", "10 أصناف", "طلبات واتساب"] });
    const basic = PLAN({ name: "Basic", maxItems: 50, features: ["50 صنف", "طلبات واتساب"] });
    // Act — the /subscribe PlanSelector card shows only the items cap (itemsPhrase)
    expect(filterLimitFeatures(free.features, free, ["items"])).toEqual(["منيو رقمي تفاعلي", "طلبات واتساب"]);
    expect(filterLimitFeatures(basic.features, basic, ["items"])).toEqual(["طلبات واتساب"]);
  });

  it("caps NOT shown in the card survive (PlanSelector shows items only — menus/orders lines stay)", () => {
    // Arrange
    const pro = PLAN({
      name: "Pro",
      maxMenus: 3,
      maxItems: 9999,
      features: ["حتى 3 منيوهات", "أصناف حتى 9999", "دعم فني فوري"],
    });
    // Act
    const out = filterLimitFeatures(pro.features, pro, ["items"]);
    // Assert — the menus line is the card's only menus statement → kept
    expect(out).toEqual(["حتى 3 منيوهات", "دعم فني فوري"]);
  });

  it("trim-tolerant exact match (stray DB whitespace never dodges the filter) and qualitative look-alikes survive", () => {
    // Arrange
    const plan = PLAN({ maxItems: 100, features: ["  أصناف حتى 100  ", "إحصائيات حتى 100 يوم أرشفة"] });
    // Act
    const out = filterLimitFeatures(plan.features, plan, ["items"]);
    // Assert — restatement dropped; the feature that merely MENTIONS a number stays
    expect(out).toEqual(["إحصائيات حتى 100 يوم أرشفة"]);
  });
});
