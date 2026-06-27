import { interpolate, useCurrentFrame, Easing } from "remotion"
import { AbsoluteFill } from "remotion"

const CATEGORIES = [
	{
		name: "مشروبات ساخنة",
		items: [
			{ name: "كابتشينو", desc: "إسبريسو مع حليب", price: "12 د.ل" },
			{ name: "لاتيه", desc: "حليب كثيف مع إسبريسو", price: "14 د.ل" },
			{ name: "إسبريسو", desc: "قهوة إيطالية مركزة", price: "8 د.ل" },
			{ name: "موكا", desc: "شوكولاتة مع إسبريسو", price: "15 د.ل" },
		],
	},
	{
		name: "مشروبات باردة",
		items: [
			{ name: "موهيتو", desc: "نعناع ليمون مثلج", price: "10 د.ل" },
			{ name: "سموثي", desc: "فواكه طازجة", price: "12 د.ل" },
			{ name: "آيس تي", desc: "شاي مثلج بالليمون", price: "8 د.ل" },
			{ name: "شكوشك", desc: "عصير طبيعي", price: "9 د.ل" },
		],
	},
	{
		name: "وجبات سريعة",
		items: [
			{ name: "برجر دجاج", desc: "دجاج مقرمش مع خضار", price: "18 د.ل" },
			{ name: "بطاطس مقلية", desc: "بطاطس ذهبية مقرمشة", price: "6 د.ل" },
			{ name: "ساندويتش", desc: "خضار مشكل", price: "14 د.ل" },
			{ name: "ناجتس", desc: "قطع دجاج مقلية", price: "12 د.ل" },
		],
	},
	{
		name: "حلويات",
		items: [
			{ name: "كنافة", desc: "نابلسية بالفستق", price: "15 د.ل" },
			{ name: "تشيز كيك", desc: "نيويورك مع توت", price: "16 د.ل" },
			{ name: "أم علي", desc: "حلى شرقي بالقشطة", price: "12 د.ل" },
			{ name: "بسبوسة", desc: "سميد بجوز الهند", price: "10 د.ل" },
		],
	},
]

const ORANGE = "#f66d0f"
const BG = "#111013"
const TEXT_SECONDARY = "oklch(0.55 0.01 0)"
const ITEM_BG = "oklch(0.18 0.005 0)"

function StatusBar({ frame }: { frame: number }) {
	const opacity = interpolate(frame, [0, 10], [1, 1], { extrapolateRight: "clamp" })
	return (
		<div style={{
			display: "flex", justifyContent: "space-between", alignItems: "center",
			padding: "0 4px", height: 24, opacity,
		}}>
			<span style={{ fontSize: 11, fontWeight: 600, color: TEXT_SECONDARY, fontFamily: "system-ui" }}>9:41</span>
			<div style={{ display: "flex", gap: 4, alignItems: "center" }}>
				<div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: ORANGE }} />
				<div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "oklch(0.4 0.01 0)" }} />
			</div>
		</div>
	)
}

function Header({ frame }: { frame: number }) {
	const titleY = interpolate(frame, [0, 15], [20, 0], {
		easing: Easing.bezier(0.16, 1, 0.3, 1),
		extrapolateRight: "clamp",
	})
	const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" })
	return (
		<div style={{
			display: "flex", alignItems: "center", justifyContent: "space-between",
			padding: "0 4px", height: 40, opacity: titleOpacity, translate: `0 ${titleY}px`,
		}}>
			<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<div style={{
					width: 28, height: 28, borderRadius: 6, backgroundColor: ORANGE,
					display: "flex", alignItems: "center", justifyContent: "center",
				}}>
					<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
						<path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" strokeLinecap="round" />
					</svg>
				</div>
				<span style={{ fontSize: 15, fontWeight: 700, color: "white", fontFamily: "system-ui" }}>Smart Menu</span>
			</div>
			<div style={{
				display: "flex", alignItems: "center", gap: 4,
				padding: "4px 10px", borderRadius: 4, backgroundColor: "oklch(0.18 0.005 0)",
			}}>
				<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth={2}>
					<circle cx="12" cy="12" r="10" />
					<path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
				<span style={{ fontSize: 10, color: TEXT_SECONDARY }}>مفتوح الآن</span>
			</div>
		</div>
	)
}

function CategoryTab({ name, active, delay }: { name: string; active: boolean; delay: number }) {
	return (
		<div style={{
			padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500,
			backgroundColor: active ? ORANGE : ITEM_BG,
			color: active ? "white" : TEXT_SECONDARY,
			whiteSpace: "nowrap", flexShrink: 0,
		}}>
			{name}
		</div>
	)
}

