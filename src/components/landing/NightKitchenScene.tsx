/* P21-W3-E — «مطبخ الليل»: the authored hero illustration.
 *
 * DIAGNOSIS this replaces: the P21-B window held two STOCK photographs
 * (ambience.webp = a chandelier-and-bokeh "European steakhouse" interior,
 * hero-dish.webp = a Western steak close-up) that read as generic stock,
 * carried zero Arabic-café semiotics, fought the Banzai-inspired direction
 * (two clashing light temperatures, a photo "pasted" next to an illustrated
 * world) and scored 62/100 in art-direction review — the known quality
 * concern the hydration pass (W2-B1r) left untouched.
 *
 * THE REBUILD is reference-led, translated to Smart-Menu's own product
 * identity (Banzai's Japanese-izakaya grammar → the Libyan/Arabic café):
 *   · dark warm ground — the window paints the product's OWN «مطبخ ليلي
 *     دافئ» warm-night-kitchen family (#241811 ground), not Banzai's plum
 *     void and not a stock photo's blacks;
 *   · food-craft texture — a lantern-lit walnut table with authored grain
 *     + a sunk halftone wash, a dallah drawn in its TRUE silhouette (pear
 *     body, flared foot, domed lid + finial spike, long swan-neck spout
 *     hovering over the finjan, tall arcing handle), a plate of dates
 *     (the canonical Arabic welcome), flat matte fills with heavy
 *     structural outlines and a halftone night air (Ben-Day dots) —
 *     screen-print logic, ZERO soft gradients;
 *   · the lantern is the scene's key light (Banzai's sign-as-key-light):
 *     its glow is layered flat shapes + comic ray dashes, and on the night
 *     stage the ember-deep accents turn luminous (the pot catches the
 *     light) — all via CSS custom properties, no JS repaint;
 *   · bold vertical typographic accent — the kanban-style vertical tag on
 *     the window edge (an HTML sibling in HeroTable, styled in §20.1);
 *   · STATIC TENSION: nothing bobs, floats, twinkles or steams in loops.
 *     The steam wisps are frozen authored curves. The only motion on the
 *     window remains the one-shot 14px ln-window-in entrance (RM-off,
 *     intro-seen-calm) that P21-B already pinned.
 *
 * Engineering contract:
 *   · pure SERVER component — no 'use client', no state, no effects;
 *   · deterministic SSR output — no Math.random(), no Date.now(), no
 *     Math in render at all: every coordinate below is a literal. The
 *     hydration contract (W2-B1r) holds by construction;
 *   · all colors ride CSS classes defined in landing.css §20.1k (var() is
 *     not valid inside SVG fill attributes) — tokens only, zero raw hex
 *     in this file;
 *   · preserveAspectRatio="xMidYMax slice": the table stays anchored to
 *     the window's bottom; the ≤640px 4:3 crop takes the sky, never the
 *     still-life.
 */

/* The lantern's comic ray dashes (Banzai's manga glow language): six
 * hardcoded segments radiating from the glass center (352, 285). The
 * top (90°) ray is deliberately absent — the hanging cord owns "up" —
 * and the bottom (270°) ray is absent too: the dallah's finial spike
 * owns "down", and the gap between lantern and pot stays calm. */
const RAYS: ReadonlyArray<ReadonlyArray<number>> = [
  [414, 285, 428, 285],
  [396, 241, 406, 231],
  [308, 241, 298, 231],
  [290, 285, 276, 285],
  [308, 329, 298, 339],
  [396, 329, 406, 339],
];

