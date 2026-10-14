import type { CSSProperties } from 'react';

/* P12-2b (S3) — HotspotPin: comic-style pin anchored over a scene object.
 *
 * The Banzai reference navigates IN the 3D world; Smart Menu's honest
 * translation is an HTML hotspot layer above the canvas: each pin is a
 * REAL focusable link (native keyboard focus, 44px hit floor, aria-label)
 * routing to the site's REAL routes — the live demo menu, the owner
 * signup and the pricing page. The pin marker is an SVG (no emoji, E5)
 * with a pop-in label on hover/focus (CSS in landing.css §20).
 *
 * Server-safe: no state, no effects.
 */
export function HotspotPin({
  href,
  label,
  title,
  icon,
  style,
  popDelay = 0,
}: {
  href: string;
  /** short label shown in the popped chip */
  label: string;
  /** full accessible name (link text for screen readers) */
  title: string;
  /** tiny SVG glyph inside the pin head */
  icon: 'menu' | 'owner' | 'pricing';
  /** anchor position over the scene (inline-start / block-start %) */
  style?: CSSProperties;
  /** stagger for the entrance pop (seconds) */
  popDelay?: number;
}) {
  return (
    <a className="ln-hotspot" href={href} aria-label={title} style={style}>
      <span className="ln-hotspot-marker" style={{ animationDelay: `${popDelay}s` }} aria-hidden="true">
        <svg viewBox="0 0 40 52" width="30" height="38" focusable="false">
          {/* pin head */}
          <circle cx="20" cy="18" r="15" className="ln-hotspot-ring" />
          <circle cx="20" cy="18" r="11.5" className="ln-hotspot-core" />
          {/* glyph */}
          {icon === 'menu' && (
            <g className="ln-hotspot-glyph">
              <rect x="14.5" y="13" width="11" height="1.8" rx="0.9" />
              <rect x="14.5" y="17.1" width="11" height="1.8" rx="0.9" />
              <rect x="14.5" y="21.2" width="7.5" height="1.8" rx="0.9" />
            </g>
          )}
          {icon === 'owner' && (
            <g className="ln-hotspot-glyph">
              <circle cx="20" cy="15.2" r="2.6" />
              <path d="M14.8 23.4c0-3.6 2.3-6 5.2-6s5.2 2.4 5.2 6z" />
            </g>
          )}
          {icon === 'pricing' && (
            <g className="ln-hotspot-glyph">
              <path d="M15 12.5h6.6c2.6 0 4.2 1.8 4.2 4.2 0 2.5-1.7 4.3-4.4 4.3h-2.9v1.6h4.9v2.1h-4.9v1.8h-2.6v-1.8H15v-2.1h1.9v-1.6H15v-2.2h1.9v-4.3H15zm3.5 2.4v4.1h2.9c1.4 0 2.3-.9 2.3-2 0-1.2-.9-2.1-2.3-2.1z" />
            </g>
          )}
          {/* pin tail */}
          <path d="M20 32.4l-4.6 7.2c-.9 1.4.2 3.2 1.9 3.2h5.4c1.7 0 2.8-1.8 1.9-3.2z" className="ln-hotspot-tail" />
          <circle cx="20" cy="18" r="15" fill="none" className="ln-hotspot-outline" />
        </svg>
      </span>
      <span className="ln-hotspot-label">{label}</span>
    </a>
  );
}
