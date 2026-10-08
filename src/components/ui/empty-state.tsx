import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * r131-F4 (A1 P0-3 / A11 SM-1 — fleet ruling "empty=56 grey/18/600"):
 * re-based on the canonical state anatomy (SO states.tsx / madarek
 * components.css:1311-1373): 56px (size-14) r-xl icon tile in the GREY
 * pastel family (--c-grey-bg ground + --c-grey-deep ink — flips per theme),
 * title 18px/600 (text-lg font-semibold), description 13px muted capped at
 * 42ch, and the CTA slot. The old 64px gold-tinted tile (border-orange/20 +
 * bg-orange/8) + 14px/700 title was two generations off the family.
 * `tone` maps onto the pastel pairs — grey default, danger for error
 * states (rose family); error states keep their retry CTA.
 */
type EmptyStateTone = "grey" | "danger"

const TONE_TILE: Record<EmptyStateTone, string> = {
  grey: "bg-(--c-grey-bg) text-(--c-grey-deep)",
  danger: "bg-(--c-rose-bg) text-(--c-rose-deep)",
}

function EmptyState({
        icon: Icon,
        title,
        description,
        action,
        tone = "grey",
        className,
        ...props
}: React.ComponentProps<"div"> & {
        /** Lucide icon rendered inside the pastel tile. Also accepts the
         *  animated ui/*-icon components (same className contract — r131-F4b
         *  unblocks owner/qr's AnimatedQrCode tile, which LucideIcon rejected). */
        icon: React.ComponentType<{ className?: string; size?: number }>;
        title: string;
        description?: string;
        /** CTA — empty states must offer the next step. */
        action?: React.ReactNode;
        /** Pastel family for the icon tile (grey default, danger for errors). */
        tone?: EmptyStateTone;
}) {
        return (
                <div
                        data-slot="empty-state"
                        className={cn(
                                "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
                                className
                        )}
                        {...props}
                >
                        <span
                                data-slot="empty-state-icon"
                                className={cn(
                                        "flex size-14 items-center justify-center rounded-xl",
                                        TONE_TILE[tone]
                                )}
                                aria-hidden="true"
                        >
                                <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <p data-slot="empty-state-title" className="mt-1 text-lg font-semibold text-foreground">
                                {title}
                        </p>
                        {description ? (
                                <p
                                        data-slot="empty-state-description"
                                        className="max-w-[42ch] text-sm leading-relaxed text-muted-foreground"
                                >
                                        {description}
                                </p>
                        ) : null}
                        {action ? <div data-slot="empty-state-action" className="mt-3">{action}</div> : null}
                </div>
        )
}

export { EmptyState }
