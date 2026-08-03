/**
 * Round 8 — WhatsApp receipt payload verification (unit-style + E2E):
 * the receipt builder produces a complete, correctly-formatted message.
 * Run: npx playwright test tests/e2e/round8-whatsapp.spec.ts --project=qa-teams
 */
import { test, expect } from "@playwright/test";
import { buildReceiptMessage } from "../../src/lib/receipt";

test("receipt: buildReceiptMessage includes all order details", () => {
  const msg = buildReceiptMessage({
    restaurantName: "مقهى الواحة",
    items: [
      { name: "كابتشينو", qty: 2, price: 7.5, notes: "بدون سكر" },
      { name: "كنافة", qty: 1, price: 12 },
    ],
    totalPrice: 27,
    notes: "توصيل للمنزل",
    customerName: "أحمد",
    customerPhone: "0910000088",
    pickupType: "delivery",
    orderNo: "ORD-123",
  });
  // Header + restaurant
  expect(msg).toContain("مقهى الواحة");
  expect(msg).toContain("فاتورة طلب");
  // Order info
  expect(msg).toContain("ORD-123");
  expect(msg).toContain("توصيل");
  // Customer
  expect(msg).toContain("أحمد");
  expect(msg).toContain("0910000088");
  // Items with qty × price = line total
  expect(msg).toContain("كابتشينو");
  expect(msg).toContain("2 × 7.50 د.ل  =  15.00 د.ل");
  expect(msg).toContain("1 × 12.00 د.ل  =  12.00 د.ل");
  // notes on item + order
  expect(msg).toContain("بدون سكر");
  expect(msg).toContain("توصيل للمنزل");
  // Total
  expect(msg).toContain("27.00 د.ل");
  // Footer
  expect(msg).toContain("شكراً لطلبك");
});

test("receipt: price math is exact (no float drift)", () => {
  const msg = buildReceiptMessage({
    restaurantName: "مطعم",
    items: [
      { name: "A", qty: 3, price: 9.99 },
      { name: "B", qty: 2, price: 0.5 },
    ],
    totalPrice: 30.97, // 3*9.99 + 2*0.5 = 29.97 + 1.0 = 30.97
  });
  expect(msg).toContain("3 × 9.99 د.ل  =  29.97 د.ل");
  expect(msg).toContain("2 × 0.50 د.ل  =  1.00 د.ل");
  expect(msg).toContain("30.97 د.ل");
});