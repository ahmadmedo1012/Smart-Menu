import { DEMO_MENU, DEMO_MENU_URL } from './landing-data';
import { NightKitchenScene, FirstBiteSpot } from './NightKitchenScene';

/* P21-W3-E — «مطبخ الليل»: the authored night-kitchen illustration.
 *
 * P21-B had translated the Banzai grammar into a photographic window
 * (the real ambience photo + the dish close-up). The stock photographs
 * were the remaining quality concern: they read as a generic chandelier
 * steakhouse — zero Arabic-café semiotics, two clashing light
 * temperatures, and a photo family that could never sit beside an
 * illustrated world. W3-E retires BOTH hero photos and authors the
 * window as an inline SVG still-life instead (NightKitchenScene — see
 * its header comment for the full art-direction contract):
 *   · the window paints the product's OWN warm night kitchen (#241811
 *     family): lantern-lit walnut table, dallah + finjan + dates, frozen
 *     steam, halftone night air — flat screen-print fills, heavy ink
 *     outlines, zero gradients, zero loops;
 *   · the printed menu card keeps its exact geometry (real rows, dotted
 *     leaders, RTL money) and its header now carries FirstBiteSpot — the
 *     same illustration language, so the hero reads as ONE authored
 *     composition with the card resting on the illustrated table;
 *   · the kanban homage upgrades to BOLD VERTICAL DISPLAY type
 *     (Banzai's signage energy — see §20.1);
 *   · ONE caption chip stays (a REAL link to the live demo menu);
 *   · no image bytes at all on the hero — the LCP story is pure
 *     server-rendered markup (the h1 paints instantly, the window is
 *     vector in the same paint).
 * Server component: no state, no effects, no 'use client'.
 *
 * P31-C — the composed unit: at ≥1025 the window is the second grid
 * track beside the copy (landing.css §6.2), the stage is a 6/5
 * landscape window, and the RENDERED scene is mirrored (§20.1k) so the
 * card rests on the table's INNER corner — beside the headline — with
 * the dates plate still under it and the dallah + finjan serving on
 * the outer edge (the kanban + the caption chip ride that edge too).
 * The authored SVG itself is untouched.
 */

/** Hero card rows — explicit picks (category, item index) into the REAL
 * demo seed: one honest cross-section of the four live categories. */
const HERO_ROWS = DEMO_MENU.map((c) => ({ cat: c, item: c.items[0]! }));

export function HeroTable() {
  return (
    <div className="ln-hero-visual">
      <div className="ln-hero-stage">
        {/* the restaurant window — the authored night-kitchen scene */}
        <figure className="ln-scene">
          <NightKitchenScene />

          {/* kanban homage — BOLD vertical display tag on the window edge
              (Banzai's signage → Arabic vertical display type) */}
          <span className="ln-scene-kanban" aria-hidden="true">
            مقهى الواحة · مساءً
          </span>

          {/* the ONE caption chip — a real link into the live demo menu */}
          <a href={DEMO_MENU_URL} className="ln-scene-caption" title="جرّب المنيو الحي — منيو مقهى الواحة التجريبي">
            <span className="ln-mono">المنيو الحي</span>
            <span className="ln-scene-caption-sub">مقهى الواحة · تجربة حقيقية</span>
          </a>
        </figure>

        {/* the printed menu card resting on the table's INNER corner —
            beside the copy across the grid gutter (P31-C; the mirrored
            scene keeps the dates plate under it, the dallah on the far
            side) — real items, real prices, printed-menu dotted leaders;
            the appetite spot (FirstBiteSpot) rides its header in the same
            authored illustration family as the window behind it */}
        <aside className="ln-hero-card" aria-label="نموذج من منيو مقهى الواحة الحي">
          <div className="ln-hero-card-spot">
            <FirstBiteSpot />
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
