'use client';

import { m, useReducedMotion } from 'motion/react';
import { MessageCircle } from 'lucide-react';

/**
 * Light celebratory success state after subscription submission.
 * The checkmark draws in ≤600ms and is fully disabled under
 * prefers-reduced-motion (path appears instantly, no confetti).
 */
export function SuccessPanel({
	planNameAr,
	paid,
}: {
	planNameAr: string;
	paid: boolean;
}) {
	const reduceMotion = useReducedMotion();

	const drawTransition = reduceMotion
		? { duration: 0 }
		: { duration: 0.5, ease: [0.65, 0, 0.35, 1] as const };

	return (
		<div className="animate-fade-in max-w-lg mx-auto text-center py-10">
			{/* Animated checkmark — stroke draw ≤600ms, static under reduced motion */}
			<m.div
				initial={reduceMotion ? false : { scale: 0.8 }}
				animate={{ scale: 1 }}
				transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 20 }}
				className="mx-auto mb-6 size-20 rounded-full bg-orange-muted flex items-center justify-center"
				role="img"
				aria-label="تم بنجاح"
			>
				<svg
					viewBox="0 0 52 52"
					className="size-10"
					fill="none"
					stroke="var(--c-flame)"
					strokeWidth="4"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<m.path
						d="M14 27 L23 36 L38 18"
						initial={{ pathLength: 0 }}
						animate={{ pathLength: 1 }}
						transition={drawTransition}
					/>
				</svg>
			</m.div>

			<h2 className="text-2xl font-bold mb-3">تم إرسال طلب اشتراكك في خطة {planNameAr}</h2>

			{paid ? (
				<div className="rounded-md border border-border/40 bg-card p-5 text-start space-y-3">
					<h3 className="font-semibold text-sm flex items-center gap-2">
						<MessageCircle className="size-4 text-orange" aria-hidden="true" />
						ماذا بعد؟
					</h3>
					<ol className="space-y-2 text-sm text-muted-foreground leading-relaxed list-decimal list-inside">
						<li>أرسل إيصال الدفع عبر تيليغرام إلى الإدارة (الزر داخل نافذة الدفع).</li>
						<li>يراجع الفريق طلبك ويوافق على التفعيل — عادة خلال ساعات العمل.</li>
						<li>ستصلك رسالة عند التفعيل، ثم يُنقلك الموقع تلقائياً إلى لوحة التحكم.</li>
					</ol>
				</div>
			) : (
				<p className="text-sm text-muted-foreground leading-relaxed">
					تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول والبدء ببناء منيو مطعمك.
				</p>
			)}
		</div>
	);
}
