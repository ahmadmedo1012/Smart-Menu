"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DisplayCardProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
  className?: string;
}

interface DisplayCardsProps {
  cards: DisplayCardProps[];
  className?: string;
  emptyMessage?: string;
}

/**
 * DisplayCards — stacked card deck with RTL-aware offset.
 * Cards stack via CSS grid [grid-template-areas:stack].
 * Hover lifts card, removes overlay on first two.
 */
export default function DisplayCards({
  cards,
  className,
  emptyMessage = "—",
}: DisplayCardsProps) {
  if (!cards?.length) {
    return (
      <div className="text-sm text-muted-foreground text-center py-12">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("grid [grid-template-areas:stack] justify-center", className)}>
      {cards.map((card, i) => {
        const isTop = i === 0;
        const hasOverlay = i < 2; // overlay on first two cards
        const offsets = [
          "",
          "translate-x-3 translate-y-3 rtl:-translate-x-3",
          "translate-x-6 translate-y-6 rtl:-translate-x-6",
        ][i] ?? "";

        return (
          <div
            key={i}
            className={cn(
              "[grid-area:stack]",
              "transition-all duration-500 ease-out",
              "hover:-translate-y-2",
              isTop && "relative z-30",
              !isTop && "relative z-20",
              offsets,
              card.className,
            )}
          >
            <div className="group relative rounded-xl border bg-card p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
              {/* overlay on top cards — fades on hover to reveal card below */}
              {hasOverlay && (
                <div className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-background/50 transition-opacity duration-700 group-hover:opacity-0" />
              )}
              <div className="relative z-0">
                {card.icon && (
                  <div className={cn("mb-3", card.iconClassName)}>
                    {card.icon}
                  </div>
                )}
                {card.title && (
                  <h3 className={cn("font-medium mb-1", card.titleClassName)}>
                    {card.title}
                  </h3>
                )}
                {card.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                )}
                {card.date && (
                  <time className="mt-2 block text-xs text-muted-foreground">
                    {card.date}
                  </time>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
