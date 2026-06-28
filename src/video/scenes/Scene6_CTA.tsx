import { interpolate, AbsoluteFill, Easing, useCurrentFrame } from "remotion"
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans"
import { Audio } from "@remotion/media"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const MUT = "rgba(255,255,255,0.5)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

export const Scene6_CTA: React.FC = () => {
	const f = useCurrentFrame()
	const op = interpolate(f, [0, 18], [0, 1], { extrapolateRight: "clamp" })
	const scale = interpolate(f, [0, 20], [0.7, 1], { extrapolateRight: "clamp", easing: EZ })
	const subOp = interpolate(f, [20, 40], [0, 0.7], { extrapolateRight: "clamp" })
	const pulse = interpolate(f % 30, [0, 15, 30], [1, 1.05, 1])

	const orbScale = 1 + 0.3 * Math.sin(f * 0.04)
	const orbOp = 0.1 + 0.08 * Math.sin(f * 0.03)

	return (
		<AbsoluteFill style={{ background: "#070708" }}>
			{/* Big ambient orb */}
			<div style={{
				position: "absolute", width: 500, height: 500, borderRadius: "50%",
				background: `radial-gradient(circle, ${O}22, transparent 70%)`,
				top: "50%", left: "50%", translate: "-50% -50%",
				scale: String(orbScale), opacity: orbOp,
			}} />

			{/* Foreground glow */}
			<div style={{
				position: "absolute", width: 300, height: 300, borderRadius: "50%",
				background: `radial-gradient(circle, ${O}15, transparent 60%)`,
				top: "30%", left: "50%", translate: "-50% 0",
				filter: "blur(40px)",
			}} />

			<div style={{
				position: "absolute", inset: 0,
				display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
				opacity: op,
			}}>
				{/* Badge */}
				<div style={{
					padding: "6px 18px", borderRadius: 20,
					background: `${O}22`, border: `1px solid ${O}44`,
					fontFamily, fontSize: 12, fontWeight: 600, color: O,
					letterSpacing: "0.15em",
				}}>
					انطلق الآن
				</div>

				{/* Main text */}
				<div style={{ textAlign: "center", transform: `scale(${scale})` }}>
					<div style={{
						fontFamily, fontSize: 44, fontWeight: 800, color: TXT,
						lineHeight: 1.15, letterSpacing: "-0.03em",
					}}>
						جهّز مطعمك
					</div>
					<div style={{
						fontFamily, fontSize: 44, fontWeight: 800, color: TXT,
						lineHeight: 1.15, letterSpacing: "-0.03em",
						marginBottom: 6,
					}}>
						للانطلاق <span style={{ color: O }}>الرقمي</span>
					</div>
					<div style={{
						width: 50, height: 3, borderRadius: 2, background: O,
						margin: "12px auto 0",
					}} />
				</div>

				{/* CTA Button */}
				<div style={{
					marginTop: 8,
					padding: "14px 36px", borderRadius: 50,
					background: `linear-gradient(135deg, ${O}, #fb923c)`,
					scale: String(pulse),
					boxShadow: `0 0 40px ${O}44, 0 4px 20px rgba(0,0,0,0.3)`,
				}}>
					<span style={{ fontFamily, fontSize: 16, fontWeight: 700, color: "white" }}>
						ابدأ مجاناً
					</span>
				</div>

				{/* Sub text */}
				<div style={{
					fontFamily, fontSize: 12, color: MUT, opacity: subOp,
					letterSpacing: "0.05em",
				}}>
					مجاناً • بدون بطاقة • دعم فني متكامل
				</div>

				{/* Bottom info */}
				<div style={{
					display: "flex", gap: 16, marginTop: 8,
					opacity: interpolate(f, [30, 50], [0, 1], { extrapolateRight: "clamp" }),
				}}>
					{["QR سريع", "تقارير", "دعم 24/7"].map((t, i) => (
						<div key={i} style={{
							padding: "4px 12px", borderRadius: 12,
							background: "oklch(0.16 0.005 0)",
							border: "1px solid rgba(255,255,255,0.06)",
							fontFamily, fontSize: 10, color: MUT,
						}}>{t}</div>
					))}
				</div>
			</div>

			{/* Audio */}
			<Audio src="https://remotion.media/ding.wav" volume={0.2} />
		</AbsoluteFill>
	)
}
