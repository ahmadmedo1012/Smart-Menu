/**
 * Phase 6 (P6-2-cR): «التقييمات» becomes a REAL screen — the web
 * /owner/reviews twin on the typed OWNER API:
 *
 *   · stats header — total + avg + the 5→1 distribution bars (round87-C5:
 *     SERVER-computed over the FULL tenant set via the envelope `stats`
 *     extra; the client never recomputes them, so they stay correct past
 *     page 1 and under the star filter)
 *   · filter chips — الكل / 5⭐…1⭐ ride `minRating` server-side (the old
 *     web client-side re-filter was a duplicate of server logic)
 *   · moderation delete with a destructive confirm
 *     (DELETE /api/items/[id]/reviews?reviewId= — the r103-F5b contract)
 *
 * Warm grammar: Baloo headers, terracotta actions, shape skeletons,
 * 56px empty well, pull-to-refresh, 44px targets.
 */
import { useState } from "react";
import { View, FlatList, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Star, Trash2, MessageCircle } from "lucide-react-native";
import Animated from "react-native-reanimated";

import { getOwnerReviews, deleteOwnerReview, type OwnerReview, type OwnerReviewsStats } from "@/services/api/client";
import { EmptyState, ErrorState } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { useEnterFade } from "@/components/motion/useEnterFade";
import { colors, pastelFamilies } from "@/theme/colors";
import { METRIC_FONT_VARIANT } from "@/theme/typography";
import { toArabicNumber } from "@/lib/format";
import { formatRelativeTimeAr } from "@/lib/order-status";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "@/app/providers";

/** Web twin: pageSize=100 covers the whole tenant set in one page. */
const REVIEWS_PAGE_SIZE = 100;

const EMPTY_STATS: OwnerReviewsStats = {
  total: 0,
  avg: 0,
  distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0 })),
};

type Filter = number | null;

