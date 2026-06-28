"use client"

import { useRef } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"

const EASE: [number, number, number, number] = [0.16, 1, 0.2, 1]

export default function ShowcaseSection() {
	const ref = useRef<HTMLDivElement>(null)
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start end", "end start"],
	})

	const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1, 0.96])
	const imageY = useTransform(scrollYProgress, [0, 0.5, 1], [40, 0, -40])

	return (
		<section
			ref={ref}
			style={{ willChange: "transform", backfaceVisibility: "hidden" }}
			className="relative py-12 sm:py-16 overflow-hidden"
		>
			<div className="relative max-w-[1220px] mx-auto px-4 sm:px-6">
				{/* Eyebrow tag */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, ease: EASE }}
					className="text-center mb-6 sm:mb-8"
				>
					<span className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-3.5 py-1 text-[0.65rem] font-medium tracking-[0.15em] text-orange uppercase">
						تجربة المطعم
					</span>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-60px" }}
					transition={{ duration: 0.8, ease: EASE }}
				>
					{/* Double-Bezel outer shell */}
					<div className="relative bg-black/5 dark:bg-white/5 p-1.5 sm:p-2 rounded-[2rem] ring-1 ring-black/5 dark:ring-white/10">
						{/* Inner core with concentric radii */}
						<div className="relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[calc(2rem-0.375rem)] sm:rounded-[calc(2rem-0.5rem)]">
							{/* Parallax scroll layer */}
							<motion.div style={{ scale: imageScale, y: imageY }}>
								<Image
									src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1800&q=85"
									alt=""
									width={1800}
									height={950}
									className="w-full h-[45vh] sm:h-[55vh] md:h-[65vh] object-cover saturate-[0.85] dark:saturate-[0.4] dark:brightness-[0.55]"
									priority
								/>
							</motion.div>

							{/* Multi-layer gradient blend — edges fade into Grid Pattern bg */}
							<div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
							<div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/60 pointer-events-none" />
							<div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent pointer-events-none" />
							<div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background/30 via-transparent to-transparent pointer-events-none" />

							{/* Radial vignette hides hard edges */}
							<div
								className="absolute inset-0 pointer-events-none"
								style={{
									background:
										"radial-gradient(ellipse at center, transparent 35%, var(--background) 100%)",
								}}
							/>
						</div>
					</div>

					{/* Accent glow pool beneath */}
					<div className="absolute -bottom-10 left-1/2 -translate-x-1/2 size-48 sm:size-64 rounded-full bg-orange/10 blur-[80px] pointer-events-none" />
				</motion.div>
			</div>
		</section>
	)
}
