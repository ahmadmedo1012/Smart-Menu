import { useCurrentFrame, interpolate, Easing, AbsoluteFill, Sequence } from "remotion"

const O = "#f66d0f"
const BG = "#070708"
const SURF = "oklch(0.16 0.005 0)"
const TXT = "oklch(0.93 0.005 0)"
const MUT = "oklch(0.5 0.01 0)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

const MENUS = [
	[
		{ name: "كابتشينو", price: "12 د.ل" },
		{ name: "لاتيه", price: "14 د.ل" },
		{ name: "إسبريسو", price: "8 د.ل" },
		{ name: "موكا", price: "15 د.ل" },
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

/* ─── Scene 1: Brand Reveal (0-75) ─── */
function Scene1_Brand({ f }: { f: number }) {
	const op = interpolate(f, [0, 25], [0, 1], { extrapolateRight: "clamp" })
	const s = interpolate(f, [0, 35], [0.5, 1], { extrapolateRight: "clamp", easing: EZ })
	const gO = interpolate(f, [15, 40], [0, 0.7], { extrapolateRight: "clamp" })
	const gF = interpolate(f, [55, 75], [0, 1], { extrapolateLeft: "clamp" })

	return (
		<div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: op }}>
			<div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, oklch(0.68 0.19 45 / 0.15), transparent 70%)", filter: `blur(${interpolate(gF, [0, 1], [20, 60])}px)`, opacity: gO, top: "35%" }} />
			<div style={{
				width: 64, height: 64, borderRadius: 14,
				background: `linear-gradient(135deg, ${O}, #ff8833)`,
				display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
				scale: String(s),
			}}>
				<svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
					<path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" strokeLinecap="round" />
					<circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
				</svg>
			</div>
			<div style={{ fontSize: 44, fontWeight: 700, color: TXT, marginBottom: 4 }}>Smart Menu</div>
			<div style={{ fontSize: 15, color: MUT }}>منيو رقمي احترافي</div>
			<div style={{ width: 60, height: 3, borderRadius: 2, background: O, marginTop: 14, scale: String(s) }} />
		</div>
	)
}

/* ─── Phone frame ─── */
function PhoneFrame({ children, show }: { children: React.ReactNode; show: number }) {
	return (
		<div style={{
			width: 320, height: 640, borderRadius: 36, overflow: "hidden", position: "relative",
			border: "1px solid oklch(0.28 0.01 0)",
			boxShadow: `0 20px 80px rgba(0,0,0,0.6), 0 0 0 1px oklch(0.2 0.01 0) inset`,
			opacity: show,
			scale: String(interpolate(show, [0, 1], [0.85, 1])),
		}}>
			<div style={{
				position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
				width: 100, height: 20, background: BG, borderRadius: "0 0 14px 14px", zIndex: 50,
			}} />
			{children}
		</div>
	)
}

/* ─── Scene 2: Phone Demo (75-435) 4 categories × 90 frames ─── */
function Scene2_Phone({ f, catIdx, catP }: { f: number; catIdx: number; catP: number }) {
	const items = MENUS[catIdx]
	const entryOp = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" })
	const entryY = interpolate(f, [0, 12], [30, 0], { extrapolateRight: "clamp", easing: EZ })

	return (
		<div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
			<div style={{
				position: "absolute", width: 360, height: 500, borderRadius: "50%",
				background: "radial-gradient(ellipse, oklch(0.68 0.19 45 / 0.08), transparent 70%)",
				filter: "blur(60px)",
			}} />
			<PhoneFrame show={entryOp}>
				<div style={{ padding: "28px 12px 12px", direction: "rtl", opacity: Math.min(catP * 2, 1) }}>
					{/* Status */}
					<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 9, color: MUT }}>
						<span>9:41</span>
						<div style={{ display: "flex", gap: 3 }}>
							<div style={{ width: 4, height: 4, borderRadius: "50%", background: O }} />
							<div style={{ width: 4, height: 4, borderRadius: "50%", background: MUT }} />
						</div>
					</div>
					{/* Header */}
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
						<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
							<div style={{ width: 22, height: 22, borderRadius: 4, background: O, display: "flex", alignItems: "center", justifyContent: "center" }}>
								<svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
									<path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" strokeLinecap="round" />
								</svg>
							</div>
							<span style={{ fontSize: 12, fontWeight: 700, color: TXT }}>Smart Menu</span>
						</div>
						<span style={{ fontSize: 8, color: MUT, padding: "1px 5px", borderRadius: 3, background: SURF }}>مفتوح</span>
					</div>
					{/* Items */}
					<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
						{items.map((item, i) => {
							const d = i * 0.12
							const p = Math.max(0, (catP - d) / (1 - d))
							const iO = interpolate(p, [0, 0.3], [0, 1], { extrapolateLeft: "clamp" })
							const iY = interpolate(p, [0, 0.4], [12, 0], { extrapolateLeft: "clamp", easing: EZ })
							const iS = interpolate(p, [0, 0.4], [0.92, 1], { extrapolateLeft: "clamp", easing: EZ })
							return (
								<div key={item.name} style={{
									opacity: iO, transform: `translateY(${iY}px) scale(${iS})`,
									display: "flex", justifyContent: "space-between",
									padding: "7px 10px", borderRadius: 5,
									background: SURF, fontSize: 11,
								}}>
									<span style={{ fontWeight: 600, color: TXT }}>{item.name}</span>
									<span style={{ fontWeight: 700, color: O }}>{item.price}</span>
								</div>
							)
						})}
					</div>
					{/* CTA */}
					{catP > 0.5 && (() => {
						const ctaP = Math.min((catP - 0.5) / 0.3, 1)
						return (
							<div style={{
								marginTop: 8, padding: "6px 16px", borderRadius: 4, background: O,
								textAlign: "center", fontSize: 10, fontWeight: 700, color: "white",
								opacity: interpolate(ctaP, [0, 0.3], [0, 1]),
								transform: `scale(${interpolate(ctaP, [0, 0.3], [0.9, 1])})`,
							}}>
								اطلب الآن ←
							</div>
						)
					})()}
				</div>
			</PhoneFrame>
		</div>
	)
}

