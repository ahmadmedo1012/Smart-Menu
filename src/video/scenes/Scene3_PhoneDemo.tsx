import { interpolate, AbsoluteFill, Easing, spring, useCurrentFrame } from "remotion"
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const BG = "#070708"
const SURF = "oklch(0.16 0.005 0)"
const TXT = "#ffffff"
const MUT = "rgba(255,255,255,0.45)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

const CATEGORIES = [
	{ name: "المشروبات", icon: "☕", items: ["كابتشينو 12 د.ل", "لاتيه 14 د.ل", "إسبريسو 8 د.ل", "موكا 15 د.ل"] },
	{ name: "الوجبات", icon: "🍔", items: ["برجر دجاج 18 د.ل", "بطاطس مقلية 6 د.ل", "ساندويتش 14 د.ل", "ناجتس 12 د.ل"] },
	{ name: "الحلويات", icon: "🍰", items: ["كنافة 15 د.ل", "تشيز كيك 16 د.ل", "أم علي 12 د.ل", "بسبوسة 10 د.ل"] },
]

/* ─── Phone frame ─── */
function PhoneFrame({ children, show }: { children: React.ReactNode; show: number }) {
	return (
		<div style={{
			width: 300, height: 600, borderRadius: 40, overflow: "hidden", position: "relative",
			border: "1.5px solid rgba(255,255,255,0.1)",
			boxShadow: `0 20px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset`,
			opacity: show,
			scale: String(interpolate(show, [0, 1], [0.82, 1])),
		}}>
			{/* Notch */}
			<div style={{
				position: "absolute", top: 0, left: "50%", translate: "-50% 0",
				width: 90, height: 22, background: "#000", borderRadius: "0 0 14px 14px", zIndex: 50,
			}} />
			<div style={{ background: "#0d0d0f", height: "100%" }}>{children}</div>
		</div>
	)
}

/* ─── Menu items list with stagger ─── */
function MenuList({ items, frame, baseDelay }: { items: string[]; frame: number; baseDelay: number }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
			{items.map((item, i) => {
				const lf = Math.max(0, frame - (baseDelay + i * 4))
				const sv = spring({ frame: lf * 1.8, fps: 30, config: { damping: 13, stiffness: 100 } })
				const [name, price] = item.split(" ")
				return (
					<div key={item} style={{
						display: "flex", justifyContent: "space-between", alignItems: "center",
						padding: "10px 14px", borderRadius: 10,
						background: SURF,
						opacity: sv, transform: `translateX(${(1 - sv) * 15}px)`,
					}}>
						<span style={{ fontFamily, fontSize: 13, fontWeight: 600, color: TXT, direction: "rtl" }}>{name} {price}</span>
					</div>
				)
			})}
		</div>
	)
}

function CategorySection({ cat, frame, catStart }: { cat: typeof CATEGORIES[0]; frame: number; catStart: number }) {
	const lf = Math.max(0, frame - catStart)
	const op = interpolate(lf, [0, 10], [0, 1], { extrapolateRight: "clamp" })
	const y = interpolate(lf, [0, 10], [10, 0], { extrapolateRight: "clamp", easing: EZ })
	return (
		<div style={{ opacity: op, transform: `translateY(${y}px)` }}>
			<div style={{
				display: "flex", alignItems: "center", gap: 6, marginBottom: 8, direction: "rtl",
			}}>
				<span style={{ fontSize: 18 }}>{cat.icon}</span>
				<span style={{ fontFamily, fontSize: 15, fontWeight: 700, color: TXT }}>{cat.name}</span>
			</div>
			<MenuList items={cat.items} frame={lf} baseDelay={4} />
		</div>
	)
}

