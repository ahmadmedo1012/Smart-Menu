import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Check, Sparkles } from "lucide-react-native";

import { api } from "@/services/api/client";
import { Spinner, EmptyState, ErrorState } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { ConnectivityBanner } from "@/components/shared/ConnectivityBanner";
import { formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import type { RootNavigation } from "@/navigation/types";
import type { Plan } from "@/lib/plan-types";

export function PricingScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const list = await api.get<Plan[]>("/api/plans");
      setPlans(list ?? []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "تعذّر تحميل الباقات"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
        <ErrorState message={error} onRetry={load} />
      </SafeAreaView>
    );
  }

  if (plans.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
        <EmptyState title="لا توجد باقات متاحة" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top"]}>
      <ConnectivityBanner />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor="#E9B44C" />}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 24, fontWeight: "700", color: "#F2EFE6", marginBottom: 8 }}>اختر باقتك</Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: "#8E97B8", marginBottom: 16 }}>باقات مرنة تناسب كل أنواع المطاعم والمقاهي</Text>
        {plans.map((plan) => {
          const isPopular = plan.sortOrder === 1 || plan.name.toLowerCase().includes("pro") || plan.name.toLowerCase().includes("premium");
          return (
            <View key={plan.id} style={{ backgroundColor: "#0D1428", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: isPopular ? 2 : 1, borderColor: isPopular ? "#E9B44C" : "#1B2444" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: "#F2EFE6" }}>{plan.nameAr || plan.name}</Text>
                {isPopular ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E9B44C", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                    <Sparkles size={12} color="#05070F" />
                    <Text style={{ color: "#05070F", fontFamily: "IBM Plex Sans Arabic", fontSize: 11, fontWeight: "700" }}>الأكثر شيوعًا</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 28, fontWeight: "700", color: "#E9B44C", marginBottom: 4 }}>{formatPrice(plan.price)}</Text>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: "#8E97B8", marginBottom: 16 }}>لمدة {plan.periodDays} يوم</Text>
              {plan.features?.map((f, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <Check size={14} color="#7FD39A" style={{ marginTop: 2 }} />
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: "#F2EFE6", flex: 1 }}>{f}</Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", gap: 16, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#1B2444" }}>
                <Limit label="منيو" value={plan.maxMenus} />
                <Limit label="صنف" value={plan.maxItems} />
                <Limit label="طلب" value={plan.maxOrders} />
              </View>
              <Button title="اشترك الآن" onPress={() => navigation.navigate("Login")} variant={isPopular ? "orange" : "outline"} size="lg" className="w-full mt-4" />
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function Limit({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: "#F2EFE6" }}>{value}</Text>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: "#8E97B8" }}>{label}</Text>
    </View>
  );
}
