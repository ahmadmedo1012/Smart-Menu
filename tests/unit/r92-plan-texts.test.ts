/**
 * round92-A3+A4 (agent 2-c) — plan feature-text ↔ enforced-cap consistency.
 *
 * Live production evidence (agent 1-a): the pricing promises contradicted the
 * caps subscription-guard enforces (Basic «طلقات غير محدودة» typo + maxOrders
 * 500 · Premium «أصناف غير محدودة» vs maxItems 100 · Pro «200 صنف» vs 9999 ·
 * Enterprise «منيوهات غير محدودة» vs 10). Decision: TEXT follows ENFORCEMENT.
 *
 * The fix ships as a data migration (20260907_round92_plan_texts) + the
 * ci-seed upsert carrying the corrected texts. These tests pin BOTH halves
 * without touching a live DB:
 *   1) DEFAULT_PLANS (scripts/ci-seed.mjs — imported pure, argv-guarded) can
 *      never re-introduce the typo or an «غير محدودة» promise;
 *   2) the migration SQL keeps its safety contract: name-keyed (portable
 *      slugs, never environment ids), cap-guarded (writes the number the row
 *      actually enforces), LIKE-guarded (idempotent), and the typo replace
 *      runs BEFORE the Basic orders replace (order-sensitive chain).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PLANS as SEED_PLANS_RAW } from '../../scripts/ci-seed.mjs';
// r93-N2 (F3/H-2): تغطية نصف الحقيقة المفقود — نفس الثوابت التي يكتبها
// مسار /api/seed (المصدر المشترك) حتى يصبح افتراقه عن ci-seed مستحيلًا.
// scripts/ مستثنى من tsconfig ولا يستنتج TS نوع JSON.parse — نصرّح بالنوع المشترك.
import { DEFAULT_PLANS as API_DEFAULT_PLANS, type DefaultPlan } from '@/lib/default-plans';
const DEFAULT_PLANS: DefaultPlan[] = SEED_PLANS_RAW;

const MIGRATION_SQL = readFileSync(
  fileURLToPath(new URL('../../prisma/migrations/20260907_round92_plan_texts/migration.sql', import.meta.url)),
  'utf8'
);

const SEED_ROUTE_SRC = readFileSync(
  fileURLToPath(new URL('../../src/app/api/seed/route.ts', import.meta.url)),
  'utf8'
);

const EXPECTED_FIXES: { plan: string; oldText: string; newText: string; cap: string }[] = [
  { plan: 'Basic', oldText: 'طلقات غير محدودة', newText: 'طلبات غير محدودة', cap: 'name-only' },
  { plan: 'Basic', oldText: 'طلبات غير محدودة', newText: 'طلبات حتى 500', cap: '"maxOrders" = 500' },
  { plan: 'Premium', oldText: 'أصناف غير محدودة', newText: 'أصناف حتى 100', cap: '"maxItems" = 100' },
  { plan: 'Premium', oldText: 'أصناف غير محدودة', newText: 'أصناف حتى 9999', cap: '"maxItems" = 9999' },
  { plan: 'Pro', oldText: '200 صنف', newText: 'أصناف حتى 9999', cap: '"maxItems" = 9999' },
  { plan: 'Pro', oldText: 'طلبات غير محدودة', newText: 'طلبات حتى 99999', cap: '"maxOrders" = 99999' },
  { plan: 'Enterprise', oldText: 'منيوهات غير محدودة', newText: 'منيوهات حتى 10', cap: '"maxMenus" = 10' },
  { plan: 'Enterprise', oldText: 'أصناف غير محدودة', newText: 'أصناف حتى 9999', cap: '"maxItems" = 9999' },
  { plan: 'Enterprise', oldText: 'طلبات غير محدودة', newText: 'طلبات حتى 99999', cap: '"maxOrders" = 99999' },
];

describe('round92-A3/A4 — ci-seed DEFAULT_PLANS carry the corrected texts', () => {
  it('no plan feature carries the «طلقات» typo (A3)', () => {
    for (const p of DEFAULT_PLANS) {
      for (const f of p.features) {
        expect(f).not.toContain('طلقات');
      }
    }
  });

  it('no plan feature promises «غير محدودة» — every line names the enforced number (A4)', () => {
    for (const p of DEFAULT_PLANS) {
      for (const f of p.features) {
        expect(`${p.name}: ${f}`).not.toContain('غير محدودة');
      }
    }
  });

  it('Premium items text matches its maxItems sentinel (9999)', () => {
    const premium = DEFAULT_PLANS.find((p) => p.name === 'Premium');
    expect(premium?.maxItems).toBe(9999);
    expect(premium?.features).toContain('أصناف حتى 9999');
  });

  it('Free plan lines keep matching its caps (10 items)', () => {
    const free = DEFAULT_PLANS.find((p) => p.name === 'Free');
    expect(free?.maxItems).toBe(10);
    expect(free?.features).toContain('10 أصناف');
  });
});

describe('r93-N2 — /api/seed يتغذى من المصدر المشترك نفسه (F3/H-2)', () => {
  it('مسار البذرة يستورد DEFAULT_PLANS من @/lib/default-plans (لا نسخة محلية بعد الآن)', () => {
    // قبل r93 كان للمسار ثابته المحلي حاملًا كذبة «أصناف غير محدودة»
    expect(SEED_ROUTE_SRC).toMatch(/from ["']@\/lib\/default-plans["']/);
    expect(SEED_ROUTE_SRC).not.toMatch(/const DEFAULT_PLANS\s*=\s*\[/);
    // لا بيانات خطة حرفية داخل المسار — كل نصوص الميزات من المصدر الواحد
    // (التعليقات التوثيقية قد تذكر الكذبة التاريخية نصًا، فالفحص على
    // absence of features: arrays لا على العبارة نفسها)
    expect(SEED_ROUTE_SRC).not.toMatch(/features\s*:/);
  });

  it('خطط مسار API مطابقة حرفيًا لخطط ci-seed (المصدر الواحد: src/lib/default-plans.json)', () => {
    // لو عدّل أحدهما نسخته دون الأخرى انكسر هذا التطابق فورًا
    expect(API_DEFAULT_PLANS).toEqual(DEFAULT_PLANS);
  });

  it('خطط مسار API لا تحمل وعد «غير محدودة» — النصف الذي كان مكشوفًا قبل r93', () => {
    for (const p of API_DEFAULT_PLANS) {
      for (const f of p.features) {
        expect(`${p.name}: ${f}`).not.toContain('غير محدودة');
      }
    }
    expect(API_DEFAULT_PLANS.find((p) => p.name === 'Premium')?.maxItems).toBe(9999);
    expect(API_DEFAULT_PLANS.find((p) => p.name === 'Premium')?.features).toContain('أصناف حتى 9999');
  });
});

describe('round92-A3/A4 — data migration safety contract', () => {
  it('contains one guarded UPDATE per documented fix (9 statements)', () => {
    const updates = MIGRATION_SQL.match(/UPDATE "SubscriptionPlan"/g) ?? [];
    expect(updates).toHaveLength(EXPECTED_FIXES.length);
  });

  for (const fix of EXPECTED_FIXES) {
    it(`${fix.plan}: ${JSON.stringify(fix.oldText)} → ${JSON.stringify(fix.newText)} is name-keyed, cap-guarded and idempotent`, () => {
      // the replace pair exists
      expect(MIGRATION_SQL).toContain(`replace("features"::text, '${fix.oldText}', '${fix.newText}')`);
      // …inside a statement scoped to THIS plan name (portable slug, never ids)
      // ('name-only' = the pure typo fix — no cap guard by design: spelling is
      // unconditionally wrong, whatever the limit happens to be)
      const stmt = MIGRATION_SQL.split(/;\s*\n/).find(
        (s) =>
          s.includes(`'${fix.newText}'`) &&
          s.includes(`name = '${fix.plan}'`) &&
          (fix.cap === 'name-only' ? true : s.includes(fix.cap))
      );
      expect(stmt, `statement for ${fix.plan} → ${fix.newText}`).toBeDefined();
      // …guarded by the enforced cap AND a LIKE on the affected text (idempotency)
      expect(stmt).toContain(`name = '${fix.plan}'`);
      if (fix.cap !== 'name-only') expect(stmt).toContain(fix.cap);
      expect(stmt).toContain(`LIKE '%${fix.oldText}%'`);
      // …and it casts safely back to jsonb
      expect(stmt).toContain('::jsonb');
    });
  }

  it('the «طلقات» typo replace runs BEFORE the Basic orders replace (order-sensitive chain)', () => {
    const typoIdx = MIGRATION_SQL.indexOf("replace(\"features\"::text, 'طلقات غير محدودة', 'طلبات غير محدودة')");
    const basicIdx = MIGRATION_SQL.indexOf("replace(\"features\"::text, 'طلبات غير محدودة', 'طلبات حتى 500')");
    expect(typoIdx).toBeGreaterThanOrEqual(0);
    expect(basicIdx).toBeGreaterThan(typoIdx);
  });

  it('never keys a fix on numeric ids (portable across environments: prod 86-90 ≠ local 1-2)', () => {
    expect(MIGRATION_SQL).not.toMatch(/WHERE id\s*=/);
    expect(MIGRATION_SQL).not.toMatch(/WHERE\s+\"?id\"?\s*=/);
  });
});
