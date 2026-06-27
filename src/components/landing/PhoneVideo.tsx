"use client"

import { useEffect, useState } from "react"

const ITEMS = [
	[
		{ name: "كابتشينو", desc: "إسبريسو مع حليب", price: "12 د.ل", accent: "#d4a574" },
		{ name: "لاتيه", desc: "حليب كثيف مع إسبريسو", price: "14 د.ل", accent: "#c4956a" },
		{ name: "إسبريسو", desc: "قهوة إيطالية مركزة", price: "8 د.ل", accent: "#8b5e3c" },
		{ name: "موكا", desc: "شوكولاتة مع إسبريسو", price: "15 د.ل", accent: "#a0522d" },
	],
	[
		{ name: "برجر دجاج", desc: "دجاج مقرمش مع خضار", price: "18 د.ل", accent: "#e8a87c" },
		{ name: "بطاطس مقلية", desc: "بطاطس ذهبية مقرمشة", price: "6 د.ل", accent: "#f0c27a" },
		{ name: "ساندويتش", desc: "خضار مشكل", price: "14 د.ل", accent: "#85c1a0" },
		{ name: "ناجتس", desc: "قطع دجاج مقلية", price: "12 د.ل", accent: "#d4a373" },
	],
	[
		{ name: "كنافة", desc: "نابلسية بالفستق", price: "15 د.ل", accent: "#c9a96e" },
		{ name: "تشيز كيك", desc: "نيويورك مع توت", price: "16 د.ل", accent: "#e8b4b4" },
		{ name: "أم علي", desc: "حلى شرقي بالقشطة", price: "12 د.ل", accent: "#d4a373" },
		{ name: "بسبوسة", desc: "سميد بجوز الهند", price: "10 د.ل", accent: "#f0c27a" },
	],
]

function MenuPage({ items, active }: { items: typeof ITEMS[number]; active: boolean }) {
	return (
		<div
			className="absolute inset-0 flex flex-col p-4 rtl"
			style={{
				opacity: active ? 1 : 0,
				transform: active ? "translateY(0)" : "translateY(10px)",
				transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
				pointerEvents: active ? "auto" : "none",
				direction: "rtl",
			}}
		>
			<div className="flex-1 flex flex-col justify-center gap-2">
				{items.map((item, i) => (
					<div
						key={item.name}
						className="flex justify-between items-center rounded-lg text-sm"
						style={{
							background: "linear-gradient(135deg, oklch(0.15 0.005 0), oklch(0.18 0.005 0))",
							padding: "8px 12px",
							borderLeft: `2px solid ${item.accent}`,
							animation: active ? `phoneItemIn 0.45s cubic-bezier(0.16,1,0.3,1) ${0.08 * i}s both` : "none",
						}}
					>
						<div className="flex flex-col gap-0.5">
							<span style={{ color: "oklch(0.93 0.005 0)", fontWeight: 600, fontSize: 12 }}>{item.name}</span>
							<span style={{ color: "oklch(0.5 0.01 0)", fontSize: 9 }}>{item.desc}</span>
						</div>
						<span style={{ color: "#f66d0f", fontWeight: 700, fontSize: 12 }}>{item.price}</span>
					</div>
				))}
			</div>
			<div
				className="text-center py-2 rounded-lg text-xs font-bold"
				style={{
					background: "linear-gradient(135deg, #f66d0f, #ff8833)",
					color: "white",
					animation: active ? "phoneItemIn 0.45s cubic-bezier(0.16,1,0.3,1) 0.45s both" : "none",
					boxShadow: "0 4px 16px oklch(0.68 0.19 45 / 0.3)",
				}}
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
		const t = setInterval(() => setPage((p) => (p + 1) % ITEMS.length), 4000)
		return () => clearInterval(t)
	}, [])

	return (
		<div
			className="size-full relative overflow-hidden"
			style={{ borderRadius: "2.3rem", background: BG }}
		>
			{/* Mesh gradient background */}
			<div style={{
				position: "absolute", inset: 0,
				background: `
					radial-gradient(ellipse at 20% 30%, oklch(0.68 0.19 45 / 0.06) 0%, transparent 60%),
					radial-gradient(ellipse at 80% 70%, oklch(0.45 0.1 30 / 0.04) 0%, transparent 50%)
				`,
			}} />
			{/* Notch */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-black z-10 rounded-b-xl" />
			{/* Content */}
			<div className="absolute inset-0 pt-5">
				{/* Status bar */}
				<div className="flex justify-between px-3 py-1.5">
					<span className="text-[10px] font-semibold" style={{ color: MUT }}>9:41</span>
					<div className="flex gap-1.5 items-center">
						<div className="size-1.5 rounded-full" style={{ background: O }} />
						<div className="size-1.5 rounded-full" style={{ background: MUT }} />
					</div>
				</div>
				{/* Header */}
				<div className="flex justify-between items-center px-3 mb-3">
					<div className="flex items-center gap-2">
						<div className="size-5 rounded flex items-center justify-center" style={{ background: O }}>
							<svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
								<path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" strokeLinecap="round" />
							</svg>
						</div>
						<span className="text-xs font-bold" style={{ color: TXT }}>Smart Menu</span>
					</div>
					<span className="text-[8px] px-1.5 py-0.5 rounded-sm" style={{ background: SURF, color: MUT }}>مفتوح الآن</span>
				</div>
				{/* Pages */}
				{ITEMS.map((items, i) => (
					<MenuPage key={i} items={items} active={page === i && mounted} />
				))}
				{/* Dots */}
				<div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
					{ITEMS.map((_, i) => (
						<div
							key={i}
							style={{
								width: i === page ? 16 : 5, height: 4, borderRadius: 2,
								background: i === page ? O : "oklch(0.3 0.01 0)",
								transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)",
							}}
						/>
					))}
				</div>
			</div>
		</div>
	)
}

const O = "#f66d0f"
const BG = "#070708"
const SURF = "oklch(0.18 0.005 0)"
const TXT = "oklch(0.93 0.005 0)"
const MUT = "oklch(0.55 0.01 0)"
