"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PARTNERS, type PublicStats } from "./landing-data";

const EASE = [0.16, 1, 0.2, 1] as const;

export default function HeroSection({ stats }: { stats: PublicStats | null }) {
	return (
		<section className="relative min-h-[90dvh] flex items-center justify-center overflow-hidden bg-[#111013]">
			{/* Orange radial glow */}
			<motion.div
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[70vmin] rounded-full pointer-events-none"
				animate={{ opacity: [0.12, 0.25, 0.12], scale: [1, 1.05, 1] }}
				transition={{ duration: 8, repeat: Infinity, ease: EASE }}
				style={{
					background: "radial-gradient(ellipse at center, oklch(0.68 0.19 45 / 0.1) 0%, transparent 70%)",
					filter: "blur(100px)",
				}}
			/>

			<div className="relative z-10 w-full max-w-[1220px] mx-auto px-4 text-center py-20">
				{/* Headline — big display like PlanPOS */}
				<motion.h1
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1.2, ease: EASE }}
					className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-medium leading-[1.15] text-white text-balance mb-6 max-w-4xl mx-auto"
				>
					اللي يواكب التطور
					<br />
					<span className="text-orange">يسبق الجميع</span>
				</motion.h1>

				{/* Subtitle — problem statement */}
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1, delay: 0.2, ease: EASE }}
					className="text-base sm:text-lg text-[#c0c0c0] max-w-2xl mx-auto leading-relaxed mb-10"
				>
					هل أنت مستعد لبدء رحلة تحولية لمطعمك؟ منيو رقمي احترافي مع طلب عبر واتساب.
				</motion.p>

				{/* CTAs — stack of 3 like PlanPOS */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1, delay: 0.35, ease: EASE }}
					className="flex gap-4 justify-center flex-wrap"
				>
					<Link href="/subscribe">
						<Button
							variant="orange"
							size="lg"
							className="px-10 h-14 text-base shadow-lg shadow-orange/20 hover:shadow-xl hover:shadow-orange/30"
						>
							إنشى قائمتك مجانا <ArrowLeft className="ms-2 size-5" />
						</Button>
					</Link>
					<Link href="#reviews">
						<Button
							variant="white-outline"
							size="lg"
							className="px-10 h-14 text-base border-2 border-white text-white hover:bg-white/10"
						>
							أراء العملاء
						</Button>
					</Link>
					<Link href="https://wa.me/218911111111" target="_blank" rel="noopener noreferrer">
						<Button
							variant="ghost"
							size="lg"
							className="px-6 h-14 text-base text-[#c0c0c0] hover:text-orange hover:bg-orange/10"
						>
							<MessageCircle className="ms-2 size-5" />
							تواصل عبر واتساب
						</Button>
					</Link>
				</motion.div>

				{/* Scroll indicator */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 1, delay: 1.2, ease: EASE }}
					className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
				>
					<span className="text-[10px] tracking-widest uppercase text-white/30">اسحب لأسفل</span>
					<ChevronDown className="size-4 text-white/30 animate-scroll-indicator" />
				</motion.div>
			</div>
		</section>
	);
}
