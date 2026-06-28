import { interpolate, AbsoluteFill, Easing, Sequence } from "remotion"
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans"
import { Audio } from "@remotion/media"

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const MUT = "rgba(255,255,255,0.45)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

/* ─── Ambient particles floating ─── */
function Particles({ f }: { f: number }) {
	return (
		<>
			{[...Array(12)].map((_, i) => {
				const seed = i * 37
				const x = 10 + ((seed * 13) % 80)
				const y = 15 + ((seed * 7) % 70)
				const drift = interpolate((f + seed) % 180, [0, 180], [0, 20 - (seed % 40)])
				return (
					<div
						key={i}
						style={{
							position: "absolute", width: 2, height: 2, borderRadius: "50%",
							background: O,
							left: `${x}%`, top: `${y}%`,
							opacity: interpolate((f + seed * 2) % 150, [0, 75, 150], [0, 0.3, 0]),
							transform: `translateY(${drift}px)`,
						}}
					/>
				)
			})}
		</>
	)
}

/* ─── Glow orb ─── */
function GlowOrb({ f, delay = 0 }: { f: number; delay?: number }) {
	const gf = Math.max(0, f - delay)
	const gO = interpolate(gf, [20, 50], [0, 0.6], { extrapolateRight: "clamp", easing: EZ })
	const gB = interpolate(gf, [30, 60], [30, 80], { extrapolateRight: "clamp" })
	return (
		<div
			style={{
				position: "absolute", width: 320, height: 320, borderRadius: "50%",
				background: `radial-gradient(circle, ${O}55, transparent 70%)`,
				filter: `blur(${gB}px)`, opacity: gO,
				top: "50%", left: "50%", translate: "-50% -50%",
			}}
		/>
	)
}

export const Scene1_Brand: React.FC<{ frame: number }> = ({ frame: f }) => {
	const { durationInFrames } = { durationInFrames: 150 }

	const op = interpolate(f, [0, 20], [0, 1], { extrapolateRight: "clamp" })
	const scale = interpolate(f, [0, 30], [0.6, 1], { extrapolateRight: "clamp", easing: EZ })
	const tagOp = interpolate(f, [40, 60], [0, 1], { extrapolateRight: "clamp" })
	const tagY = interpolate(f, [40, 60], [12, 0], { extrapolateRight: "clamp", easing: EZ })
	const lineS = interpolate(f, [65, 80], [0, 1], { extrapolateRight: "clamp", easing: EZ })
	const fadeOut = interpolate(f, [durationInFrames - 20, durationInFrames], [0, 1], { extrapolateLeft: "clamp" })

	return (
		<AbsoluteFill style={{ background: "#070708" }}>
			{/* Dark gradient overlay */}
			<div style={{
				position: "absolute", inset: 0,
				background: "radial-gradient(ellipse at 50% 40%, oklch(0.18 0.02 45 / 0.3), transparent 70%)",
			}} />

			<Particles f={f} />
			<GlowOrb f={f} delay={15} />

			{/* Logo mark */}
			<div style={{
				position: "absolute", inset: 0,
				display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
				opacity: op * (1 - fadeOut),
			}}>
				<div style={{
					width: 80, height: 80, borderRadius: 20,
					background: `linear-gradient(135deg, ${O}, #fb923c)`,
					display: "flex", alignItems: "center", justifyContent: "center",
					marginBottom: 16,
					scale: String(scale),
					boxShadow: `0 0 60px ${O}44, 0 0 120px ${O}22`,
				}}>
					<svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
						<path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" />
						<circle cx="12" cy="12" r="8" strokeDasharray="0 0" />
						<path d="M8 12l2 2 4-4" />
					</svg>
				</div>

				<div style={{ fontFamily, fontSize: 56, fontWeight: 800, color: TXT, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
					Smart Menu
				</div>

				<div style={{
					fontFamily, fontSize: 16, fontWeight: 400, color: MUT,
					opacity: tagOp, transform: `translateY(${tagY}px)`,
					letterSpacing: "0.3em",
				}}>
					منيو رقمي احترافي
				</div>

				<div style={{
					width: 60, height: 3, borderRadius: 2, background: O, marginTop: 16,
					scale: String(lineS),
					boxShadow: `0 0 20px ${O}66`,
				}} />
			</div>

			{/* Bottom text */}
			<div style={{
				position: "absolute", bottom: 60, left: 0, right: 0,
				textAlign: "center", opacity: tagOp * (1 - fadeOut),
			}}>
				<div style={{ fontFamily, fontSize: 11, color: MUT, letterSpacing: "0.2em" }}>
					حلول رقمية للمطاعم
				</div>
			</div>

			<Sequence from={30}>
				<Audio src="https://remotion.media/whoosh.wav" volume={0.4} />
			</Sequence>
		</AbsoluteFill>
	)
}
