/**
 * P42-5d (GAP-MENU-1) — DoughnutChart, the react-native-svg twin of web
 * src/components/shared/DoughnutChart.tsx (the «توزيع المبيعات حسب
 * التصنيفات» panel's shape). Same geometry — 220 viewBox, outer 86 /
 * inner 54, donutSlicePath arcs starting at 12 o'clock, the center total
 * + label, the legend rows with dot + value · pct and the slice toggles.
 *
 * Honest adaptation (no web CSS, no pointer): the slice roster rides the
 * mobile 5-color chart tokens (the server share-cap is 5 slices — 4 named
 * + «أخرى»); the web hover-grow (+4 outer) becomes a PRESS-grow (the
 * touch twin of the pointer affordance — tap a legend row to toggle, tap
 * a slice to spotlight it). Values ride toArabicNumber like the web.
 */
import { useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";

import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { CHART_SERIES } from "./chart-tokens";
import { donutSlicePath } from "./chart-geometry";
import { toArabicNumber } from "@/lib/format";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { METRIC_FONT_VARIANT } from "@/theme/typography";

export interface DoughnutSlice {
  id: string | number;
  label: string;
  value: number;
  color?: string;
}

interface DoughnutChartProps {
  data: DoughnutSlice[];
  ariaLabel?: string;
  centerLabel?: string;
}

export function DoughnutChart({
  data,
  ariaLabel = "رسم دائري",
  centerLabel,
}: DoughnutChartProps) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<string | null>(null);

  const sized = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        key: String(d.id),
        color: d.color ?? CHART_SERIES[i % CHART_SERIES.length],
      })),
    [data]
  );

  const visible = sized.filter((d) => !hidden[d.key] && d.value > 0);
  const total = visible.reduce((s, d) => s + d.value, 0);

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outer = 86;
  const inner = 54;

  const slices = visible.reduce<
    { key: string; label: string; value: number; color: string; start: number; end: number; pct: number }[]
  >((acc, d) => {
    const sweep = total > 0 ? (d.value / total) * Math.PI * 2 : 0;
    const start = acc.length === 0 ? -Math.PI / 2 : acc[acc.length - 1].end;
    acc.push({
      ...d,
      start,
      end: start + sweep,
      pct: total > 0 ? Math.round((d.value / total) * 1000) / 10 : 0,
    });
    return acc;
  }, []);

  return (
    <View style={{ flexDirection: "column", alignItems: "center", gap: 16 }}>
      <Svg width={220} height={220} viewBox={`0 0 ${size} ${size}`} accessibilityLabel={ariaLabel}>
        {slices.length === 0 ? (
          <Circle
            cx={cx}
            cy={cy}
            r={outer}
            fill="none"
            stroke={colors.ink}
            strokeOpacity={0.08}
            strokeWidth={outer - inner}
          />
        ) : (
          slices.map((s) => {
            const isActive = active === s.key;
            const path = donutSlicePath(
              cx,
              cy,
              isActive ? outer + 4 : outer,
              inner,
              s.start,
              s.end
            );
            return (
              <Path
                key={s.key}
                d={path}
                fill={s.color}
                onPressIn={() => setActive(s.key)}
                onPressOut={() => setActive(null)}
                accessibilityLabel={`${s.label}: ${toArabicNumber(s.value)} (${toArabicNumber(s.pct)}%)`}
              />
            );
          })
        )}
        <SvgText
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize={18}
          fontWeight="700"
          fontFamily="Baloo Bhaijaan 2"
          fill={colors.ink}
        >
          {toArabicNumber(total)}
        </SvgText>
        <SvgText x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill={colors.muted} fontFamily="IBM Plex Sans Arabic">
          {centerLabel ?? "الإجمالي"}
        </SvgText>
      </Svg>

      <View style={{ width: "100%", gap: 6 }}>
        {sized.map((d) => {
          const isOn = !hidden[d.key];
          const pct = total > 0 && isOn ? Math.round((d.value / total) * 1000) / 10 : 0;
          return (
            <PressableScale
              key={d.key}
              onPress={() => setHidden((h) => ({ ...h, [d.key]: !h[d.key] }))}
              accessibilityLabel={`${d.label}: ${toArabicNumber(d.value)} (${toArabicNumber(pct)}%)`}
              accessibilityState={{ selected: isOn }}
              style={{
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                borderRadius: radius.sm,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: isOn ? colors.surface : colors.surface2,
                borderColor: isOn ? colors.hairlineStrong : colors.hairline,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                <View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: isOn ? d.color : colors.muted }} />
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: isOn ? colors.ink : colors.muted }} numberOfLines={1}>
                  {d.label}
                </Text>
              </View>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, fontVariant: METRIC_FONT_VARIANT }}>
                {toArabicNumber(d.value)} · {toArabicNumber(pct)}%
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
