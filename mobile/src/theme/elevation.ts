/**
 * r132-F2b (A4 N1 — "dead elevation module + hand-rolled shadows off its own
 * ladder"): the module shipped ZERO imports while the three real shadow sites
 * hand-rolled the same values off-ladder — and elevation 6 was not even a
 * rung in the 1-5 ladder. Deletion beat addition for the dead half: the
 * elevationCss CSS-string "parity carriers" are REMOVED (the old header's
 * "Pinned by parity.mjs" claim was stale — the harness pins radius/spacing/
 * easings only), and the RN ladder below is now the CONSUMED source of truth
 * instead of dead API surface:
 *   · FloatingWhatsApp FAB + the sticky cart CTA → rung 6 (floating CTA)
 *   · the toast surface → rung 3 (the web premiumToast twin rides --elev-3)
 *
 * Grammar: the canonical dark --elev-* ladder (madarek/frontend tokens.css
 * §1.9 via the web bridge src/app/globals.css §elev), expressed with RN's
 * classic shadow* props + Android elevation. The web two-layer shadow (drop
 * + inset top light) has no RN equivalent (RN boxShadow has no inset) — the
 * drop layer is carried, the inset layer stays documented out.
 *
 * Base color: colors.shadow (#02040C) per the colors.ts SSOT comment —
 * "--elev-* shadow rgb(2,4,12,*) base". The old module hardcoded #000000,
 * which was off the colors SSOT; every rung now rides the same near-void
 * base the money-path de-glow verification pinned in r131.
 */
import type { ViewStyle } from "react-native";
import { colors } from "@/theme/colors";

export type ElevationRung = 1 | 2 | 3 | 4 | 5 | 6;

/** The RN drop layer per rung (shadow values 1:1 with the canonical ladder). */
export const elevation: Record<ElevationRung, ViewStyle> = {
  // --elev-1: 0 1px 2px rgba(0,0,0,0.30)
  1: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowOpacity: 0.3,
    elevation: 1,
  },
  // --elev-2: 0 4px 8px rgba(0,0,0,0.35)
  2: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.35,
    elevation: 2,
  },
  // --elev-3: 0 8px 16px rgba(0,0,0,0.40) — the toast surface rung
  // (the web twin: premiumToast rides shadow-[var(--elev-3)]).
  3: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.4,
    elevation: 3,
  },
  // --elev-4: 0 16px 32px rgba(0,0,0,0.45)
  4: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    shadowOpacity: 0.45,
    elevation: 4,
  },
  // --elev-5: 0 32px 64px rgba(0,0,0,0.50)
  5: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 32 },
    shadowRadius: 64,
    shadowOpacity: 0.5,
    elevation: 5,
  },
  // r132-F2b: rung 6 — the FLOATING CTA register the money path has shipped
  // since r131 (FAB + sticky cart CTA): a tight offset-4/radius-8/0.3 drop
  // with Android elevation 6. Not part of the canonical --elev-1…5 CSS
  // ladder (which stops at 5); this rung codifies the real register the
  // r131 money-path de-glow verification pinned, so the two sites consume
  // ONE recipe instead of hand-rolling twins.
  6: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.3,
    elevation: 6,
  },
};
