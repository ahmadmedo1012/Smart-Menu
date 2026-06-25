import { AbsoluteFill, useCurrentFrame, interpolate, Easing, Sequence, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/NotoSansArabic";
import { loadFont as loadHeadingFont } from "@remotion/google-fonts/ReadexPro";

const { fontFamily: bodyFont } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["arabic"],
});
const { fontFamily: headingFont } = loadHeadingFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["arabic"],
});

// ── Config ──
const FPS = 30;
const BG = "#0b0b0e";
const SURFACE = "oklch(0.15 0.03 264 / 0.6)";
const BLUE = "oklch(0.52 0.14 264)";
const BLUE_DIM = "oklch(0.43 0.18 262)";
const WHITE = "oklch(0.95 0.01 260)";
const MUTED = "oklch(0.55 0.035 262)";
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_SPRING: Parameters<typeof spring>[1] = { damping: 14, mass: 0.8, stiffness: 100 };

interface FrameProps {
  frame: number;
  fps: number;
}

// ── Shared ──
function Grain() {
  return (
    <div
      style={{
        position: "absolute", inset: 0, opacity: 0.02, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "256px 256px",
      }}
    />
  );
}

function Glow({ color = BLUE, size = "60%" }: { color?: string; size?: string }) {
  return (
    <div
      style={{
        position: "absolute", width: size, height: "50%", left: "20%", top: "25%",
        borderRadius: "50%",
        background: `radial-gradient(ellipse at center, ${color}22 0%, transparent 65%)`,
      }}
    />
  );
}

function Dot() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8">
      <circle cx="4" cy="4" r="3" fill="#22c55e" />
    </svg>
  );
}

