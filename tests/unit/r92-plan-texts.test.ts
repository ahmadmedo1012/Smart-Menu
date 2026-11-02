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
 *
 * P42 (Wave-1 fix 1+5) extends the same law to the PRICING CARD RENDER: the
 * three limit leader rows (المنيو/الأصناف/الطلبات) must be plain, instant
 * text whose first frame is the final frame — and what they show must equal
 * the sold ladder in default-plans.json (see the last describe below).
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { DEFAULT_PLANS as SEED_PLANS_RAW } from '../../scripts/ci-seed.mjs';
// r93-N2 (F3/H-2): تغطية نصف الحقيقة المفقود — نفس الثوابت التي يكتبها
// مسار /api/seed (المصدر المشترك) حتى يصبح افتراقه عن ci-seed مستحيلًا.
// scripts/ مستثنى من tsconfig ولا يستنتج TS نوع JSON.parse — نصرّح بالنوع المشترك.
import { DEFAULT_PLANS as API_DEFAULT_PLANS, type DefaultPlan } from '@/lib/default-plans';
import type { Plan } from '@/lib/plan-types';
import { formatPrice } from '@/lib/format';
const DEFAULT_PLANS: DefaultPlan[] = SEED_PLANS_RAW;

/* P42 render half — the same SSR-runtime stubs the r121-subscribe-ssr tests
 * use: the page Header needs next/navigation at runtime, and next/image
 * cannot resolve the Next loader under plain renderToString (the brand mark
 * is not what these tests pin). vi.mock is hoisted above the import below. */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/pricing',
}));

vi.mock('next/image', () => ({
  default: ({ priority: _p, ...props }: Record<string, unknown> & { priority?: boolean }) =>
    createElement('img', props),
}));

