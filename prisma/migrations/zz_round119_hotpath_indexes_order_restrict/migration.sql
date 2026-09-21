-- r119-S7 (data deep audit): three schema changes, evidence in
-- docs/rounds/audits/r119/S7-findings.md
--
-- 1) AuditLog(action, createdAt): the admin audit-log list filters by action
--    and sorts by createdAt DESC — measured 28.3ms + 70,289 buffers worst case
--    vs 0.05ms with the index (566x, local 200k-row benchmark).
-- 2) MenuItem(categoryId, sortOrder): staff list + public menu render order
--    — measured 135ms + 11.6MB external sort at 100k items without it.
-- 3) Order.restaurant ON DELETE CASCADE -> RESTRICT: cascade silently wiped
--    financial history when a restaurant row was deleted (super_admin path +
--    any direct SQL). The API guard (r118-B2, 409 with orders) is now backed
--    by the database; the API maps P2003 to the same friendly 409.

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_sortOrder_idx" ON "MenuItem"("categoryId", "sortOrder");

-- AlterForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_restaurantId_fkey";
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
