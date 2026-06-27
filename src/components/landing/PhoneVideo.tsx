"use client"

import dynamic from "next/dynamic"

const RemotionPlayer = dynamic(
	() => import("@/components/landing/RemotionPlayer"),
	{ ssr: false, loading: () => <LoadingFallback /> },
)

function LoadingFallback() {
	return (
		<div className="flex items-center justify-center size-full bg-background animate-pulse" style={{ borderRadius: "2.3rem", minHeight: 200 }}>
			<div className="size-4 rounded-full border-2 border-border border-t-orange animate-spin" />
		</div>
	)
}

export function PhoneVideo() {
	return (
		<div className="size-full relative" style={{ borderRadius: "2.3rem", overflow: "hidden" }}>
			<RemotionPlayer />
		</div>
	)
}
