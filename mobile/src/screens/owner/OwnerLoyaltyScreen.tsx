/**
 * Phase 6 (P6-2-cR): «برنامج الولاء» becomes a REAL screen — a read-only
 * overview twin of the web /owner/loyalty page on the typed OWNER API:
 *
 *   · KPI row — إجمالي الأعضاء · إجمالي الإحالات · تم التحويل (مع معدل
 *     التحويل) · النقاط المكتسبة (/api/loyalty/stats aggregates)
 *   · recent transactions — the web TransactionTable twin, with the Phase-6
 *     DotLeader motif tying each row to its points
 *
 * HONEST SCOPE: loyalty SETTINGS (reward cost, referrer percentages,
 * redemption toggles) stay on the web console — no fake controls here; the
 * footer says where they live.
 */
import { View, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Award, Users, Gift, TrendingUp, Clock } from "lucide-react-native";
import Animated from "react-native-reanimated";

import { getLoyaltyStats, type LoyaltyStats } from "@/services/api/client";
import { EmptyState, ErrorState } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { DotLeader } from "@/components/DotLeader";
import { useEnterFade } from "@/components/motion/useEnterFade";
import { colors, pastelFamilies } from "@/theme/colors";
import { METRIC_FONT_VARIANT } from "@/theme/typography";
import { toArabicNumber } from "@/lib/format";
import { formatRelativeTimeAr } from "@/lib/order-status";
import { getErrorMessage } from "@/lib/get-error-message";

export function OwnerLoyaltyScreen() {
  const enterFade = useEnterFade();
  const { data: stats, isPending, error, refetch, isRefetching } = useQuery({
    queryKey: ["loyalty-stats"],
    queryFn: getLoyaltyStats,
  });

  if (isPending) {
    /* Shape skeleton — the loaded geometry: KPI grid (2×2), a section
       title, then transaction rows (label + time line + points lane). */
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <View style={{ padding: 16 }}>
          <Skeleton width={"50%"} height={22} />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 8 }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.hairline }}>
                <Skeleton width={18} height={18} />
                <Skeleton width={"60%"} height={18} />
                <Skeleton width={"40%"} height={11} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.hairline }}>
                <Skeleton width={18} height={18} />
                <Skeleton width={"60%"} height={18} />
                <Skeleton width={"40%"} height={11} />
              </View>
            ))}
          </View>
          <Skeleton width={"35%"} height={16} />
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginTop: 8, borderWidth: 1, borderColor: colors.hairline }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ gap: 6 }}>
                  <Skeleton width={110} height={13} />
                  <Skeleton width={64} height={11} />
                </View>
                <Skeleton width={40} height={13} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <ErrorState message={getErrorMessage(error, "تعذّر تحميل بيانات الولاء")} onRetry={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }

  const data: LoyaltyStats | null = stats ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} tintColor={colors.terracotta} />}>
          <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: 16 }}>برنامج الولاء</Text>

          {/* KPI row — the web statCards twin. */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <Kpi icon={<Users size={18} color={colors.terracotta} />} label="إجمالي الأعضاء" value={toArabicNumber(data?.totalLoyaltyCards ?? 0)} />
            <Kpi icon={<Gift size={18} color={colors.mint} />} label="إجمالي الإحالات" value={toArabicNumber(data?.totalReferrals ?? 0)} />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <Kpi icon={<TrendingUp size={18} color={colors.terracotta} />} label="تم التحويل" value={toArabicNumber(data?.convertedReferrals ?? 0)} hint={`معدل التحويل ${toArabicNumber(data?.conversionRate ?? 0)}٪`} />
            <Kpi icon={<Award size={18} color={colors.yellow} />} label="النقاط المكتسبة" value={toArabicNumber(data?.totalRewardPoints ?? 0)} />
          </View>

          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: 8 }}>آخر العمليات</Text>
          {data && data.recentTransactions.length > 0 ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.hairline }}>
              {data.recentTransactions.map((tx, i) => {
                const isEarn = tx.type === "earn";
                return (
                  <View key={tx.id} style={{ padding: 12, borderBottomWidth: i < data.recentTransactions.length - 1 ? 1 : 0, borderBottomColor: colors.hairline }}>
                    {/* Phase 6: قائد النقاط — the web TransactionTable twin
                        rides the printed-menu dotted leader into the points. */}
                    <DotLeader
                      leading={
                        <View style={{ gap: 3 }}>
                          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink }} numberOfLines={1}>
                            {tx.description || (isEarn ? "نقاط مكتسبة" : "نقاط مستردة")}
                          </Text>
                          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted }}>{formatRelativeTimeAr(tx.createdAt)}</Text>
                        </View>
                      }
                      trailing={
                        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: isEarn ? colors.mint : colors.rose, fontVariant: METRIC_FONT_VARIANT }}>
                          {isEarn ? "+" : "−"}{toArabicNumber(tx.points)}
                        </Text>
                      }
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState
              title="لا توجد معاملات بعد"
              description="عندما ينضم العملاء لبرنامج الولاء وتُسجَّل النقاط ستظهر هنا"
              icon={<Clock size={24} color={pastelFamilies.grey.deep} />}
            />
          )}

          {/* Honest scope note — the settings editor is the web console's. */}
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 24, lineHeight: 19 }}>
            إعدادات البرنامج (تكلفة المكافأة ونسب الإحالة) تُدار حاليًا من لوحة التحكم على الويب
          </Text>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function Kpi({ label, value, icon, hint }: { label: string; value: string; icon: React.ReactNode; hint?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.hairline }}>
      <View style={{ marginBottom: 6 }}>{icon}</View>
      <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 18, fontWeight: "700", color: colors.ink, fontVariant: METRIC_FONT_VARIANT }}>{value}</Text>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 2 }}>{label}</Text>
      {hint ? <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 10, color: colors.muted, marginTop: 4, fontVariant: METRIC_FONT_VARIANT }}>{hint}</Text> : null}
    </View>
  );
}
