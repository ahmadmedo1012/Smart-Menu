'use client';

import Link from 'next/link';
import { MotionArrowRight } from '@/components/ui/motion-icons';
/* r138-exec-2 (J4): عبارة الجمع الموحّدة — نفس المساعد الذي تعدّ به الشريحة
   الجانبية (r92-A9)؛ كان الرأس يعدّ الأسطر بـ«N أصناف» خام (2 أصناف/11 أصناف)
   بينما الشريحة تعدّ الوحدات بصياغة سليمة. */
import { cartCountPhrase } from '@/components/menu/CartSlideOver';

interface CartPageHeaderProps {
        /* r138-exec-2 (J4): عدد الوحدات (Σ الكميات) — لا عدد الأسطر؛ نفس
           دلالة totalItems في الشريحة الجانبية. */
        count: number;
}

/** Page header (back link + title + count badge) — verbatim extraction
 * from the cart page (round89-G1). r138-exec-2 (J4): الصياغة عبر
 * cartCountPhrase والعدّ بالوحدات. */
export function CartPageHeader({ count }: CartPageHeaderProps) {
        return (
                <div className="flex items-center gap-4 mb-8 animate-slide-down">
                        <Link
                                href="/menu"
                                className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
                                        {/* r138-exec-2 (J4): «صنف واحد / صنفان / 5 أصناف / 12 صنفًا» —
            نفس صياغة الشريحة الجانبية حرفياً بدل المثلث الساذج «صنف/أصناف». */}
                                        {cartCountPhrase(count)}
                                </span>
                                <span className="absolute -top-1 -end-1 size-2 rounded-full bg-primary animate-breath" />
                        </div>
                </div>
        );
}
