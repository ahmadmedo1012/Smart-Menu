"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OptimizedImage } from "@/components/ui/OptimizedImage"
import { springGentle, springDefault } from "@/lib/motion"

export default function HeroSection() {
	return (
		<section style={{ willChange: "transform", backfaceVisibility: "hidden" }} className="relative min-h-[85dvh] flex items-center justify-center overflow-hidden bg-background">
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
					className="gpu-layer text-3xl sm:text-4xl md:text-5xl lg:text-[4.5rem] font-medium leading-[1.15] text-balance mb-5 max-w-4xl mx-auto"
				>
					<motion.span
						variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: springGentle } }}
						className="block"
					>
						اللي يواكب التطور
					</motion.span>
					<motion.span
						variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: springGentle } }}
						className="block"
					>
						<span className="text-orange">يسبق الجميع</span>
					</motion.span>
				</motion.h1>

				<div className="mx-auto mt-4 w-16 h-0.5 rounded-full bg-gradient-to-r from-gold/0 via-gold to-gold/0" />

				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...springDefault, delay: 0.15 }}
					className="gpu-layer text-sm sm:text-base text-foreground/60 max-w-2xl mx-auto leading-relaxed mb-8"
				>
					هل أنت مستعد لبدء رحلة تحولية لمطعمك؟ منيو رقمي احترافي مع طلب عبر واتساب.
				</motion.p>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...springDefault, delay: 0.25 }}
					className="gpu-layer flex gap-3 sm:gap-4 justify-center flex-wrap"
				>
					<Link href="/subscribe">
						<Button size="lg" className="text-sm sm:text-base">
							أنشئ قائمتك مجاناً <ArrowRight className="size-4 sm:size-5 rtl:rotate-180" />
						</Button>
					</Link>
					<Link href="/login">
						<Button variant="outline" size="lg" className="text-sm sm:text-base">
							تسجيل الدخول
						</Button>
					</Link>
				</motion.div>
			</div>
		</section>
	)
}
