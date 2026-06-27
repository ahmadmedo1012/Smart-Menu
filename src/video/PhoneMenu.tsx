import { useCurrentFrame, interpolate, Easing, AbsoluteFill } from "remotion"

const O = "#f66d0f"
const BG = "#070708"
const SURFACE = "oklch(0.16 0.005 0)"
const TEXT = "oklch(0.93 0.005 0)"
const MUTED = "oklch(0.5 0.01 0)"

const DATA = [
	[
		{ name: "كابتشينو", price: "12 د.ل" },
		{ name: "لاتيه", price: "14 د.ل" },
		{ name: "إسبريسو", price: "8 د.ل" },
		{ name: "موكا", price: "15 د.ل" },
	],
	[
		{ name: "موهيتو", price: "10 د.ل" },
		{ name: "سموثي", price: "12 د.ل" },
		{ name: "آيس تي", price: "8 د.ل" },
		{ name: "ليموناضة", price: "9 د.ل" },
	],
	[
		{ name: "برجر دجاج", price: "18 د.ل" },
		{ name: "بطاطس مقلية", price: "6 د.ل" },
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

const EZ = Easing.bezier(0.16, 1, 0.3, 1)

export const PhoneMenuVideo: React.FC = () => {
	const f = useCurrentFrame()

	const scene = f < 90 ? 0 : f < 450 ? 1 : f < 570 ? 2 : 3

	// Global fade out near end
	const globalOut = interpolate(f, [700, 720], [1, 0], { extrapolateLeft: "clamp" })

	return (
		<div style={{ width: "100%", height: "100%", background: BG, fontFamily: "system-ui, sans-serif", position: "relative", opacity: globalOut }}>

			{/* ===== SCENE 1: LOGO (0-90) ===== */}
			{scene === 0 && (() => {
				const op = interpolate(f, [0, 30], [0, 1], { extrapolateRight: "clamp" })
				const s = interpolate(f, [0, 40], [0.6, 1], { extrapolateRight: "clamp", easing: EZ })
				const gO = interpolate(f, [70, 90], [1, 0], { extrapolateLeft: "clamp" })
				return (
					<div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: op * gO }}>
						<div style={{
							width: 56, height: 56, borderRadius: 12,
							background: `linear-gradient(135deg, ${O}, #ff8833)`,
							display: "flex", alignItems: "center", justifyContent: "center",
							marginBottom: 10,
							transform: `scale(${s})`,
						}}>
							<svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
								<path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" strokeLinecap="round" />
								<circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
							</svg>
						</div>
						<div style={{ fontSize: 38, fontWeight: 700, color: TEXT, letterSpacing: -0.5 }}>Smart Menu</div>
						<div style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>منيو رقمي احترافي</div>
					</div>
				)
			})()}

			{/* ===== SCENE 2: PHONE (90-450) ===== */}
			{scene === 1 && (() => {
				const sf = f - 90
				const catIdx = Math.min(Math.floor(sf / 90), 3)
				const catP = ((sf % 90) / 90) * 1.5
				const items = DATA[catIdx]
				const enter = interpolate(sf, [0, 20], [40, 0], { extrapolateRight: "clamp", easing: EZ })
				const phOp = interpolate(sf, [0, 10], [0, 1], { extrapolateRight: "clamp" })

				return (
					<div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: phOp, transform: `translateY(${enter}px)` }}>
						<div style={{
							width: 320, height: 640, borderRadius: 36,
							overflow: "hidden", position: "relative",
							border: "1px solid oklch(0.25 0.01 0)",
						}}>
							<div style={{
								position: "absolute", top: 0, left: "50%",
								transform: "translateX(-50%)", width: 90, height: 18,
								background: BG, borderRadius: "0 0 10px 10px", zIndex: 10,
							}} />
							<div style={{ padding: "28px 12px 12px", direction: "rtl", opacity: Math.min(catP * 2, 1) }}>
								<div style={{ fontSize: 9, color: MUTED, marginBottom: 8 }}>
									<span>Smart Menu</span>
									<span style={{ float: "left", fontSize: 8, padding: "1px 5px", borderRadius: 3, background: SURFACE }}>مفتوح</span>
								</div>
								{items.map((item, i) => {
									const d = i * 0.12
									const p = Math.max(0, (catP - d) / (1 - d))
									const iO = interpolate(p, [0, 0.3], [0, 1], { extrapolateLeft: "clamp" })
									const iY = interpolate(p, [0, 0.4], [12, 0], { extrapolateLeft: "clamp", easing: EZ })
									return (
										<div key={item.name} style={{
											opacity: iO, transform: `translateY(${iY}px)`,
											display: "flex", justifyContent: "space-between",
											padding: "6px 10px", marginBottom: 4,
											borderRadius: 4, background: SURFACE, fontSize: 11,
										}}>
											<span style={{ fontWeight: 600, color: TEXT }}>{item.name}</span>
											<span style={{ fontWeight: 700, color: O }}>{item.price}</span>
										</div>
									)
								})}
								{catP > 0.6 && (
									<div style={{
										marginTop: sf % 90 > 60 ? 8 : 20,
										padding: "6px 16px", borderRadius: 4, background: O,
										textAlign: "center", fontSize: 10, fontWeight: 700, color: "white",
									}}>
										اطلب الآن ←
									</div>
								)}
							</div>
						</div>
					</div>
				)
			})()}

			{/* ===== SCENE 3: STATS (450-570) ===== */}
			{scene === 2 && (() => {
				const sf = f - 450
				const op = interpolate(sf, [0, 15], [0, 1], { extrapolateRight: "clamp" })
				const y = interpolate(sf, [0, 15], [16, 0], { extrapolateRight: "clamp", easing: EZ })
				return (
					<div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, opacity: op, transform: `translateY(${y}px)` }}>
						<div style={{ fontSize: 24, fontWeight: 700, color: TEXT }}>أرقام تتحدث</div>
						<div style={{ width: 30, height: 2, borderRadius: 1, background: O }} />
						<div style={{ display: "flex", gap: 12 }}>
							{["500+", "50K+", "98%"].map((v, i) => {
								const cOp = interpolate(sf - i * 5, [0, 15], [0, 1], { extrapolateRight: "clamp" })
								return (
									<div key={v} style={{ background: SURFACE, borderRadius: 8, padding: "14px 12px", minWidth: 90, textAlign: "center", opacity: cOp, transform: `scale(${interpolate(cOp, [0, 1], [0.85, 1])})` }}>
										<div style={{ fontSize: 26, fontWeight: 700, color: O }}>{v}</div>
									</div>
								)
							})}
						</div>
					</div>
				)
			})()}

			{/* ===== SCENE 4: CTA (570-720) ===== */}
			{scene === 3 && (() => {
				const sf = f - 570
				const op = interpolate(sf, [0, 15], [0, 1], { extrapolateRight: "clamp" })
				const s = interpolate(sf, [0, 15], [0.7, 1], { extrapolateRight: "clamp", easing: EZ })
				const pulse = interpolate(sf % 30, [0, 15, 30], [1, 1.05, 1])
				return (
					<div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, opacity: op }}>
						<div style={{ textAlign: "center", transform: `scale(${s})` }}>
							<div style={{ fontSize: 12, color: O, fontWeight: 600, marginBottom: 4 }}>انطلق الآن</div>
							<div style={{ fontSize: 32, fontWeight: 700, color: TEXT, lineHeight: 1.2 }}>جهّز مطعمك<br />للانطلاق الرقمي</div>
							<div style={{ width: 40, height: 2, borderRadius: 1, background: O, margin: "8px auto 0" }} />
						</div>
						<div style={{ transform: `scale(${pulse})`, padding: "8px 22px", borderRadius: 6, background: O, fontSize: 13, fontWeight: 700, color: "white" }}>
							ابدأ مجاناً
						</div>
						<div style={{ fontSize: 9, color: MUTED }}>مجاناً • بدون بطاقة • دعم فني</div>
					</div>
				)
			})()}

		</div>
	)
}
