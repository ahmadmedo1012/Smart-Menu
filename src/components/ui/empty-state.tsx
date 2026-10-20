import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * Phase 6 (r154) — the warm plate well: the state anatomy keeps the fleet
 * CONTRACT (56px size-14 icon tile · title 18px/600 text-lg font-semibold ·
 * description 13px muted capped at 42ch · CTA slot) but the Madarek
 * grey-tile ground retires. The well becomes a culinary PLATE —
 * rounded-lg (the 16px plate-round card rung) in the warm tint families:
 *
 *   · plate  (default) — terracotta well (--c-copper-*): the brand accent;
 *       an empty plate is still OUR plate.
 *   · sage   — the mint family (calm "nothing growing here yet" states).
 *   · amber  — the yellow family (rating/reward-adjacent empties).
 *   · danger — the rose family (error states keep their retry CTA).
 *
 * Families flip per theme (light pastel grounds / luminous night inks).
 * `tone` maps onto the warm pairs — plate default, danger for error
 * states; error states keep their retry CTA.
 *
 * W7-G (A2 audit — the 18 hand-rolled empties): `size="compact"` is the
 * density cut for nested panels and dropdown wells where the full 56px
 * plate would shout — size-10 well · size-4 icon · text-sm title ·
 * tighter padding. Same tone families, same slot contract.
 */
type EmptyStateTone = "plate" | "sage" | "amber" | "danger"
type EmptyStateSize = "default" | "compact"

const TONE_TILE: Record<EmptyStateTone, string> = {
  plate: "bg-(--c-copper-bg) text-(--c-copper-ink)",
  sage: "bg-(--c-mint-bg) text-(--c-mint-ink)",
  amber: "bg-(--c-yellow-bg) text-(--c-yellow-ink)",
  danger: "bg-(--c-rose-bg) text-(--c-rose-ink)",
}

function EmptyState({
        icon: Icon,
        title,
        description,
        action,
        tone = "plate",
        size = "default",
        className,
        ...props
}: React.ComponentProps<"div"> & {
        /** Lucide icon rendered inside the warm plate well. Also accepts the
         *  animated ui/*-icon components (same className contract — r131-F4b
         *  unblocks owner/qr's AnimatedQrCode tile, which LucideIcon rejected). */
        icon: React.ComponentType<{ className?: string; size?: number }>;
        title: string;
        description?: string;
        /** CTA — empty states must offer the next step. */
        action?: React.ReactNode;
        /** Warm tint family for the plate well (terracotta default, danger for errors). */
        tone?: EmptyStateTone;
        /** Density cut — "compact" (size-10 well, tighter padding) for nested panels and dropdown wells. */
        size?: EmptyStateSize;
}) {
        const compact = size === "compact"
        return (
                <div
                        data-slot="empty-state"
                        className={cn(
                                "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
                                compact && "gap-1.5 px-4 py-6",
                                className
                        )}
                        {...props}
                >
                        <span
                                data-slot="empty-state-icon"
                                className={cn(
                                        "flex size-14 items-center justify-center rounded-lg",
                                        compact && "size-10",
                                        TONE_TILE[tone]
                                )}
                                aria-hidden="true"
                        >
                                <Icon className={compact ? "size-4" : "size-5"} aria-hidden="true" />
                        </span>
                        <p
                                data-slot="empty-state-title"
                                className={cn("mt-1 text-lg font-semibold text-foreground", compact && "text-sm")}
                        >
                                {title}
                        </p>
                        {description ? (
                                <p
                                        data-slot="empty-state-description"
                                        className={cn(
                                                "max-w-[42ch] text-sm leading-relaxed text-muted-foreground",
                                                compact && "text-xs"
                                        )}
                                >
                                        {description}
                                </p>
                        ) : null}
                        {action ? <div data-slot="empty-state-action" className={compact ? "mt-2" : "mt-3"}>{action}</div> : null}
                </div>
        )
}

export { EmptyState }
