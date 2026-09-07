/**
 * r93-N6 (F10/M-3 من تقرير التفتيش 1-c) — نطاق فهرس الدفع المعلق يشمل المطعم.
 *
 * الخلل: الفهرس الفريد الجزئي SubscriptionPayment_pending_user_unique
 * (zz_round90) نطاقه userId فقط — مالكَان مشاركان في مطعم واحد يمكن أن
 * يكون لكلٍّ منهما طلب ترقية معلق لنفس المطعم (فحص الترقية محصور بالمستخدم
 * الطالب — r89-E8) → موافقة الاثنين تحصّل الرسوم مرتين.
 *
 * التعريف النهائي المختار (موثّق في الهجرة وschema.prisma): فريد على
 * (userId, COALESCE(metadata->>'upgradeRestaurantId','')) حيث pending:
 *   - نفس المستخدم + نفس المطعم → مرفوض (يحصّن فحص upgrade ضد التزامن)
 *   - نفس المستخدم + مطعم آخر → مسموح (ترقيات متوازية لمالك متعدد المنيوهات)
 *   - مستخدم مختلف + نفس المطعم → مسموح (r89-E8: طلب مهجور لا يحجب زميلًا؛
 *     منع التكرار عبر المستخدمين مسؤولية طبقة الموافقة — W1-a)
 *   - COALESCE('') يحفظ ضمانة r90 لمسار المستخدم الجديد (طلبان متزامنان
 *     يتصادمان على الزوج (userId,''))
 *
 * الدليل السلوكي الحي (قياس node+pg على قاعدة الجولة 5434 بعد
 * migrate deploy، داخل BEGIN/ROLLBACK مع SAVEPOINT لكل حالة):
 *   1) نفس المستخدم + نفس المطعم (الثانية)   → REJECTED 23505 [SubscriptionPayment_pending_user_restaurant_unique]
 *   2) نفس المستخدم + مطعم مختلف             → ALLOWED
 *   3) مستخدم مختلف + نفس المطعم             → ALLOWED
 *   4أ) مستخدم جديد: أول دفعة pending        → ALLOWED
 *   4ب) مستخدم جديد: ثانية متزامنة           → REJECTED 23505 [نفس الفهرس]
 *   5) صفوف غير pending (verified/cancelled) → ALLOWED (فهرس جزئي)
 *   6) userId=NULL دفعتان معلقتان            → ALLOWED (كما وثّق zz_round90)
 * القياس الحي خارج وحدة vitest عمدًا (CI لا يوفر DATABASE_URL لخطوة
 * الوحدة — صفر skip في جرد الوحدة قاعدة موثقة من تفتيش 1-e)؛ هذه الوحدة
 * تثبّت عقد الهجرة نفسها.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MIGRATION_SQL = readFileSync(
  fileURLToPath(new URL('../../prisma/migrations/zz_round93_pending_payment_scope/migration.sql', import.meta.url)),
  'utf8'
);

const SCHEMA_PRISMA = readFileSync(
  fileURLToPath(new URL('../../prisma/schema.prisma', import.meta.url)),
  'utf8'
);

const OLD_INDEX = 'SubscriptionPayment_pending_user_unique';
const NEW_INDEX = 'SubscriptionPayment_pending_user_restaurant_unique';

describe('r93-N6 — عقد هجرة نطاق فهرس الدفع المعلق', () => {
  it('تُسقط الفهرس القديم (zz_round90) محروسًا بـ IF EXISTS داخل معاملة الهجرة', () => {
    expect(MIGRATION_SQL).toContain(`DROP INDEX IF EXISTS "${OLD_INDEX}"`);
  });

  it('تنشئ الفهرس الفريد الجزئي الجديد بتعبير النطاق (userId + COALESCE restaurant)', () => {
    expect(MIGRATION_SQL).toContain(`CREATE UNIQUE INDEX "${NEW_INDEX}"`);
    expect(MIGRATION_SQL).toContain(
      `ON "SubscriptionPayment"("userId", COALESCE(metadata->>'upgradeRestaurantId', ''))`
    );
    expect(MIGRATION_SQL).toContain(`WHERE status = 'pending'`);
  });

  it('COALESCE(\'\') يسدّ ثقب NULL-distinct: بلا مطعم يظل الزوج (userId, \'\') — طلبان متزامنان لمستخدم جديد يتصادمان', () => {
    // بدون COALESCE كانت دفعات المستخدم الجديد (لا upgradeRestaurantId)
    // تعطي NULL الذي تتعامل معه فهارس PG الفريدة كقيم مختلفة → عودة ثقب
    // الدفع المزدوج الذي أغلقه r90 لمسار المستخدم الجديد
    expect(MIGRATION_SQL).toContain(`COALESCE(metadata->>'upgradeRestaurantId', '')`);
    expect(MIGRATION_SQL).not.toMatch(/COALESCE\(\s*metadata->>'upgradeRestaurantId'\s*\)\s*\)/);
  });

  it('ترتيب التسمية: zz_round93 يُطبَّق بعد zz_round90 (الذي ينشئ الفهرس المُسقَط) وبعد zz_round91', () => {
    // حساسية الترتيب موثقة (L-6): drop يجب أن يأتي بعد create القديم.
    // كلا الترتيبين ASCII وICU يتفقان على zz_round90 < zz_round91 < zz_round93.
    expect('zz_round93_pending_payment_scope' > 'zz_round90_pending_payment_unique').toBe(true);
    expect('zz_round93_pending_payment_scope' > 'zz_round91_referral_conversion_idx').toBe(true);
    // وبعد آخر هجرة مؤرخة بالأرقام (2026*) — zz_* آخر السلسلة في ICU
    expect('zz_round93_pending_payment_scope' > '20260907_round92_plan_texts').toBe(true);
  });

  it('فحص ما قبل التطبيق موثّق في الهجرة (لا تعارض محلي: كل ما يرضي القديم يرضي الجديد)', () => {
    expect(MIGRATION_SQL).toContain('فحص ما قبل التطبيق');
    expect(MIGRATION_SQL).toContain('صفر دفعات pending');
  });

  it('schema.prisma يوثّق الفهرس التعبيري عند SubscriptionPayment (نمط SystemEvent — غائب عن migrate diff عمدًا)', () => {
    expect(SCHEMA_PRISMA).toContain(NEW_INDEX);
    // الفهرس الجزئي/التعبيري غير قابل للتعبير في datamodel — لا يجوز أن
    // يظهر كـ@@index عادي (وإلا انحرف migrate diff)
    expect(SCHEMA_PRISMA).not.toMatch(/@@index\(\[userId[^\]]*\][^\n]*COALESCE/);
  });
});
