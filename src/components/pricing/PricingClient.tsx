'use client';

// round86-B5: moved from app/(public)/pricing/page.tsx (server wrapper now
// renders this with initialPlans baked in by ISR)

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { springDefault } from '@/lib/motion';
import {Star, Crown, Building2, Sparkles, ChevronDown, type LucideIcon} from 'lucide-react';
import AnimatedSparkles from '@/components/ui/sparkles-icon';
import { MotionCheck } from '@/components/ui/motion-icons';
import { Button } from '@/components/ui/button';
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { fetchJson } from '@/lib/fetch-json';

export type Plan = {
	id: number;
	name: string;
	nameAr: string;
	price: number;
	periodDays: number;
	features: string[];
	maxMenus: number;
	maxItems: number;
	maxOrders: number;
	sortOrder: number;
};

// Map by plan name (not index) — Enterprise previously fell past the 4-item
// arrays → blank white icon box on the 5th card.
const PLAN_META: Record<
	string,
	{ icon: LucideIcon; gradient: string; glow: string; badge: string; badgeColor: string }
> = {
	Free: {
		icon: Sparkles,
		gradient: 'from-muted-foreground/60 to-muted-foreground/80',
		glow: 'shadow-muted-foreground/20',
		badge: '',
		badgeColor: '',
	},
	Basic: {
		icon: Star,
		gradient: 'from-[var(--c-ember)] to-[var(--c-saffron)]',
		glow: 'shadow-orange/25',
		badge: 'الأكثر شعبية',
		badgeColor: 'bg-orange text-orange-foreground',
	},
	Premium: {
		icon: Crown,
		gradient: 'from-[var(--c-ember)] to-[var(--c-saffron)]',
		glow: 'shadow-orange/30',
		badge: 'الأفضل قيمة',
		badgeColor: 'bg-gradient-to-r from-orange to-orange/80 text-orange-foreground',
	},
	Pro: {
		icon: Building2,
		gradient: 'from-[var(--c-ember)] to-[var(--c-saffron)]',
		glow: 'shadow-orange/25',
		badge: '',
		badgeColor: '',
	},
	Enterprise: {
		icon: Building2,
		gradient: 'from-[var(--c-ember)] to-[var(--c-saffron)]',
		glow: 'shadow-orange/25',
		badge: 'للشركات الكبرى',
		badgeColor: 'bg-gradient-to-r from-primary to-bloom text-primary-foreground dark:text-primary-foreground',
	},
};
const DEFAULT_META = PLAN_META.Free;

