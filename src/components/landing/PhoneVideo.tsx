"use client"

import dynamic from "next/dynamic"

const RemotionPlayer = dynamic(
	() => import("@/components/landing/RemotionPlayer"),
	{ ssr: false, loading: () => <LoadingFallback /> },
)

function LoadingFallback() {
	return (
		<div className="absolute inset-0 bg-background flex items-center justify-center animate-pulse" style={{ borderRadius: "2.3rem" }}>
			<div className="size-4 rounded-full border-2 border-border border-t-orange animate-spin" />
		</div>
	)
}

export function PhoneVideo() {
	return (
		<div className="absolute inset-0" style={{ borderRadius: "2.3rem", overflow: "hidden" }}>
			<RemotionPlayer />
		</div>
	)
}
