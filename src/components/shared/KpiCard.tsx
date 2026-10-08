'use client';

/**
 * Unified KPI stat card (round79 Stage D — merge of the د1 duplication).
 *
 * One implementation replaces what used to be two parallel components:
 *   - src/components/admin/KpiCard.tsx (trend + sparkline + static value)
 *   - OwnerKpiGrid's internal StatCard (AnimatedCounter + subtitle + stagger)
 *
 * Card chrome, entrance motion, and the stretched-link a11y pattern follow the
 * owner variant (reduced-motion aware, staggered entrance — complies with the
 * round66 a11y decision). The admin variant keeps its exclusive props
 * (trend/sparkline/suffix) and is re-exported from its old path via a shim,
 * so existing admin imports keep working unchanged.
 */

import { memo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { m, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { MiniSparkline } from '@/components/shared/MiniSparkline';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/* ---------- Animated Counter (moved verbatim from OwnerKpiGrid) ---------- */

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
        const [display, setDisplay] = useState(0);
        const ref = useRef<number | null>(null);
        const mounted = useRef(false);
        // Reduced motion: skip the count-up entirely and show the final value.
        const reduceMotion = useReducedMotion();

        useEffect(() => {
                mounted.current = true;
                if (reduceMotion) {
                        setDisplay(value);
                        return;
                }
                const start = performance.now();
                const from = display;
                const to = value;
                /* r130 (W2-3, P2): 700ms — the canonical in-app stat moment
                   (--motion-duration-stat, Madarek tokens.css:183); was the
                   off-ladder 800ms literal. Curve stays easeOutCubic. */
                const duration = 700;

                function tick(now: number) {
                        if (!mounted.current) return;
                        const elapsed = now - start;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setDisplay(Math.round(from + (to - from) * eased));
                        if (progress < 1) ref.current = requestAnimationFrame(tick);
                }
                ref.current = requestAnimationFrame(tick);
                return () => {
                        mounted.current = false;
                        if (ref.current) cancelAnimationFrame(ref.current);
                };
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [value, reduceMotion]);

        return <span className="tabular-nums">{toArabicNumber(display)}{suffix}</span>;
}

/* ---------- Unified card ---------- */

export interface KpiCardProps {
        label: string;
        value: number;
        icon: LucideIcon;
        /** Icon tile background class. Default 'bg-orange-muted'. */
        iconBg?: string;
        /** Icon glyph color class. Default 'text-orange'. */
        iconColor?: string;
        /** Text appended to the value (static mode only). */
        suffix?: string;
        /** Small muted line under the value (owner dashboards). */
        subtitle?: string;
        /** Percent trend badge with arrow (admin dashboards). */
        trend?: number;
        /** Sparkline rendered next to the trend badge (admin dashboards). */
        sparklineData?: number[];
        /** Count-up value animation (owner dashboards). */
        animated?: boolean;
        /** When set the whole card becomes a real stretched link. */
        href?: string;
        /** Entrance stagger position (cards animate in sequence). */
        index?: number;
}

export const KpiCard = memo(function KpiCard({
        label,
        value,
        icon: Icon,
        iconBg,
        iconColor,
        suffix = '',
        subtitle,
        trend,
        sparklineData,
        animated = false,
        href,
        index = 0,
}: KpiCardProps) {
        const reduceMotion = useReducedMotion();

        const body = (
                <>
                        <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                                        <p className="text-3xl font-bold tracking-normal tabular-nums">
                                                {animated ? <AnimatedCounter value={value} /> : <>{toArabicNumber(value)}{suffix}</>}
                                        </p>
                                        {subtitle && <p className="text-2xs text-muted-foreground">{subtitle}</p>}
                                        {(sparklineData !== undefined || trend !== undefined) && (
                                                <div className="flex items-center gap-2">
                                                        {sparklineData && sparklineData.length > 1 && <MiniSparkline data={sparklineData} />}
                                                        {trend !== undefined && (
                                                                <span
                                                                        className={cn(
                                                                                'text-xs font-medium flex items-center gap-0.5 tabular-nums',
                                                                                trend >= 0 ? 'text-success' : 'text-destructive'
                                                                        )}
                                                                >
                                                                        {trend >= 0 ? (
                                                                                <TrendingUp className="size-3" aria-hidden="true" />
                                                                        ) : (
                                                                                <TrendingDown className="size-3" aria-hidden="true" />
                                                                        )}{' '}
                                                                        {toArabicNumber(Math.abs(trend))}%
                                                                </span>
                                                        )}
                                                </div>
                                        )}
                                </div>
                                {/* 44px pastel well (p-3 + size-5) — r131-F5 (A1 P1-4):
                                   r-lg 12px radius + the canonical 1.5px inset
                                   role-accent 30% rim (Madarek .metric-icon).
                                   Was rounded-xl with a neutral border rim. */}
                                <div className={cn('rounded-lg p-3 ring-[1.5px] ring-inset ring-[color:var(--accent-solid)]/30 shrink-0', iconBg || 'bg-orange-muted')}>
                                        <Icon className={cn('size-5', iconColor || 'text-orange')} aria-hidden="true" />
                                </div>
                        </div>
                </>
        );

        /* Entrance (r131-F5, A1 P1-4): canonical scale .92 spring pop-in
           (--ease-spring-soft register) with the 60ms card stagger;
           fully disabled under prefers-reduced-motion. */
        const entranceTransition = reduceMotion
                ? undefined
                : { type: 'spring' as const, stiffness: 260, damping: 24, delay: index * 0.06 };

        /* a11y (4.1.2 / keyboard): clickable cards are real stretched Links — a native
                 anchor gives role=link + Enter activation + focus for free, instead of a
                 div with an unannounced onClick. */
        if (href) {
                return (
                        <m.div
                                initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={entranceTransition}
                                className={cn(
                                        'group relative rounded-xl border border-border/50 bg-card/80 shadow-sm backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-base',
                                        'hover:border-orange/40 hover:shadow-lg hover:shadow-orange/10 hover:-translate-y-1',
                                        /* hover edge-rail — signature #4: 2px accent bar on the
                                           leading edge, scaleY spring from the bottom. */
                                        'before:absolute before:inset-y-3 before:start-0 before:w-0.5 before:origin-bottom before:scale-y-0 before:rounded-e-full before:bg-[var(--accent-solid)] before:transition-transform before:duration-slower before:ease-[var(--ease-spring-soft,cubic-bezier(0.16,1,0.3,1))] hover:before:scale-y-100',
                                        'min-h-[132px]',
                                )}
                        >
                                {/* stretched-link pattern: whole card is one link target */}
                                <Link
                                        href={href}
                                        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                >
                                        <span className="sr-only">{label}</span>
                                </Link>
                                <div className="p-6">{body}</div>
                        </m.div>
                );
        }

        return (
                <m.div
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={entranceTransition}
                        className={cn(
                                'group relative overflow-hidden rounded-xl border border-border/50 bg-card/80 p-6 shadow-sm backdrop-blur-sm transition-[border-color] duration-fast',
                                'hover:border-orange/40',
                                'before:absolute before:inset-y-3 before:start-0 before:w-0.5 before:origin-bottom before:scale-y-0 before:rounded-e-full before:bg-[var(--accent-solid)] before:transition-transform before:duration-slower before:ease-[var(--ease-spring-soft,cubic-bezier(0.16,1,0.3,1))] hover:before:scale-y-100',
                                'min-h-[132px]',
                        )}
                >
                        {body}
                </m.div>
        );
});