function MenuItems({ items, progress }: { items: typeof CATEGORIES[number]["items"]; progress: number }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
			{items.map((item, i) => {
				const delay = 0.08 * i
				const itemOpacity = interpolate(progress, [delay, delay + 0.2], [0, 1], {
					extrapolateLeft: "clamp", extrapolateRight: "clamp",
				})
				const itemY = interpolate(progress, [delay, delay + 0.2], [12, 0], {
					easing: Easing.bezier(0.16, 1, 0.3, 1),
					extrapolateLeft: "clamp", extrapolateRight: "clamp",
				})
				return (
					<div key={item.name} style={{
						display: "flex", alignItems: "center", justifyContent: "space-between",
						padding: "8px 12px", borderRadius: 6,
						backgroundColor: ITEM_BG,
						opacity: itemOpacity, translate: `0 ${itemY}px`,
					}}>
						<div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
							<span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{item.name}</span>
							<span style={{ fontSize: 10, color: TEXT_SECONDARY }}>{item.desc}</span>
						</div>
						<span style={{ fontSize: 13, fontWeight: 700, color: ORANGE, fontFamily: "system-ui" }}>{item.price}</span>
					</div>
				)
			})}
		</div>
	)
}

function CategoryScreen({ category, progress }: { category: typeof CATEGORIES[number]; progress: number }) {
	const titleOpacity = interpolate(progress, [0, 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
	const titleY = interpolate(progress, [0, 0.1], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 4px" }}>
			<div style={{ opacity: titleOpacity, translate: `0 ${titleY}px` }}>
				<CategoryTab name={category.name} active={true} delay={0} />
			</div>
			<MenuItems items={category.items} progress={progress} />
		</div>
	)
}

function PaginationDots({ total, active, frame }: { total: number; active: number; frame: number }) {
	return (
		<div style={{ display: "flex", justifyContent: "center", gap: 5, padding: 0 }}>
			{Array.from({ length: total }).map((_, i) => {
				const isActive = i === active
				const width = interpolate(
					Number(isActive),
					[0, 1],
					[6, 18],
				)
				return (
					<div key={i} style={{
						width, height: 5, borderRadius: 3,
						backgroundColor: isActive ? ORANGE : "oklch(0.35 0.01 0)",
						opacity: isActive ? 1 : 0.5,
					}} />
				)
			})}
		</div>
	)
}

function CTAButton({ frame }: { frame: number }) {
	const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" })
	const y = interpolate(frame, [0, 20], [10, 0], {
		easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateRight: "clamp",
	})
	return (
		<div style={{
			opacity, translate: `0 ${y}px`,
			display: "flex", alignItems: "center", justifyContent: "center",
			gap: 4, padding: "8px 20px", borderRadius: 5,
			backgroundColor: ORANGE,
			boxShadow: "0 4px 16px oklch(0.68 0.19 45 / 0.35)",
		}}>
			<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
				<path d="m21 12-4-4M21 12l-4 4M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
			<span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>اطلب الآن</span>
		</div>
	)
}

function GlowBackground() {
	return (
		<div style={{
			position: "absolute", top: "20%", left: "50%", width: "70%", height: "50%",
			borderRadius: "50%",
			background: "radial-gradient(ellipse at center, oklch(0.68 0.19 45 / 0.08) 0%, transparent 70%)",
			filter: "blur(20px)",
			transform: "translateX(-50%)",
			pointerEvents: "none",
		}} />
	)
}

export const PhoneMenuVideo: React.FC = () => {
	const frame = useCurrentFrame()
	const fps = 30
	const perCategoryDuration = 4 * fps // 4 seconds per category
	const totalDuration = CATEGORIES.length * perCategoryDuration // 16 seconds

	// Which category we're on
	const categoryIndex = Math.floor(frame / perCategoryDuration) % CATEGORIES.length
	// Progress within current category (0→1 over perCategoryDuration frames)
	const localFrame = frame % perCategoryDuration
	const progress = localFrame / perCategoryDuration

	// Fade out at end
	const isLastCategory = categoryIndex === CATEGORIES.length - 1
	const globalOut = isLastCategory
		? interpolate(localFrame, [perCategoryDuration - 10, perCategoryDuration], [1, 0], {
			extrapolateLeft: "clamp", extrapolateRight: "clamp",
		})
		: 1

	const category = CATEGORIES[categoryIndex]

	return (
		<AbsoluteFill>
			<div style={{
				width: 390, height: 844,
				backgroundColor: BG,
				fontFamily: "system-ui, -apple-system, sans-serif",
				direction: "rtl", display: "flex", flexDirection: "column",
				padding: "12px 16px 16px",
				borderRadius: 48, overflow: "hidden",
				opacity: globalOut,
			}}>
				<GlowBackground />
				<StatusBar frame={frame} />
				<Header frame={frame} />

				{/* Category tabs row */}
				<div style={{
					display: "flex", gap: 6, marginTop: 12, marginBottom: 10,
					overflowX: "auto", flexShrink: 0,
				}}>
					{CATEGORIES.map((cat, i) => (
						<CategoryTab key={cat.name} name={cat.name} active={i === categoryIndex} delay={0} />
					))}
				</div>

				{/* Content area */}
				<div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
					<CategoryScreen category={category} progress={Math.min(progress * 2, 1)} />
				</div>

				{/* CTA */}
				<div style={{ marginTop: "auto", paddingTop: 10, flexShrink: 0 }}>
					<CTAButton frame={frame} />
				</div>

				{/* Dots */}
				<div style={{ paddingTop: 10, flexShrink: 0 }}>
					<PaginationDots total={CATEGORIES.length} active={categoryIndex} frame={frame} />
				</div>
			</div>
		</AbsoluteFill>
	)
}
