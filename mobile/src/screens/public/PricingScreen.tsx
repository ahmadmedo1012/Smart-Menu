import { View, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react-native";
import Animated from "react-native-reanimated";

import { api } from "@/services/api/client";
import { Spinner, EmptyState, ErrorState } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { ConnectivityBanner } from "@/components/shared/ConnectivityBanner";
import { useEnterFade } from "@/components/motion/useEnterFade";
import { formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import type { RootNavigation } from "@/navigation/types";
import type { Plan } from "@/lib/plan-types";

import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";

export function PricingScreen() {
  const navigation = useNavigation<RootNavigation>();
  // r126-M4: content fade-in (160ms fast rung).
  const enterFade = useEnterFade();
  // r126-M5 (A6 P1-6 + P3-15): React Query owns plans fetch/loading/error —
  // was an unmemoized `load` + useEffect that refetched every error-state
  // render cycle. The query key is SHARED with the subscribe wizard's plan
  // picker, so both surfaces read one cache.
  const { data, isPending, error, refetch, isRefetching } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get<Plan[]>("/api/plans"),
    staleTime: 5 * 60_000,
  });
  const plans = data ?? [];
  const loadError = error ? getErrorMessage(error, "تعذّر تحميل الباقات") : null;
  const loading = isPending;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <ErrorState message={loadError} onRetry={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }

  if (plans.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <EmptyState title="لا توجد باقات متاحة" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ConnectivityBanner />
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} tintColor={colors.gold} />}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 24, fontWeight: "700", color: colors.sand, marginBottom: 8 }}>اختر باقتك</Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, marginBottom: 16 }}>باقات مرنة تناسب كل أنواع المطاعم والمقاهي</Text>
        {plans.map((plan) => {
          const isPopular = plan.sortOrder === 1 || plan.name.toLowerCase().includes("pro") || plan.name.toLowerCase().includes("premium");
          return (
            <View key={plan.id} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: isPopular ? 2 : 1, borderColor: isPopular ? colors.gold : colors.hairline }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand }}>{plan.nameAr || plan.name}</Text>
                {isPopular ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.gold, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                    <Sparkles size={12} color={colors.void} />
                    <Text style={{ color: colors.void, fontFamily: "IBM Plex Sans Arabic", fontSize: 11, fontWeight: "700" }}>الأكثر شيوعًا</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 28, fontWeight: "700", color: colors.gold, marginBottom: 4 }}>{formatPrice(plan.price)}</Text>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginBottom: 16 }}>لمدة {plan.periodDays} يوم</Text>
              {plan.features?.map((f, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <Check size={14} color={colors.mint} style={{ marginTop: 2 }} />
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.sand, flex: 1 }}>{f}</Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", gap: 16, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                <Limit label="منيو" value={plan.maxMenus} />
                <Limit label="صنف" value={plan.maxItems} />
                <Limit label="طلب" value={plan.maxOrders} />
              </View>
              <Button title="اشترك الآن" onPress={() => navigation.navigate("Login")} variant={isPopular ? "orange" : "outline"} size="lg" className="w-full mt-4" />
            </View>
          );
        })}
      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function Limit({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: colors.sand }} maxFontSizeMultiplier={1.4}>{value}</Text>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted }} maxFontSizeMultiplier={1.4}>{label}</Text>
    </View>
  );
}
