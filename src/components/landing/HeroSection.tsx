"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OptimizedImage } from "@/components/ui/OptimizedImage"
import { PhoneVideo } from "./PhoneVideo"
import { springGentle, springDefault, springSnappy } from "@/lib/motion"

export default function HeroSection() {
	const [isRtl, setIsRtl] = useState(false)

	useEffect(() => {
		setIsRtl(document.documentElement.dir === "rtl")
	}, [])
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

				<motion.div
					initial={{ opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...springGentle, delay: 0.4 }}
					className="gpu-layer mt-8 flex justify-center gap-4 sm:gap-6 items-end"
				>
					<div className="relative overflow-hidden" style={{ perspective: "1000px" }}>
						<div className="absolute -inset-8 rounded-full blur-[80px] opacity-40 pointer-events-none" style={{ background: "radial-gradient(circle, oklch(0.68 0.19 45 / 0.12), transparent 70%)", willChange: "filter" }} />
						<motion.div
							className="gpu-layer phone-mask relative w-[280px] h-[580px] sm:w-[300px] sm:h-[620px] p-[3px] sm:p-[4px] shadow-2xl shadow-foreground/15 dark:shadow-black/60"
							animate={{ rotateY: isRtl ? 3 : -3, rotateX: 2, y: [0, -6, 0] }}
							whileHover={{ rotateY: 0, rotateX: 4, scale: 1.02, transition: springSnappy }}
							style={{ borderRadius: "2.5rem", background: "linear-gradient(160deg, oklch(0.37 0.01 264), oklch(0.12 0.003 0) 30%, oklch(0.05 0.002 0) 70%, oklch(0.19 0.005 0))" }}
						>
							<div className="relative w-full h-full overflow-hidden bg-black animate-pulse-glow" style={{ borderRadius: "2.3rem" }}>
								<div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black z-10" style={{ borderRadius: "0 0 1rem 1rem" }} />
								<PhoneVideo />
							</div>
						</motion.div>
					</div>
				</motion.div>
			</div>
		</section>
	)
}
