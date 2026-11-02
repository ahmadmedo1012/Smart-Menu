/**
 * P42-5d (GAP-MENU-1) — SplineAreaChart, the react-native-svg twin of web
 * src/components/shared/SplineAreaChart.tsx (the «ساعات الذروة» panel's
 * shape). Same geometry — viewBox 640×height, padding {16,12,28,12},
 * Catmull-Rom smoothing (the chart-geometry port), the 0.32→0.04 area
 * gradient, 5 dashed gridlines, tickIndices(labels, 8) axis cadence —
 * and the series-toggle pills when more than one series rides.
 *
 * Honest adaptation (no web CSS, no pointer): series-1 flame / series-2
 * saffron via the mobile roster tokens; the web hover tooltip is a pointer
 * affordance — the data rides the accessibilityLabel. The unique gradient
 * id derives from the series id (the web useId twin — RN has none).
 */
import { useState } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Line, Path, Stop, Text as SvgText } from "react-native-svg";

import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { CHART_FLAME, CHART_SAFFRON, CHART_TEXT } from "./chart-tokens";
import { catmullRomPath, closeAreaPath, tickIndices } from "./chart-geometry";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";

export interface SplineSeries {
  id: string;
  label: string;
  color?: string;
  values: number[];
}

interface SplineAreaChartProps {
  labels: string[];
  series: SplineSeries[];
  height?: number;
  ariaLabel?: string;
  smoothness?: number;
}

export function SplineAreaChart({
  labels,
  series,
  height = 220,
  ariaLabel = "رسم خطي للمنحنى",
  smoothness = 1,
}: SplineAreaChartProps) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const visible = series.filter((s) => !hidden[s.id]);
  const width = 640;
  const padding = { top: 16, right: 12, bottom: 28, left: 12 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(1, ...visible.flatMap((s) => s.values), 1);
  const xAt = (i: number) =>
    padding.left + (labels.length <= 1 ? chartW / 2 : (i / (labels.length - 1)) * chartW);

  const plotted = visible.map((s, si) => {
    const y = (v: number) => padding.top + chartH - (v / maxVal) * chartH;
    const pts = labels.map((_, i) => ({ x: xAt(i), y: y(s.values[i] ?? 0) }));
    const line = catmullRomPath(pts, smoothness);
    return {
      ...s,
      color: s.color ?? (si === 0 ? CHART_FLAME : CHART_SAFFRON),
      line,
      area: closeAreaPath(line, pts, padding.top + chartH),
      gradientId: `spline-${s.id}`,
    };
  });

  const ticks = tickIndices(labels.length, 8);

  if (labels.length === 0) return null;

  return (
    <View style={{ width: "100%" }}>
      {series.length > 1 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }} accessibilityLabel="سلاسل الرسم">
          {series.map((s, si) => {
            const color = s.color ?? (si === 0 ? CHART_FLAME : CHART_SAFFRON);
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
                <View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: isOn ? color : colors.muted }} />
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
        <Defs>
          {plotted.map((s) => (
            <LinearGradient key={s.gradientId} id={s.gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={s.color} stopOpacity={0.32} />
              <Stop offset="1" stopColor={s.color} stopOpacity={0.04} />
            </LinearGradient>
          ))}
        </Defs>

        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
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

        {plotted.map((s) => (
          <Path key={`area-${s.id}`} d={s.area} fill={`url(#${s.gradientId})`} />
        ))}
        {plotted.map((s) => (
          <Path
            key={`line-${s.id}`}
            d={s.line}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {ticks.map((i) => (
          <SvgText
            key={i}
            x={xAt(i)}
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