// ── Scene 1: Restaurant Landing Card ──
function Scene1({ frame, fps }: FrameProps) {
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const slideUp = interpolate(frame, [0, 20], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const badgeScale = spring({ frame, fps, config: { damping: 12, mass: 0.6, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity, transform: `translateY(${slideUp}px)` }}>
      {/* Restaurant hero card */}
      <div style={{
        width: "72%", borderRadius: 28, overflow: "hidden",
        background: "linear-gradient(160deg, #1a1d2e 0%, #0f111a 100%)",
        border: "1px solid oklch(1 1 0 / 0.06)",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px oklch(0.52 0.14 264 / 0.08)",
      }}>
        {/* Hero image area */}
        <div style={{
          height: 280, background: "linear-gradient(135deg, oklch(0.43 0.18 262 / 0.3) 0%, oklch(0.35 0.12 266 / 0.1) 50%, #0f111a 100%)",
          display: "flex", alignItems: "flex-end", padding: "0 24px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: "linear-gradient(135deg, oklch(0.52 0.14 264), oklch(0.43 0.18 262))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: headingFont, fontSize: 22, color: WHITE, fontWeight: 700,
              boxShadow: "0 8px 20px oklch(0.43 0.18 262 / 0.3)",
            }}>م</div>
            <div>
              <div style={{ fontFamily: headingFont, fontSize: 20, color: WHITE, fontWeight: 700 }}>مطعم مذاق الشام</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <Dot />
                <span style={{ fontFamily: bodyFont, fontSize: 12, color: "#4ade80" }}>مفتوح الآن</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info row */}
        <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: bodyFont, fontSize: 11, color: MUTED }}>المأكولات الشامية الأصيلة</div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              {["مشاوي", "مقبلات", "مشروبات"].map((t) => (
                <span key={t} style={{
                  fontFamily: bodyFont, fontSize: 10, padding: "4px 10px", borderRadius: 20,
                  background: BLUE_DIM + "22", color: BLUE, border: "1px solid " + BLUE_DIM + "22",
                }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg, oklch(0.52 0.14 264), oklch(0.43 0.18 262))",
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${badgeScale})`,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Label */}
      <div style={{
        marginTop: 20, fontFamily: bodyFont, fontSize: 12, color: MUTED, textAlign: "center", letterSpacing: "0.05em",
      }}>
        استعرض • اختر • اطلب
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 2: QR Scan ──
function Scene2({ frame, fps }: FrameProps) {
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const scanY = interpolate(frame, [0, 35], [-120, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.6, 1) });
  const pulse = spring({ frame, fps, config: { damping: 8, mass: 0.5, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity }}>
      {/* QR frame */}
      <div style={{
        width: 220, height: 220, borderRadius: 32, position: "relative", overflow: "hidden",
        border: "2px solid oklch(1 1 0 / 0.1)",
        background: "#0f0f15",
        boxShadow: `0 0 60px ${BLUE}22`,
      }}>
        {/* Fake QR code */}
        <div style={{ position: "absolute", inset: 16, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1 }}>
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 2, background: Math.random() > 0.5 ? WHITE + "88" : "transparent" }} />
          ))}
        </div>

        {/* Scan line */}
        <div style={{
          position: "absolute", left: 10, right: 10, height: 3,
          background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)`,
          top: `calc(16px + ${scanY}px)`,
          boxShadow: `0 0 15px ${BLUE}`,
        }} />

        {/* Corner brackets */}
        {[
          { top: 0, left: 0, rotate: "0deg" },
          { top: 0, left: undefined, right: 0, rotate: "90deg" },
          { top: undefined, bottom: 0, left: 0, rotate: "-90deg" },
          { top: undefined, bottom: 0, left: undefined, right: 0, rotate: "180deg" },
        ].map((c, i) => (
          <div key={i} style={{
            position: "absolute", top: c.top, left: c.left, right: c.right, bottom: c.bottom,
            width: 30, height: 30,
            borderLeft: c.left !== undefined ? `3px solid ${BLUE}` : undefined,
            borderRight: c.right !== undefined ? `3px solid ${BLUE}` : undefined,
            borderTop: c.top !== undefined ? `3px solid ${BLUE}` : undefined,
            borderBottom: c.bottom !== undefined ? `3px solid ${BLUE}` : undefined,
            borderRadius: c.top === 0 && c.left === 0 ? "8px 0 0 0" :
                          c.top === 0 ? "0 8px 0 0" :
                          c.left === 0 ? "0 0 0 8px" : "0 0 8px 0",
          }} />
        ))}
      </div>

      <div style={{
        marginTop: 20, padding: "10px 24px", borderRadius: 30,
        background: BLUE_DIM + "22", border: "1px solid " + BLUE_DIM + "33",
        fontFamily: bodyFont, fontSize: 13, color: BLUE,
        transform: `scale(${0.9 + pulse * 0.1})`,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" style={{ marginLeft: 8, verticalAlign: "middle" }}>
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
        <span style={{ fontFamily: bodyFont, verticalAlign: "middle" }}>امسح رمز QR للطلب</span>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 3: Menu Browsing ──
const MENU_ITEMS = [
  { name: "شاورما دجاج", desc: "خبز صاج • ثوم • مخلل", price: "٢٥", stars: 5 },
  { name: "كباب بندورة", desc: "لحم مفروم • بندورة • بصل", price: "٣٠", stars: 4 },
  { name: "فتوش", desc: "خس • بندورة • نعناع • خبز", price: "١٥", stars: 4 },
  { name: "عصير ليمون", desc: "ليمون طازج • نعناع", price: "١٢", stars: 5 },
  { name: "حمص باللحم", desc: "حمص • لحم • صنوبر • خبز", price: "٢٢", stars: 5 },
  { name: "تبولة", desc: "برغل • بقدونس • نعناع", price: "١٤", stars: 4 },
];

function Scene3({ frame, fps }: FrameProps) {
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const scroll = interpolate(frame, [0, 40], [0, -140], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity }}>
      {/* Phone-like card */}
      <div style={{
        width: "74%", borderRadius: 28, overflow: "hidden", padding: "0 0 18px",
        background: "linear-gradient(180deg, #12121a 0%, #0d0d14 100%)",
        border: "1px solid oklch(1 1 0 / 0.05)",
        boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
      }}>
        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ fontFamily: headingFont, fontSize: 15, color: WHITE, fontWeight: 600, marginBottom: 12, textAlign: "right" }}>
            قائمة الطعام
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {["مشاوي", "مقبلات", "مشروبات", "حلويات", "سلطات"].map((c, i) => (
              <span key={c} style={{
                fontFamily: bodyFont, fontSize: 10, fontWeight: 600,
                padding: "5px 12px", borderRadius: 20,
                background: i === 0 ? BLUE_DIM : "oklch(1 1 0 / 0.06)",
                color: i === 0 ? WHITE : BLUE_DIM + "aa",
                border: i === 0 ? "none" : "1px solid oklch(1 1 0 / 0.06)",
              }}>{c}</span>
            ))}
          </div>
        </div>

        {/* Scrollable items */}
        <div style={{ maxHeight: 340, overflow: "hidden", padding: "0 20px" }}>
          <div style={{ transform: `translateY(${scroll}px)` }}>
            {MENU_ITEMS.map((item, i) => {
              const itemDelay = Math.max(0, frame - 15 - i * 4);
              const itemOpacity = interpolate(itemDelay, [0, 6], [0, 1], { extrapolateLeft: "clamp", easing: EASE });
              const itemY = interpolate(itemDelay, [0, 6], [12, 0], { extrapolateLeft: "clamp", easing: EASE });
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                  padding: "10px 12px", borderRadius: 14,
                  background: "oklch(1 1 0 / 0.03)",
                  border: "1px solid oklch(1 1 0 / 0.04)",
                  opacity: itemOpacity, transform: `translateY(${itemY}px)`,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, shrink: 0,
                    background: `linear-gradient(135deg, ${BLUE_DIM}55, ${BLUE_DIM}22)`,
                    border: "1px solid " + BLUE_DIM + "22",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: bodyFont, fontSize: 11, color: WHITE, fontWeight: 600 }}>{item.name}</span>
                      <span style={{ fontFamily: bodyFont, fontSize: 10, color: BLUE, fontWeight: 600 }}>{item.price} د.ل</span>
                    </div>
                    <div style={{ fontFamily: bodyFont, fontSize: 9, color: MUTED, marginTop: 2 }}>{item.desc}</div>
                    <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                      {Array.from({ length: 5 }).map((_, si) => (
                        <svg key={si} width="8" height="8" viewBox="0 0 24 24" fill={si < item.stars ? "#f59e0b" : "oklch(1 1 0 / 0.1)"}>
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 4: Category Switch ──
function Scene4({ frame, fps }: FrameProps) {
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const slideFrom = interpolate(frame, [0, 20], [60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const activeTab = frame > 18 ? 1 : 0;

  const categories = ["مشاوي", "مقبلات"];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity }}>
      <div style={{
        width: "74%", borderRadius: 28, overflow: "hidden", padding: "24px 20px",
        background: "linear-gradient(180deg, #12121a 0%, #0d0d14 100%)",
        border: "1px solid oklch(1 1 0 / 0.05)",
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "oklch(1 1 0 / 0.04)", borderRadius: 12, padding: 3 }}>
          {categories.map((c, i) => (
            <div key={i} style={{
              flex: 1, padding: "8px 0", borderRadius: 10, textAlign: "center", transition: "all 0.2s",
              fontFamily: bodyFont, fontSize: 13, fontWeight: 600,
              background: activeTab === i ? BLUE_DIM : "transparent",
              color: activeTab === i ? WHITE : MUTED,
              boxShadow: activeTab === i ? `0 4px 15px ${BLUE_DIM}44` : "none",
            }}>{c}</div>
          ))}
        </div>

        {/* Content */}
        <div style={{ transform: `translateX(${activeTab === 1 ? slideFrom : 0}px)` }}>
          {[
            { name: activeTab === 0 ? "شاورما دجاج" : "حمص باللحم", price: "٢٥", desc: activeTab === 0 ? "خبز صاج • ثوم • مخلل" : "حمص • لحم • صنوبر" },
            { name: activeTab === 0 ? "كباب بندورة" : "متبل", price: "٣٠", desc: activeTab === 0 ? "لحم مفروم • بندورة • بصل" : "باذنجان • طحينة • ليمون" },
            { name: activeTab === 0 ? "أجنحة دجاج" : "تبولة", price: "١٨", desc: activeTab === 0 ? "صوص حار • ليمون" : "برغل • بقدونس • نعناع" },
            { name: activeTab === 0 ? "ريش غنم" : "حمص بالطحينة", price: "٣٥", desc: activeTab === 0 ? "بهارات خاصة • أرز" : "حمص مسلوق • طحينة • زيت" },
          ].map((item, i) => {
            const d = Math.max(0, frame - 10 - i * 3);
            const y = interpolate(d, [0, 8], [10, 0], { extrapolateLeft: "clamp", easing: EASE });
            const o = interpolate(d, [0, 8], [0, 1], { extrapolateLeft: "clamp", easing: EASE });
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: "1px solid oklch(1 1 0 / 0.04)",
                opacity: o, transform: `translateY(${y}px)`,
              }}>
                <div>
                  <div style={{ fontFamily: bodyFont, fontSize: 12, color: WHITE, fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontFamily: bodyFont, fontSize: 9, color: MUTED, marginTop: 2 }}>{item.desc}</div>
                </div>
                <span style={{ fontFamily: bodyFont, fontSize: 12, color: BLUE, fontWeight: 600 }}>{item.price} د.ل</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tag */}
      <div style={{
        marginTop: 14, fontFamily: bodyFont, fontSize: 11, color: BLUE + "88",
        padding: "6px 16px", borderRadius: 20, background: BLUE_DIM + "15",
      }}>
        ← تبديل الفئات
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 5: Product Detail ──
function Scene5({ frame, fps }: FrameProps) {
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const scale = spring({ frame, fps, config: { damping: 16, mass: 0.6, stiffness: 100 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity }}>
      <div style={{
        width: "76%", borderRadius: 28, overflow: "hidden",
        background: "linear-gradient(180deg, #16161f 0%, #0d0d14 100%)",
        border: "1px solid oklch(1 1 0 / 0.06)",
        boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
        transform: `scale(${scale})`,
      }}>
        {/* Dish image */}
        <div style={{
          height: 240,
          background: "linear-gradient(135deg, oklch(0.52 0.14 264 / 0.2) 0%, oklch(0.35 0.12 266 / 0.1) 50%, #0d0d14 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
        }}>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={BLUE + "66"} strokeWidth="1.5">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
          </svg>
          <div style={{
            position: "absolute", bottom: 16, right: 20,
            fontFamily: headingFont, fontSize: 22, color: WHITE, fontWeight: 700, textShadow: "0 2px 10px rgba(0,0,0,0.5)",
          }}>
            كباب بندورة
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: "16px 20px 20px" }}>
          {/* Stars */}
          <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
            <span style={{ fontFamily: bodyFont, fontSize: 10, color: MUTED, marginRight: 4 }}>٤.٨</span>
          </div>

          <div style={{ fontFamily: bodyFont, fontSize: 11, color: MUTED, lineHeight: 1.6, marginBottom: 12 }}>
            لحم مفروم طازج مع البندورة والبصل والبهارات الشرقية، يقدم على صاج مع خبز طري
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["لحم", "مشاوي", "شامي"].map((t) => (
                <span key={t} style={{
                  fontFamily: bodyFont, fontSize: 9, padding: "3px 8px", borderRadius: 12,
                  background: BLUE_DIM + "18", color: BLUE, border: "1px solid " + BLUE_DIM + "22",
                }}>{t}</span>
              ))}
            </div>
            <span style={{ fontFamily: headingFont, fontSize: 22, color: BLUE, fontWeight: 700 }}>٣٠ د.ل</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 6: Add to Cart ──
function Scene6({ frame, fps }: FrameProps) {
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const badgePulse = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 10, mass: 0.4, stiffness: 150 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity }}>
      <div style={{
        width: "74%", borderRadius: 28, overflow: "hidden", padding: "20px",
        background: "linear-gradient(180deg, #12121a 0%, #0d0d14 100%)",
        border: "1px solid oklch(1 1 0 / 0.05)",
      }}>
        {/* Header with cart */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: headingFont, fontSize: 15, color: WHITE, fontWeight: 600 }}>الطلب</div>
          <div style={{ position: "relative" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={WHITE + "cc"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {/* Badge */}
            <div style={{
              position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: 9,
              background: BLUE, display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: bodyFont, fontSize: 9, color: WHITE, fontWeight: 700,
              transform: `scale(${badgePulse})`,
            }}>
              {frame > 15 ? (frame > 20 ? "٣" : "٢") : "١"}
            </div>
          </div>
        </div>

        {/* Cart items */}
        {[
          { name: "شاورما دجاج", qty: "١", price: "٢٥" },
          { name: "كباب بندورة", qty: "٢", price: "٦٠" },
          ...(frame > 16 ? [{ name: "عصير ليمون", qty: "١", price: "١٢" }] : []),
        ].map((item, i) => {
          const d = Math.max(0, frame - 12 - i * 5);
          const iy = interpolate(d, [0, 8], [20, 0], { extrapolateLeft: "clamp", easing: EASE });
          return (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: "1px solid oklch(1 1 0 / 0.04)", opacity: 1,
              transform: i > 1 ? `translateY(${iy}px)` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: bodyFont, fontSize: 10, color: BLUE + "88", width: 20 }}>x{item.qty}</span>
                <span style={{ fontFamily: bodyFont, fontSize: 11, color: WHITE }}>{item.name}</span>
              </div>
              <span style={{ fontFamily: bodyFont, fontSize: 11, color: WHITE }}>{item.price} د.ل</span>
            </div>
          );
        })}

        {/* Total */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 12, paddingTop: 12, borderTop: "1px solid " + BLUE_DIM + "33",
        }}>
          <span style={{ fontFamily: bodyFont, fontSize: 12, color: MUTED }}>المجموع</span>
          <span style={{ fontFamily: headingFont, fontSize: 18, color: BLUE, fontWeight: 700 }}>
            {frame > 16 ? "٩٧" : "٨٥"} د.ل
          </span>
        </div>

        {/* CTA */}
        <div style={{
          marginTop: 16, padding: "12px 0", borderRadius: 14, textAlign: "center",
          background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DIM})`,
          fontFamily: bodyFont, fontSize: 13, color: WHITE, fontWeight: 600,
          boxShadow: `0 8px 25px ${BLUE_DIM}44`,
        }}>
          إتمام الطلب
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 7: Checkout ──
function Scene7({ frame, fps }: FrameProps) {
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const focusField = frame > 18 ? 1 : 0;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity }}>
      <div style={{
        width: "74%", borderRadius: 28, overflow: "hidden", padding: "20px",
        background: "linear-gradient(180deg, #12121a 0%, #0d0d14 100%)",
        border: "1px solid oklch(1 1 0 / 0.05)",
      }}>
        <div style={{ fontFamily: headingFont, fontSize: 16, color: WHITE, fontWeight: 600, marginBottom: 16 }}>معلومات التوصيل</div>

        {/* Order summary */}
        <div style={{
          padding: "12px 14px", borderRadius: 14, marginBottom: 16,
          background: "oklch(1 1 0 / 0.03)", border: "1px solid oklch(1 1 0 / 0.04)",
        }}>
          {[
            { label: "مطعم مذاق الشام", value: "٣ أصناف" },
            { label: "المجموع", value: "٩٧ د.ل", highlight: true },
          ].map((r, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              fontFamily: bodyFont, fontSize: 12,
              color: r.highlight ? BLUE : MUTED,
              fontWeight: r.highlight ? 700 : 400,
              marginBottom: i === 0 ? 4 : 0,
            }}>
              <span>{r.label}</span>
              <span>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Form fields */}
        {["اسم العميل", "رقم الهاتف", "ملاحظات"].map((label, i) => {
          const isFocused = focusField === i;
          return (
            <div key={i} style={{
              padding: "10px 14px", borderRadius: 12, marginBottom: 8,
              background: isFocused ? BLUE_DIM + "12" : "oklch(1 1 0 / 0.03)",
              border: isFocused ? `1px solid ${BLUE}66` : "1px solid oklch(1 1 0 / 0.05)",
              transition: "all 0.2s",
            }}>
              <div style={{ fontFamily: bodyFont, fontSize: 9, color: isFocused ? BLUE : MUTED + "aa", marginBottom: 4 }}>{label}</div>
              <div style={{
                fontFamily: bodyFont, fontSize: 12, color: WHITE + "cc",
                ...(i === 0 ? {} : {}),
              }}>
                {i === 0 ? "محمد علي" : i === 1 ? "٠٩١-٢٣٤-٥٦٧٨" : ""}
              </div>
            </div>
          );
        })}

        {/* Submit */}
        <div style={{
          marginTop: 12, padding: "12px 0", borderRadius: 14, textAlign: "center",
          background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DIM})`,
          fontFamily: bodyFont, fontSize: 13, color: WHITE, fontWeight: 600,
          boxShadow: `0 8px 25px ${BLUE_DIM}44`,
        }}>
          تأكيد الطلب
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 8: Order Success ──
function Scene8({ frame, fps }: FrameProps) {
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const checkScale = spring({ frame, fps, config: { damping: 10, mass: 0.4, stiffness: 120 } });
  const slideUp = interpolate(frame, [5, 20], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity }}>
      {/* Success check circle */}
      <div style={{
        width: 90, height: 90, borderRadius: 45,
        background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DIM})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 60px ${BLUE}44, 0 10px 30px ${BLUE_DIM}33`,
        transform: `scale(${checkScale})`,
        marginBottom: 24,
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div style={{ transform: `translateY(${slideUp}px)` }}>
        <div style={{ fontFamily: headingFont, fontSize: 28, color: WHITE, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
          تم الطلب بنجاح!
        </div>
        <div style={{ fontFamily: bodyFont, fontSize: 13, color: MUTED, textAlign: "center" }}>
          رقم الطلب: #٢٥٣١
        </div>
        <div style={{
          marginTop: 16, padding: "8px 20px", borderRadius: 20,
          background: BLUE_DIM + "18", border: "1px solid " + BLUE_DIM + "22",
          fontFamily: bodyFont, fontSize: 11, color: BLUE, textAlign: "center",
        }}>
          تم إرسال الطلب إلى المطعم
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 9: Dashboard Glimpse ──
function Scene9({ frame, fps }: FrameProps) {
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity }}>
      <div style={{
        width: "78%", borderRadius: 24, overflow: "hidden", padding: "18px",
        background: "linear-gradient(180deg, #16161f 0%, #0d0d14 100%)",
        border: "1px solid oklch(1 1 0 / 0.06)",
      }}>
        {/* Dashboard top bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
        }}>
          <div style={{ fontFamily: headingFont, fontSize: 14, color: WHITE, fontWeight: 600 }}>لوحة التحكم</div>
          <div style={{
            width: 28, height: 28, borderRadius: 14,
            background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DIM})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: bodyFont, fontSize: 10, color: WHITE, fontWeight: 700,
          }}>م</div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[
            { label: "طلبات اليوم", value: "٢٤", color: BLUE },
            { label: "قيد التحضير", value: "٧", color: "#f59e0b" },
            { label: "الربح", value: "١،٢٤٠", color: "#22c55e" },
          ].map((stat) => (
            <div key={stat.label} style={{
              flex: 1, padding: "10px 8px", borderRadius: 12, textAlign: "center",
              background: "oklch(1 1 0 / 0.03)", border: "1px solid oklch(1 1 0 / 0.04)",
            }}>
              <div style={{ fontFamily: headingFont, fontSize: 16, color: stat.color, fontWeight: 700 }}>{stat.value}</div>
              <div style={{ fontFamily: bodyFont, fontSize: 8, color: MUTED, marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Recent orders */}
        <div style={{ fontFamily: bodyFont, fontSize: 11, color: WHITE, fontWeight: 600, marginBottom: 8 }}>آخر الطلبات</div>
        {[
          { name: "شاورما دجاج", time: "منذ ٢ د", status: "جديد" },
          { name: "كباب بندورة", time: "منذ ٥ د", status: "تحضير" },
          { name: "فتوش + عصير", time: "منذ ١٠ د", status: "جاهز" },
        ].map((order, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 10px", borderRadius: 10, marginBottom: 4,
            background: "oklch(1 1 0 / 0.02)",
          }}>
            <div>
              <div style={{ fontFamily: bodyFont, fontSize: 11, color: WHITE }}>{order.name}</div>
              <div style={{ fontFamily: bodyFont, fontSize: 8, color: MUTED }}>{order.time}</div>
            </div>
            <span style={{
              fontFamily: bodyFont, fontSize: 9, padding: "3px 10px", borderRadius: 12,
              background: order.status === "جديد" ? "#22c55e22" : order.status === "تحضير" ? "#f59e0b22" : BLUE_DIM + "22",
              color: order.status === "جديد" ? "#22c55e" : order.status === "تحضير" ? "#f59e0b" : BLUE,
            }}>{order.status}</span>
          </div>
        ))}
      </div>

      {/* Watermark */}
      <div style={{
        position: "absolute", bottom: 40, fontFamily: headingFont, fontSize: 12, color: BLUE + "44",
        letterSpacing: "0.15em",
      }}>
        SMAR TMENU
      </div>
    </AbsoluteFill>
  );
}

// ── Main Composition ──
export const CinematicDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = { fps: FPS };

  // Scene timing (in frames)
  const S1 = { start: 0, end: 32 };      // Restaurant landing
  const S2 = { start: 28, end: 60 };      // QR scan (overlaps 4 frames)
  const S3 = { start: 56, end: 95 };      // Menu browsing
  const S4 = { start: 88, end: 122 };     // Category switch
  const S5 = { start: 115, end: 150 };    // Product detail
  const S6 = { start: 142, end: 178 };    // Add to cart
  const S7 = { start: 168, end: 202 };    // Checkout
  const S8 = { start: 192, end: 225 };    // Order success
  const S9 = { start: 215, end: 250 };    // Dashboard glimpse

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: bodyFont, direction: "rtl" }}>
      <Grain />
      <Glow />

      {/* Scene 1 */}
      <Sequence from={S1.start} durationInFrames={S1.end - S1.start} layout="none">
        <Scene1 frame={frame - S1.start} fps={fps} />
      </Sequence>

      {/* Scene 2 — crossfade start */}
      <Sequence from={S2.start} durationInFrames={S2.end - S2.start} layout="none">
        <Scene2 frame={frame - S2.start} fps={fps} />
      </Sequence>

      {/* Scene 3 */}
      <Sequence from={S3.start} durationInFrames={S3.end - S3.start} layout="none">
        <Scene3 frame={frame - S3.start} fps={fps} />
      </Sequence>

      {/* Scene 4 */}
      <Sequence from={S4.start} durationInFrames={S4.end - S4.start} layout="none">
        <Scene4 frame={frame - S4.start} fps={fps} />
      </Sequence>

      {/* Scene 5 */}
      <Sequence from={S5.start} durationInFrames={S5.end - S5.start} layout="none">
        <Scene5 frame={frame - S5.start} fps={fps} />
      </Sequence>

      {/* Scene 6 */}
      <Sequence from={S6.start} durationInFrames={S6.end - S6.start} layout="none">
        <Scene6 frame={frame - S6.start} fps={fps} />
      </Sequence>

      {/* Scene 7 */}
      <Sequence from={S7.start} durationInFrames={S7.end - S7.start} layout="none">
        <Scene7 frame={frame - S7.start} fps={fps} />
      </Sequence>

      {/* Scene 8 */}
      <Sequence from={S8.start} durationInFrames={S8.end - S8.start} layout="none">
        <Scene8 frame={frame - S8.start} fps={fps} />
      </Sequence>

      {/* Scene 9 */}
      <Sequence from={S9.start} durationInFrames={S9.end - S9.start} layout="none">
        <Scene9 frame={frame - S9.start} fps={fps} />
      </Sequence>

      {/* Fade out */}
      {frame > S9.end - 10 && (
        <AbsoluteFill
          style={{
            background: BG,
            opacity: interpolate(frame, [S9.end - 10, S9.end], [0, 1]),
          }}
        />
      )}
    </AbsoluteFill>
  );
};
