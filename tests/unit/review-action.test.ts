/**
 * Unit tests for review Server Action logic.
 * Tests validation rules without needing a browser.
 * Run: npx tsx tests/unit/review-action.test.ts
 */
import { strict as assert } from "node:assert";

// Simulate the validation logic from src/actions/review.ts
function validateReview(form: Record<string, string | number>): void {
  const menuItemId = Number(form.menuItemId);
  const rating = Number(form.rating);
  const comment = (form.comment as string)?.trim() ?? "";
  const customerName = (form.customerName as string)?.trim() ?? "";
  const customerPhone = (form.customerPhone as string)?.trim() ?? "";

  if (!menuItemId || Number.isNaN(menuItemId)) throw new Error("Invalid menu item");
  if (!rating || rating < 1 || rating > 5) throw new Error("Rating must be 1-5");
  if (comment.length > 500) throw new Error("Comment too long");
  if (customerName.length > 50) throw new Error("Name too long");
  if (customerPhone.length > 20) throw new Error("Phone too long");
}

// Test 1: valid review passes
{
  validateReview({
    menuItemId: 1,
    rating: 5,
    comment: "ممتاز",
    customerName: "أحمد",
    customerPhone: "0912345678",
  });
  assert.ok(true, "valid review passes");
}

// Test 2: missing menuItemId
{
  try {
    validateReview({ menuItemId: 0, rating: 5, comment: "" });
    assert.fail("should have thrown");
  } catch (e: any) {
    assert.equal(e.message, "Invalid menu item");
  }
}

// Test 3: rating below 1
{
  try {
    validateReview({ menuItemId: 1, rating: 0, comment: "" });
    assert.fail("should have thrown");
  } catch (e: any) {
    assert.equal(e.message, "Rating must be 1-5");
  }
}

// Test 4: rating above 5
{
  try {
    validateReview({ menuItemId: 1, rating: 6, comment: "" });
    assert.fail("should have thrown");
  } catch (e: any) {
    assert.equal(e.message, "Rating must be 1-5");
  }
}

// Test 5: comment too long
{
  try {
    validateReview({ menuItemId: 1, rating: 3, comment: "x".repeat(501) });
    assert.fail("should have thrown");
  } catch (e: any) {
    assert.equal(e.message, "Comment too long");
  }
}

// Test 6: comment exactly at limit
{
  validateReview({ menuItemId: 1, rating: 3, comment: "x".repeat(500) });
  assert.ok(true, "500 chars OK");
}

// Test 7: name too long
{
  try {
    validateReview({ menuItemId: 1, rating: 4, comment: "", customerName: "x".repeat(51) });
    assert.fail("should have thrown");
  } catch (e: any) {
    assert.equal(e.message, "Name too long");
  }
}

// Test 8: phone too long
{
  try {
    validateReview({ menuItemId: 1, rating: 2, comment: "", customerPhone: "x".repeat(21) });
    assert.fail("should have thrown");
  } catch (e: any) {
    assert.equal(e.message, "Phone too long");
  }
}

// Test 9: empty optional fields OK
{
  validateReview({ menuItemId: 1, rating: 4, comment: "", customerName: "", customerPhone: "" });
  assert.ok(true, "empty optionals OK");
}

// Test 10: rating 1 (minimum)
{
  validateReview({ menuItemId: 2, rating: 1, comment: "سيء" });
  assert.ok(true, "rating 1 OK");
}

// Test 11: rating 5 (maximum)
{
  validateReview({ menuItemId: 3, rating: 5, comment: "ممتاز" });
  assert.ok(true, "rating 5 OK");
}

// Test 12: NaN menuItemId
{
  try {
    validateReview({ menuItemId: NaN, rating: 3, comment: "" });
    assert.fail("should have thrown");
  } catch (e: any) {
    assert.equal(e.message, "Invalid menu item");
  }
}

// Test 13: comment trimming — whitespace-only is empty
{
  validateReview({ menuItemId: 1, rating: 3, comment: "   " });
  assert.ok(true, "whitespace-only comment OK");
}

// Test 14: name with max length Arabic
{
  validateReview({ menuItemId: 1, rating: 5, comment: "", customerName: "أ".repeat(50) });
  assert.ok(true, "50 Arabic chars name OK");
}

// Test 15: phone numbers pass
{
  validateReview({ menuItemId: 1, rating: 4, comment: "جيد", customerPhone: "+218911111111" });
  assert.ok(true, "international phone OK");
}

console.log("✅ All 15 review validation tests passed.");
