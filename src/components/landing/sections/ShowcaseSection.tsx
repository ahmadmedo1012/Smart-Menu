"use client"

import { useRef } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { springGentle } from "@/lib/motion"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"

export default function ShowcaseSection() {
	const ref = useRef<HTMLDivElement>(null)
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start end", "end start"],
	})

	const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1, 0.92])
	const imageY = useTransform(scrollYProgress, [0, 0.5, 1], [40, 0, -40])

	return (
		<SectionContainer ref={ref}>
			<SectionHeader eyebrow="المنيو الذكي في العمل" />

			<motion.div
				initial={{ opacity: 0, y: 40 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, margin: "-60px" }}
				transition={springGentle}
			>
				<div className="relative bg-black/5 dark:bg-white/5 p-1.5 sm:p-2 rounded-[2rem] ring-1 ring-black/5 dark:ring-white/10">
					<div className="relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[calc(2rem-0.375rem)] sm:rounded-[calc(2rem-0.5rem)]">
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


						<div className="absolute inset-0 pointer-events-none"
							style={{ background: "radial-gradient(ellipse at center, transparent 50%, var(--background) 100%)" }}
						/>
					</div>
				</div>

				<div className="absolute -bottom-10 left-1/2 -translate-x-1/2 size-48 sm:size-64 rounded-full bg-orange/10 blur-[80px] pointer-events-none" />
			</motion.div>
		</SectionContainer>
	)
}
