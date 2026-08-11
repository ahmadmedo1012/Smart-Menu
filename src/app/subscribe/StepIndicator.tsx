'use client';

import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { MotionCheck } from '@/components/ui/motion-icons';
import { motion } from 'framer-motion';

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
	const currentIdx = stepIndex(current);

	return (
		<div className="flex items-center justify-center mb-10">
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
								'flex flex-col items-center gap-1.5 group outline-none',
								!clickable && 'cursor-default'
							)}
							aria-current={isActive ? 'step' : undefined}
						>
							<motion.div
								animate={{
									scale: isActive ? 1 : 0.92,
								}}
								className={cn(
									'size-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors duration-300',
									isActive
										? 'bg-orange text-white border-orange shadow-lg shadow-orange/25'
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
							</motion.div>
							<span
								className={cn(
									'text-[11px] sm:text-xs font-medium transition-colors hidden sm:block',
									isActive ? 'text-orange' : isDone ? 'text-foreground/70' : 'text-muted-foreground/50'
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
		</div>
	);
}
