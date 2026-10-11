import Image from 'next/image';

/* r141 (task 2-a) — HeroPlate «الطبق السينمائي»: the culinary hero object
 * that gives Smart-Menu its own personality beside the shared Orbit-Ink
 * copy column.
 *
 * Composition (all presentation lives in landing.css §24 — zero JS):
 *   · .ln-hero-plate-glow  — the warm ember halo, one blurred solid circle
 *     (no gradient site — the parity allowlist stays untouched).
 *   · .ln-hero-plate-arc   — an organic pill hairline peeking from behind
 *     the plate (radius ladder: --r-full).
 *   · .ln-hero-plate-media — the dish in a 28px frame, melting into the
 *     ink ground through inset box-shadow veils, with two slow CSS steam
 *     wisps rising off it.
 *   · .ln-hero-chips       — floating section chips (warm glass pills,
 *     slow float); ≤1024px they demote to a wrapping row under the plate.
 *
 * LCP doctrine: this component renders AFTER the copy column and never
 * gates it — the h1/sub paint server-side with their existing behaviour.
 * The dish is above the fold on desktop, so the image rides `priority`
 * with honest sizes; the composition is decorative-adjacent but carries
 * a real alt (it IS content), while the glow/arc/steam are aria-hidden.
 *
 * Server component: no state, no effects, no 'use client'.
 */
export function HeroPlate() {
  return (
    <div className="ln-hero-visual">
      <div className="ln-hero-plate-wrap">
        <span className="ln-hero-plate-glow" aria-hidden="true" />
        <span className="ln-hero-plate-arc" aria-hidden="true" />

        <div className="ln-hero-plate-media">
          <Image
            src="/images/culinary/hero-dish.png"
            alt="طبق رئيسي بإضاءة دافئة وشموع على طاولة مسائية — لقطة سينمائية من الأعلى"
            fill
            priority
            sizes="(max-width: 1024px) 92vw, 38vw"
            className="ln-hero-plate-img"
          />
          <span className="ln-steam s1" aria-hidden="true" />
          <span className="ln-steam s2" aria-hidden="true" />
        </div>

        <ul className="ln-hero-chips">
          <li className="ln-hero-chip">
            <span className="ln-hero-chip-dot" aria-hidden="true" />
            مشروبات ساخنة
          </li>
          <li className="ln-hero-chip">
            <span className="ln-hero-chip-dot" aria-hidden="true" />
            حلويات
          </li>
          <li className="ln-hero-chip">
            <span className="ln-hero-chip-dot" aria-hidden="true" />
            مقبلات
          </li>
        </ul>
      </div>
    </div>
  );
}
