/**
 * r129-F5: the trust band — the quiet mono DATA strip (web .ln-trust,
 * landing.css §3 canonical landing.css:728-764): ink-2 ground, hairline
 * block borders, mono 13px cream figures with CountUp, 26×1 separators.
 *
 * Never-fake rule (r82, web HomePage trustCells): the two REAL live
 * figures from /api/public/stats render when available; otherwise the
 * cells degrade honestly to "—" — never a fabricated number. The retry
 * affordance (ghost pill) appears only when the request actually failed.
 */
import React from "react";
import { View } from "react-native";
import { RefreshCw } from "lucide-react-native";

import { Text } from "@/components/ui/Text";
import { useCountUp, ltrIsolate } from "@/components/landing/useCountUp";
import { LandingPill } from "@/components/landing/LandingPill";
import { landing } from "@/theme/landing";
import { spacing } from "@/theme/spacing";

export interface PublicStats {
  totalRestaurants: number;
  totalUsers: number;
}

/** The honest fallback figure — an em-dash, never a fake number. */
export const TRUST_FALLBACK_VALUE = "—";

/** The web trust labels (HomePage.tsx trustCells). */
const TRUST_LABELS = { restaurants: "مطعم مسجل", users: "حساب نشط" } as const;

/** .ln-trust-sep — 26×1 hairline separator. */
const SEP_WIDTH = 26;

function TrustCell({ value, label }: { value: string; label: string }) {
  const display = useCountUp(value);
  return (
    <Text
      style={{ color: landing.ink, fontSize: 13, textAlign: "center" }}
      maxFontSizeMultiplier={1.4}
      accessibilityLabel={`${label}: ${value === TRUST_FALLBACK_VALUE ? "غير متوفر" : value}`}
    >
      {/* Latin/digits run in IBM Plex Mono; the Arabic label continues in
          the brand sans — the web --ln-mono per-run fallback. */}
      <Text style={{ fontFamily: "IBM Plex Mono", letterSpacing: 0.08 }}>
        {ltrIsolate(display)}
      </Text>
      {"  "}
      <Text style={{ fontFamily: "IBM Plex Sans Arabic" }}>{label}</Text>
    </Text>
  );
}

export function TrustBand({
  stats,
  failed,
  onRetry,
}: {
  stats: PublicStats | null;
  failed: boolean;
  onRetry: () => void;
}) {
  // The two REAL live figures; unavailable → the honest "—" cells.
  const cells = stats
    ? [
        { value: `+${stats.totalRestaurants}`, label: TRUST_LABELS.restaurants },
        { value: `+${stats.totalUsers}`, label: TRUST_LABELS.users },
      ]
    : [
        { value: TRUST_FALLBACK_VALUE, label: TRUST_LABELS.restaurants },
        { value: TRUST_FALLBACK_VALUE, label: TRUST_LABELS.users },
      ];

  return (
    // .ln-trust — ink-2 ground, hairline block borders (full-bleed band)
    <View
      accessibilityLabel="أرقام المنصّة"
      style={{
        backgroundColor: landing.paper2,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: landing.line,
        paddingVertical: spacing.sp5,
        paddingHorizontal: spacing.sp4,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sp3,
        }}
      >
        {cells.map((cell, i) => (
          <React.Fragment key={cell.label}>
            {i > 0 ? (
              <View
                style={{ width: SEP_WIDTH, height: 1, backgroundColor: landing.line }}
              />
            ) : null}
            <TrustCell value={cell.value} label={cell.label} />
          </React.Fragment>
        ))}
        {failed ? (
          <LandingPill
            variant="ghost"
            label="إعادة المحاولة"
            onPress={onRetry}
            icon={<RefreshCw size={14} color={landing.inkDim} />}
            accessibilityHint="إعادة تحميل أرقام المنصّة"
          />
        ) : null}
      </View>
    </View>
  );
}
