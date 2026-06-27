import { interpolate, useCurrentFrame } from "remotion"

const SCREENS = [
	{
		category: "مشروبات ساخنة",
		items: [
			{ name: "كابتشينو", price: "12 د.ل", color: "oklch(0.25 0.01 30)" },
			{ name: "لاتيه", price: "14 د.ل", color: "oklch(0.3 0.015 30)" },
			{ name: "إسبريسو", price: "8 د.ل", color: "oklch(0.2 0.01 30)" },
		],
	},
	{
		category: "مشروبات باردة",
		items: [
			{ name: "موهيتو", price: "10 د.ل", color: "oklch(0.25 0.01 90)" },
			{ name: "سموثي", price: "12 د.ل", color: "oklch(0.3 0.015 90)" },
			{ name: "ليموناضة", price: "8 د.ل", color: "oklch(0.2 0.01 90)" },
		],
	},
	{
		category: "وجبات سريعة",
		items: [
			{ name: "برجر دجاج", price: "18 د.ل", color: "oklch(0.25 0.01 45)" },
			{ name: "بطاطس مقلية", price: "6 د.ل", color: "oklch(0.3 0.015 45)" },
			{ name: "ساندويتش", price: "14 د.ل", color: "oklch(0.2 0.01 45)" },
		],
	},
	{
		category: "حلويات",
		items: [
			{ name: "كنافة", price: "15 د.ل", color: "oklch(0.25 0.01 25)" },
			{ name: "تشيز كيك", price: "16 د.ل", color: "oklch(0.3 0.015 25)" },
			{ name: "أم علي", price: "12 د.ل", color: "oklch(0.2 0.01 25)" },
		],
	},
]

function Screen({ screen, progress }: { screen: typeof SCREENS[number]; progress: number }) {
	const opacity = interpolate(progress, [0, 0.15, 0.85, 1], [0, 1, 1, 0])
	const y = interpolate(progress, [0, 0.2, 0.8, 1], [20, 0, 0, -20])

	return (
		<div style={{ opacity, transform: `translateY(${y}px)`, display: "flex", flexDirection: "column", gap: 6 }}>
			<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontSize: 9, color: "oklch(0.5 0.01 0)" }}>
				<div style={{ flex: 1, height: 1, backgroundColor: "oklch(0.22 0.008 0)" }} />
				<span>{screen.category}</span>
				<div style={{ flex: 1, height: 1, backgroundColor: "oklch(0.22 0.008 0)" }} />
			</div>
			{screen.items.map((item, i) => {
				const itemDelay = 0.05 * i
				const itemOpacity = interpolate(progress, [itemDelay, itemDelay + 0.15], [0, 1])
				return (
					<div key={item.name} style={{
						display: "flex", justifyContent: "space-between", alignItems: "center",
						padding: "6px 10px", borderRadius: 3,
						backgroundColor: item.color, fontSize: 11, opacity: itemOpacity,
					}}>
						<span style={{ fontWeight: 500, color: "oklch(0.93 0.005 0)" }}>{item.name}</span>
						<span style={{ fontWeight: 700, color: "#f66d0f", fontSize: 10 }}>{item.price}</span>
					</div>
				)
			})}
		</div>
	)
}

export const PhoneMenuVideo: React.FC = () => {
	const frame = useCurrentFrame()
	const screenDuration = 35
	const currentScreen = Math.floor(frame / screenDuration) % SCREENS.length
	const screenProgress = (frame % screenDuration) / screenDuration

	const screen = SCREENS[currentScreen]

	return (
		<div style={{
			width: 220,
			height: 460,
			backgroundColor: "#111013",
			fontFamily: "system-ui, -apple-system, sans-serif",
			direction: "rtl",
			display: "flex",
			flexDirection: "column",
			padding: 16,
			borderRadius: 28,
			overflow: "hidden",
		}}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, fontSize: 10, color: "oklch(0.5 0.01 0)" }}>
				<span>9:41</span>
				<div style={{ display: "flex", gap: 4 }}>
					<div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#f66d0f" }} />
					<div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "oklch(0.5 0.01 0)" }} />
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
				<div style={{ width: 20, height: 20, borderRadius: 3, backgroundColor: "#f66d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
					<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
						<path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" strokeLinecap="round"/>
					</svg>
				</div>
				<span style={{ fontSize: 11, fontWeight: 700, color: "oklch(0.93 0.005 0)" }}>المنيو</span>
			</div>

			<Screen screen={screen} progress={screenProgress} />

			<div style={{
				marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center",
				gap: 4, padding: "7px 14px", borderRadius: 3, backgroundColor: "#f66d0f",
				color: "white", fontSize: 11, fontWeight: 700,
				boxShadow: "0 4px 12px oklch(0.68 0.19 45 / 0.3)",
			}}>
				<svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
					<path d="m21 12-4-4M21 12l-4 4M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
				اطلب الآن
			</div>

			<div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
				{SCREENS.map((_, i) => (
					<div key={i} style={{
						width: i === currentScreen ? 16 : 5, height: 5,
						borderRadius: 3, backgroundColor: i === currentScreen ? "#f66d0f" : "oklch(0.5 0.01 0)",
						transition: "all 0.3s",
					}} />
				))}
			</div>
		</div>
	)
}
