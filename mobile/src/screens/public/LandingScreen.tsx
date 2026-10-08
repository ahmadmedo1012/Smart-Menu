import { View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Store, TrendingUp } from "lucide-react-native";

import { api } from "@/services/api/client";
import { OptimizedImage } from "@/components/shared/OptimizedImage";
import { FloatingWhatsApp } from "@/components/shared/FloatingWhatsApp";
import { ConnectivityBanner } from "@/components/shared/ConnectivityBanner";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/motion/PressableScale";
import { useEnterFade } from "@/components/motion/useEnterFade";
import Animated from "react-native-reanimated";
import { toArabicNumber } from "@/lib/format";
import type { RootNavigation } from "@/navigation/types";

import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";

interface PublicStats { totalRestaurants: number; totalUsers: number; }
interface FeaturedRestaurant {
  id: number; name: string; slug: string; description: string; logo: string; city: string | null;
}

export function LandingScreen() {
  const navigation = useNavigation<RootNavigation>();
  // r126-M4: content fade-in (160ms fast rung).
  const enterFade = useEnterFade();
  // r126-M5 (A6 P1-6 + P3-7): stats+featured were a fire-and-forget effect
  // with `catch {}` — failures were invisible and never retried. React
  // Query now retries (2x), refetches on focus/reconnect, and the inline
  // error row below surfaces a manual retry.
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ConnectivityBanner />
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        <View className="items-center mb-12 mt-4">
          <View className="w-20 h-20 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: colors.gold }}>
            <Store size={36} color={colors.void} />
          </View>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 28, fontWeight: "700", color: colors.sand, textAlign: "center" }}>
            الربط الذكي | Smart Menu
          </Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, color: colors.muted, marginTop: 8, textAlign: "center", lineHeight: 22 }}>
            منيو رقمي ذكي للمطاعم والمقاهي مع الطلب عبر واتساب، برنامج ولاء، وإحصائيات متقدمة
          </Text>
        </View>

        {error ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.hairline, marginBottom: 12 }}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, flex: 1 }}>تعذّر تحميل الإحصائيات والمطاعم المميزة</Text>
            <Pressable onPress={() => { void refetch(); }} accessibilityRole="button" accessibilityLabel="إعادة المحاولة" hitSlop={8}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "700", color: colors.gold }}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        ) : null}

        {stats ? (
          <View className="flex-row gap-3 mb-12">
            <StatCard icon={<Store size={20} color={colors.gold} />} label="مطعم نشط" value={toArabicNumber(stats.totalRestaurants)} />
            <StatCard icon={<TrendingUp size={20} color={colors.gold} />} label="مستخدم مسجّل" value={toArabicNumber(stats.totalUsers)} />
          </View>
        ) : null}

        <View className="gap-3 mb-12">
          <Button title="ابدأ تجربتك الآن" onPress={() => navigation.navigate("Pricing")} size="lg" className="w-full" />
          <Button title="تسجيل الدخول" variant="outline" onPress={() => navigation.navigate("Login")} size="lg" className="w-full" />
        </View>

        {featured.length > 0 ? (
          <View className="mb-12">
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand, marginBottom: 12 }}>مطاعم مميزة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}>
              {featured.map((r) => (
                <PressableScale
                  key={r.id}
                  onPress={() => navigation.navigate("Menu", { slug: r.slug })}
                  accessibilityLabel={`مطعم ${r.name}`}
                  style={{
                    width: 200, backgroundColor: colors.surface, borderRadius: 12, padding: 12,
                    borderWidth: 1, borderColor: colors.hairline,
                  }}>
                  <View style={{ width: "100%", height: 100, borderRadius: 8, overflow: "hidden", marginBottom: 8, backgroundColor: colors.surface2 }}>
                    {r.logo ? <OptimizedImage uri={r.logo} style={{ width: "100%", height: "100%" }} /> : null}
                  </View>
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "600", color: colors.sand }} numberOfLines={1}>{r.name}</Text>
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 2 }} numberOfLines={2}>{r.description || r.city || ""}</Text>
                </PressableScale>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View className="mb-12">
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand, marginBottom: 12 }}>كيف يعمل؟</Text>
          <View className="gap-4">
            <Step number={1} title="أنشئ منيوك الرقمي" description="أضف الأصناف والفئات والصور بسهولة من لوحة التحكم" />
            <Step number={2} title="شارك رمز QR" description="اطبع رمز QR وضعه على الطاولات — يتسلم العملاء المنيو فورًا" />
            <Step number={3} title="استقبل الطلبات عبر واتساب" description="كل طلب يصلك مباشرة على واتساب مع تفاصيل كاملة" />
          </View>
        </View>
      </ScrollView>
      </Animated.View>
      <FloatingWhatsApp />
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.hairline }}>
      <View style={{ marginBottom: 8 }}>{icon}</View>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 24, fontWeight: "700", color: colors.sand }} maxFontSizeMultiplier={1.4}>{value}</Text>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, marginTop: 2 }} maxFontSizeMultiplier={1.4}>{label}</Text>
    </View>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={{ width: 32, height: 32, borderRadius: 9999, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Text style={{ color: colors.void, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700" }}>{toArabicNumber(number)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "600", color: colors.sand, marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, lineHeight: 18 }}>{description}</Text>
      </View>
    </View>
  );
}
