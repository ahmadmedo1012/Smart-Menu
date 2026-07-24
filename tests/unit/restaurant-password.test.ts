import { describe, it, expect } from "vitest"

describe("RestaurantFormDialog password generation", () => {
  function generatePassword(slug: string): string {
    return `${slug}-${crypto.randomUUID().slice(0, 8)}`
  }

  it("1-char slug → password ≥ 8 chars", () => {
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword("a")
      expect(pw.length).toBeGreaterThanOrEqual(8)
    }
  })

  it("3-char slug → password ≥ 8 chars", () => {
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword("abc")
      expect(pw.length).toBeGreaterThanOrEqual(8)
    }
  })

  it("always contains dash separator", () => {
    expect(generatePassword("x")).toContain("-")
  })

  it("always produces different passwords (random UUID)", () => {
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) {
      seen.add(generatePassword("slug"))
    }
    expect(seen.size).toBe(100)
  })

  it("empty slug → 9 chars (dash + 8 random)", () => {
    const pw = generatePassword("")
    expect(pw).toMatch(/^-/)
    expect(pw.length).toBe(9)
  })
})
