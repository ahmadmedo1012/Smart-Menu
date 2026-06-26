"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneMockup } from "./PhoneMockup";
import { PARTNERS, type PublicStats } from "./landing-data";

const CINEMATIC_EASE = [0.16, 1, 0.2, 1] as const;

export default function HeroSection({ stats }: { stats: PublicStats | null }) {
	return (
		<section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-[#111013]">
			<div className="absolute inset-0 bg-gradient-to-b from-[#111013] via-orange/[0.02] to-[#111013] pointer-events-none" />

			<motion.div
				className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[80vmin] rounded-full pointer-events-none"
				animate={{ opacity: [0.15, 0.3, 0.15], scale: [1, 1.06, 1] }}
				transition={{ duration: 8, repeat: Infinity, ease: CINEMATIC_EASE }}
				style={{
					background: "radial-gradient(ellipse at center, var(--orange) 0%, transparent 70%)",
					filter: "blur(100px)",
				}}
			/>

			<motion.div
				className="absolute bottom-1/4 right-1/4 size-[50vmin] rounded-full pointer-events-none"
				animate={{ opacity: [0.08, 0.18, 0.08], scale: [1, 1.04, 1] }}
				transition={{ duration: 10, repeat: Infinity, ease: CINEMATIC_EASE, delay: 2 }}
				style={{
					background: "radial-gradient(ellipse at center, oklch(0.68 0.19 45 / 0.08) 0%, transparent 70%)",
					filter: "blur(120px)",
				}}
			/>

			<div className="relative z-10 w-full max-w-[1220px] mx-auto px-4 py-20">
				<div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
					<div className="text-center lg:text-start">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 1, ease: CINEMATIC_EASE }}
							className="inline-flex items-center gap-2 px-4 py-1.5 text-[11px] font-semibold tracking-[0.2em] uppercase text-orange border border-orange/20 rounded-full mb-8"
						>
							<span className="size-1.5 rounded-full bg-orange animate-pulse" />
							منيو رقمي • طلب فوري
						</motion.div>

						<motion.h1
							initial={{ opacity: 0, y: 40 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 1.4, delay: 0.15, ease: CINEMATIC_EASE }}
							className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5.75rem] font-medium leading-[1.1] text-white text-balance mb-6"
						>
							حوّل مطعمك
							<br />
							إلى <span className="text-orange">تجربة رقمية</span>
						</motion.h1>

						<motion.p
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 1.2, delay: 0.3, ease: CINEMATIC_EASE }}
							className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto lg:mx-0 leading-relaxed"
						>
							منيو رقمي احترافي مع طلب عبر واتساب. يعمل على كل الأجهزة بدون تطبيق.
						</motion.p>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 1, delay: 0.45, ease: CINEMATIC_EASE }}
							className="flex gap-4 justify-center lg:justify-start flex-wrap mt-10"
						>
							<Link href="/subscribe">
								<Button variant="orange" size="lg" className="px-10 h-14 text-base shadow-lg shadow-orange/20 hover:shadow-xl hover:shadow-orange/30">
									ابدأ مجاناً <ArrowLeft className="ms-2 size-5" />
								</Button>
							</Link>
							<Link href={`/menu/${PARTNERS[0].slug}`}>
								<Button variant="orange-outline" size="lg" className="px-10 h-14 border-2 text-base">
									عرض منيو تجريبي
								</Button>
							</Link>
							<Link href="https://wa.me/218911111111" target="_blank" rel="noopener noreferrer">
								<Button variant="ghost" size="lg" className="px-6 h-14 text-base text-muted-foreground hover:text-orange hover:bg-orange/10">
									<MessageCircle className="ms-2 size-5" />
									تواصل عبر واتساب
								</Button>
							</Link>
						</motion.div>
					</div>

					<motion.div
						initial={{ opacity: 0, x: 60, rotateY: -10 }}
						animate={{ opacity: 1, x: 0, rotateY: 0 }}
						transition={{ duration: 1.6, delay: 0.3, ease: CINEMATIC_EASE }}
						className="hidden lg:flex justify-center items-center"
						style={{ perspective: "1200px" }}
					>
						<PhoneMockup tilt className="w-full max-w-[320px]" />
					</motion.div>
				</div>
			</div>

			<motion.div
				className="absolute bottom-8 start-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/60"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 2.5, duration: 1.2 }}
			>
				<span className="text-[10px] font-medium tracking-[0.2em] uppercase">اسحب لأسفل</span>
				<div className="size-4 rounded-full border border-muted-foreground/20 flex items-center justify-center">
					<div className="size-1.5 rounded-full bg-orange/50 animate-scroll-indicator" />
				</div>
			</motion.div>
		</section>
	);
}
