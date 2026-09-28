import type { SVGProps } from "react";

/** Scale stroke to a 24×24-visual weight on non-24 viewBoxes */
export function scaledStrokeWidth(
  strokeWidth: number,
  viewBoxSize: number,
): number {
  return strokeWidth * (viewBoxSize / 24);
}

// r121-O-3: IconEasing (an 11-member easing union nothing ever annotated) and
// DEFAULT_STROKE_WIDTH (zero users — every icon hardcodes its own default of 2)
// were deleted after grep-verified zero references across src/tests/scripts.

export interface AnimatedIconProps extends Omit<
  SVGProps<SVGSVGElement>,
  | "ref"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onDrag"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onDragStart"
  | "onDrop"
  | "values"
> {
  /** Icon size in pixels or CSS string */
  size?: number | string;
  /** Icon color (defaults to currentColor) */
  color?: string;
  /** SVG stroke width */
  strokeWidth?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * r121-O-3: the imperative handle now has exactly ONE sanctioned
 * consumer-producer pair — shopping-cart-icon.tsx exposes it and
 * premium-toast.tsx's AnimatedCartToastIcon calls startAnimation() for the
 * add-to-cart bounce. Every other icon became a plain component; do NOT
 * reintroduce forwardRef here for new icons (hover animations are
 * self-contained via useAnimate).
 */
export interface AnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}
