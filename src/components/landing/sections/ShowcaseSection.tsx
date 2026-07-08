"use client"

import { useRef, useState, type MouseEvent } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { springGentle } from "@/lib/motion"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"

export default function ShowcaseSection() {
	const scrollRef = useRef<HTMLDivElement>(null)
	const { scrollYProgress } = useScroll({
		target: scrollRef,
		offset: ["start end", "end start"],
	})

	const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1, 0.92])
	const imageY = useTransform(scrollYProgress, [0, 0.5, 1], [40, 0, -40])

	// Mouse tilt
	const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 })
	const cardRef = useRef<HTMLDivElement>(null)

	function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
		if (!cardRef.current) return
		const rect = cardRef.current.getBoundingClientRect()
		const x = (e.clientX - rect.left) / rect.width - 0.5
		const y = (e.clientY - rect.top) / rect.height - 0.5
		setTilt({ rotateY: x * 6, rotateX: -y * 6 })
	}
	function handleMouseLeave() {
		setTilt({ rotateX: 0, rotateY: 0 })
	}

	return (
		<SectionContainer ref={scrollRef}>
			<SectionHeader eyebrow="المنيو الذكي في العمل" />

			<motion.div
				initial={{ opacity: 0, y: 40 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, margin: "-60px" }}
				transition={springGentle}
			>
				<motion.div
					ref={cardRef}
					onMouseMove={handleMouseMove}
					onMouseLeave={handleMouseLeave}
					animate={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY }}
					transition={{ type: "spring", stiffness: 150, damping: 12 }}
					style={{ perspective: "1200px" }}
					className="cursor-pointer"
				>
					<div className="relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-2xl">
						<motion.div style={{ scale: imageScale, y: imageY }}>
							<Image
								src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1800&q=85"
								alt=""
								width={1800}
								height={950}
								className="w-full h-[45vh] sm:h-[55vh] md:h-[65vh] object-cover saturate-[1.1] dark:saturate-[0.4] dark:brightness-[0.8]"
								priority
							/>
						</motion.div>

						<div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent pointer-events-none" />
						<div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background/30 via-transparent to-transparent pointer-events-none" />
					</div>

					<div className="absolute -bottom-10 left-1/2 -translate-x-1/2 size-48 sm:size-64 rounded-full bg-orange/10 blur-[80px] pointer-events-none" />
				</motion.div>
			</motion.div>
		</SectionContainer>
	)
}
