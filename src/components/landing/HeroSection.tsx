"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PublicStats } from "./landing-data"

const EASE = [0.16, 1, 0.2, 1] as const

export default function HeroSection({ stats }: { stats: PublicStats | null }) {
	return (
		<section className="relative min-h-[85dvh] flex items-center justify-center overflow-hidden bg-background">
			{/* Background restaurant image */}
			<div className="absolute inset-0 z-0">
				<img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80" alt="" className="w-full h-full object-cover opacity-15" loading="eager" />
				<div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
			</div>

			{/* Orange radial glow */}
			<motion.div
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[80vmin] rounded-full pointer-events-none z-0"
				animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.08, 1] }}
				transition={{ duration: 8, repeat: Infinity, ease: EASE }}
				style={{
					background: "radial-gradient(ellipse at center, oklch(0.68 0.19 45 / 0.15) 0%, transparent 70%)",
					filter: "blur(120px)",
				}}
			/>

			<div className="relative z-10 w-full max-w-[1220px] mx-auto px-4 text-center pt-10 pb-8">
				{/* Headline */}
				<motion.h1
					initial="hidden"
					animate="visible"
					variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
					className="text-4xl sm:text-5xl md:text-6xl lg:text-[5rem] font-medium leading-[1.1] text-balance mb-6 max-w-4xl mx-auto"
				>
					<motion.span
						variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 1, ease: EASE } } }}
						className="block"
					>
						اللي يواكب التطور
					</motion.span>
					<motion.span
						variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 1, ease: EASE } } }}
						className="block"
					>
						<span className="text-orange">يسبق الجميع</span>
					</motion.span>
				</motion.h1>

				{/* Subtitle */}
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1, delay: 0.2, ease: EASE }}
					className="text-base sm:text-lg text-foreground/60 max-w-2xl mx-auto leading-relaxed mb-10"
				>
					هل أنت مستعد لبدء رحلة تحولية لمطعمك؟ منيو رقمي احترافي مع طلب عبر واتساب.
				</motion.p>

				{/* CTAs */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1, delay: 0.35, ease: EASE }}
					className="flex gap-3 sm:gap-4 justify-center flex-wrap"
				>
					<Link href="/subscribe">
						<Button size="lg">
							إنشى قائمتك مجانا <ArrowLeft className="ms-2 size-5" />
						</Button>
					</Link>
					<Link href="https://wa.me/218911111111" target="_blank" rel="noopener noreferrer">
						<Button variant="outline" size="lg">
							<MessageCircle className="ms-2 size-5" />
							تواصل عبر واتساب
						</Button>
					</Link>
				</motion.div>

				{/* Phone showcase row */}
				<motion.div
					initial={{ opacity: 0, y: 60 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1.4, delay: 0.6, ease: EASE }}
					className="mt-8 flex justify-center gap-6 items-end"
				>
					{/* Big phone */}
					<div className="relative" style={{ perspective: "1200px" }}>
						<div className="absolute -inset-12 rounded-full blur-[100px] opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle, oklch(0.68 0.19 45 / 0.15), transparent 70%)" }} />
						<motion.div
							animate={{ rotateY: -5, rotateX: 3 }}
							whileHover={{ rotateY: 0, rotateX: 6, scale: 1.03 }}
							className="relative w-[220px] h-[460px] p-[4px] shadow-2xl shadow-foreground/15 dark:shadow-black/60"
							style={{ borderRadius: "3rem", background: "linear-gradient(160deg, #52525b, #18181b 30%, #09090b 70%, #27272a)" }}
						>
							<div className="w-full h-full overflow-hidden bg-black" style={{ borderRadius: "2.7rem" }}>
								<div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black z-10" style={{ borderRadius: "0 0 1.2rem 1.2rem" }} />
								<img src="/menu-screen.svg" alt="Smart Menu app interface" className="w-full h-full object-cover" loading="eager" />
							</div>
						</motion.div>
					</div>
					{/* Small phone */}
					<div className="relative hidden md:block" style={{ perspective: "1200px" }}>
						<motion.div
							animate={{ rotateY: 5, rotateX: 2 }}
							className="relative w-[160px] h-[340px] p-[3px] shadow-xl shadow-foreground/15 dark:shadow-black/50"
							style={{ borderRadius: "2rem", background: "linear-gradient(160deg, #52525b, #18181b 30%, #09090b 70%, #27272a)" }}
						>
							<div className="w-full h-full overflow-hidden bg-black" style={{ borderRadius: "1.7rem" }}>
								<img
									src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80"
									alt="Menu preview"
									className="w-full h-full object-cover"
								/>
							</div>
						</motion.div>
					</div>
				</motion.div>
			</div>
		</section>
	)
}
