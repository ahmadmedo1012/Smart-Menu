-- round86-B13: index alignment with hot queries + duplicate removal
--
-- Added:
--  * MenuItem(isFeatured, categoryId)      — featured showcase raw query
--    (WHERE isFeatured AND categoryId IN tenant categories)
--  * MenuCategory(restaurantId, isActive, sortOrder) — public menu ordering
--  * Order(restaurantId, createdAt)        — /api/stats date-range counts
--
-- Removed (duplicate write overhead — the @unique constraint on the same
-- column already provides the index):
--  * LoyaltyCard_referralCode_idx
--  * Session_token_idx

CREATE INDEX "MenuItem_isFeatured_categoryId_idx" ON "MenuItem"("isFeatured", "categoryId");
CREATE INDEX "MenuCategory_restaurantId_isActive_sortOrder_idx" ON "MenuCategory"("restaurantId", "isActive", "sortOrder");
CREATE INDEX "Order_restaurantId_createdAt_idx" ON "Order"("restaurantId", "createdAt");

DROP INDEX IF EXISTS "LoyaltyCard_referralCode_idx";
DROP INDEX IF EXISTS "Session_token_idx";
