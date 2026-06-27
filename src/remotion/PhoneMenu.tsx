import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	spring,
	Easing,
	AbsoluteFill,
	Sequence,
} from "remotion"
import React from "react"

/* ───────────────── color system ───────────────── */
const O = "#f66d0f"
const BG = "#0a0a0c"
const SURFACE = "oklch(0.16 0.005 0)"
const TEXT = "oklch(0.93 0.005 0)"
const MUTED = "oklch(0.5 0.01 0)"
const GLOW = "oklch(0.68 0.19 45 / 0.15)"

/* ───────────────── data ───────────────── */
const CATEGORIES = [
	{
		name: "مشروبات ساخنة", emoji: "☕",
		items: [
			{ name: "كابتشينو", desc: "إسبريسو مع حليب", price: "12 د.ل" },
			{ name: "لاتيه", desc: "حليب كثيف مع إسبريسو", price: "14 د.ل" },
			{ name: "إسبريسو", desc: "قهوة إيطالية مركزة", price: "8 د.ل" },
			{ name: "موكا", desc: "شوكولاتة مع إسبريسو", price: "15 د.ل" },
		],
	},
	{
		name: "مشروبات باردة", emoji: "🍹",
		items: [
			{ name: "موهيتو", desc: "نعناع ليمون مثلج", price: "10 د.ل" },
			{ name: "سموثي", desc: "فواكه طازجة", price: "12 د.ل" },
			{ name: "آيس تي", desc: "شاي مثلج بالليمون", price: "8 د.ل" },
			{ name: "ليموناضة", desc: "ليمون طازج مثلج", price: "9 د.ل" },
		],
	},
	{
		name: "وجبات سريعة", emoji: "🍔",
		items: [
			{ name: "برجر دجاج", desc: "دجاج مقرمش مع خضار", price: "18 د.ل" },
			{ name: "بطاطس مقلية", desc: "بطاطس ذهبية مقرمشة", price: "6 د.ل" },
			{ name: "ساندويتش", desc: "خضار مشكل", price: "14 د.ل" },
			{ name: "ناجتس", desc: "قطع دجاج مقلية", price: "12 د.ل" },
		],
	},
	{
		name: "حلويات", emoji: "🍰",
		items: [
			{ name: "كنافة", desc: "نابلسية بالفستق", price: "15 د.ل" },
			{ name: "تشيز كيك", desc: "نيويورك مع توت", price: "16 د.ل" },
			{ name: "أم علي", desc: "حلى شرقي بالقشطة", price: "12 د.ل" },
			{ name: "بسبوسة", desc: "سميد بجوز الهند", price: "10 د.ل" },
		],
	},
]

const STATS_DATA = [
	{ value: "500+", label: "مطعم ومقهى" },
	{ value: "50K+", label: "مستخدم نشط" },
	{ value: "98%", label: "رضا العملاء" },
]

/* ───────────────── helpers ───────────────── */
function springVal(frame: number, fps: number, delay = 0, damping = 14, mass = 0.8): number {
	return spring({
		frame: Math.max(0, frame - delay),
		fps,
		config: { damping, mass },
	})
}

