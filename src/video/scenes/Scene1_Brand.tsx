import { interpolate, AbsoluteFill, Easing, useCurrentFrame, Sequence } from "remotion"
import { loadFont } from "@remotion/google-fonts/Outfit"
import { Audio } from "@remotion/media"

const { fontFamily } = loadFont("normal", { weights: ["300", "400", "600", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const TXT_MUTED = "rgba(255,255,255,0.4)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

const HERO_IMG = "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1080&h=1920&fit=crop"

export const Scene1_Brand: React.FC = () => {
	const f = useCurrentFrame()
	const imgScale = interpolate(f, [0, 120], [1.0, 1.06], { extrapolateRight: "clamp" })
	const overlayOp = interpolate(f, [0, 20], [0.6, 0.3], { extrapolateRight: "clamp" })
	const contentOp = interpolate(f, [15, 40], [0, 1], { extrapolateRight: "clamp" })
	const logoY = interpolate(f, [15, 40], [20, 0], { extrapolateRight: "clamp", easing: EZ })
	const lineS = interpolate(f, [45, 65], [0, 1], { extrapolateRight: "clamp", easing: EZ })
	const tagOp = interpolate(f, [50, 75], [0, 0.6], { extrapolateRight: "clamp" })
	const fadeOut = interpolate(f, [105, 120], [0, 1], { extrapolateLeft: "clamp" })

	return (
		<AbsoluteFill style={{ background: "#000", fontFamily }}>
			{/* Hero image */}
			<div style={{
				position: "absolute", inset: 0,
				background: `url(${HERO_IMG}) center/cover`,
				transform: `scale(${imgScale})`,
				filter: "brightness(0.85) contrast(1.05)",
			}} />

			{/* Dark overlay — deep vignette */}
			<div style={{
				position: "absolute", inset: 0,
				background: `
					linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.3) 100%)
				`,
				opacity: overlayOp,
			}} />

			{/* Warm glow from bottom */}
			<div style={{
				position: "absolute", bottom: 0, left: 0, right: 0,
				height: "50%",
				background: `linear-gradient(0deg, ${O}22, transparent)`,
			}} />

			{/* Brand content */}
			<div style={{
				position: "absolute", inset: 0,
				display: "flex", flexDirection: "column",
				alignItems: "center", justifyContent: "center",
				opacity: contentOp * (1 - fadeOut),
			}}>
				<div style={{
					width: 80, height: 80, borderRadius: 20,
					background: `linear-gradient(145deg, ${O}, #fb923c)`,
					display: "flex", alignItems: "center", justifyContent: "center",
					marginBottom: 18, transform: `translateY(${logoY}px)`,
					boxShadow: `0 0 50px ${O}44`,
				}}>
					<svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
						<path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" /><circle cx="12" cy="12" r="8" /><path d="M8 12l2 2 4-4" />
					</svg>
				</div>
				<div style={{
					fontSize: 56, fontWeight: 700, color: TXT,
					letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 4,
				}}>
					Smart Menu
				</div>
				<div style={{ width: `${lineS * 40}px`, height: 3, borderRadius: 2, background: O, marginTop: 6 }} />
				<div style={{
					fontSize: 13, fontWeight: 300, color: TXT_MUTED,
					marginTop: 10, letterSpacing: "0.3em", opacity: tagOp,
				}}>
					منيو رقمي احترافي
				</div>
			</div>

			<Sequence from={18}>
				<Audio src="https://remotion.media/whoosh.wav" volume={0.3} />
			</Sequence>
		</AbsoluteFill>
	)
}
