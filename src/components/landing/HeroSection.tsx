"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PhoneVideo } from "./PhoneVideo"
const EASE = [0.16, 1, 0.2, 1] as const

export default function HeroSection() {
	return (
		<section className="relative min-h-[85dvh] flex items-center justify-center overflow-hidden bg-background">
			<div className="absolute inset-0 z-0">
				<img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80" alt="" className="w-full h-full object-cover opacity-[0.08] sm:opacity-15" loading="eager" />
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
						variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } } }}
						className="block"
					>
						اللي يواكب التطور
					</motion.span>
					<motion.span
						variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } } }}
						className="block"
					>
						<span className="text-orange">يسبق الجميع</span>
					</motion.span>
				</motion.h1>

				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
					className="text-sm sm:text-base text-foreground/60 max-w-2xl mx-auto leading-relaxed mb-8"
				>
					هل أنت مستعد لبدء رحلة تحولية لمطعمك؟ منيو رقمي احترافي مع طلب عبر واتساب.
				</motion.p>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
					className="flex gap-3 sm:gap-4 justify-center flex-wrap"
				>
					<Link href="/subscribe">
						<Button size="lg" className="text-sm sm:text-base">
							إنشى قائمتك مجانا <ArrowLeft className="me-1.5 size-4 sm:size-5" />
						</Button>
					</Link>
					<Link href="https://wa.me/218911111111" target="_blank" rel="noopener noreferrer">
						<Button variant="outline" size="lg" className="text-sm sm:text-base">
							<MessageCircle className="me-1.5 size-4 sm:size-5" />
							تواصل عبر واتساب
						</Button>
					</Link>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1, delay: 0.4, ease: EASE }}
					className="mt-8 flex justify-center gap-4 sm:gap-6 items-end"
				>
					<div className="relative" style={{ perspective: "1000px" }}>
						<div className="absolute -inset-8 rounded-full blur-[80px] opacity-40 pointer-events-none" style={{ background: "radial-gradient(circle, oklch(0.68 0.19 45 / 0.12), transparent 70%)" }} />
						<motion.div
							animate={{ rotateY: -3, rotateX: 2 }}
							whileHover={{ rotateY: 0, rotateX: 4, scale: 1.02 }}
							className="relative w-[200px] h-[420px] sm:w-[220px] sm:h-[460px] p-[3px] sm:p-[4px] shadow-2xl shadow-foreground/15 dark:shadow-black/60"
							style={{ borderRadius: "2.5rem", background: "linear-gradient(160deg, #52525b, #18181b 30%, #09090b 70%, #27272a)" }}
						>
							<div className="w-full h-full overflow-hidden bg-black" style={{ borderRadius: "2.3rem" }}>
								<div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black z-10" style={{ borderRadius: "0 0 1rem 1rem" }} />
								<PhoneVideo />
							</div>
						</motion.div>
					</div>
					<div className="relative hidden md:block" style={{ perspective: "1000px" }}>
						<motion.div
							animate={{ rotateY: 3, rotateX: 1 }}
							className="relative w-[140px] h-[300px] sm:w-[160px] sm:h-[340px] p-[2px] sm:p-[3px] shadow-xl shadow-foreground/15 dark:shadow-black/50"
							style={{ borderRadius: "1.8rem", background: "linear-gradient(160deg, #52525b, #18181b 30%, #09090b 70%, #27272a)" }}
						>
							<div className="w-full h-full overflow-hidden bg-black" style={{ borderRadius: "1.5rem" }}>
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
