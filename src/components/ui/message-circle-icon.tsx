"use client";
/* P27-C (CSS twin — the SmartBot v12-E5.1 law): the hover choreography was
   motion useAnimate (instant reset → pathLength 0→1 + opacity 0→1 draw,
   0.6s easeInOut → scale 1→1.05→1 pulse, 0.3s easeOut; un-hover settles to
   the full state over 0.2s). Pure CSS now (.ai-msg rules in globals.css):
   the draw is the pathLength="1" + stroke-dashoffset technique, the pulse
   rides the same path with animation-delay, and the un-hover settle is the
   base-state transition — leaving hover mid-draw transitions from the
   animated value over 0.2s, exactly motion's settle. Re-hover re-runs the
   draw (the keyframe's 0% IS the instant reset). prefers-reduced-motion
   honored in CSS. */
import type { AnimatedIconProps } from "./types";

function MessageCircleIcon({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }: AnimatedIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`ai-msg cursor-pointer ${className}`}
            style={{ overflow: "visible" }}
        >
            <path
                className="message-path"
                pathLength={1}
                d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
            />
        </svg>
    );
}

export default MessageCircleIcon;
