'use client';

import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { MotionCheck } from '@/components/ui/motion-icons';
import { m, useReducedMotion } from 'motion/react';

export type WizardStep = 'plan' | 'menu' | 'account' | 'review';

const STEP_ORDER: WizardStep[] = ['plan', 'menu', 'account', 'review'];

const STEP_LABELS: Record<WizardStep, string> = {
        plan: 'اختر الخطة',
        menu: 'بيانات المنيو',
        account: 'بيانات الدخول',
        review: 'المراجعة',
};

export function stepIndex(step: WizardStep) {
        return STEP_ORDER.indexOf(step);
}

export function StepIndicator({
        current,
        onNavigate,
}: {
        current: WizardStep;
        onNavigate?: (s: WizardStep) => void;
}) {
        const reduceMotion = useReducedMotion();
        const currentIdx = stepIndex(current);

        return (
                <nav aria-label="خطوات الاشتراك" className="flex items-center justify-center mb-10">
                        {STEP_ORDER.map((s, i) => {
                                const isActive = s === current;
                                const isDone = i < currentIdx;
                                const clickable = isDone || isActive;

                                return (
                                        <div key={s} className="flex items-center">
                                                {/* Step node */}
                                                <button
                                                        type="button"
                                                        disabled={!clickable}
                                                        onClick={() => clickable && onNavigate?.(s)}
                                                        className={cn(
                                                                'flex flex-col items-center gap-1.5 group outline-none focus-visible:ring-2 focus-visible:ring-orange/40 rounded-full',
                                                                !clickable && 'cursor-default'
                                                        )}
                                                        aria-current={isActive ? 'step' : undefined}
                                                        aria-disabled={!clickable || undefined}
							/* F-D/round91: step label span is hidden on mobile (hidden sm:block) and the
								   number becomes a check icon once done → this button lost its accessible
								   name on mobile deep-links (?plan=… starts at step 2; axe button-name
								   critical). Name it explicitly. */
							aria-label={`الخطوة ${toArabicNumber(i + 1)}: ${STEP_LABELS[s]}${isDone ? ' (مكتملة)' : isActive ? ' (الحالية)' : ''}`}
                                                >
                                                        <m.div
                                                                initial={false}
                                                                whileTap={clickable && !reduceMotion ? { scale: 0.94 } : undefined}
                                                                className={cn(
                                                                        'size-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors duration-300',
                                                                        isActive
                                                                                /* round94 (D/A8): هضبة saffron بمركز دائرة الخطوة (نمط زر flame)
                                                                                   — الرقم espresso الممركز كان على منتصف المنحدر 4.58:1
                                                                                   والآن على saffron الصرفة 8.97:1. */
                                                                                ? 'bg-[linear-gradient(135deg,var(--c-ember),var(--c-saffron)_50%,var(--c-ember))] text-espresso border-transparent shadow-lg shadow-orange/30 font-extrabold'
                                                                                : isDone
                                                                                        ? 'bg-orange/15 text-orange border-orange/40'
                                                                                        : 'bg-muted/50 text-muted-foreground border-border/40'
                                                                )}
                                                        >
                                                                {isDone ? (
                                                                        <MotionCheck className="size-4" />
                                                                ) : (
                                                                        toArabicNumber(i + 1)
                                                                )}
                                                        </m.div>
                                                        <span
                                                                className={cn(
                                                                        'text-[11px] sm:text-xs font-medium transition-colors hidden sm:block',
                                                                        isActive ? 'text-orange font-bold' : isDone ? 'text-foreground/70' : 'text-muted-foreground/50'
                                                                )}
                                                        >
                                                                {STEP_LABELS[s]}
                                                        </span>
                                                </button>

                                                {/* Connector */}
                                                {i < STEP_ORDER.length - 1 && (
                                                        <div
                                                                className={cn(
                                                                        'w-8 sm:w-14 h-0.5 mx-1 sm:mx-2 rounded-full transition-colors duration-500',
                                                                        i < currentIdx ? 'bg-orange/50' : 'bg-muted-foreground/15'
                                                                )}
                                                        />
                                                )}
                                        </div>
                                );
                        })}
                </nav>
        );
}