function PlanCard({ plan, index, yearly }: { plan: Plan; index: number; yearly: boolean }) {
	const reduceMotion = useReducedMotion();
	const meta = PLAN_META[plan.name] ?? DEFAULT_META;
	const Icon = meta.icon;
	const monthlyPrice = plan.price;
	const displayPrice = yearly ? monthlyPrice * 10 : monthlyPrice;
	const periodLabel = plan.periodDays === 0 ? '' : yearly ? '/السنة' : '/الشهر';
	const isPopular = index === 1;
	const isFree = plan.price === 0;

	return (
		<motion.div
			initial={reduceMotion ? false : { opacity: 0, y: 24 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-40px" }}
			transition={{ ...springDefault, delay: index * 0.08 }}
			className={cn(
				'group relative flex flex-col rounded-2xl border p-6 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 sm:p-8',
				isPopular
					? 'border-orange/50 bg-card shadow-lg shadow-orange/15 glow-border'
					: 'border-border/50 bg-card hover:border-orange/40 hover:shadow-lg hover:shadow-orange/8'
			)}
		>
			{meta.badge && (
				<div
					className={cn(
						'absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold shadow-lg',
						meta.badgeColor
					)}
				>
					{meta.badge}
				</div>
			)}

			<div className="relative z-10 flex flex-col flex-1">
				<div className="flex items-center gap-3 mb-4">
					<div
						className={cn(
							'flex size-11 items-center justify-center rounded-lg border',
							isFree
								? 'border-border bg-muted text-muted-foreground'
								: 'border-orange/20 bg-orange/10 text-orange'
						)}
					>
						<Icon className="size-5" />
					</div>
					<div>
						<h2 className="text-base sm:text-lg font-bold">{plan.nameAr}</h2>
						<p className="text-xs text-muted-foreground">{plan.name}</p>
					</div>
				</div>

				<div className="mb-6">
					{isFree ? (
						<div className="text-3xl sm:text-4xl font-bold tabular-nums">مجاني</div>
					) : (
						<div className="flex items-baseline gap-1">
							<span className="text-3xl sm:text-4xl font-bold tracking-normal tabular-nums">
								{toArabicNumber(displayPrice)}
							</span>
							<span className="text-sm sm:text-lg text-muted-foreground font-medium">د.ل</span>
							<span className="text-xs sm:text-sm text-muted-foreground">{periodLabel}</span>
						</div>
					)}
					{yearly && !isFree && (
						<p className="text-xs text-orange mt-1">وفر شهرين عند الاشتراك السنوي</p>
					)}
				</div>

				<div className="space-y-2 mb-6">
					{[
						['المنيو', plan.maxMenus === 9999 ? 'غير محدود' : toArabicNumber(plan.maxMenus)],
						[
							'الأصناف',
							plan.maxItems === 9999 ? 'غير محدود' : `حتى ${toArabicNumber(plan.maxItems)}`,
						],
						[
							'الطلبات',
							plan.maxOrders === 99999 ? 'غير محدود' : `حتى ${toArabicNumber(plan.maxOrders)}`,
						],
					].map(([label, val]) => (
						<div
							key={label as string}
							className="flex items-center justify-between rounded-lg bg-muted/45 px-3 py-2 text-sm"
						>
							<span className="text-muted-foreground">{label as string}</span>
							<span className="font-semibold">{val as string}</span>
						</div>
					))}
				</div>

				<div className="space-y-3 mb-8 flex-1">
					{plan.features.map((feature: string, i: number) => (
						<div
							key={i}
							className="flex items-start gap-3 text-sm"
						>
							<div className="relative shrink-0 mt-0.5">
								<MotionCheck className="size-4 text-orange transition-transform duration-300 group-hover/feature:scale-110" />
								<span className="absolute inset-0 size-4 rounded-full bg-orange/20 scale-0 group-hover/feature:scale-150 transition-transform duration-300" />
							</div>
							<span>{feature}</span>
						</div>
					))}
				</div>

				<Link href={isFree ? '/subscribe' : `/subscribe?plan=${plan.id}`}>
					<Button
						className={cn(
							'w-full h-12',
							isPopular ? 'bg-orange text-orange-foreground shadow-lg shadow-orange/25' : ''
						)}
						variant={isPopular ? 'orange' : 'outline'}
					>
						{isFree ? 'ابدأ مجاناً' : 'اشترك الآن'}
					</Button>
				</Link>
			</div>
		</motion.div>
	);
}

// Yearly billing = 10× the monthly price (two months free) → fixed savings
// anchor shown on the toggle. Derived from the same math as PlanCard.displayPrice.
const YEARLY_SAVINGS_PCT = Math.round((1 - 10 / 12) * 100);

export function PricingClient({ initialPlans }: { initialPlans: Plan[] | null }) {
	// round86-B5: server-rendered initial plans (SEO-visible, no post-hydrate
	// waterfall); the client fetch is only a fallback when the server data was
	// missing (DB hiccup at revalidation time).
	const [plans, setPlans] = useState<Plan[]>(initialPlans ?? []);
	const [loading, setLoading] = useState(initialPlans === null);
	const [yearly, setYearly] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadPlans = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchJson<{ data?: Plan[] }>('/api/plans');
			setPlans(data.data ?? []);
			setError(null);
		} catch {
			setError('فشل تحميل الخطط');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (plans.length === 0) loadPlans();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="min-h-dvh overflow-x-clip bg-background">
			<Header />

			<section className="relative border-b border-border/50 pb-16 pt-24 text-center sm:pb-20 sm:pt-28">

				<div className="relative z-10 max-w-3xl mx-auto px-4">
					<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange/20 bg-orange/8 px-4 py-1.5 text-sm text-orange">
						<AnimatedSparkles className="size-4" />
						خطط تناسب جميع الأحجام
					</div>
					<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-[1.35]">اختر خطتك</h1>
					<p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
						ابدأ برفع منيو مطعمك رقمياً واختر الخطة التي تناسب احتياجاتك
					</p>

					<div className="mt-6 inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card p-1 sm:mt-8">
						<button
							type="button"
							onClick={() => setYearly(false)}
							aria-pressed={!yearly}
							className={cn(
								'rounded-md px-4 py-2 text-xs font-medium transition-colors relative outline-none focus-visible:ring-2 focus-visible:ring-orange/60 sm:text-sm',
								yearly ? 'text-muted-foreground' : 'bg-orange-muted text-ember dark:text-saffron'
							)}
						>
							شهري
							{!yearly && (
								<span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-orange" />
							)}
						</button>
						<button
							type="button"
							onClick={() => setYearly(true)}
							aria-pressed={yearly}
							className={cn(
								'rounded-md px-4 py-2 text-xs font-medium transition-colors relative outline-none focus-visible:ring-2 focus-visible:ring-orange/60 sm:text-sm',
								yearly ? 'bg-orange-muted text-ember dark:text-saffron' : 'text-muted-foreground'
							)}
						>
							سنوي ·<span className="ms-1 text-xs text-ember dark:text-saffron font-bold">وفّر {toArabicNumber(YEARLY_SAVINGS_PCT)}%</span>
							{yearly && (
								<span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-orange" />
							)}
						</button>
					</div>
				</div>
			</section>

			<section className="pb-16 sm:pb-24">
				<div className="max-w-6xl mx-auto px-4">
					{loading ? (
						<>
							<LoadingAnnouncer loading={loading} message="جاري تحميل الباقات..." />
							<div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
							{[...Array(4)].map((_, i) => (
								<div key={i} className="rounded-sm border border-border/30 p-6 sm:p-8">
									<div className="flex items-center gap-3 mb-4">
										<div className="size-11 rounded-sm skeleton" />
										<div className="space-y-2 flex-1">
											<div className="h-4 w-3/4 skeleton rounded-sm" />
											<div className="h-3 w-1/2 skeleton rounded-sm" />
										</div>
									</div>
									<div className="h-8 w-1/2 skeleton rounded-sm mb-6" />
									<div className="space-y-2 mb-6">
										{[...Array(3)].map((_, j) => (
											<div key={j} className="h-7 skeleton rounded-sm" />
										))}
									</div>
									<div className="space-y-2 mb-8">
										{[...Array(4)].map((_, j) => (
											<div key={j} className="h-4 w-4/5 skeleton rounded-sm" />
										))}
									</div>
									<div className="h-12 skeleton rounded-sm" />
								</div>
							))}
							</div>
						</>
					) : error ? (
						<div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
							<span>{error}</span>
							<Button variant="outline" onClick={loadPlans}>
								إعادة المحاولة
							</Button>
						</div>
					) : plans.length === 0 ? (
						<div className="text-center py-20 text-muted-foreground">لا توجد خطط متاحة حالياً</div>
					) : (
						<div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
							{plans.map((plan, i) => (
								<PlanCard key={plan.id} plan={plan} index={i} yearly={yearly} />
							))}
						</div>
					)}
				</div>
			</section>

			<section className="pb-16 sm:pb-24">
				<div className="max-w-3xl mx-auto px-4">
					<h2 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-10">أسئلة شائعة</h2>
					<div className="space-y-3 sm:space-y-4">
						{[
							{
								q: 'هل يمكنني الترقية لاحقاً؟',
								a: 'نعم، يمكنك الترقية في أي وقت. سيتم احتساب الفرق بشكل تناسبي.',
							},
							{
								q: 'هل يوجد فترة تجريبية؟',
								a: 'نعم، الخطة المجانية متاحة للأبد مع ميزات محدودة. يمكنك الترقية في أي وقت.',
							},
							{
								q: 'هل يمكنني إلغاء الاشتراك؟',
								a: 'نعم، يمكنك إلغاء الاشتراك في أي وقت. يظل المنيو نشطاً حتى نهاية الفترة المدفوعة.',
							},
							{
								q: 'هل تدعمون جميع أنواع المطاعم؟',
								a: 'نعم، المنصة تدير المطاعم والمقاهي والمخابز والمطاعم السيارة وجميع أنواع الخدمات الغذائية.',
							},
						].map((faq, i) => (
							<details
								key={i}
								className="group overflow-hidden rounded-xl border border-border/50 bg-card transition-[border-color,box-shadow] duration-200 open:border-orange/25 open:shadow-sm"
							>
								<summary className="flex items-center justify-between cursor-pointer text-sm sm:text-base font-medium list-none px-4 sm:px-5 py-3 sm:py-4 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-orange/60">
																	{faq.q}
																	<span className="text-muted-foreground group-open:rotate-180 transition-transform duration-300 text-xs">
																		<ChevronDown className="size-4" />
																	</span>
																</summary>
								<div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-300">
									<div className="overflow-hidden">
										<p className="px-4 sm:px-5 pb-3 sm:pb-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
											{faq.a}
										</p>
									</div>
								</div>
							</details>
						))}
					</div>
				</div>
			</section>

			<section className="pb-16 sm:pb-24">
				<div className="max-w-2xl mx-auto px-4 text-center">
					<div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-6 shadow-sm sm:p-8 md:p-12">
						<div className="absolute inset-x-0 top-0 mx-auto h-1 w-20 bg-orange" />
						<h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
							مستعد لانطلاق مطعمك الرقمي؟
						</h2>
						<p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto">
							ابدأ مجاناً بدون بطاقة ائتمان
						</p>
						<div className="flex gap-3 sm:gap-4 justify-center flex-wrap">
							<Link href="/subscribe">
								<Button variant="flame" size="lg">ابدأ مجاناً</Button>
							</Link>
							<Link href="/menu/al-waha-cafe">
								<Button size="lg" variant="outline">
									شاهد منيو تجريبي
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</section>

			<Footer />
		</div>
	);
}