export function OwnerReviewsScreen() {
  const enterFade = useEnterFade();
  const [filterStar, setFilterStar] = useState<Filter>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isPending, error, refetch, isRefetching } = useQuery({
    queryKey: ["owner-reviews", filterStar],
    queryFn: () => getOwnerReviews({ pageSize: REVIEWS_PAGE_SIZE, minRating: filterStar ?? undefined }),
  });

  const reviews: OwnerReview[] = data?.data ?? [];
  const stats: OwnerReviewsStats = data?.stats ?? EMPTY_STATS;

  const confirmDelete = (review: OwnerReview) => {
    Alert.alert(
      "حذف التقييم",
      `سيُحذف تقييم ${review.customerName || "مجهول"} (${toArabicNumber(review.rating)} نجوم) على «${review.menuItem?.nameAr || review.menuItem?.name || "—"}» نهائيًا وسيُعاد حساب متوسط التقييم.`,
      [
        { text: "رجوع", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: () => { void doDelete(review); } },
      ],
      { cancelable: true },
    );
  };

  const doDelete = async (review: OwnerReview) => {
    setDeletingId(review.id);
    try {
      await deleteOwnerReview(review.menuItemId, review.id);
      toast.success("تم حذف التقييم");
      void refetch();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "تعذّر حذف التقييم"));
    } finally {
      setDeletingId(null);
    }
  };

  if (isPending) {
    /* Shape skeleton — the stats grid (2 half KPIs + the distribution
       card) then review rows (stars + name line, comment lines, footer). */
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.hairline }}>
                <Skeleton width={"50%"} height={11} />
                <Skeleton width={"35%"} height={24} />
              </View>
            ))}
          </View>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginVertical: 8, borderWidth: 1, borderColor: colors.hairline, gap: 10 }}>
            <Skeleton width={"40%"} height={11} />
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Skeleton width={28} height={11} />
                <View style={{ flex: 1, height: 8, borderRadius: 9999, backgroundColor: colors.surface2, overflow: "hidden" }} />
                <Skeleton width={20} height={11} />
              </View>
            ))}
          </View>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.hairline, gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ gap: 6 }}>
                  <Skeleton width={90} height={12} />
                  <Skeleton width={120} height={11} />
                </View>
                <Skeleton width={56} height={11} />
              </View>
              <Skeleton width={"85%"} height={12} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <ErrorState message={getErrorMessage(error, "تعذّر تحميل التقييمات")} onRetry={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
        <FlatList
          data={reviews}
          keyExtractor={(review) => String(review.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} tintColor={colors.terracotta} />}
          ListHeaderComponent={
            <View>
              {/* Stats — server-computed over the FULL set (round87-C5). */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.hairline }}>
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted }}>إجمالي التقييمات</Text>
                  <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 22, fontWeight: "700", color: colors.ink, fontVariant: METRIC_FONT_VARIANT }}>{toArabicNumber(stats.total)}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.hairline }}>
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted }}>متوسط التقييم</Text>
                  <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 22, fontWeight: "700", color: colors.yellow, fontVariant: METRIC_FONT_VARIANT }}>{stats.avg > 0 ? stats.avg.toFixed(1) : "—"}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.hairline }}>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginBottom: 8 }}>توزيع التقييمات</Text>
                {stats.distribution.map((d) => (
                  <View key={d.star} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 3 }}>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, width: 34, fontVariant: METRIC_FONT_VARIANT }}>{toArabicNumber(d.star)} نجوم</Text>
                    <View style={{ flex: 1, height: 8, borderRadius: 9999, backgroundColor: colors.surface2, overflow: "hidden" }}>
                      <View style={{ height: 8, borderRadius: 9999, backgroundColor: colors.yellow, width: `${stats.total > 0 ? (d.count / stats.total) * 100 : 0}%` }} />
                    </View>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, width: 22, textAlign: "right", fontVariant: METRIC_FONT_VARIANT }}>{toArabicNumber(d.count)}</Text>
                  </View>
                ))}
              </View>

              {/* Filter chips — the star filter rides minRating server-side. */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {([null, 5, 4, 3, 2, 1] as Filter[]).map((star) => {
                  const selected = filterStar === star;
                  return (
                    <PressableScale
                      key={star ?? "all"}
                      onPress={() => setFilterStar(star)}
                      hitSlop={4}
                      accessibilityLabel={star ? `تقييمات ${toArabicNumber(star)} نجوم` : "كل التقييمات"}
                      accessibilityState={{ selected }}
                      style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9999, backgroundColor: selected ? colors.terracotta : colors.surface, borderWidth: 1, borderColor: selected ? colors.terracotta : colors.hairline }}
                    >
                      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: selected ? colors.onAccent : colors.muted, fontVariant: METRIC_FONT_VARIANT }} maxFontSizeMultiplier={1.4}>
                        {star ? `${toArabicNumber(star)} نجوم` : "الكل"}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          }
          renderItem={({ item: review }) => (
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.hairline }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <View style={{ flexDirection: "row", gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={14} color={s <= review.rating ? colors.yellow : colors.hairlineStrong} fill={s <= review.rating ? colors.yellow : "transparent"} />
                      ))}
                    </View>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, flexShrink: 1 }} numberOfLines={1}>{review.customerName || "مجهول"}</Text>
                  </View>
                  {review.menuItem ? (
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: colors.terracottaPressed, marginBottom: 4 }} numberOfLines={1}>
                      {review.menuItem.nameAr || review.menuItem.name}
                    </Text>
                  ) : null}
                  {review.comment ? (
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.ink, lineHeight: 20 }}>{review.comment}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end", gap: 8 }}>
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 10, color: colors.muted }}>{formatRelativeTimeAr(review.createdAt)}</Text>
                  <PressableScale
                    onPress={() => confirmDelete(review)}
                    disabled={deletingId === review.id}
                    hitSlop={4}
                    accessibilityLabel={`حذف تقييم ${review.customerName || "مجهول"}`}
                    accessibilityState={deletingId === review.id ? { busy: true } : undefined}
                    style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.roseBg, alignItems: "center", justifyContent: "center", opacity: deletingId === review.id ? 0.45 : 1 }}
                  >
                    <Trash2 size={16} color={colors.rose} />
                  </PressableScale>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="لا توجد تقييمات"
              description={filterStar ? "لا توجد تقييمات بهذا عدد النجوم — جرّب تصفية أخرى" : "عندما يقوم العملاء بتقييم الأصناف ستظهر هنا"}
              icon={<MessageCircle size={24} color={pastelFamilies.grey.deep} />}
            />
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
}
