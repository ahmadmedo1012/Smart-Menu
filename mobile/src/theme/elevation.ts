/**
 * r129-F5: the canonical Madarek elevation ladder as a JS module — the
 * night (dark) values 1:1 with madarek/frontend/src/styles/tokens.css §1.9
 * --elev-1…5 via the web bridge (src/app/globals.css:564-568). The app is
 * night-only (userInterfaceStyle: "dark"), so the dark ladder is the one
 * RN consumes; colors.shadow (#02040C) stays the legacy base color.
 *
 * RN adaptation: the web two-layer shadow (drop + inset top light) is
 * expressed with RN's classic shadow* props + Android elevation. The
 * `inset 0 1px 0 rgba(255,255,255,0.0x)` top-light layer has NO RN
 * equivalent (RN boxShadow does not support inset) — the drop layer is
 * carried, the inset layer is documented out. Canonical CSS strings ship
 * alongside (the parity carriers).
 *
 * Pinned (aggregate) by tests/design/parity.mjs (r128 section).
 */
import type { ViewStyle } from "react-native";

/** The canonical dark --elev-* strings (parity carriers, verbatim). */
export const elevationCss = {
  1: "0 1px 2px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.04)",
  2: "0 4px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
  3: "0 8px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)",
  4: "0 16px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)",
  5: "0 32px 64px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.08)",
} as const;

export type ElevationRung = keyof typeof elevationCss;

/** RN style objects — the drop layer of each rung (inset layer omitted). */
export const elevation: Record<ElevationRung, ViewStyle> = {
  1: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowOpacity: 0.3,
    elevation: 1,
  },
  2: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.35,
    elevation: 2,
  },
  3: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.4,
    elevation: 3,
  },
  4: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    shadowOpacity: 0.45,
    elevation: 4,
  },
  5: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 32 },
    shadowRadius: 64,
    shadowOpacity: 0.5,
    elevation: 5,
  },
};
