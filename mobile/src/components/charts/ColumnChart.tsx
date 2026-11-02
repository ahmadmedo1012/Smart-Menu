/**
 * P42-5d (GAP-MENU-1) — ColumnChart, the react-native-svg twin of web
 * src/components/shared/ColumnChart.tsx (the «مؤشر التفاعل اليومي»
 * panel's shape — current vs. previous month). Same geometry — viewBox
 * 640×height, padding {16,8,28,8}, 3 gridlines (0/0.5/1), grouped bars
 * (innerGap 22% · barSlot · the 0.86 width split · rx=3), the
 * tickIndices(labels, 10) cadence — and the series-toggle pills.
 *
 * Honest adaptation (no web CSS, no pointer): series-1 flame / series-2
 * saffron via the mobile roster tokens; the web per-group hover tooltip +
 * keyboard-focus rects are pointer affordances — the grouped data rides
 * the accessibilityLabel. The web grow-in animation is a session nicety;
 * the native columns ship at full height (the screen fade is the entrance).
 */
import { useState } from "react";
import { View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";

import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { CHART_FLAME, CHART_SAFFRON, CHART_TEXT } from "./chart-tokens";
import { tickIndices } from "./chart-geometry";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";

export interface ColumnSeries {
  id: string;
  label: string;
  color?: string;
  values: number[];
}

interface ColumnChartProps {
  labels: string[];
  series: ColumnSeries[];
  height?: number;
  ariaLabel?: string;
}

export function ColumnChart({
  labels,
  series,
  height = 220,
  ariaLabel = "رسم أعمدة",
}: ColumnChartProps) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const width = 640;
  const padding = { top: 16, right: 8, bottom: 28, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const visible = series.filter((s) => !hidden[s.id]);
  const maxVal = Math.max(1, ...visible.flatMap((s) => s.values));
  const groupW = labels.length > 0 ? chartW / labels.length : chartW;
  const innerGap = groupW * 0.22;
  const barSlot = Math.max(4, groupW - innerGap);
  const barW = visible.length > 0 ? Math.max(4, (barSlot * 0.86) / visible.length) : barSlot;
  const ticks = tickIndices(labels.length, 10);

  const colored = series.map((s, i) => ({
    ...s,
    color: s.color ?? (i === 0 ? CHART_FLAME : CHART_SAFFRON),
  }));

  if (labels.length === 0) return null;

  return (
    <View style={{ width: "100%" }}>
      {series.length > 1 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }} accessibilityLabel="سلاسل الأعمدة">
          {colored.map((s) => {
            const isOn = !hidden[s.id];
            return (
              <PressableScale
                key={s.id}
                onPress={() => setHidden((h) => ({ ...h, [s.id]: !h[s.id] }))}
                hitSlop={4}
                accessibilityLabel={s.label}
                accessibilityState={{ selected: isOn }}
                style={{
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: radius.sm,
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  backgroundColor: isOn ? colors.surface : colors.surface2,
                  borderColor: isOn ? colors.hairlineStrong : colors.hairline,
                }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 4, backgroundColor: isOn ? s.color : colors.muted }} />
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: isOn ? colors.ink : colors.muted }} maxFontSizeMultiplier={1.4}>
                  {s.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      ) : null}

      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        accessibilityLabel={ariaLabel}
      >
        {[0, 0.5, 1].map((pct) => {
          const y = padding.top + chartH * (1 - pct);
          return (
            <Line
              key={pct}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke={colors.ink}
              strokeOpacity={0.06}
              strokeDasharray="4 4"
            />
          );
        })}

        {labels.map((_, i) => {
          const gx = padding.left + i * groupW + innerGap / 2;
          const vis = colored.filter((s) => !hidden[s.id]);
          return (
            <G key={i}>
              {vis.map((s, si) => {
                const h = ((s.values[i] ?? 0) / maxVal) * chartH;
                const x = gx + si * barW + si * 2;
                const y = padding.top + chartH - h;
                return (
                  <Rect key={s.id} x={x} width={barW} y={y} height={h} rx={3} fill={s.color} />
                );
              })}
            </G>
          );
        })}

        {ticks.map((i) => (
          <SvgText
            key={i}
            x={padding.left + i * groupW + groupW / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize={11}
            fill={CHART_TEXT}
            fontFamily="IBM Plex Sans Arabic"
          >
            {labels[i]}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
