import { interpolate, AbsoluteFill, Easing, spring, Img } from "remotion"
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans"
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay"
import { Audio } from "@remotion/media"

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] })
const { fontFamily: serif } = loadPlayfair("normal", { weights: ["600", "700"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const MUT = "rgba(255,255,255,0.5)"
const SURF = "oklch(0.16 0.005 0)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

/* ─── Food items ─── */
const FOODS = [
	{
		img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=800&fit=crop",
		name: "Italian Pizza",
		price: "24 د.ل",
		tag: "مشاوي",
	},
	{
		img: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=800&fit=crop",
		name: "Pancakes",
		price: "14 د.ل",
		tag: "فطور",
	},
	{
		img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=800&fit=crop",
		name: "Fresh Salad",
		price: "10 د.ل",
		tag: "صحي",
	},
	{
		img: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&h=800&fit=crop",
		name: "Desserts",
		price: "16 د.ل",
		tag: "حلويات",
	},
	{
		img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=800&fit=crop",
		name: "Grilled Steak",
		price: "35 د.ل",
		tag: "لحوم",
	},
	{
		img: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=800&fit=crop",
		name: "Burger King",
		price: "18 د.ل",
		tag: "وجبات سريعة",
	},
]

/* ─── Image card component ─── */
function FoodCard({
	img,
	name,
	price,
	tag,
	frame,
	delay,
}: {
	img: string
	name: string
	price: string
	tag: string
	frame: number
	delay: number
}) {
	const lf = Math.max(0, frame - delay)
	const op = interpolate(lf, [0, 15], [0, 1], { extrapolateRight: "clamp", easing: EZ })
	const s = spring({ frame: lf * 1.5, fps: 30, config: { damping: 14, stiffness: 90 } })
	const y = interpolate(s, [0, 1], [40, 0])
	const imgScale = interpolate(lf, [0, 30], [1.15, 1], { extrapolateRight: "clamp" })
	const shimmer = interpolate(lf, [0, 60], [-100, 100], { extrapolateRight: "clamp" })

	return (
		<div
			style={{
				width: 280, height: 360, borderRadius: 24, overflow: "hidden", position: "relative",
				background: SURF, opacity: op, transform: `translateY(${y}px)`,
				boxShadow: `0 12px 50px rgba(0,0,0,0.4)`,
				flexShrink: 0,
			}}
		>
			<Img
				src={img}
				style={{
					width: "100%", height: "100%", objectFit: "cover",
					transform: `scale(${imgScale})`,
					filter: "brightness(0.85)",
				}}
			/>
			{/* Gradient overlay */}
			<div style={{
				position: "absolute", inset: 0,
				background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 50%)",
			}} />
			{/* Shimmer */}
			<div style={{
				position: "absolute", inset: 0,
				background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)`,
				transform: `translateX(${shimmer}%)`,
			}} />
			{/* Tag */}
			<div style={{
				position: "absolute", top: 14, right: 14,
				padding: "4px 12px", borderRadius: 20,
				background: O,
				fontFamily, fontSize: 11, fontWeight: 700, color: "white",
			}}>
				{tag}
			</div>
			{/* Info */}
			<div style={{
				position: "absolute", bottom: 18, left: 18, right: 18,
				display: "flex", justifyContent: "space-between", alignItems: "flex-end",
			}}>
				<div>
					<div style={{ fontFamily, fontSize: 20, fontWeight: 700, color: TXT }}>{name}</div>
					<div style={{ fontFamily, fontSize: 13, color: MUT, marginTop: 2 }}>{tag}</div>
				</div>
				<div style={{
					fontFamily: serif, fontSize: 22, fontWeight: 700, color: O,
					textShadow: "0 2px 10px rgba(0,0,0,0.3)",
				}}>
					{price}
				</div>
			</div>
		</div>
	)
}

export const Scene2_FoodShowcase: React.FC<{ frame: number }> = ({ frame: f }) => {
	const durationInFrames = 150
	const fadeOut = interpolate(f, [durationInFrames - 20, durationInFrames], [0, 1], { extrapolateLeft: "clamp" })

	/* ─── Horizontal scroll animation ─── */
	const scrollX = interpolate(f, [0, 120], [0, -(FOODS.length * 310 - 400)], {
		extrapolateRight: "clamp",
		easing: Easing.bezier(0.25, 0, 0.15, 1),
	})

	/* ─── Title ─── */
	const titleOp = interpolate(f, [0, 20], [0, 1], { extrapolateRight: "clamp" })
	const titleY = interpolate(f, [0, 20], [15, 0], { extrapolateRight: "clamp", easing: EZ })
	const subOp = interpolate(f, [15, 30], [0, 1], { extrapolateRight: "clamp" })

	return (
		<AbsoluteFill style={{ background: "#070708" }}>
			{/* Gradient glow top */}
			<div style={{
				position: "absolute", top: -100, left: "50%", translate: "-50% 0",
				width: 600, height: 400, borderRadius: "50%",
				background: `radial-gradient(ellipse, ${O}22, transparent 70%)`,
			}} />

			{/* Title */}
			<div style={{
				position: "absolute", top: 100, left: 0, right: 0, textAlign: "center",
				opacity: titleOp * (1 - fadeOut * 0.5),
			}}>
				<div style={{
					fontFamily, fontSize: 13, fontWeight: 600, color: O,
					letterSpacing: "0.25em", marginBottom: 6,
				}}>
					مختاراتنا
				</div>
				<div style={{
					fontFamily, fontSize: 38, fontWeight: 800, color: TXT,
					letterSpacing: "-0.02em",
					transform: `translateY(${titleY}px)`,
				}}>
					أشهى الأطباق
				</div>
				<div style={{
					width: 40, height: 3, borderRadius: 2, background: O,
					margin: "10px auto 0",
				}} />
				<div style={{
					fontFamily, fontSize: 14, color: MUT, marginTop: 8,
					opacity: subOp,
				}}>
					مأكولات طازجة • نكهات لا تُقاوم
				</div>
			</div>

			{/* Scrolling food cards */}
			<div style={{
				position: "absolute", top: 520, left: 40,
				display: "flex", gap: 30,
				transform: `translateX(${scrollX}px)`,
				opacity: 1 - fadeOut * 0.5,
			}}>
				{FOODS.map((food, i) => (
					<FoodCard key={i} {...food} frame={f} delay={5 + i * 3} />
				))}
			</div>

			{/* Audio */}
			<Audio src="https://remotion.media/whoosh.wav" volume={(ff) => ff < 5 ? interpolate(ff, [0, 4], [0, 0.3]) : 0} />
		</AbsoluteFill>
	)
}
