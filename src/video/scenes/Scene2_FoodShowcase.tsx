import { interpolate, AbsoluteFill, Easing, spring, Img, useCurrentFrame, staticFile } from "remotion"
import { loadFont } from "@remotion/google-fonts/Outfit"
import { Audio } from "@remotion/media"
import { Lottie } from "@remotion/lottie"

declare module "remotion" {
  interface LottieAnimationData {}
}

const { fontFamily } = loadFont("normal", { weights: ["300", "400", "600", "700", "800"], subsets: ["latin"] })

const O = "#f97316"
const TXT = "#ffffff"
const TXT_MUTED = "rgba(255,255,255,0.45)"
const SURF = "oklch(0.14 0.005 0)"
const EZ = Easing.bezier(0.16, 1, 0.3, 1)

const FOODS = [
  { img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=800&fit=crop", name: "Pizza Margherita", price: "24 د.ل", tag: "إيطالي" },
  { img: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=800&fit=crop", name: "Pancakes", price: "14 د.ل", tag: "فطور" },
  { img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=800&fit=crop", name: "Fresh Salad", price: "10 د.ل", tag: "صحي" },
  { img: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&h=800&fit=crop", name: "Desserts", price: "16 د.ل", tag: "حلويات" },
  { img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=800&fit=crop", name: "Grilled Steak", price: "35 د.ل", tag: "لحوم" },
  { img: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=800&fit=crop", name: "Burger", price: "18 د.ل", tag: "وجبات سريعة" },
]

export const Scene2_FoodShowcase: React.FC = () => {
  const f = useCurrentFrame()

  const titleOp = interpolate(f, [0, 18], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(f, [0, 18], [-12, 0], { extrapolateRight: "clamp", easing: EZ })
  const fadeOut = interpolate(f, [130, 150], [0, 1], { extrapolateLeft: "clamp" })

  return (
    <AbsoluteFill style={{ background: "#080808", fontFamily }}>
      {/* Top glow */}
      <div style={{
        position: "absolute", top: -120, left: "50%", translate: "-50% 0",
        width: 700, height: 450, borderRadius: "50%",
        background: `radial-gradient(ellipse, ${O}22, transparent 70%)`,
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 80, left: 0, right: 0, textAlign: "center",
        opacity: titleOp * (1 - fadeOut),
      }}>
        <div style={{ fontSize: 38, fontWeight: 700, color: TXT, letterSpacing: "-0.02em" }}>
          أشهى الأطباق
        </div>
        <div style={{ width: 36, height: 3, borderRadius: 2, background: O, margin: "10px auto" }} />
        <div style={{ fontSize: 13, color: TXT_MUTED, marginTop: 2 }}>نكهات لا تُقاوم</div>
      </div>

      {/* 3x2 Grid of food cards */}
      <div style={{
        position: "absolute", top: 240, left: 30, right: 30,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
        opacity: 1 - fadeOut,
      }}>
        {FOODS.map((food, i) => {
          const col = i % 2
          const row = Math.floor(i / 2)
          const delay = 8 + col * 4 + row * 6
          const lf = Math.max(0, f - delay)
          const cardOp = interpolate(lf, [0, 12], [0, 1], { extrapolateRight: "clamp", easing: EZ })
          const cardS = spring({ frame: lf * 2, fps: 30, config: { damping: 12, stiffness: 100 } })
          const imgS = interpolate(lf, [0, 25], [1.1, 1], { extrapolateRight: "clamp" })

          return (
            <div key={i} style={{
              borderRadius: 18, overflow: "hidden", position: "relative",
              aspectRatio: "3/4",
              opacity: cardOp, scale: String(cardS),
              transform: cardOp < 1 ? `translateY(${(1 - cardOp) * 15}px)` : "none",
              boxShadow: `0 8px 30px rgba(0,0,0,0.5)`,
            }}>
              <Img src={food.img} style={{
                width: "100%", height: "100%", objectFit: "cover",
                transform: `scale(${imgS})`,
                filter: "brightness(0.8) saturate(1.05)",
              }} />
              {/* Gradient overlay */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 50%)",
              }} />
              {/* Tag */}
              <div style={{
                position: "absolute", top: 10, right: 10,
                padding: "3px 10px", borderRadius: 20,
                background: O, fontSize: 10, fontWeight: 700, color: "white",
              }}>{food.tag}</div>
              {/* Text */}
              <div style={{
                position: "absolute", bottom: 14, left: 14, right: 14,
                display: "flex", justifyContent: "space-between", alignItems: "flex-end",
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: TXT }}>{food.name}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: O }}>{food.price}</div>
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
