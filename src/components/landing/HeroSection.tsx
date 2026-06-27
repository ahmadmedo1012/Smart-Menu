"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type PublicStats } from "./landing-data";

const EASE = [0.16, 1, 0.2, 1] as const;

export default function HeroSection({ stats }: { stats: PublicStats | null }) {
	return (
		<section className="relative min-h-[85dvh] flex items-center justify-center overflow-hidden">
			{/* Orange radial glow */}
			<motion.div
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[70vmin] rounded-full pointer-events-none"
				animate={{ opacity: [0.1, 0.18, 0.1], scale: [1, 1.05, 1] }}
				transition={{ duration: 8, repeat: Infinity, ease: EASE }}
				style={{
					background: "radial-gradient(ellipse at center, oklch(0.68 0.19 45 / 0.1) 0%, transparent 70%)",
					filter: "blur(100px)",
				}}
			/>

			<div className="relative z-10 w-full max-w-[1220px] mx-auto px-4 text-center py-20">
				{/* Headline — using h1 for semantic/SEO, styled as display */}
				<motion.h1
					initial="hidden"
					animate="visible"
					variants={{
						visible: { transition: { staggerChildren: 0.15 } },
					}}
					className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-medium leading-[1.15] text-balance mb-6 max-w-4xl mx-auto"
				>
					<motion.span
						variants={{
							hidden: { opacity: 0, y: 30 },
							visible: { opacity: 1, y: 0, transition: { duration: 1, ease: EASE } },
						}}
						className="block"
					>
						اللي يواكب التطور
					</motion.span>
					<motion.span
						variants={{
							hidden: { opacity: 0, y: 30 },
							visible: { opacity: 1, y: 0, transition: { duration: 1, ease: EASE } },
						}}
						className="block"
					>
						<span className="text-orange font-bold">يسبق الجميع</span>
					</motion.span>
				</motion.h1>

				{/* Subtitle */}
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1, delay: 0.2, ease: EASE }}
					className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10"
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
						<Button
							size="lg"
							className="px-10 h-14 text-base shadow-lg shadow-orange/20 hover:shadow-xl hover:shadow-orange/30"
						>
							إنشى قائمتك مجانا <ArrowLeft className="ms-2 size-5" />
						</Button>
					</Link>
					<Link href="#reviews">
						<Button
							variant="outline"
							size="lg"
							className="px-10 h-14 text-base"
						>
							أراء العملاء
						</Button>
					</Link>
					<Link href="https://wa.me/218911111111" target="_blank" rel="noopener noreferrer">
						<Button
							variant="ghost"
							size="lg"
							className="px-6 h-14 text-base"
						>
							<MessageCircle className="ms-2 size-5" />
							تواصل عبر واتساب
						</Button>
					</Link>
				</motion.div>

				{/* Phone showcase */}
				<motion.div
					initial={{ opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1.2, delay: 0.55, ease: EASE }}
					className="mt-16"
				>
					<div className="relative mx-auto w-full max-w-[800px] aspect-video rounded-xl overflow-hidden bg-gradient-to-b from-white/5 to-transparent border border-white/10 shadow-2xl">
						<img
							src="/hero-poster.jpg"
							alt="Smart Menu showcase"
							className="w-full h-full object-cover"
							loading="eager"
						/>
					</div>
				</motion.div>
			</div>

		</section>
	);
}
