/**
 * P42-5d (GAP-MENU-1) — HorizontalBar, the mobile twin of web
 * src/components/shared/HorizontalBar.tsx (the «الأصناف الأكثر طلباً»
 * ranking). The web implementation is div/CSS (NOT SVG) — so the native
 * twin is View-based too: the rank tile (1st on the terracotta fill, top-3
 * on the soft copper, rest muted), the label + value row, and the 2px
 * progress bar (rounded track + terracotta fill at value/max %).
 *
 * RTL: the fill grows from the reading start (right in the app's forced
 * RTL) via alignSelf flex-start — the same visual direction the web div
 * fills in an RTL container.
 */
import { View } from "react-native";

import { Text } from "@/components/ui/Text";
import { toArabicNumber } from "@/lib/format";
import { colors } from "@/theme/colors";
import { METRIC_FONT_VARIANT } from "@/theme/typography";

interface BarItem {
  label: string;
  value: number;
}

interface HorizontalBarProps {
  data: BarItem[];
  maxItems?: number;
}

export function HorizontalBar({ data, maxItems = 10 }: HorizontalBarProps) {
  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, maxItems);
  const maxVal = Math.max(...sorted.map((d) => d.value), 1);

  if (sorted.length === 0) return null;

  return (
    <View style={{ gap: 8 }}>
      {sorted.map((item, i) => {
        const pct = (item.value / maxVal) * 100;
        return (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {/* Rank tile — 1st terracotta/onAccent · top-3 soft copper · rest muted */}
            <View
              style={{
                width: 24, height: 24, borderRadius: 6,
                alignItems: "center", justifyContent: "center",
                backgroundColor: i === 0 ? colors.terracotta : i < 3 ? colors.terracottaSoft : colors.surface2,
              }}
            >
              <Text
                style={{
                  fontFamily: "IBM Plex Sans Arabic", fontSize: 11, fontWeight: "700",
                  color: i === 0 ? colors.onAccent : colors.ink,
                  fontVariant: METRIC_FONT_VARIANT,
                }}
              >
                {toArabicNumber(i + 1)}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink, flexShrink: 1 }} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, fontVariant: METRIC_FONT_VARIANT }}>
                  {toArabicNumber(item.value)}
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: 9999, backgroundColor: colors.surface2, overflow: "hidden" }}>
                <View style={{ height: "100%", borderRadius: 9999, backgroundColor: colors.terracotta, width: `${pct}%`, alignSelf: "flex-start" }} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
