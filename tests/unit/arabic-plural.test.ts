/**
 * Arabic pluralization rules — the six noun-number states.
 * getArabicPlural must pick singular/dual/plural per classical rules:
 * 0 zero-form, 1 singular, 2 dual, 3-10 plural, 11+ singular.
 */
import { describe, it, expect } from "vitest";
import { getArabicPlural, arabicNumberState } from "@/lib/arabic-plural";

describe("arabicNumberState classification", () => {
  it("classifies boundary values into the five states", () => {
    // Arrange
    const cases: Array<[number, string]> = [
      [0, "zero"],
      [1, "one"],
      [2, "two"],
      [3, "few"],
      [10, "few"],
      [11, "many"],
      [100, "many"],
    ];

    for (const [n, expected] of cases) {
      expect(arabicNumberState(n)).toBe(expected);
    }
  });

  it("rejects negative and non-integer counts", () => {
    expect(() => arabicNumberState(-1)).toThrow(RangeError);
    expect(() => arabicNumberState(1.5)).toThrow(RangeError);
    expect(() => arabicNumberState(NaN)).toThrow(RangeError);
  });
});

describe("getArabicPlural — positional form (count, singular, dual?, plural?)", () => {
  it("uses singular for 11+ (many state)", () => {
    // 15 صنف
    expect(getArabicPlural(15, "صنف", "صنفان", "أصناف")).toBe("صنف");
    expect(getArabicPlural(100, "صنف", "صنفان", "أصناف")).toBe("صنف");
  });

  it("uses plural for 3-10 (few state)", () => {
    // 5 أصناف
    expect(getArabicPlural(5, "صنف", "صنفان", "أصناف")).toBe("أصناف");
    expect(getArabicPlural(3, "طلب", undefined, "طلبات")).toBe("طلبات");
    expect(getArabicPlural(10, "طلب", undefined, "طلبات")).toBe("طلبات");
  });

  it("uses dual for exactly 2", () => {
    // صنفان
    expect(getArabicPlural(2, "صنف", "صنفان", "أصناف")).toBe("صنفان");
    expect(getArabicPlural(2, "مطعم")).toBe("مطعمان");
  });

  it("uses singular for exactly 1", () => {
    expect(getArabicPlural(1, "صنف", "صنفان", "أصناف")).toBe("صنف");
  });

  it("uses zero form 'لا <plural>' for 0 by default", () => {
    expect(getArabicPlural(0, "صنف", "صنفان", "أصناف")).toBe("لا أصناف");
    expect(getArabicPlural(0, "طلب", undefined, "طلبات")).toBe("لا طلبات");
  });

  it("derives sound feminine plural from ة nouns when plural omitted", () => {
    // طبقة → طبقات
    expect(getArabicPlural(4, "طبقة")).toBe("طبقات");
    expect(getArabicPlural(7, "طبقة", "طبقتان")).toBe("طبقات");
  });

  it("falls back to sound masculine plural when no plural given for a non-ة noun", () => {
    // صنف → صنفون (mechanical; call sites should pass broken plurals explicitly)
    expect(getArabicPlural(4, "صنف")).toBe("صنفون");
  });
});

describe("getArabicPlural — object forms (broken plurals, custom zero/one)", () => {
  it("supports custom zero wording", () => {
    expect(
      getArabicPlural(0, "طلب", { few: "طلبات", zero: "لا توجد طلبات" })
    ).toBe("لا توجد طلبات");
  });

  it("supports explicit one/two/few/many overrides", () => {
    expect(
      getArabicPlural(1, "صنف", { two: "صنفان", few: "أصناف", many: "صنفاً" })
    ).toBe("صنف");
    expect(
      getArabicPlural(12, "صنف", { two: "صنفان", few: "أصناف", many: "صنفاً" })
    ).toBe("صنفاً");
  });

  it("handles feminine dual derivation (قائمة → قائمتان)", () => {
    expect(getArabicPlural(2, "قائمة")).toBe("قائمتان");
  });
});

describe("realistic UI phrases", () => {
  it("renders full count + noun strings as call sites will", () => {
    const items = (n: number) => `${n} ${getArabicPlural(n, "صنف", "صنفان", "أصناف")}`;
    expect(items(0)).toBe("0 لا أصناف"); // caller decides zero rendering
    expect(items(1)).toBe("1 صنف");
    expect(items(2)).toBe("2 صنفان");
    expect(items(5)).toBe("5 أصناف");
    expect(items(23)).toBe("23 صنف");

    const orders = (n: number) =>
      n === 0 ? "لا توجد طلبات" : `${n} ${getArabicPlural(n, "طلب", undefined, "طلبات")}`;
    expect(orders(0)).toBe("لا توجد طلبات");
    expect(orders(1)).toBe("1 طلب");
    expect(orders(3)).toBe("3 طلبات");
    expect(orders(18)).toBe("18 طلب");
  });
});
