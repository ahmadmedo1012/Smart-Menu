"use client"

import Link from "next/link"
import { MessageCircle, TrendingUp } from "lucide-react"
import { MotionArrowRight } from '@/components/ui/motion-icons';
import { motion, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { IPhoneMockup } from "@/components/ui/iphone-mockup"
import { springDefault } from "@/lib/motion"

// Staggered entrance for hero content — professional premium reveal
const heroItem = {
	hidden: { opacity: 0, y: 16 },
	show: (i: number) => ({
		opacity: 1,
		y: 0,
		transition: { delay: 0.15 + i * 0.12, ...springDefault },
	}),
};

export function HeroSection({ totalRestaurants }: { totalRestaurants?: number }) {
	const reduceMotion = useReducedMotion();
	// Real count from fetchPublicStats (never hard-code marketing numbers —
	// round 82: "أكثر من 500 مطعم" fabricated while API returned 136).
	const trustCount = totalRestaurants && totalRestaurants > 0 ? totalRestaurants : 0;

	return (
		<>
			<div
				className="absolute inset-0 -z-10 overflow-clip pointer-events-none"
				aria-hidden="true"
			>
				<div
					className="absolute top-1/4 left-1/2 -translate-x-1/2 size-[70vmin] rounded-full"
					style={{
						background: "radial-gradient(ellipse at center, oklch(0.55 0.19 45 / 0.12) 0%, transparent 70%)",
						filter: "blur(120px)",
					}}
				/>
				<div
					className="absolute bottom-0 left-1/4 -translate-x-1/2 size-[50vmin] rounded-full"
					style={{
						background: "radial-gradient(ellipse at center, oklch(0.85 0.09 85 / 0.07) 0%, transparent 70%)",
						filter: "blur(100px)",
					}}
				/>
				<div
					className="absolute top-1/3 right-1/4 size-[40vmin] rounded-full"
					style={{
						background: "radial-gradient(ellipse at center, oklch(0.78 0.13 30 / 0.05) 0%, transparent 70%)",
						filter: "blur(90px)",
					}}
				/>
			</div>

			<ContainerScroll
				className="bg-background"
				titleComponent={
					<motion.div
							initial={reduceMotion ? false : "hidden"}
							animate="show"
							variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
						>
						<motion.h1 variants={heroItem} custom={0} className="text-[1.9rem] sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.35] text-balance max-w-3xl mx-auto">
							<span className="block">
								منيو رقمي لمطعمك{"\u00A0"}
							</span>
							<span className="block">
								<span className="text-orange">الطلبات تصل</span> على واتساب
							</span>
						</motion.h1>

						<motion.div variants={heroItem} custom={1} className="mx-auto mt-4 w-16 h-0.5 rounded-full bg-gradient-to-r from-orange/0 via-orange to-orange/0" />

						<motion.p variants={heroItem} custom={2} className="text-sm sm:text-base text-foreground/60 max-w-2xl mx-auto leading-relaxed mb-8">
							هل أنت مستعد لبدء رحلة تحولية لمطعمك؟ منيو رقمي احترافي مع طلب عبر واتساب.
						</motion.p>

						<motion.div variants={heroItem} custom={3} className="flex gap-3 sm:gap-4 justify-center flex-wrap">
							<Link href="/subscribe">
								<Button size="lg" className="text-sm sm:text-base">
									ابدأ مجاناً <MotionArrowRight className="size-4 sm:size-5 rtl:rotate-180" />
								</Button>
							</Link>
							<Link href="/login">
								<Button variant="outline" size="lg" className="text-sm sm:text-base">
									تسجيل الدخول
								</Button>
							</Link>
						</motion.div>

						<motion.div variants={heroItem} custom={4} className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-3 py-1 text-[11px] font-medium text-orange mt-6">
							<span className="size-1.5 rounded-full bg-orange animate-pulse-dot" />
							أكثر من {trustCount.toLocaleString("ar")} مطعم يثقون فينا
						</motion.div>
					</motion.div>
				}
			>
				<div className="flex justify-center sm:px-4 md:px-0">
					<div className="relative w-full max-w-[240px] sm:max-w-[280px] md:max-w-[300px] lg:max-w-[320px]">
						<IPhoneMockup
							model="15-pro"
							color="natural-titanium"
							wallpaper="/hero-phone.webp"
							wallpaperFit="cover"
							scale={1}
							className="w-full"
						/>

						{/* Floating: WhatsApp order notification */}
						<motion.div
							initial={{ opacity: 0, y: 14, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							transition={{ delay: 0.55, ...springDefault }}
							className="absolute top-5 -start-2 sm:-start-5 md:-start-8 z-10"
						>
							<div className="animate-float-slow">
								<div className="glass-strong rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-xl">
									<div className="relative size-9 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0">
										<MessageCircle className="size-4 text-[#25D366]" />
										<span className="absolute -top-0.5 -end-0.5 size-2.5 rounded-full bg-[#25D366] ring-2 ring-background" />
									</div>
									<div className="text-start">
										<p className="text-xs font-bold text-foreground leading-tight">طلب جديد وصل</p>
										<p className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">بيتزا مارغريتا ×2 · الآن</p>
									</div>
								</div>
							</div>
						</motion.div>

						{/* Floating: monthly growth stat */}
						<motion.div
							initial={{ opacity: 0, y: 14, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							transition={{ delay: 0.75, ...springDefault }}
							className="absolute bottom-24 -end-2 sm:-end-5 md:-end-8 z-10"
						>
							<div className="animate-float-slow [animation-delay:1.5s]">
								<div className="glass-strong rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-xl">
									<div className="size-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
										<TrendingUp className="size-4 text-emerald-500" />
									</div>
									<div className="text-start">
										<p className="text-sm font-bold text-foreground leading-none">+32%</p>
										<p className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">نمو الطلبات الشهرية</p>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</ContainerScroll>
		</>
	)
}