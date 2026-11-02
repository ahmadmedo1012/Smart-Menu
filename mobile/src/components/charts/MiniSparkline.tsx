/**
 * P42-5d (GAP-MENU-1) — MiniSparkline, the react-native-svg twin of web
 * src/components/shared/MiniSparkline.tsx: the tiny trend line the KPI
 * cards carry. Same geometry (padding 2, min/max scaling, polyline + area
 * gradient), same trend-color rule (up → sage mint, down → rose).
 *
 * Honest adaptation (no web CSS): the trend color resolves through mobile
 * tokens; the gradient stops are the web's 0.25→0 fade; no draw-in
 * animation (the web pathLength ride is a pointer-session nicety — the
 * native fleet's reduced-motion discipline keeps entrances at the screen
 * fade, so the sparkline ships its final shape).
 */
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { colors } from "@/theme/colors";

export function MiniSparkline({
  data,
  width = 80,
  height = 28,
  ariaLabel,
}: {
  data: number[];
  width?: number;
  height?: number;
  ariaLabel?: string;
}) {
  if (data.length < 2) return null;

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;
  const padding = 2;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * chartW,
    y: padding + chartH - ((v - minVal) / range) * chartH,
  }));

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const isUp = data[data.length - 1] >= data[0];
  /* Web: --success #6FA06A / --destructive #C96873 — mobile mint/rose. */
  const trendColor = isUp ? colors.mint : colors.rose;
  const gradientId = `spark-${width}-${height}-${isUp ? "up" : "dn"}`;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      accessibilityLabel={ariaLabel ?? (isUp ? "اتجاه صاعد" : "اتجاه هابط")}
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.terracottaHover} stopOpacity={0.25} />
          <Stop offset="1" stopColor={trendColor} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path
        d={`${path} L ${points[points.length - 1].x} ${padding + chartH} L ${points[0].x} ${padding + chartH} Z`}
        fill={`url(#${gradientId})`}
      />
      <Path
        d={path}
        fill="none"
        stroke={trendColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
