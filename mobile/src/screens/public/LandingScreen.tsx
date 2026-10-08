/**
 * r129-F5: the landing re-ground — the Orbit-Ink world (#252A3E) replaces
 * the product night, mirroring the web's `.landing` scoping rule: ONLY this
 * route paints Orbit-Ink (ink/cream/lime/violet, IBM Plex Mono voice,
 * 0.97 press register); every other screen keeps colors.ts night/sand/gold.
 *
 * Anatomy (the web HomePage.tsx r128 layer, mobile P0 subset — light path,
 * marquee, sky and grain are P1/P3):
 *   hero   — mono chapter eyebrow «00 — البداية», h1 with exactly ONE lime
 *            word (الطلبات على واتساب), sub, gold/ghost pill pair (48px,
 *            press 0.97), 13px meta row with hairline dots;
 *   trust  — full-bleed ink-2 band: mono 13px cream figures, CountUp
 *            (ar-LY), honest "—" + ghost retry (never-fake, r82);
 *   journey— the web's 5-station copy (JourneySection.tsx STATIONS) as
 *            flat stacked hairline cards (radius 20, cream 3% fill):
 *            STATIC this round — no light path, no scrub.
 * The featured plate keeps its live ["landing"] query, re-skinned to the
 * Orbit-Ink card recipe. FAB + connectivity banner stay product chrome.
 */
import { View, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Languages,
  Smartphone,
  UserPlus,
  UtensilsCrossed,
  QrCode,
  MessageCircle,
  Gift,
  type LucideIcon,
} from "lucide-react-native";
import Animated from "react-native-reanimated";

import { api } from "@/services/api/client";
import { OptimizedImage } from "@/components/shared/OptimizedImage";
import { FloatingWhatsApp } from "@/components/shared/FloatingWhatsApp";
import { ConnectivityBanner } from "@/components/shared/ConnectivityBanner";
import { PressableScale } from "@/components/motion/PressableScale";
import { useEnterFade } from "@/components/motion/useEnterFade";
import { LandingPill } from "@/components/landing/LandingPill";
import { TrustBand, type PublicStats } from "@/components/landing/TrustBand";
import { Text } from "@/components/ui/Text";
import { landing, landingH1Size } from "@/theme/landing";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import type { RootNavigation } from "@/navigation/types";

interface FeaturedRestaurant {
  id: number; name: string; slug: string; description: string; logo: string; city: string | null;
}

/* ── the 5-station journey — the web STATIONS copy, verbatim
   (src/components/landing/JourneySection.tsx:27-52; every desc traces to
   shipped product copy — WhatsApp orders, Arabic dashboard, loyalty). */
const STATIONS: readonly {
  n: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  tag: string;
}[] = [
  {
    n: "01", icon: UserPlus, title: "أنشئ حسابك المجاني",
    desc: "أدخل بيانات مطعمك وأنشئ حساباً مجاناً بدون بطاقة ائتمان — دقائق معدودة تفصلك عن الانطلاق.",
    tag: "مجاناً",
  },
  {
    n: "02", icon: UtensilsCrossed, title: "صمّم المنيو الخاص بك",
    desc: "أضف الأصناف والفئات والأسعار والصور عبر لوحة تحكم عربية بالكامل — في أي وقت وبدون مساعدة فنية.",
    tag: "الإعداد",
  },
  {
    n: "03", icon: QrCode, title: "شارك منيوك",
    desc: "رابط واحد تشاركه أينما كان، وQR كود مخصص بألوان وشعار مطعمك على الطاولات — الزبون يصل بنقرة.",
    tag: "الانطلاق",
  },
  {
    n: "04", icon: MessageCircle, title: "استقبل الطلبات",
    desc: "الطلب يصل مباشرة على واتساب مع تفاصيل الصنف والكمية واسم الزبون — داخل المكان أو سفرياً أو توصيلاً.",
    tag: "الطلب",
  },
  {
    n: "05", icon: Gift, title: "كافئ زبائنك",
    desc: "برنامج ولاء ومكافآت لعملائك الأوفياء، وأدوات تمنحك صورة أفضل عن عملك من لوحة واحدة.",
    tag: "الولاء",
  },
];

/* Web landing literals with no --ln-* token (component-local, provenance
   in the comments): station ico chip fill + the hero value meta dots. */
const STATION_ICO_BG = "rgba(245,243,231,0.08)"; // .ln-station-ico

/** The mono chapter label — .ln-label (lime, 12px, ls .08em, weight 500).
 *  marginBottom defaults to the .ln-label 14px; the hero eyebrow overrides
 *  to --sp-6 24px (.ln-hero-eyebrow margin-block-end). */
