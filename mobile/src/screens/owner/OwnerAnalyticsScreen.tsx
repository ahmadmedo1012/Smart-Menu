/**
 * P42-5d (GAP-MENU-1) — «التحليلات»: the advanced-analytics screen, the
 * native twin of the web AnalyticsTab (src/app/(protected)/owner/
 * OwnerCharts.tsx) + its dashboard gate (owner/page.tsx:107-160, 439-450).
 *
 * THE PORT MAP (same backend, same honesty, both halves):
 *   1. DUAL GATE (the web page.tsx:112-158 twin): the LIGHT entitlements
 *      probe (/api/owner/entitlements?restaurantId= → features.advancedStats)
 *      decides whether the advanced route is fetched AT ALL (zero 403s
 *      below tier — «المالك دون بريميوم لا يرى تبويب التحليلات مقفولًا
 *      ولا تُستهلك استعلاماته»), while the 403 from /api/stats/advanced
 *      stays the PRIMARY truth (server-fed, fail-closed — a plan that
 *      changed mid-session still locks). Probe failure → optimistic fetch
 *      (unknown), exactly the web `advancedAllowed !== false` decision.
 *   2. THE STATE MACHINE (the AnalyticsTab twin): range today/week/month
 *      with the verbatim RANGE_LABELS, loading / error «تعذّر تحميل
 *      التحليلات» / locked / data — 403 classifies through the
 *      plan-feature-gate family (NOT the count-cap classifier) and renders
 *      the PlanFeatureLockCard with a WORKING upgrade door
 *      (OwnerSubscribe + the restaurant context — the 5e74620f doctrine).
 *   3. THE SHAPES (web src/components/shared/* ports): KPI row with
 *      sparklines, SplineAreaChart (ساعات الذروة), HorizontalBar +
 *      growth list (الأصناف الأكثر طلباً), DoughnutChart (توزيع
 *      التصنيفات), ColumnChart (التفاعل اليومي), AreaChart (اتجاه
 *      الإيرادات) — react-native-svg via the already-present dependency,
 *      on the app's own culinary theme (no web CSS).
 *   4. HONEST EMPTY (no fake zeros): every series is guarded by
 *      seriesHasData — a zero-filled bucket series is an EMPTY state with
 *      its own Arabic copy, and KPI values stay skeletons until real data
 *      lands (the web shows 0s on a failed load; the native port keeps the
 *      unknown honest).
 *
 * RESTAURANT CONTEXT: the dashboard's active-restaurant doctrine — the
 * shared ["owner-restaurants"] React Query cache (the menu screen's
 * resolver: primary first), overridable by the route param. The upgrade
 * CTA carries the same id OwnerSubscribe accepts.
 *
 * MOUNT: pushed from the owner dashboard's analytics section card
 * (OwnerScreens.tsx) — the native-idiomatic twin of the web dashboard's
 * always-visible «تحليلات» tab (no hiding; the lock lives INSIDE).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Animated from "react-native-reanimated";
import { Activity, Clock, DollarSign, PieChart, TrendingUp } from "lucide-react-native";

import { api, getOwnerRestaurants } from "@/services/api/client";
import { EmptyState, ErrorState } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { useEnterFade } from "@/components/motion/useEnterFade";
import { PlanFeatureLockCard } from "@/components/shared/PlanFeatureLockCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { AreaChart } from "@/components/charts/AreaChart";
import { SplineAreaChart } from "@/components/charts/SplineAreaChart";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { HorizontalBar } from "@/components/charts/HorizontalBar";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import {
  dayLabel,
  hourLabel,
  peakOrdersPhrase,
  seriesHasData,
  type AdvancedStats,
  type AnalyticsRange,
  type OwnerEntitlements,
} from "@/lib/analytics";
import { classifyPlanFeatureGate, type PlanFeatureGateDetails } from "@/lib/plan-feature-gate";
import { toArabicNumber, formatPrice } from "@/lib/format";
import { colors } from "@/theme/colors";
import { METRIC_FONT_VARIANT } from "@/theme/typography";
import type { RootNavigation } from "@/navigation/types";

/** The web OwnerCharts.tsx:64-68 RANGE_LABELS — verbatim labels. */
export const RANGE_LABELS: { value: AnalyticsRange; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "هذا الأسبوع" },
  { value: "month", label: "هذا الشهر" },
];

/** The web AnalyticsTab's one non-403 error copy — verbatim (it never
 *  blames the network for a server failure; offline is the shell banner). */
