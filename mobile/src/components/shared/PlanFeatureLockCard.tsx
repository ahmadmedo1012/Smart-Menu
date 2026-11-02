/**
 * P42-5d (GAP-MENU-1) — PlanFeatureLockCard, the mobile twin of web
 * src/components/shared/PlanFeatureLock.tsx (the FEATURE-gate lock family —
 * «تعطيل + تفسير + رابط ترقية — لا زر ميت»), the inline state the
 * advanced-analytics screen renders when the plan tier is below the
 * feature's minimum.
 *
 * COPY (mirrored verbatim from the web source of truth):
 *   · title       «${labelAr} متوفرة في خطة «${minPlanNameAr}» فأعلى»
 *                 (PlanFeatureLock.tsx:31 — for advancedStats:
 *                 «الإحصائيات المتقدمة متوفرة في خطة «بريميوم» فأعلى»)
 *   · description «قم بترقية خطتك لفتح هذه الميزة والاستفادة من كامل
 *                 قدرات منصتك.» (PlanFeatureLock.tsx:32)
 *   · CTA         «الترقية إلى خطة ${minPlanNameAr}» (PlanFeatureLock.tsx:72
 *                 — «الترقية إلى خطة بريميوم»)
 *
 * DIFFERENT FAMILY from PlanLimitLockSheet (5e74620f): that sheet answers a
 * count-CAP refusal mid-action (a modal interruption); this card is the
 * STATE of a gated screen (the web replaces the tab panel with the lock —
 * no hiding, no fake loading). When the lock comes from the server's 403
 * (the primary truth — plan changed mid-session), the server message rides
 * verbatim in its own well (the PlanLimitLockSheet precedent), above the
 * static family copy.
 *
 * THE DOOR: the CTA routes to OwnerSubscribe (the web /subscribe
 * upgrade-mode twin) carrying the restaurant id — the same context-carrying
 * doctrine as 5e74620f (the web /subscribe probe resolves the owner's
 * primary link; the native flow accepts the explicit context first).
 */
import { useEffect } from "react";
import { AccessibilityInfo, View } from "react-native";
import { Lock } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { PLAN_FEATURE_ADVANCED_STATS } from "@/lib/plan-feature-gate";
import type { PlanFeatureGateDetails } from "@/lib/plan-feature-gate";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";

/** Web PlanFeatureLock.tsx:31 title pattern, advancedStats values. */
export const PLAN_FEATURE_LOCK_TITLE = `${PLAN_FEATURE_ADVANCED_STATS.labelAr} متوفرة في خطة «${PLAN_FEATURE_ADVANCED_STATS.minPlanNameAr}» فأعلى`;

/** Web PlanFeatureLock.tsx:32 description, verbatim. */
export const PLAN_FEATURE_LOCK_DESCRIPTION =
  "قم بترقية خطتك لفتح هذه الميزة والاستفادة من كامل قدرات منصتك.";

/** Web PlanFeatureLock.tsx:72 CTA pattern, advancedStats value. */
export const PLAN_FEATURE_LOCK_CTA = `الترقية إلى خطة ${PLAN_FEATURE_ADVANCED_STATS.minPlanNameAr}`;

export function PlanFeatureLockCard({
  /** The classifier's parse of the server's 403 (when the lock is server-fed). */
  gate,
  /** Opens the upgrade flow (OwnerSubscribe). */
  onUpgrade,
}: {
  gate?: PlanFeatureGateDetails | null;
  onUpgrade: () => void;
}) {
  // SR announcement — the toast twin (providers.tsx:163): the screen content
  // was replaced by this lock; the reader should hear WHY once, not just
  // observe the swap.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(gate ? gate.message : PLAN_FEATURE_LOCK_TITLE);
  }, [gate]);

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.hairline,
        padding: 24,
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* The lock glyph in the warm terracotta well — the web lock-well twin
          (orange-muted circle + Lock, PlanFeatureLock.tsx:61-63). */}
      <View style={{ width: 48, height: 48, borderRadius: 9999, backgroundColor: colors.terracottaSoft, alignItems: "center", justifyContent: "center" }}>
        <Lock size={24} color={colors.terracotta} />
      </View>
      {gate ? (
        /* The server's verbatim 403 copy — the primary truth (the same line
           the web toasts); shown ABOVE the static family copy when the lock
           is server-fed, so plan-change-mid-session never goes unexplained. */
        <View style={{ backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline, padding: 12, alignSelf: "stretch" }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink, textAlign: "center", lineHeight: 20 }}>
            {gate.message}
          </Text>
        </View>
      ) : null}
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.ink, textAlign: "center", lineHeight: 21 }}>
        {PLAN_FEATURE_LOCK_TITLE}
      </Text>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, textAlign: "center", lineHeight: 19, maxWidth: 340 }}>
        {PLAN_FEATURE_LOCK_DESCRIPTION}
      </Text>
      {/* The working upgrade door — no dead button, no fake unlock. */}
      <Button title={PLAN_FEATURE_LOCK_CTA} onPress={onUpgrade} size="lg" className="w-full" />
    </View>
  );
}