export const Scene3_PhoneDemo: React.FC = () => {
	const f = useCurrentFrame()
	const durationInFrames = 180
	const fadeOut = interpolate(f, [durationInFrames - 20, durationInFrames], [0, 1], { extrapolateLeft: "clamp" })

	const phoneOp = interpolate(f, [0, 18], [0, 1], { extrapolateRight: "clamp" })
	const titleOp = interpolate(f, [5, 20], [0, 1], { extrapolateRight: "clamp" })
	const titleY = interpolate(f, [5, 20], [12, 0], { extrapolateRight: "clamp", easing: EZ })

	return (
		<AbsoluteFill style={{ background: BG }}>
			{/* Glow */}
			<div style={{
				position: "absolute", width: 500, height: 500, borderRadius: "50%",
				background: `radial-gradient(ellipse, ${O}11, transparent 70%)`,
				top: "50%", left: "50%", translate: "-50% -50%",
			}} />

			{/* Title */}
			<div style={{
				position: "absolute", top: 90, left: 0, right: 0, textAlign: "center",
				opacity: titleOp * (1 - fadeOut * 0.5),
			}}>
				<div style={{
					fontFamily, fontSize: 32, fontWeight: 800, color: TXT, letterSpacing: "-0.02em",
					transform: `translateY(${titleY}px)`,
				}}>
					الطلب أسهل
				</div>
				<div style={{ fontFamily, fontSize: 14, color: MUT, marginTop: 4 }}>
					بضغطة زر
				</div>
			</div>

			{/* Phone */}
			<div style={{
				position: "absolute", top: "50%", left: "50%", translate: "-50% -50%",
				transform: `translate(-50%, -50%) translateY(${interpolate(f, [0, 20], [15, 0])}px)`,
				opacity: phoneOp * (1 - fadeOut * 0.5),
			}}>
				<PhoneFrame show={1}>
					<div style={{ padding: "32px 14px 14px", direction: "rtl" }}>
						{/* Status */}
						<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 9, color: MUT }}>
							<span>9:41</span>
							<span>📶 🔋</span>
						</div>
						{/* Header */}
						<div style={{
							display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
							paddingBottom: 10,
							borderBottom: "1px solid rgba(255,255,255,0.06)",
						}}>
							<div style={{ width: 24, height: 24, borderRadius: 6, background: O, display: "flex", alignItems: "center", justifyContent: "center" }}>
								<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" strokeLinecap="round" /></svg>
							</div>
							<span style={{ fontFamily, fontSize: 13, fontWeight: 700, color: TXT }}>Smart Menu</span>
							<span style={{ marginLeft: "auto", fontFamily, fontSize: 8, color: "#4ade80", padding: "2px 8px", borderRadius: 4, background: "rgba(74,222,128,0.1)" }}>مفتوح</span>
						</div>

						{/* Categories */}
						<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
							{CATEGORIES.map((cat, i) => (
								<CategorySection key={i} cat={cat} frame={f} catStart={20 + i * 35} />
							))}
						</div>

						{/* CTA */}
						{(() => {
							const ctaF = Math.max(0, f - 130)
							const ctaOp = interpolate(ctaF, [0, 10], [0, 1], { extrapolateRight: "clamp" })
							const ctaS = spring({ frame: ctaF * 2, fps: 30, config: { damping: 12, stiffness: 120 } })
							return (
								<div style={{
									marginTop: 16, padding: "10px 20px", borderRadius: 10,
									background: O, textAlign: "center",
									opacity: ctaOp, scale: String(ctaS),
									boxShadow: `0 4px 20px ${O}44`,
								}}>
									<span style={{ fontFamily, fontSize: 13, fontWeight: 700, color: "white" }}>
										اطلب الآن ←
									</span>
								</div>
							)
						})()}
					</div>
				</PhoneFrame>
			</div>

			{/* Side labels */}
			<div style={{
				position: "absolute", right: 40, top: "50%", translate: "0 -50%",
				display: "flex", flexDirection: "column", gap: 16,
				opacity: phoneOp * (1 - fadeOut),
			}}>
				{["مسح QR", "اختر طلبك", "ادفع بسهولة"].map((l, i) => {
					const d = Math.max(0, f - (30 + i * 10))
					const o = interpolate(d, [0, 10], [0, 1], { extrapolateRight: "clamp" })
					return (
						<div key={i} style={{ opacity: o, display: "flex", alignItems: "center", gap: 6 }}>
							<div style={{ width: 6, height: 6, borderRadius: "50%", background: O }} />
							<span style={{ fontFamily, fontSize: 11, color: TXT }}>{l}</span>
						</div>
					)
				})}
			</div>
		</AbsoluteFill>
	)
}
