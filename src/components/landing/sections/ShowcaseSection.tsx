"use client"

import { useRef } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { springGentle, springSnappy } from "@/lib/motion"
import { Eyebrow } from "@/components/ui/Eyebrow"

export default function ShowcaseSection() {
	const ref = useRef<HTMLDivElement>(null)
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start end", "end start"],
	})

	const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1, 0.92])
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
					transition={springSnappy}
					className="text-center mb-6 sm:mb-8"
				>
					<Eyebrow>المنيو الذكي في العمل</Eyebrow>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-60px" }}
					transition={springGentle}
				>
					{/* Inner rounded container */}
					<div className="relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-2xl">
						{/* Parallax scroll layer */}
						<motion.div style={{ scale: imageScale, y: imageY }}>
							<Image
								src="https://images.unsplash.com/photo-1504312835578-c5866c0c8b34?w=1800&q=85"
								alt=""
								width={1800}
								height={950}
								className="w-full h-[45vh] sm:h-[55vh] md:h-[65vh] object-cover saturate-[1.1] dark:saturate-[0.4] dark:brightness-[0.8]"
								priority
							/>
						</motion.div>

						{/* Gradient blend */}
						<div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent pointer-events-none" />
						<div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background/30 via-transparent to-transparent pointer-events-none" />
					</div>

					{/* Accent glow pool beneath */}
					<div className="absolute -bottom-10 left-1/2 -translate-x-1/2 size-48 sm:size-64 rounded-full bg-orange/10 blur-[80px] pointer-events-none" />
				</motion.div>
			</div>
		</section>
	)
}
