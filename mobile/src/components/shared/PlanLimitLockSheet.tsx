/**
 * P42-5b (GAP-X1) — the native plan-lock surface: the honest answer to a
 * plan-cap 403 on the owner screens.
 *
 * WHAT THIS CLOSES: plan-limit server refusals surfaced on native as a bare
 * server-copy toast with NO upgrade door (OwnerMenu item-cap saves /
 * OwnerRestaurants menu-cap creates), while the web surfaces the same states
 * honestly — the unified Arabic 403 copy (src/lib/plan-limit-error.ts:31),
 * the feature-lock family (src/components/shared/PlanFeatureLock.tsx:20 —
 * «تعطيل + تفسير + رابط ترقية — لا زر ميت») and the at-cap usage badge with
 * its «ترقية» door (src/components/owner/PlanUsageBadge.tsx:108-114). This
 * sheet is the native twin of that family: explain the real blocker with the
 * server's verbatim copy, then hand the owner the upgrade door.
 *
 * COPY (mirrored verbatim where the web copy exists):
 *   · heading   «وصلت للحد الأقصى» — the web badge's at-cap line
 *              (PlanUsageBadge.tsx:131 «وصلت للحد الأقصى. قم بترقية خطتك.»).
 *   · body      the SERVER message verbatim (the unified PlanLimitError copy
 *              the web toast also shows — kind, limit and plan all named).
 *   · promise   «بيانات مطعمك الحالية ستبقى كما هي — فقط سيتم ترقية خطتك.»
 *              — the web upgrade summary's reassurance line
 *              (src/app/(protected)/subscribe/PaymentSection.tsx:46).
 *   · CTA       «رقِّ خطتك» — routes into the native upgrade flow
 *              (OwnerSubscribe — the web /subscribe upgrade-mode twin).
 *
 * SHEET GRAMMAR: the app's non-blocking state pattern (AppBottomSheet —
 * swipe-dismiss + backdrop tap + 380ms plate-round entrance). BottomSheetModal's
 * default stackBehavior is "switch": presenting this lock over the item form
 * sheet swaps the form out — the cap makes that save permanently unsaveable,
 * so the lock REPLACES the dead end instead of stacking above it.
 *
 * The screen-reader twin of the toast's announceForAccessibility
 * (app/providers.tsx:163): the server message is announced once on mount —
 * sheets render in a portal outside the tree the reader walks.
 */
import { useEffect } from "react";
import { AccessibilityInfo, View } from "react-native";
import { Lock, X } from "lucide-react-native";

import { AppBottomSheet } from "@/components/shared/AppBottomSheet";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { colors } from "@/theme/colors";
import type { PlanLimitDetails } from "@/lib/plan-limit";

/** «وصلت للحد الأقصى» — web PlanUsageBadge.tsx:131 (the at-cap line). */
export const PLAN_LIMIT_LOCK_TITLE = "وصلت للحد الأقصى";

/** «رقِّ خطتك» — the upgrade door (web family: «الترقية» /
 *  «رقِّ خطة مطعمك», PlanFeatureLock.tsx:46 + SubscribeClient.tsx:427). */
export const PLAN_LIMIT_LOCK_CTA = "رقِّ خطتك";

/** Web PaymentSection.tsx:46 — the upgrade promise, verbatim. */
export const PLAN_LIMIT_LOCK_PROMISE =
  "بيانات مطعمك الحالية ستبقى كما هي — فقط سيتم ترقية خطتك.";

export function PlanLimitLockSheet({
  details,
  onUpgrade,
  onClose,
}: {
  /** The classifier's parse of the server's plan-cap 403. */
  details: PlanLimitDetails;
  /** Opens the upgrade flow (OwnerSubscribe). */
  onUpgrade: () => void;
  /** Fired once the sheet has fully closed, for ANY reason. */
  onClose: () => void;
}) {
  // SR announcement — the toast twin (providers.tsx:163): the sheet body
  // renders in a portal, so the reader never walks it on focus changes.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(details.message);
  }, [details.message]);

  return (
    <AppBottomSheet
      snapPoints={["58%"]}
      onClose={onClose}
      header={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/* The lock glyph in the warm terracotta well — the web
              PlanFeatureLock lock-well twin (orange-muted circle + Lock). */}
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.terracottaSoft, alignItems: "center", justifyContent: "center" }}>
            <Lock size={20} color={colors.terracottaPressed} />
          </View>
          <Text
            style={{ flex: 1, fontFamily: "Baloo Bhaijaan 2", fontSize: 18, fontWeight: "700", color: colors.ink }}
            numberOfLines={1}
          >
            {PLAN_LIMIT_LOCK_TITLE}
          </Text>
          <PressableScale onPress={onClose} hitSlop={12} accessibilityLabel="إغلاق">
            <X size={20} color={colors.muted} />
          </PressableScale>
        </View>
      }
      footer={
        <Button
          title={PLAN_LIMIT_LOCK_CTA}
          onPress={onUpgrade}
          size="lg"
          className="w-full"
        />
      }
    >
      <View style={{ gap: 14, paddingTop: 8 }}>
        {/* The honest explanation — the server's unified 403 copy VERBATIM
            (kind + limit + plan + remedy), the same line the web toast
            shows. No paraphrase, no softened «تعذّر الحفظ». */}
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ backgroundColor: colors.surface2, borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, padding: 14 }}
        >
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "600", color: colors.ink, lineHeight: 22 }}>
            {details.message}
          </Text>
        </View>
        {/* The upgrade promise — web PaymentSection.tsx:46, verbatim: the
            owner must know the upgrade never touches their data. */}
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, lineHeight: 19 }}>
          {PLAN_LIMIT_LOCK_PROMISE}
        </Text>
      </View>
    </AppBottomSheet>
  );
}
