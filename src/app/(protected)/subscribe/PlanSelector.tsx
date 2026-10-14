'use client';

import { Flame } from 'lucide-react';
import { MotionArrowLeft } from '@/components/ui/motion-icons';
import { MotionCheck } from '@/components/ui/motion-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice, toArabicNumber } from '@/lib/format';
import { getArabicPlural } from '@/lib/arabic-plural';
import { itemsPhrase, filterLimitFeatures, type ComparisonPlan } from '@/components/subscribe/plan-comparison';
/* P13-2b (T4): خريطة عرض الخطط من الوحدة الموحّدة (كانت PLAN_META محلية
   ثالثة هنا). */
import { PLAN_META, DEFAULT_PLAN_META } from '@/components/subscribe/plan-meta';

type Plan = ComparisonPlan;

export function PlanSelector({
        plans,
        selectedPlan,
        upgradeMode,
        onSelect,
        onContinue,
}: {
        plans: Plan[];
        selectedPlan: number | null;
        upgradeMode: boolean;
        onSelect: (id: number) => void;
        onContinue: () => void;
}) {
        const visiblePlans = plans.filter((p) => (!upgradeMode ? true : Number(p.price) > 0));
        const selected = plans.find((p) => p.id === selectedPlan);

        return (
                <div className="animate-fade-in">
                        <h2 className="font-heading text-2xl font-bold text-center mb-8">
                                {upgradeMode ? 'اختر خطة للترقية إليها' : 'اختر خطة تناسب مطعمك'}
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
                                {visiblePlans.map((plan) => {
                                        const meta = PLAN_META[plan.name] ?? DEFAULT_PLAN_META;
                                        const Icon = meta.icon;
                                        const isSelected = selectedPlan === plan.id;
                                        /* P13-2b (T3): itemsPhrase أعلاه هو سطح حدّ الأصناف الوحيد في
                                           البطاقة — سلاسل الميزات التي تعيد ذكر نفس السقف تُسقط من
                                           العرض (نفس قاعدة /pricing، نفس المساعد المشترك). */
                                        const features = filterLimitFeatures(plan.features, plan, ['items']);
                                        return (
                                                <button
                                                        key={plan.id}
                                                        type="button"
                                                        onClick={() => onSelect(plan.id)}
                                                        aria-pressed={isSelected}
                                                        className={cn(
                                                                /* r95 → r128-F5 (§4 flat cards): بطاقة مسطّحة —
                                                                   حدّ شعري، لا ظلّ ولا تدرّج ولا زجاج. */
                                                                'relative flex flex-col rounded-lg border p-5 text-start transition-[border-color] duration-slower hover:border-accent-foreground/30 outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                                isSelected
                                                                        ? 'border-accent-foreground/40 ring-2 ring-primary/30 bg-card'
                                                                        : 'border-border/50 bg-card'
                                                        )}
                                                >
                                                        {/* Selection check — shape + position carry the state alongside color (a11y) */}
                                                        <span
                                                                aria-hidden={!isSelected}
                                                                className={cn(
                                                                        'absolute -top-2 -end-2 size-6 rounded-full flex items-center justify-center transition-opacity duration-fast',
                                                                        isSelected
                                                                                ? 'bg-primary opacity-100'
                                                                                : 'bg-border/60 opacity-0 pointer-events-none'
                                                                )}
                                                        >
                                                                <MotionCheck className="size-3.5 text-primary-foreground" />
                                                        </span>
                                                        {meta.recommended && !upgradeMode && (
                                                                /* round94 (D/A8) → r128-F5 → Phase 6 (r154): شارة
                                                                   تراكوتا صلبة (bg-orange بحبر أبيض 5.02:1) — موحّدة
                                                                   مع شارة /pricing نفسها؛ بلا تدرّج ولا ظل. */
                                                                <span className="absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-orange px-2.5 py-0.5 text-3xs font-bold text-orange-foreground">
                                                                        <Flame className="size-3" aria-hidden="true" />
                                                                        الأكثر شعبية
                                                                </span>
                                                        )}
                                                        <span
                                                                className={cn(
                                                                        /* r95 → r128-F5 → Phase 6 (r154): بئر الطبق الدائري بحافة
                                                                           التراكوتا (نفس عقد KPI/‌pricing) */
                                                                        'size-10 rounded-full ring-[1.5px] ring-inset ring-[color:var(--accent-solid)]/30 flex items-center justify-center mb-3',
                                                                        meta.chip
                                                                )}
                                                        >
                                                                <Icon className="size-5" aria-hidden="true" />
                                                        </span>
                                                        <h3 className="font-heading font-bold text-lg mb-1">{plan.nameAr}</h3>
                                                        <div className="flex items-baseline gap-1 mb-3">
                                                                {/* r128-F5: أرقام الأسعار بخط mono (نمط ln-mono).
                                                                   r131 (A2 P1-5 — حكم توحيد السعر): درجة --fs-metric-lg
                                                                   الموحّدة (30px) عبر السطحين مع /pricing. */}
                                                                <span className="text-[length:var(--fs-metric-lg,30px)] font-bold tabular-nums font-mono leading-none">
                                                                        {Number(plan.price) === 0 ? 'مجاني' : formatPrice(plan.price, { suffix: '' })}
                                                                </span>
                                                                {Number(plan.price) > 0 && (
                                                                        <span className="text-xs text-muted-foreground">د.ل/شهر</span>
                                                                )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mb-3">{itemsPhrase(plan)}</p>
                                                        <div className="space-y-1.5 mb-4 flex-1">
                                                                {features.slice(0, 4).map((f, j) => (
                                                                        <div key={j} className="flex items-center gap-2 text-xs">
                                                                                {/* r95: علامات الميزات — اللهب الأسطع */}
                                                                                <MotionCheck className="size-3 text-accent-foreground shrink-0" />
                                                                                <span>{f}</span>
                                                                        </div>
                                                                ))}
                                                                {features.length > 4 && (
                                                                        /* r95: مزيد الميزات — accent-foreground (AA).
                                                                           P13-2b (T3): العدّ على القائمة المصفّاة (بعد إسقاط
                                                                           تكرارات حدّ الأصناف) وإلا ادّعى البطاقة ميزات مخفية أكثر
                                                                           من الموجود. */
                                                                        <p className="text-xs text-accent-foreground font-medium">
                                                                                +{toArabicNumber(features.length - 4)}{' '}
                                                                                {getArabicPlural(features.length - 4, 'ميزة أخرى', 'ميزتان أخريان', 'ميزات أخرى')}
                                                                        </p>
                                                                )}
                                                        </div>
                                                </button>
                                        );
                                })}
                        </div>
                        <div className="text-center">
                                {/* r131 (A2 P2-15): تقسيم أنصاف الأقطار داخل التدفق الواحد
                                    (8/10/20) أُزيل — زر Button يرث r-md (10px) القانونية. */}
                                <Button
                                        size="lg"
                                        variant={selected ? 'flame' : 'outline'}
                                        className="px-10 h-14 text-lg"
                                        disabled={!selectedPlan}
                                        onClick={onContinue}
                                >
                                        {selected ? `متابعة مع خطة ${selected.nameAr}` : 'اختر خطة أولاً'}
                                        <MotionArrowLeft className="ms-2 size-5" />
                                </Button>
                        </div>
                </div>
        );
}
