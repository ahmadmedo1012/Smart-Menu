import { interpolate, AbsoluteFill, Easing, useCurrentFrame } from "remotion"
import { loadFont } from "@remotion/google-fonts/Outfit"
import { Audio } from "@remotion/media"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const TXT_MUTED = "rgba(255,255,255,0.45)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

const FINAL_IMG = "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1080&h=1920&fit=crop"

export const Scene3_CTA: React.FC = () => {
	const f = useCurrentFrame()
	const imgScale = interpolate(f, [0, 120], [1.0, 1.05], { extrapolateRight: "clamp" })
	const contentOp = interpolate(f, [0, 20], [0, 1], { extrapolateRight: "clamp" })
	const contentScale = interpolate(f, [0, 20], [0.85, 1], { extrapolateRight: "clamp", easing: EZ })
	const badgeOp = interpolate(f, [5, 20], [0, 1], { extrapolateRight: "clamp" })
	const subOp = interpolate(f, [30, 50], [0, 1], { extrapolateRight: "clamp" })
	const chipOp = interpolate(f, [35, 55], [0, 1], { extrapolateRight: "clamp" })
	const fadeOut = interpolate(f, [105, 120], [0, 1], { extrapolateLeft: "clamp" })
	const orbS = 1 + 0.2 * Math.sin(f * 0.035)
	const btnPulse = interpolate(f % 25, [0, 12, 25], [1, 1.04, 1])

	return (
		<AbsoluteFill style={{ background: "#000", fontFamily }}>
			<div style={{
				position: "absolute", inset: 0,
				background: `url(${FINAL_IMG}) center/cover`,
				transform: `scale(${imgScale})`,
				filter: "brightness(0.7) contrast(1.1)",
			}} />
			<div style={{
				position: "absolute", inset: 0,
				background: "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.2) 100%)",
			}} />
			<div style={{
				position: "absolute", bottom: "30%", left: "50%", transform: "translateX(-50%)",
				width: 400, height: 400, borderRadius: "50%",
				background: `radial-gradient(circle, ${O}33, transparent 70%)`,
				filter: "blur(60px)", scale: String(orbS),
			}} />
			<div style={{
				position: "absolute", inset: 0, display: "flex", flexDirection: "column",
				alignItems: "center", justifyContent: "flex-end",
				paddingBottom: 140,
				opacity: contentOp * (1 - fadeOut), transform: `scale(${contentScale})`,
			}}>
				<div style={{
					padding: "5px 18px", borderRadius: 20, background: `${O}22`,
					border: `1px solid ${O}44`, fontSize: 11, fontWeight: 600,
					color: O, letterSpacing: "0.15em", marginBottom: 12, opacity: badgeOp,
				}}>انطلق الآن</div>
				<div style={{ fontSize: 42, fontWeight: 700, color: TXT, lineHeight: 1.15, letterSpacing: "-0.02em", textAlign: "center", maxWidth: 380 }}>
					جهّز مطعمك للانطلاق <span style={{ color: O }}>الرقمي</span>
				</div>
				<div style={{ width: 40, height: 3, borderRadius: 2, background: O, margin: "14px auto", boxShadow: `0 0 10px ${O}55` }} />
				<div style={{
					padding: "13px 44px", borderRadius: 50, background: `linear-gradient(145deg, ${O}, #fb923c)`,
					scale: String(btnPulse), boxShadow: `0 0 40px ${O}44`,
				}}>
					<span style={{ fontSize: 16, fontWeight: 700, color: "white" }}>ابدأ مجاناً</span>
				</div>
				<div style={{ fontSize: 12, color: TXT_MUTED, opacity: subOp, marginTop: 8 }}>
					مجاناً • بدون بطاقة • دعم فني متكامل
				</div>
				<div style={{ display: "flex", gap: 8, marginTop: 14, opacity: chipOp }}>
					{["QR سريع", "تقارير", "دعم 24/7"].map((t, i) => (
						<div key={i} style={{ padding: "4px 12px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: TXT_MUTED }}>{t}</div>
					))}
				</div>
			</div>
			<Audio src="https://remotion.media/ding.wav" volume={0.18} />
		</AbsoluteFill>
	)
}
