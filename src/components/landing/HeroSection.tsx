"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OptimizedImage } from "@/components/ui/OptimizedImage"
import { springGentle, springDefault } from "@/lib/motion"

export default function HeroSection() {
	return (
		<section style={{ backfaceVisibility: "hidden" }} className="relative min-h-[85dvh] flex items-center justify-center overflow-hidden bg-background">
			<div className="absolute inset-0 z-0 pointer-events-none">
				<OptimizedImage src="/hero-bg.webp" alt="" className="absolute inset-0" imageClassName="object-cover opacity-[0.08] sm:opacity-15" skeleton={false} priority />
				<div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
			</div>

			<div
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[80vmin] rounded-full pointer-events-none z-0"
				style={{
					background: "radial-gradient(ellipse at center, oklch(0.68 0.19 45 / 0.12) 0%, transparent 70%)",
					filter: "blur(100px)",
				}}
			/>

			<div className="relative z-10 w-full max-w-[1220px] mx-auto px-4 sm:px-6 text-center pt-16 pb-8">
				<motion.h1
					initial="hidden"
					animate="visible"
					variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
					className="text-3xl sm:text-4xl md:text-5xl lg:text-[4.5rem] font-medium leading-[1.15] text-balance mb-5 max-w-4xl mx-auto"
				>
					<motion.span
						variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: springGentle } }}
						className="block"
					>
						منيو رقمي لمطعمك
					</motion.span>
					<motion.span
						variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: springGentle } }}
						className="block"
					>
						<span className="text-orange">الطلبات تصل</span> على واتساب
					</motion.span>
				</motion.h1>

				<div className="mx-auto mt-4 w-16 h-0.5 rounded-full bg-gradient-to-r from-gold/0 via-gold to-gold/0" />

				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...springDefault, delay: 0.15 }}
					className="text-sm sm:text-base text-foreground/60 max-w-2xl mx-auto leading-relaxed mb-8"
				>
					هل أنت مستعد لبدء رحلة تحولية لمطعمك؟ منيو رقمي احترافي مع طلب عبر واتساب.
				</motion.p>

				{/* USP badge — trust signal */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...springDefault, delay: 0.2 }}
					className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/5 px-3 py-1 text-[11px] font-medium text-gold mb-6"
				>
					<span className="size-1.5 rounded-full bg-gold animate-pulse-dot" />
					أكثر من 500 مطعم يثقون فينا
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...springDefault, delay: 0.35 }}
					className="gpu-layer flex gap-3 sm:gap-4 justify-center flex-wrap"
				>
					<motion.div whileHover={{ scale: 1.05, x: 5 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
						<Link href="/subscribe">
							<Button size="lg" className="text-sm sm:text-base">
								أنشئ قائمتك مجاناً <ArrowRight className="size-4 sm:size-5 rtl:rotate-180" />
							</Button>
						</Link>
					</motion.div>
					<Link href="/login">
						<Button variant="outline" size="lg" className="text-sm sm:text-base">
							تسجيل الدخول
						</Button>
					</Link>
				</motion.div>
			</div>

			{/* Floating decorative element — desktop only */}
			<div className="hidden lg:block absolute left-8 top-1/3 opacity-20 pointer-events-none">
				<div className="size-24 grid grid-cols-3 gap-0.5">
					{Array.from({ length: 9 }).map((_, i) => (
						<div key={i} className={`size-1.5 ${Math.random() > 0.5 ? 'bg-gold/60' : 'bg-transparent'} rounded-[1px]`} />
					))}
				</div>
			</div>
		</section>
	)
}
