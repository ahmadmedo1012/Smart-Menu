import { interpolate, AbsoluteFill, Easing, useCurrentFrame, Sequence } from "remotion"
import { loadFont } from "@remotion/google-fonts/Outfit"
import { Audio } from "@remotion/media"
import { Lottie } from "@remotion/lottie"
import foodIcon from "../food-icon.json"

const { fontFamily } = loadFont("normal", { weights: ["300", "400", "600", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const TXT_MUTED = "rgba(255,255,255,0.4)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

export const Scene1_Brand: React.FC = () => {
	const f = useCurrentFrame()
	const op = interpolate(f, [0, 15], [0.8, 1], { extrapolateRight: "clamp" })
	const logoScale = interpolate(f, [0, 25], [0.85, 1], { extrapolateRight: "clamp", easing: EZ })
	const subOp = interpolate(f, [20, 40], [0, 1], { extrapolateRight: "clamp" })
	const subY = interpolate(f, [20, 40], [16, 0], { extrapolateRight: "clamp", easing: EZ })
	const lineW = interpolate(f, [35, 55], [0, 1], { extrapolateRight: "clamp", easing: EZ })
	const bottomOp = interpolate(f, [50, 70], [0, 0.6], { extrapolateRight: "clamp" })
	const fadeOut = interpolate(f, [130, 150], [0, 1], { extrapolateLeft: "clamp" })

	return (
		<AbsoluteFill style={{ background: "#050505", fontFamily }}>
			{/* Vignette */}
			<div style={{
				position: "absolute", inset: 0,
				background: "radial-gradient(ellipse at 50% 42%, oklch(0.17 0.025 45 / 0.5), #050505 70%)",
			}} />
			{/* Particles */}
			{Array.from({length: 20}).map((_, i) => {
				const seed = i * 31
				return (
					<div key={i} style={{
						position: "absolute", width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2,
						borderRadius: "50%", background: i % 4 === 0 ? O : "rgba(255,255,255,0.3)",
						left: `${5 + ((seed * 13) % 90)}%`, top: `${5 + ((seed * 7) % 90)}%`,
						opacity: interpolate((f + seed * 2) % 160, [0, 80, 160], [0, 0.35, 0]),
						transform: `translateY(${interpolate((f + seed) % 200, [0, 200], [0, 25 - (seed % 50)])}px)`,
						filter: i % 3 === 0 ? "blur(1px)" : "none",
					}} />
				)
			})}
			{/* Center glow */}
			<div style={{
				position: "absolute", width: 500, height: 500, borderRadius: "50%",
				background: `radial-gradient(circle, ${O}33, transparent 70%)`,
				filter: "blur(60px)", top: "50%", left: "50%", translate: "-50% -55%",
				opacity: interpolate(f, [0, 40], [0.3, 0.7], { extrapolateRight: "clamp" }),
			}} />
			{/* Content */}
			<div style={{
				position: "absolute", inset: 0, display: "flex", flexDirection: "column",
				alignItems: "center", justifyContent: "center", opacity: op * (1 - fadeOut),
			}}>
				{/* Lottie animation above logo */}
				<Sequence from={0} durationInFrames={150}>
					<div style={{
						position: "absolute", top: "30%", left: "50%", translate: "-50% 0",
						width: 120, height: 120, opacity: interpolate(f, [0, 20], [0, 0.5]),
					}}>
						<Lottie
							animationData={foodIcon}
							loop
						/>
					</div>
				</Sequence>

				<div style={{
					width: 88, height: 88, borderRadius: 22,
					background: `linear-gradient(145deg, ${O}, #fb923c)`,
					display: "flex", alignItems: "center", justifyContent: "center",
					marginBottom: 20, scale: String(logoScale),
					boxShadow: `0 0 70px ${O}44, 0 0 140px ${O}22`,
				}}>
					<svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
						<path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" /><circle cx="12" cy="12" r="8" /><path d="M8 12l2 2 4-4" />
					</svg>
				</div>
				<div style={{ fontSize: 64, fontWeight: 800, color: TXT, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 4 }}>
					Smart Menu
				</div>
				<div style={{
					fontSize: 15, fontWeight: 400, color: TXT_MUTED,
					opacity: subOp, transform: `translateY(${subY}px)`, letterSpacing: "0.35em",
				}}>
					منيو رقمي احترافي
				</div>
				<div style={{
					width: `${lineW * 50}px`, height: 3, borderRadius: 2, background: O,
					marginTop: 18, boxShadow: `0 0 20px ${O}66`,
				}} />
				<div style={{
					position: "absolute", bottom: 80, fontSize: 11, color: TXT_MUTED,
					textAlign: "center", letterSpacing: "0.2em", opacity: bottomOp,
				}}>
					حلول رقمية للمطاعم
				</div>
			</div>
			<Sequence from={25}>
				<Audio src="https://remotion.media/whoosh.wav" volume={0.35} />
			</Sequence>
		</AbsoluteFill>
	)
}
