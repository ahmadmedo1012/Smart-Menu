"use client"

import { useEffect, useState } from "react"

const ITEMS = [
	[
		{ name: "كابتشينو", price: "12 د.ل" },
		{ name: "لاتيه", price: "14 د.ل" },
		{ name: "إسبريسو", price: "8 د.ل" },
		{ name: "موكا", price: "15 د.ل" },
	],
	[
		{ name: "برجر", price: "18 د.ل" },
		{ name: "بطاطس", price: "6 د.ل" },
		{ name: "ساندويتش", price: "14 د.ل" },
		{ name: "ناجتس", price: "12 د.ل" },
	],
	[
		{ name: "كنافة", price: "15 د.ل" },
		{ name: "تشيز كيك", price: "16 د.ل" },
		{ name: "أم علي", price: "12 د.ل" },
		{ name: "بسبوسة", price: "10 د.ل" },
	],
]

function MenuPage({ items, active }: { items: typeof ITEMS[number]; active: boolean }) {
	return (
		<div
			className="absolute inset-0 flex flex-col p-4 rtl transition-opacity duration-700"
			style={{
				opacity: active ? 1 : 0,
				pointerEvents: active ? "auto" : "none",
				direction: "rtl",
			}}
		>
			<div className="flex-1 flex flex-col justify-center gap-1.5">
				{items.map((item, i) => (
					<div
						key={item.name}
						className="flex justify-between items-center px-2.5 py-1.5 rounded-md text-sm"
						style={{
							background: "oklch(0.16 0.005 0)",
							animation: active ? `phoneFadeIn 0.4s ease-out ${0.1 * i}s both` : "none",
						}}
					>
						<span style={{ color: "oklch(0.93 0.005 0)", fontWeight: 600 }}>{item.name}</span>
						<span style={{ color: "#f66d0f", fontWeight: 700 }}>{item.price}</span>
					</div>
				))}
			</div>
			<div
				className="text-center py-1.5 rounded-md text-xs font-bold"
				style={{ background: "#f66d0f", color: "white", animation: active ? "phoneFadeIn 0.4s ease-out 0.6s both" : "none" }}
			>
				اطلب الآن ←
			</div>
		</div>
	)
}

export function PhoneVideo() {
	const [page, setPage] = useState(0)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
		const t = setInterval(() => setPage((p) => (p + 1) % ITEMS.length), 3500)
		return () => clearInterval(t)
	}, [])

	return (
		<div className="size-full relative" style={{ borderRadius: "2.3rem", overflow: "hidden", background: "#070708" }}>
			{/* Notch */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-black z-10 rounded-b-xl" />

			{/* Content */}
			<div className="absolute inset-0 pt-5">
				{/* Status bar */}
				<div className="flex justify-between px-3 py-1">
					<span className="text-[10px]" style={{ color: "oklch(0.5 0.01 0)" }}>9:41</span>
					<div className="flex gap-1">
						<div className="size-[5px] rounded-full" style={{ background: "#f66d0f" }} />
						<div className="size-[5px] rounded-full" style={{ background: "oklch(0.5 0.01 0)" }} />
					</div>
				</div>
				{/* Header */}
				<div className="flex justify-between items-center px-3 mb-2">
					<div className="flex items-center gap-1.5">
						<div className="size-5 rounded flex items-center justify-center" style={{ background: "#f66d0f" }}>
							<svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
								<path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" strokeLinecap="round" />
							</svg>
						</div>
						<span className="text-xs font-bold" style={{ color: "oklch(0.93 0.005 0)" }}>Smart Menu</span>
					</div>
					<span className="text-[9px] px-1.5 py-0.5 rounded-sm" style={{ background: "oklch(0.16 0.005 0)", color: "oklch(0.5 0.01 0)" }}>مفتوح</span>
				</div>
				{/* Pages */}
				{ITEMS.map((items, i) => (
					<MenuPage key={i} items={items} active={page === i && mounted} />
				))}
				{/* Dots */}
				<div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
					{ITEMS.map((_, i) => (
						<div
							key={i}
							className="rounded-full transition-all duration-500"
							style={{
								width: i === page ? 14 : 4,
								height: 3,
								background: i === page ? "#f66d0f" : "oklch(0.3 0.01 0)",
							}}
						/>
					))}
				</div>
			</div>
		</div>
	)
}
