"use client";

import { useEffect, useRef, memo } from "react";

/** Kokonutd-inspired animated fluid shape canvas.
 *  Renders floating SVG paths with mesh gradients and heavy blur.
 *  Zero-dependency, GPU-composited via CSS filters + transforms. */
const FluidBackground = memo(function FluidBackground() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let frame: number;
    let t = 0;

    const paths = svg.querySelectorAll<SVGPathElement>(".fluid-path");
    const orig = Array.from(paths).map((p) => p.getAttribute("d")!);
    if (orig.length === 0) return;

    // Simple sine-wave vertex animation for organic drift
    function animate() {
      t += 0.004;
      paths.forEach((p, i) => {
        const d = orig[i];
        // Shift y-coords subtly
        const newD = d.replaceAll(/(\d+(?:\.\d+)?)\s+/g, (m) => {
          const v = parseFloat(m);
          return isFinite(v) && v > 10 ? `${(v + Math.sin(t + i) * 6).toFixed(1)} ` : m;
        });
        p.setAttribute("d", newD);
      });
      frame = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-5 overflow-hidden" aria-hidden="true">
      <svg
        ref={svgRef}
        className="size-full opacity-40 dark:opacity-20"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="fluid-blur"><feGaussianBlur stdDeviation="120" /></filter>
          <radialGradient id="fg1" cx="30%" cy="20%" r="60%">
            <stop offset="0%" stopColor="var(--orange, #f97316)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--orange, #f97316)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fg2" cx="70%" cy="80%" r="50%">
            <stop offset="0%" stopColor="var(--orange, #f97316)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--orange, #f97316)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fg3" cx="50%" cy="50%" r="45%">
            <stop offset="0%" stopColor="oklch(0.68 0.19 45)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="oklch(0.68 0.19 45)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Organic fluid shapes */}
        <g filter="url(#fluid-blur)">
          <path
            className="fluid-path"
            d="M 200,100 C 400,50 600,200 720,150 S 1000,300 1200,200 S 1400,400 1300,600 S 1100,800 800,750 S 400,600 200,500 S -50,300 200,100 Z"
            fill="url(#fg1)"
          />
          <path
            className="fluid-path"
            d="M 1300,100 C 1100,80 900,250 720,200 S 400,350 200,250 S 50,500 150,700 S 300,900 600,850 S 1000,700 1200,600 S 1450,400 1300,100 Z"
            fill="url(#fg2)"
          />
          <path
            className="fluid-path"
            d="M 720,50 C 900,100 1100,300 1000,500 S 800,700 720,600 S 500,500 400,300 S 500,100 720,50 Z"
            fill="url(#fg3)"
          />
        </g>

        {/* Mesh grain overlay dots */}
        <g opacity="0.03" fill="currentColor">
          {Array.from({ length: 20 }, (_, i) => (
            <circle key={i} cx={i % 2 === 0 ? 100 + i * 70 : 900 + i * 40} cy={50 + i * 45} r="1.5" />
          ))}
        </g>
      </svg>
    </div>
  );
});

export { FluidBackground };
