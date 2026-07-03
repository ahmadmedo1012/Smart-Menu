"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Quote, Star, ChevronLeft, ChevronRight } from "lucide-react"
import { springGentle, springSnappy, slideVariants } from "@/lib/motion"
import { OptimizedImage } from "@/components/ui/OptimizedImage"

const testimonials = [
	{
		name: "أحمد المبروك",
		role: "صاحب مقهى الواحة",
		location: "طرابلس",
		content: "منذ استخدام الربط الذكي، زادت طلباتنا عبر واتساب. الزبائن صاروا يطلبون مباشرة من المنيو دون الاتصال بنا.",
		rating: 5,
		avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
	},
	{
		name: "سارة التومي",
		role: "مديرة مطعم الأصيل",
		location: "بنغازي",
		content: "وفرت لنا المنصة وقتاً وجهداً. تحديث المنيو يتم لحظياً والطلبات تصل مرتبة. أنصح بها كل مطعم.",
		rating: 5,
		avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
	},
	{
		name: "عمر بن عاشور",
		role: "صاحب بيتزا روما",
		location: "مصراتة",
		content: "نظام الولاء والنقاط جعل الزبائن يعودون باستمرار. زيادة واضحة في المبيعات الشهرية.",
		rating: 5,
		avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80",
	},
	{
		name: "نورة الصغير",
		role: "صاحبة كوفي أرت",
		location: "الزاوية",
		content: "بعد استخدام منيو الربط الذكي، صار عندي وقت أهتم بالجودة والإبداع بدل استلام الطلبات بالتلفون.",
		rating: 5,
		avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
	},
	{
		name: "خالد المنتصر",
		role: "صاحب مستر برجر",
		location: "طرابلس",
		content: "QR كود واحد غير كل شي. الزبون يمسح ويطلب. الأخطاء قلت، الرضا زاد، والمبيعات تضاعفت.",
		rating: 5,
		avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80",
	},
]

export default function TestimonialsSection() {
	const [[page, dir], setPage] = useState([0, 0])
	const [isPaused, setIsPaused] = useState(false)

	const index = ((page % testimonials.length) + testimonials.length) % testimonials.length

	const next = useCallback(() => setPage(([p]) => [p + 1, 1]), [])
	const prev = useCallback(() => setPage(([p]) => [p - 1, -1]), [])

	// Auto rotate
	useEffect(() => {
		if (isPaused) return
		const t = setInterval(next, 5500)
		return () => clearInterval(t)
	}, [isPaused, next])

	const t = testimonials[index]

	return (
		<section className="relative py-12 sm:py-16 overflow-hidden" id="reviews">
			{/* Ambient glow pools */}
			<div className="pointer-events-none absolute top-1/4 right-1/4 size-[40vmin] rounded-full bg-orange/5 blur-[120px]" />
			<div className="pointer-events-none absolute bottom-1/4 left-1/4 size-[30vmin] rounded-full bg-orange/3 blur-[100px]" />

			<div className="relative z-10 max-w-[1220px] mx-auto px-4 sm:px-6">
				{/* Section header */}
				<div className="text-center mb-14 sm:mb-18">
					<motion.span
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={springSnappy}
						className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-4 py-1 text-[0.65rem] font-medium text-orange mb-5"
					>
						<Quote className="size-3" />
						تجارب حقيقية
					</motion.span>

					<motion.h2
						initial={{ opacity: 0, y: 16 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ ...springGentle, delay: 0.06 }}
						className="text-[1.8rem] sm:text-3xl md:text-[2.75rem] font-[520] leading-[1.2]"
					>
						ماذا يقول عملاؤنا
					</motion.h2>

					<motion.p
						initial={{ opacity: 0, y: 8 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ ...springSnappy, delay: 0.15 }}
						className="text-sm text-muted-foreground/70 mt-3 max-w-lg mx-auto"
					>
						آلاف المطاعم والمقاهي تثق في منصتنا
					</motion.p>
				</div>

				{/* Main carousel */}
				<div className="flex justify-center" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
					<div className="relative w-full max-w-2xl">
						{/* Card backdrop */}
						<div className="absolute inset-0 -top-4 scale-[0.97] rounded-2xl border border-border/20 bg-card/40 blur-sm opacity-50 pointer-events-none" />
						<div className="absolute inset-0 -top-2 scale-[0.985] rounded-2xl border border-border/10 bg-card/20 blur-[1px] opacity-30 pointer-events-none" />

						{/* Active card */}
						<AnimatePresence mode="wait" custom={dir}>
							<motion.div
								key={page}
								custom={dir}
								variants={slideVariants(dir as 1 | -1)}
								initial="hidden"
								animate="visible"
								exit="exit"
								className="relative rounded-2xl border border-border/50 bg-card p-4 md:p-6 lg:p-8 shadow-xl shadow-black/20"
							>
								{/* Floating quote icon */}
								<div className="absolute -top-4 right-6 size-10 rounded-full bg-orange/15 flex items-center justify-center">
									<Quote className="size-4 text-orange" />
								</div>

								{/* Stars */}
								<div className="flex gap-1 mb-5">
									{Array.from({ length: 5 }).map((_, i) => (
										<Star
											key={i}
											className={`size-4 ${i < t.rating ? "fill-orange text-orange" : "text-border"}`}
										/>
									))}
								</div>

								{/* Quote */}
								<blockquote className="text-base sm:text-lg leading-relaxed text-foreground/85 mb-6 max-w-prose">
									&ldquo;{t.content}&rdquo;
								</blockquote>

								{/* Attribution */}
								<div className="flex items-center gap-4">
									<div className="size-11 sm:size-12 rounded-full overflow-hidden ring-2 ring-orange/20 ring-offset-2 ring-offset-card shrink-0">
										<OptimizedImage src={t.avatar} alt={t.name} className="size-full" skeleton={false} />
									</div>
									<div>
										<p className="text-sm font-medium text-foreground">{t.name}</p>
										<p className="text-xs text-muted-foreground/70">{t.role} · {t.location}</p>
									</div>
								</div>
							</motion.div>
						</AnimatePresence>

						{/* Nav arrows */}
						<div className="flex items-center justify-center gap-4 mt-8">
							<button
								onClick={prev}
								className="size-9 rounded-full border border-border/40 bg-card/60 flex items-center justify-center hover:bg-orange/15 hover:border-orange/30 transition-colors duration-200 group"
								aria-label="السابق"
							>
								<ChevronRight className="size-4 text-muted-foreground group-hover:text-orange transition-colors" />
							</button>

							{/* Dots */}
							<div className="flex gap-2">
								{testimonials.map((_, i) => (
									<button
										key={i}
										onClick={() => setPage([i, i > index ? 1 : -1])}
										className={`h-1.5 rounded-full transition-all duration-500 ${
											i === index ? "w-8 bg-orange" : "w-1.5 bg-border hover:bg-orange/40"
										}`}
										aria-label={`التقييم ${i + 1}`}
									/>
								))}
							</div>

							<button
								onClick={next}
								className="size-9 rounded-full border border-border/40 bg-card/60 flex items-center justify-center hover:bg-orange/15 hover:border-orange/30 transition-colors duration-200 group"
								aria-label="التالي"
							>
								<ChevronLeft className="size-4 text-muted-foreground group-hover:text-orange transition-colors" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
