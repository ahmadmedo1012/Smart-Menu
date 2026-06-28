"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

const BG = "#070708"

export function PhoneVideo() {
	const videoRef = useRef<HTMLVideoElement>(null)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
		// Loop the video when it ends
		const el = videoRef.current
		if (!el) return
		const onEnd = () => {
			el.currentTime = 0
			el.play()
		}
		el.addEventListener("ended", onEnd)
		return () => el.removeEventListener("ended", onEnd)
	}, [])

	return (
		<motion.div
			initial={{ scale: 0.95, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			transition={{ type: "spring", stiffness: 80, damping: 15 }}
			className="size-full relative overflow-hidden"
			style={{ borderRadius: "2.3rem", background: BG, minWidth: 0 }}
		>
			<video
				ref={videoRef}
				src="/hero-intro.mp4"
				autoPlay
				muted
				playsInline
				preload="auto"
				className="size-full object-cover"
				style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.6s" }}
			/>
		</motion.div>
	)
}
