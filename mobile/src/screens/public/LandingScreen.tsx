import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Store, TrendingUp } from "lucide-react-native";

import { api } from "@/services/api/client";
import { OptimizedImage } from "@/components/shared/OptimizedImage";
import { FloatingWhatsApp } from "@/components/shared/FloatingWhatsApp";
import { ConnectivityBanner } from "@/components/shared/ConnectivityBanner";
import { Button } from "@/components/ui/Button";
import { toArabicNumber } from "@/lib/format";
import type { RootNavigation } from "@/navigation/types";

interface PublicStats { totalRestaurants: number; totalUsers: number; }
interface FeaturedRestaurant {
  id: number; name: string; slug: string; description: string; logo: string; city: string | null;
}

export function LandingScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [featured, setFeatured] = useState<FeaturedRestaurant[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [s, f] = await Promise.all([
          api.get<PublicStats>("/api/public/stats"),
          api.get<FeaturedRestaurant[]>("/api/public/featured"),
        ]);
        setStats(s); setFeatured(f ?? []);
      } catch {}
    })();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
      <ConnectivityBanner />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        <View className="items-center mb-12 mt-4">
          <View className="w-20 h-20 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: "#E9B44C" }}>
            <Store size={36} color="#05070F" />
          </View>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 28, fontWeight: "700", color: "#F2EFE6", textAlign: "center" }}>
            الربط الذكي | Smart Menu
          </Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, color: "#8E97B8", marginTop: 8, textAlign: "center", lineHeight: 22 }}>
            منيو رقمي ذكي للمطاعم والمقاهي مع الطلب عبر واتساب، برنامج ولاء، وإحصائيات متقدمة
          </Text>
        </View>

        {stats ? (
          <View className="flex-row gap-3 mb-12">
            <StatCard icon={<Store size={20} color="#E9B44C" />} label="مطعم نشط" value={toArabicNumber(stats.totalRestaurants)} />
            <StatCard icon={<TrendingUp size={20} color="#E9B44C" />} label="مستخدم مسجّل" value={toArabicNumber(stats.totalUsers)} />
          </View>
        ) : null}

        <View className="gap-3 mb-12">
          <Button title="ابدأ تجربتك الآن" onPress={() => navigation.navigate("Pricing")} size="lg" className="w-full" />
          <Button title="تسجيل الدخول" variant="outline" onPress={() => navigation.navigate("Login")} size="lg" className="w-full" />
        </View>

        {featured.length > 0 ? (
          <View className="mb-12">
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: "#F2EFE6", marginBottom: 12 }}>مطاعم مميزة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}>
              {featured.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => navigation.navigate("Menu", { slug: r.slug })}
                  style={({ pressed }) => ({
                    width: 200, backgroundColor: "#0D1428", borderRadius: 12, padding: 12,
                    borderWidth: 1, borderColor: "#1B2444", opacity: pressed ? 0.9 : 1,
                  })}>
                  <View style={{ width: "100%", height: 100, borderRadius: 8, overflow: "hidden", marginBottom: 8, backgroundColor: "#121A36" }}>
                    {r.logo ? <OptimizedImage uri={r.logo} style={{ width: "100%", height: "100%" }} /> : null}
                  </View>
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "600", color: "#F2EFE6" }} numberOfLines={1}>{r.name}</Text>
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: "#8E97B8", marginTop: 2 }} numberOfLines={2}>{r.description || r.city || ""}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View className="mb-12">
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: "#F2EFE6", marginBottom: 12 }}>كيف يعمل؟</Text>
          <View className="gap-4">
            <Step number={1} title="أنشئ منيوك الرقمي" description="أضف الأصناف والفئات والصور بسهولة من لوحة التحكم" />
            <Step number={2} title="شارك رمز QR" description="اطبع رمز QR وضعه على الطاولات — يتسلم العملاء المنيو فورًا" />
            <Step number={3} title="استقبل الطلبات عبر واتساب" description="كل طلب يصلك مباشرة على واتساب مع تفاصيل كاملة" />
          </View>
        </View>
      </ScrollView>
      <FloatingWhatsApp />
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#0D1428", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#1B2444" }}>
      <View style={{ marginBottom: 8 }}>{icon}</View>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 24, fontWeight: "700", color: "#F2EFE6" }}>{value}</Text>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: "#8E97B8", marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#E9B44C", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Text style={{ color: "#05070F", fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700" }}>{toArabicNumber(number)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "600", color: "#F2EFE6", marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: "#8E97B8", lineHeight: 18 }}>{description}</Text>
      </View>
    </View>
  );
}
