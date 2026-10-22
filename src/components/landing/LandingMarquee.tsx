/**
 * LandingMarquee — the vocabulary ring, one slow pass (kit §3 / R3).
 *
 * Self-contained marquee strip: the item list is duplicated ×2 and the
 * seamless RTL loop runs on pure CSS (`ln-marquee` keyframes in
 * src/app/landing.css — translateX 0 → calc(50% + 24px), 42s linear).
 * Server-safe: no client JS, no "use client", no effects — the whole
 * animation is declarative, and prefers-reduced-motion kills it in CSS.
 *
 * Markup (P21-W6 2-c): section.ln-marquee[aria-hidden] >
 * div.ln-marquee-clip > div.ln-marquee-track >
 * (span.ln-marquee-item > text + span.ln-marquee-sep). The clip wrapper
 * is the mask window — landing.css fades the track's text at both edges
 * there (mirror-symmetric mask-image), while the flood band itself keeps
 * its full-bleed rectangle. The `·` glyph inside the separator span is
 * hidden by CSS (font-size: 0) and a true cream dot is drawn in its
 * place.
 *
 * r128-F1a (Stage A foundation). Consumers (Stage B): pass REAL
 * platform vocabulary only — no fabricated names (r82 honesty).
 */
export function LandingMarquee({ items }: { items: string[] }) {
  // Empty payload → no strip at all (an empty track animates nothing
  // and would ship a bare hairline band).
  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <section className="ln-marquee" aria-hidden="true">
      <div className="ln-marquee-clip">
        <div className="ln-marquee-track">
          {doubled.map((it, i) => (
            <span className="ln-marquee-item" key={i}>
              {it}
              <span className="ln-marquee-sep">·</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
