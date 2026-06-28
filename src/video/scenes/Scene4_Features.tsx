import { interpolate, AbsoluteFill, Easing, spring } from "remotion"
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans"
import { Audio } from "@remotion/media"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const MUT = "rgba(255,255,255,0.5)"
const SURF = "oklch(0.16 0.005 0)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

const FEATURES = [
	{ icon: "📱", title: "منيو رقمي", desc: "تصفح المنيو بلمسة" },
	{ icon: "💳", title: "دفع إلكتروني", desc: "آمن وسريع" },
	{ icon: "📊", title: "تقارير ذكية", desc: "تحليل مبيعاتك" },
	{ icon: "🔔", title: "إشعارات فورية", desc: "طلبات لحظية" },
	{ icon: "⭐", title: "تقييمات", desc: "آراء العملاء" },
	{ icon: "🎯", title: "عروض مخصصة", desc: "خصومات ذكية" },
]

function FeatureCard({ icon, title, desc, frame, delay }: { icon: string; title: string; desc: string; frame: number; delay: number }) {
	const lf = Math.max(0, frame - delay)
	const op = interpolate(lf, [0, 15], [0, 1], { extrapolateRight: "clamp", easing: EZ })
	const s = spring({ frame: lf * 2, fps: 30, config: { damping: 13, stiffness: 100 } })
	const y = (1 - s) * 20
	return (
		<div style={{
			display: "flex", alignItems: "center", gap: 14,
			padding: "16px 18px", borderRadius: 16,
			background: SURF,
			border: "1px solid rgba(255,255,255,0.05)",
			opacity: op, transform: `translateY(${y}px) scale(${s})`,
		}}>
			<div style={{ fontSize: 24, width: 40, textAlign: "center" }}>{icon}</div>
			<div>
				<div style={{ fontFamily, fontSize: 15, fontWeight: 700, color: TXT }}>{title}</div>
				<div style={{ fontFamily, fontSize: 12, color: MUT }}>{desc}</div>
			</div>
		</div>
	)
}

export const Scene4_Features: React.FC<{ frame: number }> = ({ frame: f }) => {
	const durationInFrames = 150
	const fadeOut = interpolate(f, [durationInFrames - 20, durationInFrames], [0, 1], { extrapolateLeft: "clamp" })

	const titleOp = interpolate(f, [0, 15], [0, 1], { extrapolateRight: "clamp" })
	const titleY = interpolate(f, [0, 15], [12, 0], { extrapolateRight: "clamp", easing: EZ })

	return (
		<AbsoluteFill style={{ background: "#070708" }}>
			{/* Ambient glow */}
			<div style={{
				position: "absolute", width: 500, height: 500, borderRadius: "50%",
				background: `radial-gradient(ellipse, ${O}11, transparent 70%)`,
				top: "30%", left: "50%", translate: "-50% 0",
			}} />

			{/* Title */}
			<div style={{
				position: "absolute", top: 90, left: 0, right: 0, textAlign: "center",
				opacity: titleOp * (1 - fadeOut * 0.5),
			}}>
				<div style={{
					fontFamily, fontSize: 13, fontWeight: 600, color: O,
					letterSpacing: "0.25em", marginBottom: 6,
				}}>
					Smart Menu
				</div>
				<div style={{
					fontFamily, fontSize: 36, fontWeight: 800, color: TXT,
					letterSpacing: "-0.02em",
					transform: `translateY(${titleY}px)`,
				}}>
					مميزات المنصة
				</div>
				<div style={{ width: 40, height: 3, borderRadius: 2, background: O, margin: "10px auto 0" }} />
			</div>

			{/* Feature grid */}
			<div style={{
				position: "absolute", top: 380, left: 40, right: 40,
				display: "flex", flexDirection: "column", gap: 10,
				opacity: 1 - fadeOut * 0.5,
			}}>
				{FEATURES.map((feat, i) => (
					<FeatureCard key={i} {...feat} frame={f} delay={8 + i * 4} />
				))}
			</div>

			{/* Chips */}
			<div style={{
				position: "absolute", bottom: 50, left: 0, right: 0,
				display: "flex", justifyContent: "center", gap: 6,
				opacity: interpolate(f, [40, 60], [0, 1], { extrapolateRight: "clamp" }),
			}}>
				{["سهل", "سريع", "آمن", "حديث"].map((t, i) => (
					<div key={i} style={{
						padding: "6px 16px", borderRadius: 20,
						background: SURF, border: "1px solid rgba(255,255,255,0.06)",
						fontFamily, fontSize: 12, color: MUT,
					}}>{t}</div>
				))}
			</div>

			<Audio src="https://remotion.media/ding.wav" volume={0.15} />
		</AbsoluteFill>
	)
}
