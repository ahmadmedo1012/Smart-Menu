/**
 * Phase 6 (P6-2-c): the menu dot-leader — the RN twin of the web Phase-5
 * SIGNATURE motif (.menu-leader / .menu-leader-rule, globals.css §signature):
 * the printed-menu row where a dotted rule ties a label to its price.
 *
 *   ── label ······························· price ──
 *
 * RN form: a flex row whose middle child is a 2px DOTTED bottom border
 * (RN supports borderStyle: "dotted" on both platforms) lifted a quarter
 * line up (translateY -4 ≈ the web translateY(-0.25em)) so the dots sit on
 * the text baseline. Ink = colors.menuLeader (warm tan #CBB08C — the web
 * --menu-leader light, decorative ≥3:1 not required for leaders, kept in
 * the warm family).
 *
 * Usage (the web twin's three canonical surfaces):
 *   · item card price rows (leading price + rule + badge),
 *   · cart sheet lines (rule + trailing price),
 *   · totals rows (leading label + rule + trailing value).
 */
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "@/theme/colors";

/** The rule alone — for inline placement between existing nodes. */
export function DotLeaderRule({
  ink = colors.menuLeader,
  style,
}: {
  /** Rule ink override (defaults to colors.menuLeader). */
  ink?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    // aria-hidden by construction (a View): the leader is decoration, never
    // announced — the price text carries the money semantics.
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.rule, { borderBottomColor: ink }, style]}
    />
  );
}

export interface DotLeaderProps {
  /** Node before the rule (label / price). */
  leading?: ReactNode;
  /** Node after the rule (price / value). */
  trailing?: ReactNode;
  /** Rule ink override (defaults to colors.menuLeader). */
  ink?: string;
  /** Extra style on the row container. */
  style?: StyleProp<ViewStyle>;
  /** Extra style on the rule itself. */
  ruleStyle?: StyleProp<ViewStyle>;
}

/** The full row — leading · dotted rule (flexes) · trailing. */
export function DotLeader({ leading, trailing, ink, style, ruleStyle }: DotLeaderProps) {
  return (
    <View style={[styles.row, style]}>
      {leading != null ? <View style={styles.end}> {leading} </View> : null}
      <DotLeaderRule ink={ink} style={ruleStyle} />
      {trailing != null ? <View style={styles.start}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  // RTL: the leading node hugs the row start (row-reverse semantics are
  // handled by RN's forced-RTL layout — no physical left/right here).
  end: { flexShrink: 0 },
  start: { flexShrink: 0 },
  rule: {
    flex: 1,
    minWidth: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.menuLeader,
    borderStyle: "dotted",
    transform: [{ translateY: -4 }],
    opacity: 0.9,
  },
});
