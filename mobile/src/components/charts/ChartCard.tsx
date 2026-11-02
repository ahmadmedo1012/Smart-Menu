/**
 * P42-5d (GAP-MENU-1) — ChartCard, the mobile twin of web
 * src/components/shared/ChartCard.tsx: the one plate every analytics panel
 * rides — header (icon + title + description) and the honest state family
 * (loading shape / error + retry / empty / content), so a chart NEVER
 * invents zeros or blames the network for a server failure.
 *
 * Grammar (the app's own, not web CSS): raised-plate surface + hairline +
 * the 16 plate-round rung; loading = the CHART-SHAPED skeleton (the web's
 * h-3 title line + h-160 chart block — r131 fleet ruling "loading = shape
 * skeletons"); error = the rose well family with the SAME copy the web
 * card carries; empty = the 56px grey well + 18/600 title (r131-F10).
 *
 * The web `summary` line is sr-only there — on native it rides the
 * section's accessibilityLabel (RN has no sr-only; the visible twin is the
 * children's own summary line, exactly like the web's الذروة line).
 */
import type { ReactNode } from "react";
import { View } from "react-native";
import { TriangleAlert } from "lucide-react-native";

import { Text } from "@/components/ui/Text";
import { Skeleton } from "@/components/ui/Skeleton";
import { PressableScale } from "@/components/motion/PressableScale";
import { colors, pastelFamilies } from "@/theme/colors";
import { radius } from "@/theme/radius";

/** «إعادة المحاولة» — web ChartCard.tsx:80 retry label, verbatim. */
export const CHART_CARD_RETRY_LABEL = "إعادة المحاولة";

/** Loading announce — web ChartCard.tsx:66 aria-label, verbatim. */
const CHART_CARD_LOADING_LABEL = "جارٍ تحميل الرسم البياني";

interface ChartCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  /** SR summary of the plotted data (the web sr-only twin). */
  summary?: string;
  children: ReactNode;
}

export function ChartCard({
  title,
  description,
  icon,
  loading = false,
  error = null,
  empty = false,
  emptyTitle = "لا توجد بيانات بعد",
  emptyDescription = "ستظهر النتائج هنا بعد وصول أول الطلبات.",
  onRetry,
  summary,
  children,
}: ChartCardProps) {
  return (
    <View
      accessibilityLabel={summary ? `${title}. ${summary}` : title}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.hairline,
        padding: 16,
      }}
    >
      <View style={{ marginBottom: 16, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon}
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.ink }}>{title}</Text>
        </View>
        {description ? (
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, lineHeight: 18 }}>{description}</Text>
        ) : null}
      </View>

      {loading ? (
        /* The chart-shaped skeleton — the web's h-[220px] justify-end
           column: title line (h-3 w-24) + the h-[160px] chart block. */
        <View
          accessibilityLabel={CHART_CARD_LOADING_LABEL}
          accessibilityState={{ busy: true }}
          style={{ minHeight: 220, justifyContent: "flex-end", gap: 12 }}
        >
          <Skeleton width={96} height={12} />
          <Skeleton width={"100%"} height={160} borderRadius={radius.sm} />
        </View>
      ) : error ? (
        <View style={{ minHeight: 200, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <TriangleAlert size={24} color={colors.rose} />
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "600", color: colors.ink, textAlign: "center" }}>{error}</Text>
          {onRetry ? (
            <PressableScale
              onPress={onRetry}
              accessibilityLabel={CHART_CARD_RETRY_LABEL}
              style={{
                minHeight: 44,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.hairlineStrong,
                backgroundColor: colors.surface2,
                paddingHorizontal: 16,
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink }} maxFontSizeMultiplier={1.4}>
                {CHART_CARD_RETRY_LABEL}
              </Text>
            </PressableScale>
          ) : null}
        </View>
      ) : empty ? (
        /* The EmptyState grammar card-scoped — 56px grey well + 18/600. */
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 24 }}>
          <View style={{
            width: 56, height: 56, borderRadius: radius.xl,
            backgroundColor: pastelFamilies.grey.bg,
            alignItems: "center", justifyContent: "center", marginBottom: 16,
          }}>
            {icon ?? <TriangleAlert size={24} color={pastelFamilies.grey.deep} />}
          </View>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "600", color: colors.ink, textAlign: "center" }}>{emptyTitle}</Text>
          {emptyDescription ? (
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 19 }}>{emptyDescription}</Text>
          ) : null}
        </View>
      ) : (
        children
      )}
    </View>
  );
}
