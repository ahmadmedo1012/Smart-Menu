'use client';

/**
 * r137 — شارة «مفتوح الآن / مغلق حاليًا» لصفحة المنيو العامة.
 *
 * الجزيرة العميلية (نمط OrbField/MenuIslands r86-B6): تُحسب الحالة على
 * العميل فقط — صفحة المنيو مخبأة ISR (revalidate 60)، فأي حساب خادمي
 * كان سيعلن فتحًا/إغلاقًا بلسان اللحظة التي خُبزت فيها الصفحة، لا لسان
 * لحظة الزبون. حتى التركيب الأول لا يرسم شيئًا (useMounted) — لا وميض
 * إيدراج ولا تعارض ماء.
 *
 * التحديث: إعادة حساب كل 60 ثانية (المطعم يغلق 23:00 والشارة تقول
 * «مفتوح الآن» إلى ما لا نهاية = بيانات كاذبة، لا ميزة مفقودة). لا
 * شبكة إطلاقًا — مقارنات محلية صرفة.
 *
 * الصمت الصادق: لا صفوف ساعات مهيكلة → لا شارة أصلًا (workingHours
 * النصي الحر يبقى يُعرض كما هو في MenuHero).
 */
import { useEffect, useState } from 'react';
import { computeOpenStatus, tripoliWallClock, type OpeningHoursRow } from '@/lib/opening-hours';
import { cn } from '@/lib/utils';

type BadgeState = { isOpen: boolean; text: string } | null;

export function OpenStatusBadge({ hours }: { hours?: OpeningHoursRow[] | null }) {
	const [badge, setBadge] = useState<BadgeState>(null);

	useEffect(() => {
		if (!hours || hours.length === 0) return;
		const recompute = () => {
			const status = computeOpenStatus(hours, tripoliWallClock());
			if (!status) {
				setBadge(null);
				return;
			}
			setBadge(
				status.isOpen
					? { isOpen: true, text: `مفتوح الآن · يغلق ${status.closesAtLabel}` }
					: {
							isOpen: false,
							text: status.nextOpenLabel ? `مغلق حاليًا · ${status.nextOpenLabel}` : 'مغلق حاليًا',
						},
			);
		};
		recompute();
		// 60 ثانية: دقة الحدّ الأدنى الصادقة للدقيقة (الحدود دقيقة-إلى-دقيقة)
		const timer = setInterval(recompute, 60_000);
		return () => clearInterval(timer);
	}, [hours]);

	if (!badge) return null;

	return (
		<p
			aria-live="polite"
			dir="rtl"
			className={cn(
				'inline-flex items-center gap-1.5 mt-1 px-3.5 py-1.5 rounded-full text-xs font-medium',
				'border backdrop-blur-md',
				badge.isOpen
					? 'bg-success/10 border-success/30 text-success'
					: 'bg-glass-bg/30 border-glass-border text-muted-foreground',
			)}
		>
			<span
				aria-hidden="true"
				className={cn('size-1.5 rounded-full', badge.isOpen ? 'bg-success' : 'bg-muted-foreground/60')}
			/>
			{badge.text}
		</p>
	);
}