function ChapterLabel({ children, marginBottom = 14 }: { children: string; marginBottom?: number }) {
  // Latin/digits ride IBM Plex Mono-Medium (.ln-label --fw-medium); the
  // Arabic run continues in the brand sans Medium — per-run fallback like
  // the web --ln-mono chain.
  const [num, ...rest] = children.split(" — ");
  return (
    <Text
      style={{ color: landing.lime, fontSize: 12, marginBottom }}
      maxFontSizeMultiplier={1.4}
    >
      <Text style={{ fontFamily: "IBM Plex Mono-Medium", letterSpacing: 0.08 }}>
        {`${num} — `}
      </Text>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontWeight: "500" }}>
        {rest.join(" — ")}
      </Text>
    </Text>
  );
}

export function LandingScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { width } = useWindowDimensions();
  // r126-M4: content fade-in (160ms fast rung).
  const enterFade = useEnterFade();
  // r126-M5 (A6 P1-6 + P3-7): stats+featured ride React Query (retries,
  // refetch on focus/reconnect); the trust band surfaces the failure
  // honestly ("—" + retry) — never a fabricated figure.
  const { data, error, refetch } = useQuery({
    queryKey: ["landing"],
    queryFn: async () => {
      const [s, f] = await Promise.all([
        api.get<PublicStats>("/api/public/stats"),
        api.get<FeaturedRestaurant[]>("/api/public/featured"),
      ]);
      return { stats: s, featured: f ?? [] };
    },
    staleTime: 5 * 60_000,
  });
  const stats = data?.stats ?? null;
  const featured = data?.featured ?? [];

  const h1Size = landingH1Size(width);
  const gutter = spacing.sp5; // --page-gutter-mobile

  return (
    // The Orbit-Ink ground — landing-scoped only (web .landing R4 rule).
    <SafeAreaView style={{ flex: 1, backgroundColor: landing.ink }} edges={["top"]}>
      <ConnectivityBanner />
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 96 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══ الفصل ٠ — البداية: the hero ═══ */}
          <View style={{ paddingHorizontal: gutter, paddingTop: spacing.sp8, marginBottom: spacing.sp8 }}>
            <ChapterLabel marginBottom={spacing.sp6}>00 — البداية</ChapterLabel>

            {/* the monolith — flat cream, exactly ONE lime word (على واتساب),
                zero letter-spacing (Arabic joins — never tracked), web clamp
                floor 44px / mid 56px (landingH1Size), lh 1.18 (GAP-5). */}
            <Text
              style={{
                fontFamily: "IBM Plex Sans Arabic",
                fontWeight: "700",
                fontSize: h1Size,
                lineHeight: Math.round(h1Size * landing.h1LineHeight),
                color: landing.cream,
                marginBottom: spacing.sp7,
                // P3-26 subtle depth on dark ink ground (RN: one shadow)
                textShadowColor: "rgba(0,0,0,0.25)",
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 8,
              }}
              maxFontSizeMultiplier={1.4}
            >
              منيو رقمي لمطعمك{"\n"}
              والطلبات تصلك{" "}
              <Text style={{ color: landing.lime }}>على واتساب</Text>
            </Text>

            <Text
              style={{
                fontFamily: "IBM Plex Sans Arabic",
                fontSize: 15,
                lineHeight: 24,
                color: landing.creamDim,
                marginBottom: spacing.sp9,
              }}
              maxFontSizeMultiplier={1.4}
            >
              أنشئ منيو واضحاً، استقبل الطلبات على واتساب، وتابع أداء مطعمك من لوحة واحدة.
            </Text>

            {/* gold + ghost pill pair — 48px (the touch floor), press 0.97 */}
            <View style={{ gap: spacing.sp3, marginBottom: spacing.sp8 }}>
              <LandingPill
                variant="gold"
                size="xl"
                fullWidth
                label="ابدأ تجربتك الآن"
                onPress={() => navigation.navigate("Pricing")}
                accessibilityHint="اختيار الباقة وإنشاء الحساب"
              />
              <LandingPill
                variant="ghost"
                size="xl"
                fullWidth
                label="تسجيل الدخول"
                onPress={() => navigation.navigate("Login")}
                accessibilityHint="العودة إلى حسابك"
              />
            </View>

            {/* 13px meta row — hairline 3px dots (web .ln-hero-meta) */}
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sp3 }}
            >
              <MetaItem icon={Check} label="بدون بطاقة ائتمان" />
              <MetaDot />
              <MetaItem icon={Languages} label="واجهة عربية بالكامل" />
              <MetaDot />
              <MetaItem icon={Smartphone} label="بدون تثبيت للزبون" />
            </View>
          </View>

          {/* ═══ الفصل ١ — الثقة: the quiet mono DATA band (full-bleed) ═══ */}
          <TrustBand stats={stats} failed={error != null} onRetry={() => { void refetch(); }} />

          {/* ═══ الفصل ٣ (web numbering) — الرحلة: 5 stations, static ═══ */}
          <View
            style={{
              paddingHorizontal: gutter,
              paddingTop: spacing.sp11,
              paddingBottom: spacing.sp11,
              borderBottomWidth: 1,
              borderBottomColor: landing.lineSoft,
            }}
          >
            <ChapterLabel>02 — الرحلة</ChapterLabel>
            <Text
              style={{
                fontFamily: "IBM Plex Sans Arabic",
                fontWeight: "700",
                fontSize: 32,
                lineHeight: 39,
                color: landing.creamDim,
                marginBottom: spacing.sp4,
              }}
              maxFontSizeMultiplier={1.4}
            >
              من مسح الرمز إلى الطلب —{" "}
              <Text style={{ color: landing.cream }}>خمس محطات</Text>
            </Text>
            <Text
              style={{
                fontFamily: "IBM Plex Sans Arabic",
                fontSize: 15,
                lineHeight: 24,
                color: landing.creamDim,
                marginBottom: spacing.sp7,
              }}
              maxFontSizeMultiplier={1.4}
            >
              خطّ ضوءٍ واحد يربط محطاتك؛ كل محطة تبني على ما قبلها.
            </Text>

            {/* stacked flat hairline cards — the web ≤768 journey form
                (gap 28, card padding 20), no light path this round. */}
            <View style={{ gap: 28 }}>
              {STATIONS.map((s) => (
                <View
                  key={s.n}
                  style={{
                    backgroundColor: landing.card,
                    borderWidth: 1,
                    borderColor: landing.lineSoft,
                    borderRadius: radius["2xl"],
                    padding: spacing.sp5,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.sp3,
                      marginBottom: spacing.sp4,
                    }}
                  >
                    <Text
                      style={{ fontFamily: "IBM Plex Mono", fontSize: 13, color: landing.creamDim }}
                      maxFontSizeMultiplier={1.4}
                    >
                      {s.n}
                    </Text>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: radius.lg,
                        backgroundColor: STATION_ICO_BG,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <s.icon size={20} color={landing.creamDim} />
                    </View>
                    <View
                      style={{
                        marginStart: "auto",
                        borderWidth: 1,
                        borderColor: landing.line,
                        borderRadius: radius.pill,
                        paddingVertical: 4,
                        paddingHorizontal: 12,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, color: landing.creamDim }} maxFontSizeMultiplier={1.4}>
                        {s.tag}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      fontFamily: "IBM Plex Sans Arabic",
                      fontWeight: "700",
                      fontSize: 22,
                      color: landing.cream,
                      marginBottom: spacing.sp3,
                    }}
                    maxFontSizeMultiplier={1.4}
                  >
                    {s.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "IBM Plex Sans Arabic",
                      fontSize: 14.5,
                      lineHeight: 25,
                      color: landing.creamDim,
                    }}
                    maxFontSizeMultiplier={1.4}
                  >
                    {s.desc}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ═══ الأرض: the live featured plate, Orbit-Ink cards ═══ */}
          {featured.length > 0 ? (
            <View style={{ paddingHorizontal: gutter, paddingTop: spacing.sp10 }}>
              <Text
                style={{
                  fontFamily: "IBM Plex Sans Arabic",
                  fontWeight: "700",
                  fontSize: 18,
                  color: landing.cream,
                  marginBottom: spacing.sp4,
                }}
                maxFontSizeMultiplier={1.4}
              >
                مطاعم مميزة
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sp3, paddingHorizontal: 4 }}>
                {featured.map((r) => (
                  <PressableScale
                    key={r.id}
                    // the landing press register 0.97 (r130 W2-4: the product
                    // world rides the SAME 0.97 for controls, 0.99 for cards)
                    scaleTo={landing.pressScale}
                    onPress={() => navigation.navigate("Menu", { slug: r.slug })}
                    accessibilityLabel={`مطعم ${r.name}`}
                    accessibilityRole="button"
                    style={{
                      width: 200, backgroundColor: landing.card, borderRadius: radius["2xl"], padding: 12,
                      borderWidth: 1, borderColor: landing.lineSoft,
                    }}
                  >
                    <View style={{ width: "100%", height: 100, borderRadius: radius.lg, overflow: "hidden", marginBottom: 8, backgroundColor: STATION_ICO_BG }}>
                      {r.logo ? <OptimizedImage uri={r.logo} style={{ width: "100%", height: "100%" }} /> : null}
                    </View>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontWeight: "600", fontSize: 14, color: landing.cream }} numberOfLines={1}>{r.name}</Text>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, lineHeight: 17, color: landing.creamDim, marginTop: 2 }} numberOfLines={2}>{r.description || r.city || ""}</Text>
                  </PressableScale>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>
      <FloatingWhatsApp />
    </SafeAreaView>
  );
}

function MetaItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sp3 }}>
      <Icon size={13} color={landing.creamDim} />
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: landing.creamDim }} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </View>
  );
}

function MetaDot() {
  // .ln-hero-meta-dot — 3×3 hairline pill
  return <View style={{ width: 3, height: 3, borderRadius: radius.pill, backgroundColor: landing.line }} />;
}