function fadeSlide(frame: number, dur: number, dir: "up" | "down" = "up") {
	const d = dir === "up" ? -1 : 1
	return {
		opacity: interpolate(frame, [0, dur * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
		y: interpolate(frame, [0, dur * 0.5], [d * 24, 0], {
			easing: Easing.bezier(0.16, 1, 0.3, 1),
			extrapolateLeft: "clamp", extrapolateRight: "clamp",
		}),
	}
}

/* ───────────────── Scene 1: Logo Reveal ───────────────── */
function Scene1_Logo({ frame, fps }: { frame: number; fps: number }) {
	const s = springVal(frame, fps, 0, 12, 0.6)
	const scale = interpolate(s, [0, 1], [0.6, 1])
	const opacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" })
	const gOpacity = interpolate(frame, [20, 50, 80], [0, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
	return (
		<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity }}>
			<div style={{
				position: "absolute", width: 300, height: 300, borderRadius: "50%",
				background: `radial-gradient(circle, ${GLOW} 0%, transparent 70%)`,
				opacity: gOpacity, filter: "blur(40px)",
			}} />
			<div style={{ scale: String(scale), display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
				<div style={{
					width: 60, height: 60, borderRadius: 14,
					background: `linear-gradient(135deg, ${O}, oklch(0.72 0.22 45))`,
					display: "flex", alignItems: "center", justifyContent: "center",
					boxShadow: `0 0 40px ${GLOW}`,
				}}>
					<svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
						<path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" strokeLinecap="round" />
						<circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
					</svg>
				</div>
				<span style={{ fontSize: 48, fontWeight: 700, color: TEXT, letterSpacing: "-0.02em" }}>Smart Menu</span>
				<span style={{ fontSize: 18, color: MUTED, marginTop: -4 }}>منيو رقمي احترافي</span>
			</div>
		</AbsoluteFill>
	)
}

/* ───────────────── Phone UI ───────────────── */
function PhoneFrame({ children }: { children: React.ReactNode }) {
	return (
		<div style={{
			width: 390, height: 844, borderRadius: 48,
			overflow: "hidden", position: "relative",
			border: "1px solid oklch(0.25 0.01 0)",
			boxShadow: "0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px oklch(0.2 0.01 0) inset",
		}}>
			<div style={{
				position: "absolute", top: 0, left: "50%", translate: "-50% 0",
				width: 120, height: 24, background: BG, borderRadius: "0 0 16px 16px", zIndex: 50,
			}} />
			{children}
		</div>
	)
}

function PhoneUI({
	frame, fps, catIndex, catProg,
}: {
	frame: number; fps: number; catIndex: number; catProg: number;
}) {
	const category = CATEGORIES[catIndex]
	const uiOpacity = interpolate(catProg, [0, 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })

	// Tab springs — all at top level
	const tabSprings = CATEGORIES.map((_, i) => springVal(frame - i * 2, fps, 0, 20))
	// Item springs
	const itemSprings = category.items.map((_, i) => {
		const d = 0.1 * i
		const p = Math.max(0, (catProg - d) / (1 - d))
		return { p, sp: spring({ frame: Math.max(0, Math.round(p * 20)), fps: 20, config: { damping: 14, mass: 0.6 } }) }
	})
	// CTA spring
	const ctaP = Math.max(0, (catProg - 0.6) / 0.4)
	const ctaSp = springVal(Math.round(ctaP * 15), 15, 0, 10, 0.5)

	const hdr = fadeSlide(frame, 15, "up")
	const dotsOpacity = interpolate(catProg, [0, 0.2], [0, 1])

	return (
		<div style={{
			width: "100%", height: "100%", background: BG,
			direction: "rtl", display: "flex", flexDirection: "column",
			padding: "32px 16px 16px",
		}}>
			{/* Status bar */}
			<div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px", height: 20, marginBottom: 8 }}>
				<span style={{ fontSize: 10, fontWeight: 600, color: MUTED }}>9:41</span>
				<div style={{ display: "flex", gap: 4, alignItems: "center" }}>
					<div style={{ width: 5, height: 5, borderRadius: "50%", background: O }} />
					<div style={{ width: 5, height: 5, borderRadius: "50%", background: MUTED }} />
				</div>
			</div>

			{/* Header */}
			<div style={{
				opacity: hdr.opacity, translate: `0 ${hdr.y}px`,
				display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16,
			}}>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<div style={{
						width: 26, height: 26, borderRadius: 6, background: O,
						display: "flex", alignItems: "center", justifyContent: "center",
					}}>
						<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
							<path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" strokeLinecap="round" />
						</svg>
					</div>
					<span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Smart Menu</span>
				</div>
				<div style={{
					display: "flex", gap: 4, padding: "3px 8px", borderRadius: 4, background: SURFACE, alignItems: "center",
				}}>
					<svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={O} strokeWidth={2}>
						<circle cx="12" cy="12" r="10" />
						<path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
					<span style={{ fontSize: 9, color: MUTED }}>مفتوح الآن</span>
				</div>
			</div>

			{/* Tabs */}
			<div style={{ display: "flex", gap: 6, marginBottom: 12, flexShrink: 0 }}>
				{CATEGORIES.map((cat, i) => (
					<div key={cat.name} style={{
						padding: "4px 10px", borderRadius: 5, fontSize: 10, fontWeight: 500,
						background: i === catIndex ? O : SURFACE,
						color: i === catIndex ? "white" : MUTED,
						scale: String(interpolate(tabSprings[i], [0, 1], [0.85, 1])),
						opacity: tabSprings[i],
					}}>
						{cat.emoji} {cat.name}
					</div>
				))}
			</div>

			{/* Items */}
			<div style={{ display: "flex", flexDirection: "column", gap: 6, opacity: uiOpacity }}>
				{category.items.map((item, i) => {
					const { p, sp } = itemSprings[i]
					return (
						<div key={item.name} style={{
							display: "flex", alignItems: "center", justifyContent: "space-between",
							padding: "8px 12px", borderRadius: 6, background: SURFACE,
							opacity: interpolate(p, [0, 0.3], [0, 1]),
							translate: `0 ${interpolate(p, [0, 0.5], [16, 0], {
								easing: Easing.bezier(0.16, 1, 0.3, 1),
							})}px`,
							scale: String(interpolate(sp, [0, 1], [0.95, 1])),
						}}>
							<div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
								<span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{item.name}</span>
								<span style={{ fontSize: 9, color: MUTED }}>{item.desc}</span>
							</div>
							<span style={{ fontSize: 12, fontWeight: 700, color: O }}>{item.price}</span>
						</div>
					)
				})}
			</div>

			{/* CTA */}
			<div style={{
				marginTop: "auto", paddingTop: 10,
				scale: String(interpolate(ctaSp, [0, 1], [0.9, 1])),
				opacity: interpolate(ctaP, [0, 0.3], [0, 1]),
			}}>
				<div style={{
					display: "flex", alignItems: "center", justifyContent: "center",
					gap: 4, padding: "8px 20px", borderRadius: 5, background: O,
					boxShadow: `0 4px 16px oklch(0.68 0.19 45 / 0.35)`,
				}}>
					<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
						<path d="m21 12-4-4M21 12l-4 4M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
					<span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>اطلب الآن</span>
				</div>
			</div>

			{/* Dots */}
			<div style={{
				display: "flex", justifyContent: "center", gap: 4, padding: "8px 0 0", opacity: dotsOpacity,
			}}>
				{CATEGORIES.map((_, i) => (
					<div key={i} style={{
						width: i === catIndex ? 16 : 5, height: 4, borderRadius: 2,
						background: i === catIndex ? O : "oklch(0.3 0.01 0)",
						opacity: i === catIndex ? 1 : 0.5,
					}} />
				))}
			</div>
		</div>
	)
}

/* ───────────────── Scene 2: Phone Demo ───────────────── */
function Scene2_Phone({
	frame, fps, catIndex, catProg,
}: {
	frame: number; fps: number; catIndex: number; catProg: number;
}) {
	const phoneSp = springVal(frame - 5, fps, 0, 18, 0.7)
	const phoneY = interpolate(phoneSp, [0, 1], [120, 0])
	const phoneOpacity = interpolate(phoneSp, [0, 0.4], [0, 1])

	const tiltX = interpolate(frame % 120, [0, 60, 120], [1, -2, 1], {
		easing: Easing.bezier(0.45, 0, 0.55, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp",
	})
	const tiltY = interpolate(frame % 60, [0, 30, 60], [0, 1, 0], {
		easing: Easing.bezier(0.45, 0, 0.55, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp",
	})

	return (
		<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
			<div style={{
				position: "absolute", width: 400, height: 600, borderRadius: "50%",
				background: `radial-gradient(ellipse, ${GLOW} 0%, transparent 70%)`,
				filter: "blur(60px)", opacity: phoneOpacity,
			}} />
			<div style={{
				rotate: `${tiltX}deg`, translate: `0 ${phoneY}px`, opacity: phoneOpacity, perspective: 1000,
			}}>
				<div style={{ transform: `rotateY(${tiltY}deg)` }}>
					<PhoneFrame>
						<PhoneUI frame={frame} fps={fps} catIndex={catIndex} catProg={catProg} />
					</PhoneFrame>
				</div>
			</div>
		</AbsoluteFill>
	)
}

/* ───────────────── Scene 3: Stats ───────────────── */
function Scene3_Stats({ frame, fps }: { frame: number; fps: number }) {
	const s = springVal(frame, fps, 0, 14, 0.6)
	const scale = interpolate(s, [0, 1], [0.8, 1])
	const cardSprings = STATS_DATA.map((_, i) => springVal(frame - i * 8, fps, 0, 12, 0.5))

	return (
		<AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
			<div style={{ scale: String(scale), opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }) }}>
				<span style={{ fontSize: 28, fontWeight: 700, color: TEXT, display: "block", textAlign: "center", marginBottom: 8 }}>
					أرقام تتحدث
				</span>
				<div style={{ width: 40, height: 3, borderRadius: 2, background: O, margin: "0 auto" }} />
			</div>
			<div style={{ display: "flex", gap: 20 }}>
				{STATS_DATA.map((stat, i) => (
					<div key={stat.label} style={{
						background: SURFACE, borderRadius: 12, padding: "20px 16px", minWidth: 120,
						textAlign: "center",
						scale: String(interpolate(cardSprings[i], [0, 1], [0.85, 1])),
						opacity: cardSprings[i],
					}}>
						<div style={{
							fontSize: 32, fontWeight: 700, color: O,
							opacity: interpolate(cardSprings[i], [0, 0.5, 1], [0, 0.5, 1]),
						}}>
							{stat.value}
						</div>
						<div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{stat.label}</div>
					</div>
				))}
			</div>
		</AbsoluteFill>
	)
}

/* ───────────────── Scene 4: Final CTA ───────────────── */
function Scene4_CTA({ frame, fps }: { frame: number; fps: number }) {
	const s = springVal(frame, fps, 0, 12, 0.6)
	const scale = interpolate(s, [0, 1], [0.7, 1])
	const pulse = interpolate(frame % 30, [0, 15, 30], [1, 1.06, 1], {
		easing: Easing.bezier(0.45, 0, 0.55, 1),
	})

	return (
		<AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
			<div style={{
				scale: String(scale),
				opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
				textAlign: "center",
			}}>
				<span style={{ fontSize: 14, color: O, fontWeight: 600, display: "block", marginBottom: 6 }}>انطلق الآن</span>
				<span style={{ fontSize: 40, fontWeight: 700, color: TEXT, lineHeight: 1.2, display: "block", letterSpacing: "-0.02em" }}>
					جهّز مطعمك<br />للانطلاق الرقمي
				</span>
				<div style={{ width: 60, height: 3, borderRadius: 2, background: O, margin: "12px auto 0" }} />
			</div>
			<div style={{
				scale: String(pulse),
				opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" }),
				display: "flex", alignItems: "center", justifyContent: "center",
				gap: 6, padding: "10px 28px", borderRadius: 8,
				background: O, boxShadow: `0 0 30px ${GLOW}`,
			}}>
				<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
					<path d="m21 12-4-4M21 12l-4 4M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
				<span style={{ fontSize: 16, fontWeight: 700, color: "white" }}>ابدأ مجاناً</span>
			</div>
			<span style={{
				fontSize: 11, color: MUTED, opacity: interpolate(frame, [20, 35], [0, 0.7]),
			}}>
				مجاناً • بدون بطاقة • دعم فني متكامل
			</span>
		</AbsoluteFill>
	)
}

/* ───────────────── Particles background ───────────────── */
function Particles({ frame }: { frame: number }) {
	return (
		<>
			{[...Array(6)].map((_, i) => (
				<div key={i} style={{
					position: "absolute", width: 2, height: 2, borderRadius: "50%", background: O,
					left: `${10 + i * 16}%`,
					top: `${20 + (i % 3) * 25}%`,
					opacity: interpolate((frame + i * 20) % 120, [0, 60, 120], [0, 0.3, 0]),
				}} />
			))}
		</>
	)
}

/* ───────────────── Main ───────────────── */
export const PhoneMenuVideo: React.FC = () => {
	const frame = useCurrentFrame()
	const { fps } = useVideoConfig()

	// Timing (720 frames @ 30fps = 24s)
	const t1 = 90  // 0-90: logo reveal (3s)
	const t2 = 450 // 90-450: phone demo (12s, 4 categories × 3s)
	const t3 = 570 // 450-570: stats (4s)
	const t4 = 690 // 570-690: final CTA (4s)
	const total = 720

	const globalOut = interpolate(frame, [total - 20, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })

	return (
		<AbsoluteFill style={{ background: "#070708", fontFamily: "system-ui, -apple-system, sans-serif" }}>
			<div style={{
				position: "absolute", inset: 0,
				background: `radial-gradient(ellipse at 50% 0%, oklch(0.15 0.01 45 / 0.08) 0%, transparent 60%)`,
			}} />
			<Particles frame={frame} />

			<Sequence from={0} durationInFrames={t1}>
				<Scene1_Logo frame={frame} fps={fps} />
			</Sequence>

			<Sequence from={t1} durationInFrames={t2 - t1}>
				{(() => {
					const sf = frame - t1
					const perCat = 90
					const ci = Math.min(Math.floor(sf / perCat), CATEGORIES.length - 1)
					const cp = Math.min(((sf % perCat) / perCat) * 1.5, 1)
					return <Scene2_Phone frame={sf} fps={fps} catIndex={ci} catProg={cp} />
				})()}
			</Sequence>

			<Sequence from={t2} durationInFrames={t3 - t2}>
				<Scene3_Stats frame={frame - t2} fps={fps} />
			</Sequence>

			<Sequence from={t3} durationInFrames={t4 - t3}>
				<Scene4_CTA frame={frame - t3} fps={fps} />
			</Sequence>

			<div style={{ position: "absolute", inset: 0, opacity: globalOut, background: "#070708" }} />
		</AbsoluteFill>
	)
}
