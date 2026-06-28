import { interpolate, AbsoluteFill, Easing, spring } from "remotion"
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const MUT = "rgba(255,255,255,0.5)"
const SURF = "oklch(0.16 0.005 0)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

const STATS = [
	{ value: "500+", label: "مطعم", suffix: "" },
	{ value: "50K", label: "مستخدم", suffix: "+" },
	{ value: "98%", label: "رضا العملاء", suffix: "" },
	{ value: "4.9", label: "متوسط التقييم", suffix: "" },
]

function StatCard({ value, label, suffix, frame, delay }: { value: string; label: string; suffix: string; frame: number; delay: number }) {
	const lf = Math.max(0, frame - delay)
	const op = interpolate(lf, [0, 15], [0, 1], { extrapolateRight: "clamp", easing: EZ })
	const s = spring({ frame: lf * 2, fps: 30, config: { damping: 13, stiffness: 100 } })
	const y = (1 - s) * 20

	return (
		<div style={{
			background: SURF, borderRadius: 16, padding: "22px 20px",
			textAlign: "center", opacity: op, transform: `translateY(${y}px) scale(${s})`,
			border: "1px solid rgba(255,255,255,0.05)",
		}}>
			<div style={{ fontFamily, fontSize: 34, fontWeight: 800, color: O, letterSpacing: "-0.03em" }}>
				{value}{suffix}
			</div>
			<div style={{ fontFamily, fontSize: 13, color: MUT, marginTop: 4 }}>{label}</div>
		</div>
	)
}

export const Scene5_Stats: React.FC<{ frame: number }> = ({ frame: f }) => {
	const durationInFrames = 120
	const fadeOut = interpolate(f, [durationInFrames - 20, durationInFrames], [0, 1], { extrapolateLeft: "clamp" })
	const titleOp = interpolate(f, [0, 15], [0, 1], { extrapolateRight: "clamp" })
	const titleY = interpolate(f, [0, 15], [12, 0], { extrapolateRight: "clamp", easing: EZ })

	return (
		<AbsoluteFill style={{ background: "#070708" }}>
			<div style={{
				position: "absolute", width: 500, height: 500, borderRadius: "50%",
				background: `radial-gradient(ellipse, ${O}11, transparent 70%)`,
				top: "50%", left: "50%", translate: "-50% -50%",
			}} />

			<div style={{
				position: "absolute", top: 90, left: 0, right: 0, textAlign: "center",
				opacity: titleOp * (1 - fadeOut * 0.5),
			}}>
				<div style={{
					fontFamily, fontSize: 36, fontWeight: 800, color: TXT,
					letterSpacing: "-0.02em", transform: `translateY(${titleY}px)`,
				}}>
					أرقام تتحدث
				</div>
				<div style={{ width: 40, height: 3, borderRadius: 2, background: O, margin: "10px auto 0" }} />
			</div>

			<div style={{
				position: "absolute", top: "50%", left: 40, right: 40,
				translate: "0 -50%",
				display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
				opacity: 1 - fadeOut,
			}}>
				{STATS.map((stat, i) => (
					<StatCard key={i} {...stat} frame={f} delay={8 + i * 5} />
				))}
			</div>

			{/* Bottom bar chart */}
			<div style={{
				position: "absolute", bottom: 40, left: 40, right: 40, height: 60,
				display: "flex", alignItems: "flex-end", gap: 6,
				opacity: interpolate(f, [30, 50], [0, 0.3], { extrapolateRight: "clamp" }),
			}}>
				{[30, 55, 40, 70, 45, 85, 60, 75, 50, 90, 65, 80].map((h, i) => (
					<div key={i} style={{
						flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0",
						background: O,
						opacity: 0.3 + 0.3 * (h / 100),
					}} />
				))}
			</div>
		</AbsoluteFill>
	)
}
