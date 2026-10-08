'use client';

import { Button } from '@/components/ui/button';
import type { Plan } from '@/lib/plan-types';
import {CreditCard} from 'lucide-react';
import { MotionCheck } from '@/components/ui/motion-icons';
import { PaymentDialog } from '@/components/shared/PaymentDialog';
import { formatPrice } from '@/lib/format';

export function UpgradePlanSummary({
        currentPlan,
        onBack,
        onPay,
}: {
        currentPlan: Plan;
        onBack: () => void;
        onPay: () => void;
}) {
        return (
                <div className="animate-fade-in max-w-lg mx-auto">
                        {/* r95: ملخص الخطة — هندسة بطاقة SmartBot */}
                        <div className="rounded-2xl p-5 mb-8 border border-accent-foreground/30 bg-gradient-to-r from-orange-muted/80 to-white dark:from-orange-muted/20 dark:to-card">
                                <div className="flex items-center justify-between">
                                        <div>
                                                <p className="font-bold text-lg">{currentPlan.nameAr}</p>
                                                <p className="text-sm text-muted-foreground tabular-nums">
                                                        {formatPrice(currentPlan.price, { suffix: ' د.ل/شهر' })}
                                                </p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={onBack}>
                                                تغيير
                                        </Button>
                                </div>
                                <div className="mt-4 space-y-2 text-sm">
                                        {currentPlan.features.slice(0, 5).map((f, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                        {/* r95: علامات الميزات — اللهب الأسطع */}
                                                        <MotionCheck className="size-3.5 text-accent-foreground shrink-0" />
                                                        <span>{f}</span>
                                                </div>
                                        ))}
                                </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6 text-center">
                                بيانات مطعمك الحالية ستبقى كما هي — فقط سيتم ترقية خطتك.
                        </p>
                        {/* r131 (A2 P2-15): تجاوز rounded-sm أُزيل — الوراثة من Button (r-md 10px). */}
                        <Button className="w-full h-14 text-base font-semibold" size="lg" onClick={onPay}>
                                <CreditCard className="size-5 ms-2" />
                                <span className="tabular-nums">ادفع الآن ({formatPrice(currentPlan.price)})</span>
                        </Button>
                </div>
        );
}

export function PaymentDialogWrapper({
        open,
        onOpenChange,
        currentPlan,
        upgradeMode,
        user,
        form,
        onSuccess,
}: {
        open: boolean;
        onOpenChange: (o: boolean) => void;
        currentPlan: Plan;
        upgradeMode: boolean;
        user: { role: string; subscriptionStatus: string; restaurantId: number | null } | null;
        form: { restaurants: { name: string; slug: string }[]; username: string };
        onSuccess: () => void;
}) {
        return (
                <PaymentDialog
                        open={open}
                        onOpenChange={onOpenChange}
                        planId={currentPlan.id}
                        planName={currentPlan.name}
                        planNameAr={currentPlan.nameAr}
                        price={Number(currentPlan.price)}
                        onSuccess={onSuccess}
                        upgradeRestaurantId={upgradeMode && user?.restaurantId ? user.restaurantId : undefined}
                        tempRestaurants={form.restaurants.map((r) => ({ name: r.name, slug: r.slug }))}
                        tempUsername={form.username.trim()}
                />
        );
}
