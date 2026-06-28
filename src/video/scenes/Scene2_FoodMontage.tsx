import { interpolate, AbsoluteFill, Easing, useCurrentFrame, Img } from "remotion"
import { loadFont } from "@remotion/google-fonts/Outfit"
import { Audio } from "@remotion/media"

const { fontFamily } = loadFont("normal", { weights: ["300", "400", "600", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

const DISHES = [
	{ img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1080&h=1920&fit=crop", name: "مارغريتا", price: "24 د.ل" },
	{ img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1080&h=1920&fit=crop", name: "ستيك مشوي", price: "35 د.ل" },
	{ img: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1080&h=1920&fit=crop", name: "بان كيك", price: "14 د.ل" },
	{ img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1080&h=1920&fit=crop", name: "سلطة طازجة", price: "10 د.ل" },
	{ img: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=1080&h=1920&fit=crop", name: "حلويات", price: "16 د.ل" },
]

function DishCard({ img, name, price, frame, segDuration }: { img: string; name: string; price: string; frame: number; segDuration: number }) {
	const imgScale = interpolate(frame, [0, segDuration], [1.0, 1.08], { extrapolateRight: "clamp" })
	const textOp = interpolate(frame, [8, 25], [0, 1], { extrapolateRight: "clamp", easing: EZ })
	const textY = interpolate(frame, [8, 25], [20, 0], { extrapolateRight: "clamp", easing: EZ })
	const priceOp = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp", easing: EZ })
	const fadeOut = interpolate(frame, [segDuration - 15, segDuration], [0, 1], { extrapolateLeft: "clamp" })

	return (
		<div style={{ position: "absolute", inset: 0, opacity: 1 - fadeOut }}>
			<Img src={img} style={{
				width: "100%", height: "100%", objectFit: "cover",
				transform: `scale(${imgScale})`,
				filter: "brightness(0.8) contrast(1.1)",
			}} />
			<div style={{
				position: "absolute", inset: 0,
				background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 40%, transparent 60%)",
			}} />
			<div style={{
				position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
				background: `linear-gradient(0deg, ${O}11, transparent)`,
			}} />
			<div style={{
				position: "absolute", bottom: 100, left: 30,
				opacity: textOp, transform: `translateY(${textY}px)`,
			}}>
				<div style={{ fontFamily, fontSize: 32, fontWeight: 600, color: TXT, lineHeight: 1.2 }}>{name}</div>
				<div style={{ fontFamily, fontSize: 20, fontWeight: 600, color: O, opacity: priceOp, marginTop: 4 }}>{price}</div>
			</div>
		</div>
	)
}

function Sparkles({ f }: { f: number }) {
	return (
		<div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
			{Array.from({length: 8}).map((_, i) => {
				const seed = i * 47
				return (
					<div key={i} style={{
						position: "absolute", width: 4, height: 4, borderRadius: "50%",
						background: "#fff", opacity: interpolate((f + seed) % 100, [0, 50, 100], [0, 0.5, 0]),
						filter: "blur(1px)",
						left: `${10 + ((seed * 19) % 80)}%`, top: `${15 + ((seed * 11) % 65)}%`,
					}} />
				)
			})}
		</div>
	)
}

export const Scene2_FoodMontage: React.FC = () => {
	const f = useCurrentFrame()
	const segDuration = 60
	const activeIdx = Math.min(Math.floor(f / segDuration), DISHES.length - 1)
	const localF = f - activeIdx * segDuration

	return (
		<AbsoluteFill style={{ background: "#000" }}>
			{DISHES.map((dish, i) => (
				<div key={i} style={{ position: "absolute", inset: 0, opacity: i === activeIdx ? 1 : 0 }}>
					<DishCard {...dish} frame={i === activeIdx ? localF : 999} segDuration={segDuration} />
				</div>
			))}
			<Sparkles f={f} />
			{DISHES.map((_, i) => {
				if (i === 0) return null
				const transitionFrame = f - (i * segDuration - 15)
				if (transitionFrame < 0 || transitionFrame > 15) return null
				return (
					<div key={`x-${i}`} style={{
						position: "absolute", inset: 0, background: "#000",
						opacity: interpolate(transitionFrame, [0, 15], [0, 1]),
					}} />
				)
			})}
			<Audio src="https://remotion.media/ding.wav" volume={(ff) => {
				const mod = ff % 60
				return mod < 5 ? interpolate(mod, [0, 4], [0, 0.15]) : 0
			}} />
		</AbsoluteFill>
	)
}
