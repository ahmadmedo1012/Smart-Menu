import { cn } from '@/lib/utils';

/**
 * r131-F5 (A1 P0-8): canonical page-header chrome for owner/admin pages —
 * Madarek base.css:243-266 anatomy:
 *
 *   · <header> flex space-between, items-end, wrap, gap 20px
 *   · padding-block-end 16px + 1px hairline separator (rule @50%)
 *   · title = display rung clamp(28px, 3.6vw, 40px) / 700 / lh 1.1
 *   · subtitle = 13px muted, lh 1.55, max-inline-size 72ch
 *   · trailing actions toolbar (flex-wrap, shrink-0)
 *
 * Replaces the per-page drift this round found: sr-only h1s (dashboard,
 * settings), fixed 22-30px text-xl/2xl heads, and headers with no
 * separator at all. Server-component-safe (no hooks).
 */
export function PageHeader({
        title,
        subtitle,
        actions,
        className,
        id,
}: {
        /** Page h1 — rendered VISIBLE (one h1 per page, Arabic). */
        title: React.ReactNode;
        /** 13px secondary line, clamped to 72ch (canonical measure). */
        subtitle?: React.ReactNode;
        /** Trailing toolbar: buttons, filters, indicators. */
        actions?: React.ReactNode;
        className?: string;
        /** Optional anchor id (skip-link / aria-labelledby targets). */
        id?: string;
}) {
        return (
                <header
                        className={cn(
                                'flex flex-wrap items-end justify-between gap-5 pb-4 border-b border-border/50',
                                className
                        )}
                >
                        <div className="flex min-w-0 max-w-full flex-col gap-1.5">
                                <h1
                                        id={id}
                                        className="font-display text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.1] font-bold tracking-normal text-foreground"
                                >
                                        {title}
                                </h1>
                                {subtitle ? (
                                        <p className="max-w-[72ch] text-sm leading-[1.55] text-muted-foreground">
                                                {subtitle}
                                        </p>
                                ) : null}
                        </div>
                        {actions ? (
                                <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
                        ) : null}
                </header>
        );
}
