import * as React from "react"
import { useId } from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

type InputState = "default" | "error" | "success" | "warning"

/*
 * r131-F4 (A1 P0-1 — the P0 input primitive): re-based on the canonical
 * fleet control recipe (SO r130 input.tsx / Madarek components.css:690-752):
 *   · height 44px (h-11) · radius 10px (rounded-md = --radius-md) ·
 *     1px border · font-size 16px at EVERY breakpoint — SM remaps
 *     --text-base to 15px, so the iOS-zoom floor is pinned explicitly with
 *     text-[16px]; the old `text-base md:text-sm` split rendered 15px mobile
 *     / 13px desktop (3 heights-in-one-tree + iOS keyboard zoom).
 *   · focus = state border + the ONE sanctioned 3px/22% halo
 *     (--state-input-focus-halo → --accent-solid: gold dark / copper light);
 *     the old ring-2 + ring-ring/25 double indicator is retired (A1 P1-10).
 *   · stateful variants (error/success/warning) ride their own
 *     --state-input-*-halo token (same 3px/22% contract, keyed to the
 *     per-theme status ink) — defined once in globals.css :root.
 *   · placeholder = --placeholder-text (the AA faint tier, 4.86:1/4.92:1 —
 *     A7 P1-1; was muted-foreground/70 at 3.73:1/3.83:1).
 */
function Input({
        className,
        type,
        state = "default",
        id,
        "aria-describedby": ariaDescribedBy,
        ...props
}: React.ComponentProps<"input"> & {
        state?: InputState;
}) {
        const stateStyles: Record<InputState, string> = {
                default:
                        "border-input focus-visible:border-ring focus-visible:shadow-[var(--state-input-focus-halo)]",
                error:
                        "border-destructive focus-visible:border-destructive focus-visible:shadow-[var(--state-input-error-halo)]",
                success:
                        "border-[color:var(--success)] focus-visible:border-[color:var(--success)] focus-visible:shadow-[var(--state-input-success-halo)]",
                warning:
                        "border-[color:var(--warning)] focus-visible:border-[color:var(--warning)] focus-visible:shadow-[var(--state-input-warning-halo)]",
        }

        // End-relative padding so typed text (Arabic or Latin) never collides
        // with the trailing state icon. Logical property works in both LTR/RTL.
        const hasTrailingIcon = state === "success" || state === "error" || state === "warning"

        // Stable id for label association if consumer didn't pass one.
        const generatedId = useId()
        const inputId = id ?? generatedId

        return (
                <div className="relative w-full">
                        <InputPrimitive
                                id={inputId}
                                type={type}
                                data-slot="input"
                                data-state={state}
                                dir="auto"
                                className={cn(
                                        "h-11 w-full min-w-0 rounded-md border bg-transparent px-4 text-[16px] leading-normal shadow-xs transition-[color,background-color,border-color,box-shadow] duration-fast outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-placeholder-text disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-input/30 dark:disabled:opacity-60",
                                        // Logical inline-end padding reserves space for the icon.
                                        hasTrailingIcon ? "px-12" : "px-4",
                                        stateStyles[state],
                                        className
                                )}
                                aria-invalid={state === "error" || undefined}
                                aria-describedby={ariaDescribedBy}
                                {...props}
                        />
                        {/* Icon container: smooth crossfade so state changes feel intentional,
                            not snappy. pointer-events-none so the icon never eats the click. */}
                        {state === "success" && (
                                <CheckCircle2
                                        className="pointer-events-none absolute end-3 top-1/2 size-5 -translate-y-1/2 text-[color:var(--success)] transition-opacity duration-fast"
                                        aria-hidden="true"
                                />
                        )}
                        {state === "error" && (
                                <AlertCircle
                                        className="pointer-events-none absolute end-3 top-1/2 size-5 -translate-y-1/2 text-destructive transition-opacity duration-fast"
                                        aria-hidden="true"
                                />
                        )}
                        {state === "warning" && (
                                <AlertTriangle
                                        className="pointer-events-none absolute end-3 top-1/2 size-5 -translate-y-1/2 text-[color:var(--warning)] transition-opacity duration-fast"
                                        aria-hidden="true"
                                />
                        )}
                </div>
        )
}

export { Input }
export type { InputState }
