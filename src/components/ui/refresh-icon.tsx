"use client";
/* P27-C (CSS twin — the SmartBot v12-E5.1 law): the hover rotate was motion
   useAnimate (rotate 180, 0.4s easeInOut, both directions) — the whole
   motion engine rode the public chunk graph for this one hover. Pure CSS now
   (.ai-refresh rules in globals.css): identical choreography and triggers
   (pointerenter/leave = :hover), prefers-reduced-motion honored in CSS.
   The imperative API never existed here (r121-O-3), so nothing else changes.
   The twin animates the independent `rotate` property so the `animate-spin`
   className passthrough (a `transform` keyframe) composes instead of
   fighting — while spinning, the 180° offset is a phase shift only. */
import type { AnimatedIconProps } from "./types";

function RefreshIcon({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }: AnimatedIconProps) {
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
            className={`ai-refresh cursor-pointer ${className}`}
        >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
            <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
        </svg>
    );
}

export default RefreshIcon;
