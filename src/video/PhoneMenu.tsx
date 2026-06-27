import { useCurrentFrame, interpolate, Easing, AbsoluteFill } from "remotion"

export const PhoneMenuVideo: React.FC = () => {
	const f = useCurrentFrame()
	// Simple scene: logo fade-in, orange theme
	const op = interpolate(f, [0, 30], [0, 1], { extrapolateRight: "clamp" })
	const tx = interpolate(f, [0, 30], [20, 0], { extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) })
	const sc = interpolate(f, [0, 40], [0.6, 1], { extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) })

	return (
		<div style={{ background: "#070708", width: 390, height: 844, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", direction: "rtl", position: "relative" }}>
			{/* Glow */}
			<div style={{ position: "absolute", width: "80%", height: "40%", borderRadius: "50%", background: "radial-gradient(ellipse, oklch(0.68 0.19 45 / 0.1), transparent 70%)", filter: "blur(50px)", top: "30%" }} />

			{/* Brand icon */}
			<div style={{ opacity: op, transform: `translateY(${tx}px) scale(${sc})`, display: "flex", flexDirection: "column", alignItems: "center" }}>
				<div style={{ width: 56, height: 56, borderRadius: 12, background: "linear-gradient(135deg, #f66d0f, #ff8833)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
					<svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
						<path d="M3 12h2M21 12h-2M12 3v2M12 21v-2" strokeLinecap="round" />
						<circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
					</svg>
				</div>
				<div style={{ fontSize: 38, fontWeight: 700, color: "oklch(0.93 0.005 0)", marginBottom: 4 }}>Smart Menu</div>
				<div style={{ fontSize: 14, color: "oklch(0.5 0.01 0)" }}>منيو رقمي احترافي</div>
			</div>
		</div>
	)
}
