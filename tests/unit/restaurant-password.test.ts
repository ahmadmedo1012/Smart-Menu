// round92-C1: كان مرآة — الآن يستورد الإنتاج الحقيقي.
// كان الملف ينسخ قالب كلمة المرور محليًا (`${slug}-${uuid.slice(0,8)}`) ويختبر
// النسخة؛ الآن يستورد generateOwnerPassword الحقيقية من RestaurantFormDialog
// (تصدير قابلية اختبار r92-C1 — نفس التعبير الحرفي) ويوكّد عليها وعلى سياسة
// الإنتاج الفعلية: passwordOptional/PASSWORD_MIN_LENGTH (الحد الذي تفرضه
// POST /api/restaurants على كلمات مرور المالكين المولَّدة).
import { describe, it, expect } from "vitest";
import { generateOwnerPassword } from "@/app/(protected)/admin/restaurants/RestaurantFormDialog";
import { passwordOptional } from "@/lib/validation";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";

describe("RestaurantFormDialog password generation", () => {
  it("1-char slug → password ≥ 8 chars", () => {
    for (let i = 0; i < 20; i++) {
      const pw = generateOwnerPassword("a");
      expect(pw.length).toBeGreaterThanOrEqual(8)
      // ← سياسة الإنتاج: كلمة المرور المولَّدة يجب أن تعبر تحقق الخادم
      expect(passwordOptional.safeParse(pw).success).toBe(true)
    }
  })

  it("3-char slug → password ≥ 8 chars", () => {
    for (let i = 0; i < 20; i++) {
      const pw = generateOwnerPassword("abc")
      expect(pw.length).toBeGreaterThanOrEqual(8)
      expect(passwordOptional.safeParse(pw).success).toBe(true)
    }
  })

  it("always contains dash separator", () => {
    expect(generateOwnerPassword("x")).toContain("-")
  })

  it("always produces different passwords (random UUID)", () => {
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) {
      seen.add(generateOwnerPassword("slug"))
    }
    expect(seen.size).toBe(100)
  })

  it("empty slug → 9 chars (dash + 8 random)", () => {
    const pw = generateOwnerPassword("")
    expect(pw).toMatch(/^-/)
    expect(pw.length).toBe(9)
    // أقصر صيغة يولّدها الحوار يجب أن تظل فوق حد الخادم — إن رُفع الحد
    // فوق 9 انكسر هذا الاختبار (انجراف حقيقي بين المولِّد والسياسة).
    expect(pw.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH)
    expect(passwordOptional.safeParse(pw).success).toBe(true)
  })
})
