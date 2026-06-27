"use client"

import { useRef, useState } from "react"

export function PhoneVideo() {
	const videoRef = useRef<HTMLVideoElement>(null)
	const [loaded, setLoaded] = useState(false)

	return (
		<>
			{!loaded && (
				<div className="absolute inset-0 bg-background flex items-center justify-center animate-pulse" style={{ borderRadius: "2.3rem" }}>
					<div className="size-4 rounded-full border-2 border-border border-t-orange animate-spin" />
				</div>
			)}
			<video
				ref={videoRef}
				src="/video/phone-menu.mp4"
				autoPlay
				muted
				loop
				playsInline
				onLoadedData={() => setLoaded(true)}
				className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
				style={{ borderRadius: "2.3rem" }}
			/>
		</>
	)
}