import { PricingClient } from '@/components/pricing/PricingClient';

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
   * moves, so the drift can never re-appear silently.
   *
   * P40-5c (P3-4): the LIVE nameAr values (أساسي/احترافي/شركات — no ال,
   * matching /api/plans at 2026-10-31) replace the drifted seed-only
   * spellings (الأساسية/الاحترافية/الشركات), and the FEATURES arrays are
   * pinned too — the original drift was exactly nameAr + bullets. */
  const LADDER = [
    {
      name: 'Free', nameAr: 'مجاني', price: 0, maxMenus: 1, maxItems: 10, maxOrders: 100,
      features: ['منيو رقمي تفاعلي', '10 أصناف', 'طلبات واتساب', 'إحصائيات أساسية'],
    },
    {
      name: 'Basic', nameAr: 'أساسي', price: 19, maxMenus: 1, maxItems: 50, maxOrders: 500,
      features: ['منيو رقمي', '50 صنف', 'طلبات حتى 500', 'برنامج ولاء', 'دعم فني'],
    },
    {
      name: 'Premium', nameAr: 'بريميوم', price: 29, maxMenus: 2, maxItems: 100, maxOrders: 1000,
      features: ['جميع ميزات المجانية', 'أصناف حتى 100', 'إحصائيات متقدمة', 'دعم فني فوري'],
    },
    {
      name: 'Pro', nameAr: 'احترافي', price: 129, maxMenus: 3, maxItems: 9999, maxOrders: 99999,
      features: ['حتى 3 منيوهات', 'أصناف حتى 9999', 'طلبات حتى 99999', 'برنامج إحالات', 'إحصائيات متقدمة', 'دعم فوري', 'تصدير CSV'],
    },
    {
      name: 'Enterprise', nameAr: 'شركات', price: 299, maxMenus: 10, maxItems: 9999, maxOrders: 99999,
      features: ['منيوهات حتى 10', 'أصناف حتى 9999', 'طلبات حتى 99999', 'دعم فني فوري'],
    },
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

  it('P40-5c (P3-4): the feature BULLETS mirror the live rows byte-for-byte (the original drift)', () => {
    LADDER.forEach((expected, i) => {
      expect(DEFAULT_PLANS[i]!.features, expected.name).toEqual(expected.features);
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

/* ── P42 (Wave-1 fix 1+5) — the pricing card's limit rows: plain, instant ────
 *
 * THE BUG (live evidence, P42-1a/1c): the three limit leader rows rode the
 * count-up animator — a component whose own contract says «Marketing/hero
 * use only — never for live in-app data» (src/components/ui/CountUp.tsx).
 * Its 0→value animation (1100ms) put «حتى 0» on all three rows in
 * mid-animation screenshots of the LIVE pricing page. The fix renders the
 * values as plain spans — the SSR string is the final string, first frame
 * to last.
 *
 * This block pins the parity on BOTH levels (the r92 law extended to the
 * render): the MAPPING the component builds (`حتى ${cap}` from each plan's
 * own caps), and the ACTUAL component output (PricingClient rendered via
 * the r121-subscribe-ssr renderToString pattern, seeded with DEFAULT_PLANS
 * — the same source the seed/api equality above already locks together, so
 * what the cards SHOW must equal what default-plans.json SELLS):
 *   1) the Free card's three rows: «حتى 1» / «حتى 10» / «حتى 100»;
 *   2) «حتى 0» appears NOWHERE (the screenshot lie cannot re-form);
 *   3) the rendered limit ladder equals the (maxMenus, maxItems, maxOrders)
 *      tuples of default-plans.json for ALL 5 plans — any drift between
 *      what the cards show and what is sold fails here.
 */
describe('P42 — صفوف حدود التسعير: نص فوري يطابق السلم المباع', () => {
  /* (1) the mapping — the exact strings PlanCard builds from each plan. */
  const limitRows = DEFAULT_PLANS.flatMap((p) => [
    `حتى ${p.maxMenus}`,
    `حتى ${p.maxItems}`,
    `حتى ${p.maxOrders}`,
  ]);

  it('الخريطة: صفوف المجاني الثلاثة — حتى 1 / حتى 10 / حتى 100', () => {
    const free = DEFAULT_PLANS.find((p) => p.name === 'Free');
    expect(free).toBeDefined();
    expect([
      `حتى ${free!.maxMenus}`,
      `حتى ${free!.maxItems}`,
      `حتى ${free!.maxOrders}`,
    ]).toEqual(['حتى 1', 'حتى 10', 'حتى 100']);
  });

  it('الخريطة: لا «حتى 0» لأي خطة — سقف صفري كذبة لا تمرّ من هنا', () => {
    expect(limitRows).not.toContain('حتى 0');
    for (const p of DEFAULT_PLANS) {
      for (const cap of [p.maxMenus, p.maxItems, p.maxOrders]) {
        expect(cap, `${p.name} cap`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('الخريطة: السلم الخمسي كاملًا كما يُباع (Free→Enterprise)', () => {
    expect(limitRows).toEqual([
      'حتى 1', 'حتى 10', 'حتى 100', // Free
      'حتى 1', 'حتى 50', 'حتى 500', // Basic
      'حتى 2', 'حتى 100', 'حتى 1000', // Premium
      'حتى 3', 'حتى 9999', 'حتى 99999', // Pro
      'حتى 10', 'حتى 9999', 'حتى 99999', // Enterprise
    ]);
  });

  /* (2) the render — DEFAULT_PLANS in the Plan shape /api/plans (via
   * plans-server.ts) hands the pricing page (r121: the wrapper bakes exactly
   * this mapping in via ISR; ci-seed ↔ /api/seed equality is pinned above). */
  const PLANS: Plan[] = DEFAULT_PLANS.map((p: DefaultPlan, i: number) => ({
    id: i + 1,
    name: p.name,
    nameAr: p.nameAr,
    price: p.price,
    periodDays: p.periodDays,
    features: [...p.features],
    maxMenus: p.maxMenus,
    maxItems: p.maxItems,
    maxOrders: p.maxOrders,
    sortOrder: p.sortOrder,
  }));

  const html = renderToString(createElement(PricingClient, { initialPlans: PLANS }));

  /** The limit leader rows render <span …>حتى N</span> — anchored at the span
   * end so a feature string merely MENTIONING a number can never satisfy the
   * pin (filterLimitFeatures drops the exact restatements; the anchor keeps
   * their return from silently re-counting). */
  const limitSpans = [...html.matchAll(/حتى (\d+)<\/span>/g)].map((m) => Number(m[1]!));
  const spanCounts = new Map<number, number>();
  for (const n of limitSpans) spanCounts.set(n, (spanCounts.get(n) ?? 0) + 1);

  it('البطاقة ترسم صفوف المجاني نصًا فوريًا: حتى 1 / حتى 10 / حتى 100', () => {
    expect(html).toContain('>حتى 1</span>');
    expect(html).toContain('>حتى 10</span>');
    expect(html).toContain('>حتى 100</span>');
  });

  it('«حتى 0» لا يظهر في HTML التسعير إطلاقًا — كذبة منتصف الأنيميشن لا يمكن أن تتشكل مجددًا', () => {
    expect(html).not.toContain('حتى 0');
  });

  it('السلم المرسوم = سقوف default-plans للخطط الخمس كلها (انحراف العرض عن المبيع يفشل هنا)', () => {
    // 3 limit rows per plan, every value from the plan's own caps
    expect(limitSpans).toHaveLength(DEFAULT_PLANS.length * 3);
    const expected = new Map<number, number>();
    for (const p of DEFAULT_PLANS) {
      for (const v of [p.maxMenus, p.maxItems, p.maxOrders]) {
        expected.set(v, (expected.get(v) ?? 0) + 1);
      }
    }
    expect(Object.fromEntries(spanCounts), 'المرسوم «حتى N» مقابل سقوف default-plans').toEqual(
      Object.fromEntries(expected),
    );
  });

  it('كل بطاقة تعرض سعرها المباع: المجاني «مجاني» والمدفوع الرقم الخام', () => {
    for (const p of DEFAULT_PLANS) {
      expect(html, `${p.name} card title`).toContain(`>${p.nameAr}</h2>`);
      if (p.price === 0) {
        // the metric-grade price div (not the nameAr h2) carries the free label
        expect(html, `${p.name} free price`).toContain('>مجاني</div>');
      } else {
        expect(html, `${p.name} paid price`).toContain(
          `>${formatPrice(p.price, { suffix: '' })}</span>`,
        );
      }
    }
  });

  it('بصمة CountUp الـSSR (data-numeric) اختفت من HTML التسعير', () => {
    expect(html).not.toContain('data-numeric');
  });

  it('عقد المصدر: PricingClient لا يلمس العدّاد — وهيرو الهبوط يحتفظ به (مقرّه التسويقي)', () => {
    const pricingSrc = readFileSync(
      fileURLToPath(new URL('../../src/components/pricing/PricingClient.tsx', import.meta.url)),
      'utf8',
    );
    expect(pricingSrc).not.toMatch(/CountUp/);
    // out of scope by design: marketing counters stay on the landing
    const landingSrc = readFileSync(
      fileURLToPath(new URL('../../src/components/landing/HomePage.tsx', import.meta.url)),
      'utf8',
    );
    expect(landingSrc).toContain('CountUp');
  });
});