export function NightKitchenScene() {
  return (
    <svg
      className="lnk-scene"
      viewBox="0 0 480 600"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="رسم توضيحي لمطبخ ليلي دافئ في مقهى الواحة: قنديل معلّق يضيء مائدة خشبية عليها دلة قهوة عربية يتصاعد منها البخار، وفنجان، وصحن تمور"
    >
      <defs>
        {/* halftone night air — one 24px cell, tiled (deterministic) */}
        <pattern id="lnk-dots" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.7" className="lnk-fill-cream" />
        </pattern>
      </defs>

      {/* the night air — two flat halftone bands, denser toward the top */}
      <rect x="0" y="0" width="480" height="250" fill="url(#lnk-dots)" opacity="0.055" />
      <rect x="0" y="250" width="480" height="152" fill="url(#lnk-dots)" opacity="0.026" />

      {/* the warm horizon step — the floor the table stands on */}
      <rect x="0" y="404" width="480" height="38" className="lnk-fill-void-2" />

      {/* the walnut table — lit edge, plank seams, authored grain + a
          faint halftone wash so the wood reads as material, not a flat
          brown slab (same Ben-Day cell as the night air, sunk low) */}
      <rect x="0" y="442" width="480" height="158" className="lnk-fill-wood" />
      <rect x="0" y="446" width="480" height="154" fill="url(#lnk-dots)" opacity="0.03" />
      <rect x="0" y="442" width="480" height="3" className="lnk-fill-wood-hi" />
      <line x1="0" y1="500" x2="480" y2="500" className="lnk-stroke-wood-hi" strokeWidth="1.5" opacity="0.55" />
      <line x1="0" y1="556" x2="480" y2="556" className="lnk-stroke-wood-hi" strokeWidth="1.5" opacity="0.55" />
      <path d="M60 476 q18 -3 34 0" className="lnk-stroke-wood-hi" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M300 480 q20 -3 38 1" className="lnk-stroke-wood-hi" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M120 530 q16 -2 30 0" className="lnk-stroke-wood-hi" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M360 528 q18 -2 34 0" className="lnk-stroke-wood-hi" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M210 576 q16 -2 30 0" className="lnk-stroke-wood-hi" strokeWidth="1.5" fill="none" opacity="0.5" />

      {/* the lantern's light pool on the wood — two flat steps, no gradient */}
      <ellipse cx="368" cy="556" rx="130" ry="28" className="lnk-fill-glow" opacity="0.1" />
      <ellipse cx="368" cy="550" rx="74" ry="15" className="lnk-fill-glow" opacity="0.12" />

      {/* the plate of dates — the table's far side (the card rests over it
          on desktop: paper-on-world depth; phones see it whole) */}
      <ellipse cx="140" cy="436" rx="66" ry="16" className="lnk-fill-cream lnk-stroke-ink" strokeWidth="2.5" />
      <ellipse cx="140" cy="436" rx="48" ry="10.5" className="lnk-fill-plate-well" />
      <ellipse cx="124" cy="432" rx="10" ry="6.5" className="lnk-fill-amber lnk-stroke-ink" strokeWidth="1.75" transform="rotate(-15 124 432)" />
      <circle cx="152" cy="433" r="3.2" className="lnk-fill-glow" />
      <circle cx="160" cy="428" r="3.2" className="lnk-fill-glow" />
      <circle cx="145" cy="426" r="3.2" className="lnk-fill-glow" />

      {/* the dallah — the café's signature object, drawn in its TRUE
          silhouette: a pear body on a flared foot, a tall domed lid with
          a slender finial spike, a long SWAN-NECK spout rising from the
          waist to hover over the finjan, and a tall arcing handle on the
          lantern-quiet side — everything clear of the printed card's
          corner (the card's visual edge lands ≈x 305-335; the handle
          arc rides x 325-352 and tops out at y 338, clear of both the
          card and the lantern's ember tip). */}
      <path d="M348 452 L396 452 L388 434 L356 434 Z" className="lnk-fill-cream lnk-stroke-ink" strokeWidth="2.5" />
      <path d="M356 434 C342 424 340 400 346 382 C349 370 356 360 362 352 L382 352 C388 360 395 370 398 382 C404 400 402 424 388 434 Z" className="lnk-fill-cream lnk-stroke-ink" strokeWidth="2.5" />
      {/* the lid — a brass dome + the slender finial spike */}
      <path d="M359 350 C361 331 383 331 385 350 Z" className="lnk-fill-amber lnk-stroke-ink" strokeWidth="2.5" />
      <path d="M369 331 L375 331 L374 307 L370 307 Z" className="lnk-fill-amber lnk-stroke-ink" strokeWidth="1.75" />
      <circle cx="372" cy="303" r="4.5" className="lnk-fill-ember-deep lnk-stroke-ink" strokeWidth="2" />
      {/* the swan-neck spout — out of the waist, up over the finjan */}
      <path d="M392 404 C421 403 437 388 438 361 L425 354 C423 378 409 389 390 391 Z" className="lnk-fill-cream lnk-stroke-ink" strokeWidth="2.5" />
      <ellipse cx="431.5" cy="358" rx="8" ry="4.5" className="lnk-fill-ember-deep lnk-stroke-ink" strokeWidth="2" transform="rotate(-32 431.5 358)" />
      {/* the handle — a tall arc, double-stroke tube. Its peak rides
          lid-height and stays clear of the lantern's ember tip (x ≤346
          vs the tip at 348+). */}
      <path d="M352 400 C327 392 325 352 342 338" className="lnk-stroke-ink" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M352 400 C327 392 325 352 342 338" className="lnk-stroke-cream" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* the lantern-side shoulder catches the key light — one flat
          warm stroke (screen-print highlight, not a gradient) */}
      <path d="M380 358 C389 363 393 373 392 384" className="lnk-stroke-glow" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.55" />
      {/* the bulb's arabesque band — three ember diamonds between two rules */}
      <line x1="349" y1="380" x2="395" y2="380" className="lnk-stroke-ink" strokeWidth="1.5" opacity="0.45" />
      <line x1="352" y1="412" x2="392" y2="412" className="lnk-stroke-ink" strokeWidth="1.5" opacity="0.45" />
      <path d="M355.5 396 L360 391.5 L364.5 396 L360 400.5 Z" className="lnk-fill-ember-deep" />
      <path d="M367.5 396 L372 391.5 L376.5 396 L372 400.5 Z" className="lnk-fill-ember-deep" />
      <path d="M379.5 396 L384 391.5 L388.5 396 L384 400.5 Z" className="lnk-fill-ember-deep" />

      {/* the finjan + its date */}
      <ellipse cx="436" cy="449" rx="26" ry="6" className="lnk-fill-cream lnk-stroke-ink" strokeWidth="2.5" />
      <path d="M422 416 L450 416 L444 448 L428 448 Z" className="lnk-fill-cream lnk-stroke-ink" strokeWidth="2.5" />
      <ellipse cx="436" cy="416" rx="14" ry="3.5" className="lnk-fill-ember-deep lnk-stroke-ink" strokeWidth="2" />
      <ellipse cx="436" cy="416" rx="11" ry="2.6" className="lnk-fill-ink" opacity="0.85" />
      <ellipse cx="452" cy="440" rx="7" ry="4.5" className="lnk-fill-amber lnk-stroke-ink" strokeWidth="1.5" transform="rotate(-18 452 440)" />

      {/* the frozen steam — authored wisps, never animated. Two rise
          from the swan spout's mouth, two from the finjan, drifting
          APART so they never cross the spout; 3px strokes so the heat
          reads at phone width. */}
      <path d="M425 346 C419 328 431 316 425 294" className="lnk-stroke-cream" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M433 344 C429 326 439 314 434 296" className="lnk-stroke-cream" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M441 400 C439 382 449 370 444 350" className="lnk-stroke-cream" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M449 398 C447 382 456 372 451 354" className="lnk-stroke-cream" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />

      {/* the hanging lantern — the scene's key light */}
      <rect x="350.5" y="0" width="3" height="232" className="lnk-fill-cream" opacity="0.4" />
      {/* the glow: one flat octagon + the manga ray dashes */}
      <path d="M352 231 L392 245 L406 285 L392 325 L352 339 L312 325 L298 285 L312 245 Z" className="lnk-fill-glow" opacity="0.09" />
      {RAYS.map(([x1, y1, x2, y2]) => (
        <line
          key={`${x1}-${y1}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          className="lnk-stroke-glow"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.45"
        />
      ))}
      {/* the lantern body — brass cap, glowing glass, ember base */}
      <circle cx="352" cy="232" r="5" className="lnk-fill-amber lnk-stroke-ink" strokeWidth="2" />
      <path d="M332 250 Q352 222 372 250 Z" className="lnk-fill-ember-deep lnk-stroke-ink" strokeWidth="3" />
      <path d="M330 250 L374 250 L381 308 L323 308 Z" className="lnk-fill-glass lnk-stroke-ink" strokeWidth="3" />
      {/* the flame — the hottest point reads cream */}
      <path d="M352 262 C344 272 340 284 346 294 Q352 300 358 294 C364 284 360 272 352 262 Z" className="lnk-fill-cream" />
      <line x1="340" y1="256" x2="340" y2="302" className="lnk-stroke-ink" strokeWidth="1.75" opacity="0.3" />
      <line x1="364" y1="256" x2="364" y2="302" className="lnk-stroke-ink" strokeWidth="1.75" opacity="0.3" />
      <path d="M322 308 L382 308 L377 319 L327 319 Z" className="lnk-fill-ember-deep lnk-stroke-ink" strokeWidth="3" />
      <path d="M338 319 L366 319 L362 328 L342 328 Z" className="lnk-fill-amber lnk-stroke-ink" strokeWidth="2" />
      <circle cx="352" cy="332" r="4" className="lnk-fill-ember-deep" />
    </svg>
  );
}

/* «اللقمة الأولى» — the printed card's spot illustration (the appetite
 * close-up the photo header used to carry). Same authored family as the
 * window scene — outline-led, flat, no gradients — so the hero is ONE
 * illustration language, no toon/photo clash. The dotted ellipse is the
 * printed-menu dot-leader motif drawn into the artwork itself. */
export function FirstBiteSpot() {
  return (
    <svg
      className="lnk-spot"
      viewBox="0 0 320 200"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="رسم توضيحي لفنجان قهوة عربية يتصاعد منه البخار، على صحن مع تمرات وحبّتي قهوة"
    >
      {/* the plate — outline + the dotted-leader ring (the menu motif) */}
      <ellipse cx="160" cy="140" rx="80" ry="26" className="lnk-fill-cream lnk-stroke-ink" strokeWidth="2.5" />
      <ellipse
        cx="160"
        cy="140"
        rx="60"
        ry="18"
        fill="none"
        className="lnk-stroke-ink"
        strokeWidth="2"
        strokeDasharray="0.5 7"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* the finjan — the first sip */}
      <ellipse cx="160" cy="136" rx="42" ry="9" className="lnk-fill-cream lnk-stroke-ink" strokeWidth="2.5" />
      <path d="M136 136 L184 136 L176 84 L144 84 Z" className="lnk-fill-cream lnk-stroke-ink" strokeWidth="2.5" />
      <ellipse cx="160" cy="84" rx="18" ry="4.5" className="lnk-fill-cream lnk-stroke-ink" strokeWidth="2.5" />
      <ellipse cx="160" cy="84" rx="14" ry="3.4" className="lnk-fill-ember-deep" />

      {/* the steam — printed-spot terracotta wisps (frozen, 3.5px so the
          heat reads at card size; heights vary short–tall–medium so the
          rise reads organic, not ruler-parallel) */}
      <path d="M148 74 C142 56 152 44 147 26" className="lnk-stroke-ember" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.65" />
      <path d="M160 70 C155 50 164 38 159 12" className="lnk-stroke-ember" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.65" />
      <path d="M172 74 C170 58 178 48 173 34" className="lnk-stroke-ember" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.65" />

      {/* a CLUSTER of three dates on the plate's right (the welcome
          bite — grouped so they read as fruit, not scattered pebbles)
          + a pair of coffee beans on the left, each with its crease */}
      <ellipse cx="206" cy="128" rx="12" ry="7" className="lnk-fill-amber lnk-stroke-ink" strokeWidth="2" transform="rotate(-12 206 128)" />
      <ellipse cx="224" cy="120" rx="11" ry="6.5" className="lnk-fill-amber lnk-stroke-ink" strokeWidth="2" transform="rotate(-26 224 120)" />
      <ellipse cx="216" cy="138" rx="10.5" ry="6" className="lnk-fill-amber lnk-stroke-ink" strokeWidth="2" transform="rotate(6 216 138)" />
      <ellipse cx="102" cy="128" rx="7" ry="4.5" className="lnk-fill-amber lnk-stroke-ink" strokeWidth="1.75" transform="rotate(-24 102 128)" />
      <path d="M96 126 q6 -2 12 2" className="lnk-stroke-ink" strokeWidth="1.5" fill="none" opacity="0.6" />
      <ellipse cx="114" cy="134" rx="6" ry="4" className="lnk-fill-amber lnk-stroke-ink" strokeWidth="1.75" transform="rotate(10 114 134)" />
      <path d="M108 132 q6 1 12 -3" className="lnk-stroke-ink" strokeWidth="1.5" fill="none" opacity="0.6" />
    </svg>
  );
}
