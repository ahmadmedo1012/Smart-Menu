/**
 * P42-5d (GAP-MENU-1) — AreaChart, the react-native-svg twin of web
 * src/components/shared/AreaChart.tsx (the «اتجاه الإيرادات» panel's
 * shape). Same geometry — viewBox 600×height, padding {20,10,30,10},
 * min/max scaling, 5 recessive dashed gridlines, the area gradient
 * (accent-hover top 0.35 → stroke 0.05), the 2px line, the r=3 dots with
 * the page-colored rim, and the every-Nth axis labels.
 *
 * Honest adaptation (no web CSS, no pointer): the stroke rides CHART_FLAME
 * (web --chart-1); the web hover tooltip + hit-target rects are a POINTER
 * affordance — on touch the data rides the accessibilityLabel instead of a
 * hover card. The web pathLength draw-in is a session nicety; the native
 * chart ships its final shape (the screen's enter-fade is the entrance).
 */
import Svg, { Circle, Defs, G, LinearGradient, Line, Path, Stop, Text as SvgText } from "react-native-svg";

import { CHART_FLAME, CHART_TEXT } from "./chart-tokens";
import { colors } from "@/theme/colors";

interface DataPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: DataPoint[];
  height?: number;
  /** Stroke color override (defaults to the flame roster token). */
  color?: string;
  gradientId?: string;
  ariaLabel?: string;
}

export function AreaChart({
  data,
  height = 200,
  color,
  gradientId = "area-gradient",
  ariaLabel,
}: AreaChartProps) {
  if (data.length === 0) return null;

  const stroke = color ?? CHART_FLAME;
  const width = 600;
  const padding = { top: 20, right: 10, bottom: 30, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      accessibilityLabel={ariaLabel ?? "مخطط مساحي"}
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.terracottaHover} stopOpacity={0.35} />
          <Stop offset="1" stopColor={stroke} stopOpacity={0.05} />
        </LinearGradient>
      </Defs>

      {/* Grid lines — recessive dashed, the web's 5-rung ladder */}
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

      {/* Area fill + the thin 2px line */}
      <Path d={areaPath} fill={`url(#${gradientId})`} />
      <Path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots — the web's r=3 with the page-colored rim */}
      {points.map((p, i) => (
        <Circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill={stroke}
          stroke={colors.page}
          strokeWidth={2}
        />
      ))}

      {/* Axis labels — every Nth + the last, the web's cadence */}
      {data.map((d, i) =>
        i % Math.max(1, Math.floor(data.length / 6)) === 0 || i === data.length - 1 ? (
          <G key={i}>
            <SvgText
              x={points[i].x}
              y={height - 5}
              textAnchor="middle"
              fontSize={11}
              fill={CHART_TEXT}
              fontFamily="IBM Plex Sans Arabic"
            >
              {d.label}
            </SvgText>
          </G>
        ) : null
      )}
    </Svg>
  );
}
