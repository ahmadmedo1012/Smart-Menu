'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

interface ChartCardProps {
        title: string;
        description?: string;
        icon?: LucideIcon;
        loading?: boolean;
        error?: string | null;
        empty?: boolean;
        emptyTitle?: string;
        emptyDescription?: string;
        onRetry?: () => void;
        actions?: ReactNode;
        summary?: string;
        children: ReactNode;
        className?: string;
}

export function ChartCard({
        title,
        description,
        icon: Icon,
        loading = false,
        error = null,
        empty = false,
        emptyTitle = 'لا توجد بيانات بعد',
        emptyDescription = 'ستظهر النتائج هنا بعد وصول أول الطلبات.',
        onRetry,
        actions,
        summary,
        children,
        className,
}: ChartCardProps) {
        return (
                <section
                        className={cn(
                                /* W7-G (P2, A2 audit): الطبق القانوني — rounded-lg (16)
                                   + p-4 (كان rounded-xl 20 + p-5 خارج سلّم أطباق r152). */
                                'rounded-lg border border-border/60 bg-card p-4 shadow-sm',
                                className
                        )}
                >
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                                {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                                                <h2 className="text-sm font-semibold">{title}</h2>
                                        </div>
                                        {description ? (
                                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
                                        ) : null}
                                </div>
                                {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
                        </div>

                        {loading ? (
                                /* W7-F (I-14): the chart-shaped pulse joins the one skeleton
                                   language — shimmer = shapes (DESIGN.md), pulse = live dots. */
                                <div
                                        className="flex h-[220px] flex-col justify-end gap-3"
                                        aria-busy="true"
                                        aria-label="جارٍ تحميل الرسم البياني"
                                >
                                        <div className="skeleton h-3 w-24" />
                                        <div className="skeleton h-[160px]" />
                                        <span className="sr-only">جارٍ التحميل</span>
                                </div>
                        ) : error ? (
                                <div className="flex h-[200px] flex-col items-center justify-center gap-3 text-center">
                                        <AlertCircle className="size-6 text-destructive/70" aria-hidden="true" />
                                        <p className="text-sm font-medium">{error}</p>
                                        {onRetry ? (
                                                <Button variant="outline" size="sm" onClick={onRetry}>
                                                        إعادة المحاولة
                                                </Button>
                                        ) : null}
                                </div>
                        ) : empty ? (
                                <EmptyState icon={Icon ?? AlertCircle} title={emptyTitle} description={emptyDescription} />
                        ) : (
                                <div>
                                        {summary ? <p className="sr-only">{summary}</p> : null}
                                        {children}
                                </div>
                        )}
                </section>
        );
}