export const ANALYTICS_ERROR_COPY = "تعذّر تحميل التحليلات";

/** The web page.tsx:460-462 no-restaurant analytics empty — verbatim. */
const NO_RESTAURANT_EMPTY_TITLE = "لا توجد بيانات تحليلات بعد";
const NO_RESTAURANT_EMPTY_DESC = "ستظهر التحليلات المتقدمة هنا بعد وصول أول الطلبات.";

/** The probe state machine — pending → allowed/denied, or unknown (probe
 *  failed: optimistic, the 403 stays the primary truth). */
type EntitlementProbe = "pending" | "allowed" | "denied" | "unknown";

export function OwnerAnalyticsScreen() {
  const navigation = useNavigation<RootNavigation>();
  const enterFade = useEnterFade();
  // The optional restaurant context (the dashboard/menu pass the active id;
  // omitted → the auth row's own resolution below).
  const route = useRoute();
  const routeParams = (route.params || {}) as { restaurantId?: number };

  // ── restaurant scope (the menu screen's resolver: the SHARED cache,
  //    primary first — the web useActiveRestaurant doctrine) ──────────────
  const {
    data: restaurants,
    isPending: restaurantsPending,
    error: restaurantsError,
    refetch: refetchRestaurants,
  } = useQuery({
    queryKey: ["owner-restaurants"],
    queryFn: getOwnerRestaurants,
  });
  const primaryId = useMemo(
    () =>
      restaurants && restaurants.length > 0
        ? (restaurants.find((r) => r.isPrimary) ?? restaurants[0]).id
        : null,
    [restaurants]
  );
  const restaurantId = routeParams.restaurantId ?? primaryId;

  // ── the AnalyticsTab state machine (web OwnerCharts.tsx:77-127 twin) ───
  const [range, setRange] = useState<AnalyticsRange>("week");
  const [data, setData] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /* The 403 lock (primary truth — server-fed): carries the classifier's
     parse so the lock can show the server's verbatim copy. */
  const [locked, setLocked] = useState<PlanFeatureGateDetails | null>(null);
  /* The entitlements probe result (preference only — avoids the wasted
     fetch below tier; never an enforcement). */
  const [probe, setProbe] = useState<EntitlementProbe>("pending");

  // The probe — once per restaurant scope (the web probes once per
  // dashboard load). Failure → "unknown" (optimistic) and the load runs.
  useEffect(() => {
    setProbe("pending");
    if (restaurantId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const ent = await api.get<OwnerEntitlements>(
          `/api/owner/entitlements?restaurantId=${restaurantId}`
        );
        if (cancelled) return;
        setProbe(ent?.features?.advancedStats === false ? "denied" : "allowed");
      } catch {
        if (!cancelled) setProbe("unknown");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const load = useCallback(
    async (nextRange: AnalyticsRange) => {
      if (restaurantId === null) return;
      setLoading(true);
      setError(null);
      try {
        const json = await api.get<AdvancedStats>(
          `/api/stats/advanced?restaurantId=${restaurantId}&range=${nextRange}`
        );
        setData(json);
      } catch (e: unknown) {
        const status = (e as { status?: unknown } | null)?.status;
        if (status === 403) {
          /* W7-B (G-4) twin: بوابة الخطة — قفل صادق لا خطأ تحميل. The
             classifier lifts the server's verbatim feature-denied copy. */
          setLocked(classifyPlanFeatureGate(e));
          return;
        }
        setError(ANALYTICS_ERROR_COPY);
      } finally {
        setLoading(false);
      }
    },
    [restaurantId]
  );

  // A fresh restaurant scope is a fresh gate check (the web remounts the
  // tab through the dashboard load; native resets the machine instead).
  useEffect(() => {
    setLocked(null);
    setData(null);
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    // The web twin awaits the probe BEFORE deciding to fetch at all
    // (page.tsx:147-150 «advancedAllowed !== false») — pending waits,
    // denied never fetches (zero 403s below tier).
    if (probe === "pending" || probe === "denied") return;
    void load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, range, probe, load]);

  const stats = data;

  // ── derived series (the web AnalyticsTab memos, same math) ─────────────
  const revenueSparkline = useMemo(() => (stats?.revenue7d ?? []).map((r) => r.revenue), [stats?.revenue7d]);
  const ordersSparkline = useMemo(() => (stats?.orders7d ?? []).map((o) => o.count), [stats?.orders7d]);
  const chartData = useMemo(
    () =>
      (stats?.revenue7d ?? []).map((d) => ({
        label: dayLabel(String(d.date).slice(0, 10)),
        value: d.revenue,
      })),
    [stats?.revenue7d]
  );
  const hourly = useMemo(() => stats?.hourlyDistribution ?? [], [stats?.hourlyDistribution]);
  const hourlyHasData = seriesHasData(hourly.map((h) => h.count));
  const peak = useMemo(() => {
    if (!hourlyHasData || hourly.length === 0) return null;
    return hourly.reduce((best, h) => (h.count > best.count ? h : best), hourly[0]);
  }, [hourly, hourlyHasData]);

  const topBar = useMemo(
    () => (stats?.topItems ?? []).slice(0, 10).map((i) => ({ label: i.name, value: i.totalSold })),
    [stats?.topItems]
  );

  const categories = stats?.categoryBreakdown ?? [];
  const daily = stats?.dailyActivity;
  const dailyLabels = (daily?.current ?? []).map((d) => dayLabel(d.date));
  const dailyHasData = seriesHasData([
    ...(daily?.current ?? []).map((d) => d.count),
    ...(daily?.previous ?? []).map((d) => d.count),
  ]);

  const revenue7dTotal = useMemo(() => (stats?.revenue7d ?? []).reduce((s, r) => s + r.revenue, 0), [stats?.revenue7d]);
  const orders7dTotal = useMemo(() => (stats?.orders7d ?? []).reduce((s, o) => s + o.count, 0), [stats?.orders7d]);
  const aovAvg = useMemo(
    () =>
      Math.round(
        (stats?.aovTrend ?? []).reduce((s, a) => s + a.aov, 0) / Math.max(stats?.aovTrend.length ?? 0, 1)
      ),
    [stats?.aovTrend]
  );

  const onRetry = useCallback(() => {
    void load(range);
  }, [load, range]);

  const onUpgrade = useCallback(() => {
    navigation.navigate("OwnerSubscribe", restaurantId !== null ? { restaurantId } : undefined);
  }, [navigation, restaurantId]);

  // ── restaurant-scope guards (the menu screen's grammar) ────────────────
  if (restaurantsPending) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <AnalyticsSkeleton />
      </SafeAreaView>
    );
  }
  if (restaurantsError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <ErrorState message="تعذّر تحميل مطاعمك" onRetry={() => { void refetchRestaurants(); }} />
      </SafeAreaView>
    );
  }
  if (restaurantId === null) {
    /* The web page.tsx:460-463 twin — analytics with no restaurant is the
       K-13 honest empty, not an error. */
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <EmptyState
          title={NO_RESTAURANT_EMPTY_TITLE}
          description={NO_RESTAURANT_EMPTY_DESC}
          icon={<Activity size={24} color={colors.muted} />}
        />
      </SafeAreaView>
    );
  }

  // ── the lock (probe-denied OR the server's 403 — the primary truth) ────
  if (probe === "denied" || locked) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1, justifyContent: "center" }}>
          <PlanFeatureLockCard gate={locked} onUpgrade={onUpgrade} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {/* The filter row — web «تصفية الرسوم حسب الفترة» + FilterTabs twin */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted }}>تصفية الرسوم حسب الفترة</Text>
            <View style={{ flexDirection: "row", gap: 6 }} accessibilityLabel="نطاق التاريخ">
              {RANGE_LABELS.map((r) => {
                const selected = range === r.value;
                return (
                  <PressableScale
                    key={r.value}
                    onPress={() => setRange(r.value)}
                    hitSlop={4}
                    disabled={loading}
                    accessibilityLabel={r.label}
                    accessibilityState={{ selected, disabled: loading }}
                    style={{
                      minHeight: 44,
                      justifyContent: "center",
                      paddingHorizontal: 14,
                      borderRadius: 9999,
                      backgroundColor: selected ? colors.terracotta : colors.surface,
                      borderWidth: 1,
                      borderColor: selected ? colors.terracotta : colors.hairline,
                      opacity: loading && !selected ? 0.6 : 1,
                    }}
                  >
                    <Text
                      style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: selected ? colors.onAccent : colors.ink }}
                      maxFontSizeMultiplier={1.4}
                    >
                      {r.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>

          {/* The KPI row — web KpiCard twins (values stay skeletons until
              real data lands — no fake zeros on a failed first load). */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            <KpiTile
              label="إيرادات 7 أيام"
              value={stats ? formatPrice(revenue7dTotal) : null}
              icon={<DollarSign size={18} color={colors.mint} />}
              iconBg={colors.mintBg}
              trend={stats?.growthPct}
              sparkline={revenueSparkline}
            />
            <KpiTile
              label="طلبات 7 أيام"
              value={stats ? toArabicNumber(orders7dTotal) : null}
              icon={<TrendingUp size={18} color={colors.terracotta} />}
              iconBg={colors.terracottaSoft}
              sparkline={ordersSparkline}
            />
            <KpiTile
              label="متوسط قيمة الطلب"
              value={stats ? formatPrice(aovAvg) : null}
              icon={<Activity size={18} color={colors.sky} />}
              iconBg={colors.skyBg}
            />
            <KpiTile
              label="النمو"
              value={stats ? `${toArabicNumber(stats.growthPct ?? 0)}%` : null}
              icon={<TrendingUp size={18} color={colors.terracotta} />}
              iconBg={colors.terracottaSoft}
              trend={stats?.growthPct}
            />
          </View>

          {/* ساعات الذروة — SplineAreaChart */}
          <ChartCard
            title="ساعات الذروة والإقبال"
            description="منحنى الطلبات حسب الساعة خلال الفترة المحددة"
            icon={<Clock size={16} color={colors.muted} />}
            loading={loading}
            error={error}
            onRetry={onRetry}
            empty={!hourlyHasData}
            emptyTitle="لا توجد زيارات مسجلة بعد"
            emptyDescription="سيظهر توزيع ساعات الذروة هنا مع أول الطلبات."
            summary={peak ? `ساعة الذروة ${hourLabel(peak.hour)} بعدد ${peakOrdersPhrase(peak.count)}` : undefined}
          >
            {peak ? (
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, marginBottom: 12 }}>
                الذروة: <Text style={{ fontWeight: "600", color: colors.ink }}>{hourLabel(peak.hour)}</Text> — {peakOrdersPhrase(peak.count)}
              </Text>
            ) : null}
            <SplineAreaChart
              labels={hourly.map((h) => hourLabel(h.hour))}
              series={[
                {
                  id: "traffic",
                  label: "الطلبات",
                  values: hourly.map((h) => h.count),
                },
              ]}
              ariaLabel="ساعات الذروة والإقبال"
              height={220}
            />
          </ChartCard>

          {/* الأصناف الأكثر طلباً — HorizontalBar + growth list */}
          <ChartCard
            title="الأصناف الأكثر طلباً ومعاينة"
            description="أعلى 10 أصناف حسب كمية الطلب"
            icon={<Activity size={16} color={colors.muted} />}
            loading={loading}
            error={error}
            onRetry={onRetry}
            empty={topBar.length === 0}
            emptyTitle="لا توجد أصناف مطلوبة بعد"
            emptyDescription="سيظهر ترتيب الأصناف الأكثر طلباً هنا مع نموّها."
          >
            <HorizontalBar data={topBar} maxItems={10} />
            {stats?.topItems && stats.topItems.length > 0 ? (
              <View style={{ marginTop: 12, gap: 4 }}>
                {stats.topItems.slice(0, 10).map((item, idx) =>
                  item.growth !== 0 ? (
                    <View key={item.itemId} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <Text style={{ flex: 1, fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted }} numberOfLines={1}>
                        {toArabicNumber(idx + 1)}. {item.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "IBM Plex Sans Arabic",
                          fontSize: 12,
                          fontWeight: "600",
                          color: item.growth > 0 ? colors.mint : colors.rose,
                          fontVariant: METRIC_FONT_VARIANT,
                        }}
                      >
                        {item.growth > 0 ? "↑" : "↓"}
                        {toArabicNumber(Math.abs(item.growth))}%
                      </Text>
                    </View>
                  ) : null
                )}
              </View>
            ) : null}
          </ChartCard>

          {/* توزيع المبيعات حسب التصنيفات — DoughnutChart */}
          <ChartCard
            title="توزيع المبيعات حسب التصنيفات"
            description="نسبة الطلبات عبر تصنيفات المنيو"
            icon={<PieChart size={16} color={colors.muted} />}
            loading={loading}
            error={error}
            onRetry={onRetry}
            empty={categories.length === 0 || !seriesHasData(categories.map((c) => c.count))}
            emptyTitle="لا يوجد توزيع تصنيفات بعد"
            emptyDescription="ستظهر نسب التصنيفات هنا بعد تسجيل الطلبات."
          >
            <DoughnutChart
              data={categories.map((c) => ({
                id: c.categoryId,
                label: c.name,
                value: c.count,
              }))}
              ariaLabel="توزيع المبيعات حسب التصنيفات"
              centerLabel="صنف مباع"
            />
          </ChartCard>

          {/* مؤشر التفاعل اليومي — ColumnChart (current vs previous month) */}
          <ChartCard
            title="مؤشر التفاعل اليومي"
            description="عدد الطلبات اليومية للشهر الحالي مقارنة بالشهر السابق"
            icon={<Activity size={16} color={colors.muted} />}
            loading={loading}
            error={error}
            onRetry={onRetry}
            empty={!dailyHasData}
            emptyTitle="لا يوجد نشاط يومي بعد"
            emptyDescription="ستظهر مقارنة الشهر الحالي بالسابق هنا مع أول الطلبات."
          >
            <ColumnChart
              labels={dailyLabels}
              series={[
                {
                  id: "current",
                  label: "الشهر الحالي",
                  values: (daily?.current ?? []).map((d) => d.count),
                },
                {
                  id: "previous",
                  label: "الشهر السابق",
                  values: (daily?.previous ?? []).map((d) => d.count),
                },
              ]}
              ariaLabel="مؤشر التفاعل اليومي مقارنة بالشهر السابق"
              height={240}
            />
          </ChartCard>

          {/* اتجاه الإيرادات (7 أيام) — AreaChart */}
          <ChartCard
            title="اتجاه الإيرادات (7 أيام)"
            icon={<DollarSign size={16} color={colors.muted} />}
            loading={loading}
            error={error}
            onRetry={onRetry}
            empty={!(chartData.length > 0 && seriesHasData(chartData.map((d) => d.value)))}
            emptyTitle="لا توجد بيانات إيرادات بعد"
            emptyDescription="ستظهر الإيرادات هنا مع أول الطلبات"
          >
            {chartData.length > 0 ? <AreaChart data={chartData} height={200} /> : null}
          </ChartCard>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

/** The dashboard Kpi grammar (surface card r-12 + Baloo value + 11px label)
 *  with the web KpiCard's trend/sparkline lane. value=null → skeleton
 *  (unknown), never a fake zero. */
function KpiTile({
  label,
  value,
  icon,
  iconBg,
  trend,
  sparkline,
}: {
  label: string;
  value: string | null;
  icon: React.ReactNode;
  iconBg: string;
  trend?: number;
  sparkline?: number[];
}) {
  return (
    <View style={{ width: "48.5%", backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.hairline }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <View style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
          {icon}
        </View>
        {trend !== undefined ? (
          <Text
            style={{
              fontFamily: "IBM Plex Sans Arabic",
              fontSize: 12,
              fontWeight: "600",
              color: trend >= 0 ? colors.mint : colors.rose,
              fontVariant: METRIC_FONT_VARIANT,
            }}
          >
            {trend >= 0 ? "↑" : "↓"} {toArabicNumber(Math.abs(trend))}%
          </Text>
        ) : null}
      </View>
      {value !== null ? (
        <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 18, fontWeight: "700", color: colors.ink, fontVariant: METRIC_FONT_VARIANT }}>
          {value}
        </Text>
      ) : (
        <Skeleton width={"55%"} height={18} />
      )}
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 2 }}>{label}</Text>
      {sparkline && sparkline.length > 1 ? (
        <View style={{ marginTop: 8, alignItems: "flex-start" }}>
          <MiniSparkline data={sparkline} />
        </View>
      ) : null}
    </View>
  );
}

/** The shape-matched first-paint skeleton — the loaded layout's geometry:
 *  the range-pills row, the 2×2 KPI tiles, then chart-card blocks (the
 *  r131 fleet ruling "loading = shape skeletons"). */
function AnalyticsSkeleton() {
  return (
    <View style={{ padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Skeleton width={120} height={12} />
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Skeleton width={56} height={32} borderRadius={9999} />
          <Skeleton width={72} height={32} borderRadius={9999} />
          <Skeleton width={72} height={32} borderRadius={9999} />
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ width: "48.5%", backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.hairline, gap: 8 }}>
            <Skeleton width={36} height={36} borderRadius={9999} />
            <Skeleton width={"55%"} height={18} />
            <Skeleton width={"40%"} height={11} />
          </View>
        ))}
      </View>
      {[0, 1].map((i) => (
        <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.hairline, marginBottom: 16, gap: 12 }}>
          <Skeleton width={"45%"} height={12} />
          <Skeleton width={"100%"} height={160} borderRadius={12} />
        </View>
      ))}
    </View>
  );
}