/* ─── Scene 3: Stats (435-555) ─── */
function Scene3_Stats({ f }: { f: number }) {
	const op = interpolate(f, [0, 15], [0, 1], { extrapolateRight: "clamp" })
	const ty = interpolate(f, [0, 15], [18, 0], { extrapolateRight: "clamp", easing: EZ })
	const STATS = [
		{ v: "500+", l: "مطعم" },
		{ v: "50K+", l: "مستخدم" },
		{ v: "98%", l: "رضا" },
	]
	return (
		<div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, opacity: op }}>
			<div style={{ transform: `translateY(${ty}px)` }}>
				<div style={{ fontSize: 28, fontWeight: 700, color: TXT, marginBottom: 6 }}>أرقام تتحدث</div>
				<div style={{ width: 36, height: 3, borderRadius: 2, background: O, margin: "0 auto" }} />
			</div>
			<div style={{ display: "flex", gap: 16 }}>
				{STATS.map((s, i) => {
					const cO = interpolate(f - i * 6, [0, 18], [0, 1], { extrapolateRight: "clamp" })
					return (
						<div key={s.l} style={{
							background: SURF, borderRadius: 10, padding: "18px 16px",
							minWidth: 100, textAlign: "center",
							opacity: cO,
							transform: `scale(${interpolate(cO, [0, 1], [0.82, 1])})`,
						}}>
							<div style={{ fontSize: 30, fontWeight: 700, color: O }}>{s.v}</div>
							<div style={{ fontSize: 13, color: MUT, marginTop: 4 }}>{s.l}</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}

/* ─── Scene 4: Final CTA (555-720) ─── */
function Scene4_CTA({ f }: { f: number }) {
	const op = interpolate(f, [0, 15], [0, 1], { extrapolateRight: "clamp" })
	const s = interpolate(f, [0, 18], [0.65, 1], { extrapolateRight: "clamp", easing: EZ })
	const pulse = interpolate(f % 30, [0, 15, 30], [1, 1.06, 1])
	const subOp = interpolate(f, [18, 35], [0, 0.7], { extrapolateRight: "clamp" })
	return (
		<div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, opacity: op }}>
			<div style={{ textAlign: "center", transform: `scale(${s})` }}>
				<div style={{ fontSize: 13, color: O, fontWeight: 600, marginBottom: 6 }}>انطلق الآن</div>
				<div style={{ fontSize: 38, fontWeight: 700, color: TXT, lineHeight: 1.15 }}>جهّز مطعمك<br />للانطلاق الرقمي</div>
				<div style={{ width: 50, height: 3, borderRadius: 2, background: O, margin: "10px auto 0" }} />
			</div>
			<div style={{
				transform: `scale(${pulse})`,
				padding: "10px 26px", borderRadius: 6,
				background: O,
				boxShadow: "0 0 30px oklch(0.68 0.19 45 / 0.3)",
				fontSize: 14, fontWeight: 700, color: "white",
			}}>
				ابدأ مجاناً
			</div>
			<div style={{ fontSize: 10, color: MUT, opacity: subOp }}>
				مجاناً • بدون بطاقة • دعم فني متكامل
			</div>
		</div>
	)
}

/* ─── Particles ─── */
function Particles({ f }: { f: number }) {
	return (
		<>
			{[...Array(6)].map((_, i) => (
				<div key={i} style={{
					position: "absolute", width: 2, height: 2, borderRadius: "50%", background: O,
					left: `${10 + i * 16}%`, top: `${15 + (i % 4) * 20}%`,
					opacity: interpolate((f + i * 25) % 150, [0, 75, 150], [0, 0.2, 0]),
				}} />
			))}
		</>
	)
}

/* ─── Main ─── */
export const PhoneMenuVideo: React.FC = () => {
	const f = useCurrentFrame()
	const total = 720

	return (
		<AbsoluteFill style={{ background: BG, fontFamily: "system-ui, sans-serif" }}>
			<div style={{
				position: "absolute", inset: 0,
				background: "radial-gradient(ellipse at 50% 0%, oklch(0.15 0.01 45 / 0.07) 0%, transparent 60%)",
			}} />
			<Particles f={f} />

			<Sequence from={0} durationInFrames={75}>
				<Scene1_Brand f={f} />
			</Sequence>

			<Sequence from={75} durationInFrames={360}>
				{(() => {
					const sf = f - 75
					const ci = Math.min(Math.floor(sf / 90), 3)
					const cp = Math.min(((sf % 90) / 90) * 1.5, 1)
					return <Scene2_Phone f={sf} catIdx={ci} catP={cp} />
				})()}
			</Sequence>

			<Sequence from={435} durationInFrames={120}>
				<Scene3_Stats f={f - 435} />
			</Sequence>

			<Sequence from={555} durationInFrames={165}>
				<Scene4_CTA f={f - 555} />
			</Sequence>

			<div style={{
				position: "absolute", inset: 0,
				background: BG,
				opacity: interpolate(f, [total - 20, total], [0, 1]),
				pointerEvents: "none",
			}} />
		</AbsoluteFill>
	)
}
