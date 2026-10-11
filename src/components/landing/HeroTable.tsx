import Image from 'next/image';
import { DEMO_MENU } from './landing-data';

/* r142 (task 2-b) — HeroTable «مائدة أول لقمة»: the hero's warm editorial
 * composition, replacing the r141 cinematic plate + floating chips (the
 * owner rejected that attempt as an incremental overlay).
 *
 * The composition is the المائدة concept itself in miniature:
 *   · .ln-hero-glow   — the ONE sanctioned warm radial (paper light pool
 *     behind the dish, α 0.12 — the new allowlist's single gradient site).
 *   · .ln-hero-dish   — the r141 hero photo (now hero-dish.webp) in a tall
 *     paper arch frame (قوس المائدة), melting into the page via inset
 *     veils, with two slow steam wisps (cream vapor on paper).
 *   · .ln-hero-card   — a REAL menu card leaning against the dish: a 3D
 *     CSS tilt (static perspective transform, no JS, no hover jitter)
 *     carrying four REAL rows from the platform's live demo menu
 *     (/menu/al-waha-cafe — مقهى الواحة, the seed rows in landing-data.ts),
 *     with dotted price leaders exactly like a printed menu. A gentle
 *     7s float breathes life into it; prefers-reduced-motion kills it.
 *
 * LCP doctrine: rendered AFTER the copy column, never gating it. The
 * dish is above the fold on desktop → `priority` with honest sizes; the
 * card is server-rendered HTML (no hydration gate). The glow/steam are
 * aria-hidden; the card and dish carry real content.
 *
 * Server component: no state, no effects, no 'use client'.
 */

/** Hero card rows — explicit picks (category, item index) into the REAL
 * demo seed: one honest cross-section of the four live categories. */
const HERO_ROWS = DEMO_MENU.map((c) => ({ cat: c, item: c.items[0]! }));

export function HeroTable() {
  return (
    <div className="ln-hero-visual">
      <div className="ln-hero-stage">
        <span className="ln-hero-glow" aria-hidden="true" />

        <div className="ln-hero-dish">
          <Image
            src="/images/culinary/hero-dish.webp"
            alt="مائدة دافئة بطبق رئيسي وإضاءة مسائية — اللقمة الأولى قبل أن تُقلب صفحة المنيو"
            fill
            priority
            sizes="(max-width: 1024px) 92vw, 40vw"
            className="ln-hero-dish-img"
          />
          <span className="ln-steam s1" aria-hidden="true" />
          <span className="ln-steam s2" aria-hidden="true" />
        </div>

        {/* the leaning menu card — real items, real prices, printed-menu
            dotted leaders; the only 3D object on the page (static tilt) */}
        <aside className="ln-hero-card" aria-label="نموذج من منيو مقهى الواحة الحي">
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
