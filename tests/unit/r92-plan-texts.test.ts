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

  it('Premium items text matches its enforced cap (P13-2b ladder realignment: 100, not the 9999 sentinel)', () => {
    /* P13-2b ladder realignment: Premium in the production ladder is 29 د.ل
     * (2/100/1000) — the 9999 sentinel moved up to Pro/Enterprise only. The
     * feature text follows the enforced cap (r92 law: «أصناف حتى 100»). */
    const premium = DEFAULT_PLANS.find((p) => p.name === 'Premium');
    expect(premium?.maxItems).toBe(100);
    expect(premium?.features).toContain('أصناف حتى 100');
    // the sentinel now lives ONLY in the two top plans
    for (const p of DEFAULT_PLANS.filter((p) => p.name !== 'Pro' && p.name !== 'Enterprise')) {
      expect(`${p.name}: maxItems=${p.maxItems}`).not.toContain('9999');
      expect(`${p.name}: maxMenus=${p.maxMenus}`).not.toContain('9999');
    }
  });

  it('Free plan lines keep matching its caps (10 items)', () => {
    const free = DEFAULT_PLANS.find((p) => p.name === 'Free');
    expect(free?.maxItems).toBe(10);
    expect(free?.features).toContain('10 أصناف');
  });
});

describe('P13-2b (T2) — the seed ladder mirrors the production 5-plan ladder', () => {
  /* Production is the source of truth (live /api/plans rows — untouched):
   * Free 0 (1/10/100) · Basic 19 (1/50/500) · Premium 29 (2/100/1000) ·
   * Pro 129 (3/9999/99999) · Enterprise 299 (10/9999/99999), all 30-day.
   * Before P13-2b the local/CI seed carried only 2 plans (Free + a Premium
   * with the maxMenus=9999 sentinel) — every dev/e2e environment drifted
   * from what production sells. This pin breaks the moment either side
   * moves, so the drift can never re-appear silently. */
  const LADDER = [
    { name: 'Free', nameAr: 'مجاني', price: 0, maxMenus: 1, maxItems: 10, maxOrders: 100 },
    { name: 'Basic', nameAr: 'الأساسية', price: 19, maxMenus: 1, maxItems: 50, maxOrders: 500 },
    { name: 'Premium', nameAr: 'بريميوم', price: 29, maxMenus: 2, maxItems: 100, maxOrders: 1000 },
    { name: 'Pro', nameAr: 'الاحترافية', price: 129, maxMenus: 3, maxItems: 9999, maxOrders: 99999 },
    { name: 'Enterprise', nameAr: 'الشركات', price: 299, maxMenus: 10, maxItems: 9999, maxOrders: 99999 },
  ];

  it('five plans, in sortOrder, with the production prices, caps and period', () => {
    expect(DEFAULT_PLANS.map((p) => p.name)).toEqual(LADDER.map((p) => p.name));
    LADDER.forEach((expected, i) => {
      const p = DEFAULT_PLANS[i];
      expect(p.nameAr).toBe(expected.nameAr);
      expect(p.price).toBe(expected.price);
      expect(p.maxMenus).toBe(expected.maxMenus);
      expect(p.maxItems).toBe(expected.maxItems);
      expect(p.maxOrders).toBe(expected.maxOrders);
      expect(p.periodDays).toBe(30);
      expect(p.sortOrder).toBe(i + 1);
    });
  });

  it('no plan carries the 9999 menus sentinel (r120 value-ladder collapse guard)', () => {
    // zz_round120: Premium maxMenus 9999 → 2 — a cheap plan showing
    // «unlimited menus» above Pro/Enterprise collapses the value ladder.
    for (const p of DEFAULT_PLANS) {
      expect(p.maxMenus).toBeLessThan(9999);
    }
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
    // P13-2b ladder realignment: Premium follows the production ladder (100),
    // not the old local 9999 sentinel
    expect(API_DEFAULT_PLANS.find((p) => p.name === 'Premium')?.maxItems).toBe(100);
    expect(API_DEFAULT_PLANS.find((p) => p.name === 'Premium')?.features).toContain('أصناف حتى 100');
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
