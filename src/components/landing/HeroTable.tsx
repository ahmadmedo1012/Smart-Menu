import Image from 'next/image';
import type { ReactNode } from 'react';
import { DEMO_MENU, DEMO_MENU_URL } from './landing-data';
import { HotspotPin } from './HotspotPin';

/* r142 (task 2-b) — HeroTable «مائدة أول لقمة», P12-2b (S1/S3) rework:
 * the paper arch + photo plate gave way to the ORIGINAL three.js kitchen
 * island — a floating wooden tea table (steaming teapot, bowls, amber
 * tea glasses, parasol, lantern string) over the plum void, with a soft
 * reflection sheen beneath. The REAL menu card stays exactly where it
 * was — leaning against the world, now carrying the dish photo on its
 * header (the one priority image) so the LCP story keeps a real photo.
 *
 * The S3 hotspot pins are REAL links over the scene objects:
 *   · المنيو الحي  → /menu/al-waha-cafe (the live demo — DEMO_MENU_URL)
 *   · صاحب مطعم    → /subscribe (owner signup — the real CTA route)
 *   · الأسعار      → /pricing (the real pricing route)
 * Focusable, 44px hit floor, aria-labels — the canvas below is decor.
 *
 * Server component: no state, no effects, no 'use client'.
 */

/** Hero card rows — explicit picks (category, item index) into the REAL
 * demo seed: one honest cross-section of the four live categories. */
const HERO_ROWS = DEMO_MENU.map((c) => ({ cat: c, item: c.items[0]! }));

export function HeroTable({ scene }: { scene?: ReactNode }) {
  return (
    <div className="ln-hero-visual">
      <div className="ln-hero-stage">
        {/* the floating island diorama in its rounded comic panel —
            aria-hidden decor (hotspots, card, headline are the real layer) */}
        <div className="ln-scene">
          <div className="ln-island-frame" aria-hidden="true">
            {scene}
          </div>

          {/* S3 — in-world hotspot pins over the scene objects (physical
              anchors: left/top % over the canvas, direction-neutral) */}
          <div className="ln-hotspots">
            <HotspotPin
              href={DEMO_MENU_URL}
              icon="menu"
              label="المنيو الحي"
              title="جرّب المنيو الحي — منيو مقهى الواحة التجريبي"
              style={{ left: '38%', top: '52%' }}
              popDelay={0.45}
            />
            <HotspotPin
              href="/subscribe"
              icon="owner"
              label="صاحب مطعم؟ ابدأ مجاناً"
              title="أنشئ حساب مطعمك — ابدأ مجاناً بدون بطاقة ائتمان"
              style={{ left: '64%', top: '24%' }}
              popDelay={0.62}
            />
            <HotspotPin
              href="/pricing"
              icon="pricing"
              label="الأسعار"
              title="خطط الأسعار — تفاصيل الاشتراك"
              style={{ left: '16%', top: '64%' }}
              popDelay={0.79}
            />
          </div>
        </div>

        {/* the leaning menu card — real items, real prices, printed-menu
            dotted leaders; the dish photo rides its header (priority —
            the page's one eager hero image) */}
        <aside className="ln-hero-card" aria-label="نموذج من منيو مقهى الواحة الحي">
          <div className="ln-hero-card-photo">
            <Image
              src="/images/culinary/hero-dish.webp"
              alt="مائدة دافئة بطبق رئيسي وإضاءة مسائية — اللقمة الأولى قبل أن تُقلب صفحة المنيو"
              fill
              priority
              sizes="(max-width: 1024px) 88vw, 320px"
              className="ln-hero-card-photo-img"
            />
            <span className="ln-steam s1" aria-hidden="true" />
            <span className="ln-steam s2" aria-hidden="true" />
          </div>
          <p className="ln-hero-card-kicker ln-mono">مقهى الواحة · منيو حي</p>
          <ul className="ln-hero-card-rows">
            {HERO_ROWS.map(({ cat, item }) => (
              <li key={cat.key} className="ln-hero-card-row">
                <span className="ln-hero-card-name">
                  <span aria-hidden="true">{cat.icon}</span> {item.name}
                </span>
                <span className="ln-hero-card-leader" aria-hidden="true" />
                {/* r143 (Phase-4 W1 D8): الاتساق الثنائي — كان dir="ltr" يجعل
                    العملة تُقرأ أولًا («3.00 د.ل» بصريًا LTR) بينما المنتج كله
                    RTL-أصيل (الديمو: الرقم يمينًا والعملة يسارًا). إسقاط dir
                    يُسلّم الترتيب للقاعدة RTL فيقرأه العربي: الرقم أولًا.
                    القانون: الأرقام منفصلة LTR، وموضع العملة موحّد على كل
                    الأسطح (DESIGN.md §bidi). */}
                <span className="ln-hero-card-price">
                  {item.price.toFixed(2)} <i>د.ل</i>
                </span>
              </li>
            ))}
          </ul>
          <p className="ln-hero-card-tag">
            امسح الرمز · اطلب من طاولتك
          </p>
        </aside>
      </div>
    </div>
  );
}
