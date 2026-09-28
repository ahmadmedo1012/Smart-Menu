'use client';

import Link from 'next/link';
import { MotionArrowRight } from '@/components/ui/motion-icons';
import { toArabicNumber } from '@/lib/format';

interface CartPageHeaderProps {
        count: number;
}

/** Page header (back link + title + count badge) — verbatim extraction
 * from the cart page (round89-G1). */
export function CartPageHeader({ count }: CartPageHeaderProps) {
        return (
                <div className="flex items-center gap-4 mb-8 animate-slide-down">
                        <Link
                                href="/menu"
                                className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
                                aria-label="العودة إلى القائمة"
                        >
                                {/* r121 (J-2): سهم «العودة إلى القائمة» كان MotionArrowLeft —
                                    في RTL سهم العودة يشير يميناً (اتفاقية print/page.tsx:150
                                    و BackButton.tsx). */}
                                <MotionArrowRight className="size-5" />
                        </Link>
                        <h1 className="text-2xl font-bold">سلة الطلب</h1>
                        <div className="relative">
                                <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/30">
                                        {toArabicNumber(count)} {count === 1 ? 'صنف' : 'أصناف'}
                                </span>
                                <span className="absolute -top-1 -end-1 size-2 rounded-full bg-primary animate-breath" />
                        </div>
                </div>
        );
}
