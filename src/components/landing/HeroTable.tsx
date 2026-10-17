import Image from 'next/image';
import { DEMO_MENU, DEMO_MENU_URL } from './landing-data';

/* P21-B — «نافذة المطعم»: the Banzai-informed hero staging. The P12-2b
 * three.js kitchen-island diorama is RETIRED (owner rejection: causeless
 * idle bob, drag-spin, floating food props — HERO-ORIGIN.md in
 * p21-research). What replaces it is the reference's actual grammar:
 *   · ONE framed "window into the restaurant world" (Banzai's rounded
 *     visual window) holding the REAL ambience photograph — the scene
 *     lights itself (candle glow, bokeh), exactly like Banzai's
 *     sign-as-key-light staging. No synthetic lights, no fake glow.
 *   · static tension: the composition is FROZEN. No bob, no float, no
 *     steam loops, no twinkle. Motion = one 14px ease-out entrance
 *     (RM-off, intro-seen-calm) and nothing else.
 *   · the kanban homage: a small vertical mono label on the window edge
 *     (Banzai's vertical signage → Arabic rotated mono tag).
 *   · ONE caption chip on the window (Banzai's corner branding) — a REAL
 *     link to the live demo menu. The three comic hotspot pins retire;
 *     /subscribe + /pricing remain live in the header + hero CTAs.
 *   · the leaning menu card stays exactly where it was (real rows,
 *     dotted leaders, RTL money) minus the 7s float — it now READS as a
 *     printed menu resting on the photo's corner (paper-on-world depth).
 * Server component: no state, no effects, no 'use client'.
 */

/** Hero card rows — explicit picks (category, item index) into the REAL
 * demo seed: one honest cross-section of the four live categories. */
const HERO_ROWS = DEMO_MENU.map((c) => ({ cat: c, item: c.items[0]! }));

export function HeroTable() {
  return (
    <div className="ln-hero-visual">
      <div className="ln-hero-stage">
        {/* the restaurant window — the page's ONE priority photograph */}
        <figure className="ln-scene">
          <Image
            src="/images/culinary/ambience.webp"
            alt="مائدة مقهى الواحة مساءً — شموع وأقداح على خشب دافئ، الأجواء نفسها التي يورّثها المنيو"
            fill
            priority
            sizes="(max-width: 1024px) 92vw, 42vw"
            className="ln-scene-photo-img"
          />
          {/* grounding scrim + top fade — legibility for the chip and the
              kanban, never a light source (the photo lights itself) */}
          <span className="ln-scene-veil" aria-hidden="true" />

          {/* kanban homage — vertical mono tag on the window edge */}
          <span className="ln-scene-kanban ln-mono" aria-hidden="true">
            مقهى الواحة · مساءً
          </span>

          {/* the ONE caption chip — a real link into the live demo menu */}
          <a href={DEMO_MENU_URL} className="ln-scene-caption" title="جرّب المنيو الحي — منيو مقهى الواحة التجريبي">
            <span className="ln-mono">المنيو الحي</span>
            <span className="ln-scene-caption-sub">مقهى الواحة · تجربة حقيقية</span>
          </a>
        </figure>

        {/* the printed menu card resting on the window corner — real
            items, real prices, printed-menu dotted leaders; the appetite
            close-up (hero-dish) rides its header as the detail shot */}
        <aside className="ln-hero-card" aria-label="نموذج من منيو مقهى الواحة الحي">
          <div className="ln-hero-card-photo">
            <Image
              src="/images/culinary/hero-dish.webp"
              alt="طبق رئيسي مشوي على مائدة دافئة بإضاءة الشموع — اللقمة الأولى قبل أن تُقلب صفحة المنيو"
              fill
              sizes="(max-width: 1024px) 88vw, 320px"
              className="ln-hero-card-photo-img"
            />
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
