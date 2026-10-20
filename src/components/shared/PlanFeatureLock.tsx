'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
/* W7-B (G-4): النسخة والخريطة من المصدر النقي المشترك (بلا prisma —
   plan-entitlements-core) حتى لا تسحب مكونات الواجهة قاعدة البيانات
   إلى حزمة العميل. */
import { PLAN_FEATURES, type PlanFeatureKey } from '@/lib/plan-entitlements-core';

/**
 * W7-B — حالة القفل الصادقة لميزة خطة (وجه المالك حصرًا).
 *
 * عقد الأسرة: تعطيل + تفسير + رابط ترقية — لا زر ميت، لا وظيفة
 * مخفية تتظاهر بالتحميل، ولا لافتة في وجه الزبون (وجه الزبون يعامل
 * بالغياب الصادق — LoyaltyWidget). النسخة مشتقة من الخريطة نفسها
 * التي تفرض الحارسات 403 (المصدر الواحد).
 */
export function PlanFeatureLock({
        feature,
        compact = false,
        className,
}: {
        feature: PlanFeatureKey;
        /** داخل صف/عمود ضيق: بلا لوحة كاملة — سطر أيقونة + نص + زر. */
        compact?: boolean;
        className?: string;
}) {
        const def = PLAN_FEATURES[feature];
        const title = `${def.labelAr} متوفرة في خطة «${def.minPlanNameAr}» فأعلى`;
        const description = 'قم بترقية خطتك لفتح هذه الميزة والاستفادة من كامل قدرات منصتك.';

        if (compact) {
                return (
                        <div
                                className={cn(
                                        'flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5',
                                        className
                                )}
                        >
                                <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <p className="min-w-0 flex-1 text-xs text-muted-foreground">{title}</p>
                                <Link href="/subscribe">
                                        <Button size="sm" variant="orange" className="h-9 px-3 text-xs">
                                                الترقية
                                        </Button>
                                </Link>
                        </div>
                );
        }

        return (
                <div
                        className={cn(
                                'flex flex-col items-center justify-center gap-3 rounded-lg border border-border/60 bg-card p-8 text-center shadow-sm',
                                className
                        )}
                        role="status"
                >
                        <div className="flex size-12 items-center justify-center rounded-full bg-orange-muted">
                                <Lock className="size-6 text-orange" aria-hidden="true" />
                        </div>
                        <div className="space-y-1">
                                <p className="text-sm font-bold">{title}</p>
                                <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
                                        {description}
                                </p>
                        </div>
                        <Link href="/subscribe">
                                <Button size="sm" variant="orange">
                                        الترقية إلى خطة {def.minPlanNameAr}
                                </Button>
                        </Link>
                </div>
        );
}
