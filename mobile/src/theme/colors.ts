/**
 * r126-M7 (A6 P2-8): the Madarek palette as the single source of truth for
 * inline styles. Previously 426 hex literals across 21 files (ErrorBoundary
 * even documented "there is no shared color-constants module") — one typo
 * (e.g. #E9B45C) would ship silently.
 *
 * Values are 1:1 with the canonical Madarek tokens (madarek tokens.css) via
 * the web bridge (smart-menu-real/src/app/globals.css); tailwind.config.js
 * mirrors the same values for the NativeWind path (JS config cannot require
 * a TS module — keep the two in sync).
 *
 * The app renders the NIGHT (dark) theme only (userInterfaceStyle: "dark",
 * night-only by design, matching the web). The Madarek LIGHT theme
 * (cream/ink/copper) + the 9 pastel families are exported for the
 * documented light-mode follow-up — nothing consumes them yet.
 */

/** Night theme — the values every screen consumes. */
export const colors = {
  /** Page ground (Madarek --neutral-50 dark / night). */
  night: "#070B16",
  /** Raised card (surface-1). */
  surface: "#0D1428",
  /** Soft fill / secondary control (surface-2). */
  surface2: "#121A36",
  /** Hairline border (neutral-200 dark). */
  hairline: "#1B2444",
  /** Warm sand ink — primary text (neutral-900 dark). */
  sand: "#F2EFE6",
  /** Muted text (neutral-500 dark, 4.86:1 on night). */
  muted: "#8E97B8",
  /** Gold accent (--accent dark, 10.39:1 on night). */
  gold: "#E9B44C",
  /** Accent hover / pale gold. */
  goldHover: "#F5D48A",
  /** Accent strong. */
  goldStrong: "#C9962F",
  /** Void ink — text ON gold (--accent-fg dark, 10.63:1). Never white-on-gold. */
  void: "#05070F",
  /** Success mint ink. */
  mint: "#7FD39A",
  /** Success soft background (mint family dark bg). */
  mintBg: "#0F241C",
  /** Warning yellow ink. */
  yellow: "#ECC97D",
  /** Info sky ink. */
  sky: "#8FBBF2",
  /** Danger rose ink. */
  rose: "#F0938F",
  /** WhatsApp brand green (sanctioned non-Madarek brand color). */
  whatsapp: "#25D366",
  /** Elevation shadow color (near-void; --elev-* dark shadows). */
  shadow: "#02040C",

  // r129-F5: the deep neutral ramp + status soft-backgrounds the r128 web
  // bridge carries (globals.css:308-314/334-350) — surface-3, border-strong,
  // text-secondary/strong-2, --accent-soft and the status-soft fills.
  /** Surface-3 (--neutral-150 dark) — the deepest raised layer. */
  surface3: "#182142",
  /** Strong divider/border (--neutral-300 dark, --border-strong). */
  hairlineStrong: "#263052",
  /** Secondary body text (--neutral-700 dark, --text-secondary). */
  textSecondary: "#C3C8DC",
  /** Second-strong text (--neutral-800 dark) — near-sand emphasis. */
  textStrong2: "#DDE1EE",
  /** Gold soft fill (--accent-soft dark = --c-copper-bg). */
  goldSoft: "#2C2312",
  /** Warning soft background (--warning-soft dark = --c-yellow-bg). */
  yellowBg: "#2C2410",
  /** Info soft background (--info-soft dark = --c-sky-bg). */
  skyBg: "#14213A",
  /** Danger soft background (--danger-soft dark = --c-rose-bg). */
  roseBg: "#2C1620",

  // Alpha spellings (tokenized so 8-digit hexes stop drifting, A6 P3-12):
  /** Sheet/scrim backdrop — night at 70%. */
  scrim: "rgba(2,4,12,0.7)",
  /** Overlay chrome fill — surface-2 at 92%. */
  surface2Scrim: "rgba(18,26,54,0.92)",
  /** Rose at ~14% — soft danger fills (sold-out badge, modifier errors). */
  roseSoft: "#F0938F24",
  /** Rose at ~33% — danger borders. */
  roseBorder: "#F0938F55",
} as const;

export type ColorToken = keyof typeof colors;

/**
 * Madarek LIGHT theme (cream/ink/copper) — unconsumed follow-up data.
 * --neutral-* light ramp + light accent (copper ink #B57438).
 */
export const lightColors = {
  page: "#FBFAF9",
  surface: "#FFFFFF",
  surface2: "#F7F6F3",
  hairline: "#E9E7E2",
  ink: "#191918",
  inkMuted: "#6F6C66",
  accent: "#B57438",
  accentStrong: "#5C3416",
  onAccent: "#FFFFFF",
  /** --state-focus-ring-color LIGHT (tokens.css:543 = var(--accent-strong)):
   *  the light ring must clear 4.5:1 — copper #B57438 is 3.65:1 on cream, so
   *  the light theme rides the deep copper #5C3416 (10.29:1). The dark twin
   *  keeps the shared :root cascade var(--accent) = #E9B44C (tailwind.config
   *  `ring`) — r130 W2-4: the canonical pair, unified with the fleet ruling
   *  (web dark ring #C9962F → #E9B44C is the W2-3 web-side fix). */
  ring: "#5C3416",
} as const;

/**
 * The 9 Madarek pastel section families — DARK bg/ink/deep triplets
 * (rubric §1.6). Unconsumed follow-up data (kept for the light/pastel
 * adoption wave; web parity reference).
 */
export const pastelFamilies = {
  peach: { bg: "#2C1A16", ink: "#F2A07F", deep: "#FCD9C4" },
  mint: { bg: "#0F241C", ink: "#7FD39A", deep: "#C9EAD3" },
  lavender: { bg: "#221B3A", ink: "#B7A0F4", deep: "#DCD2F9" },
  sky: { bg: "#14213A", ink: "#8FBBF2", deep: "#C9DCEE" },
  yellow: { bg: "#2C2410", ink: "#ECC97D", deep: "#F8E5B5" },
  rose: { bg: "#2C1620", ink: "#F0938F", deep: "#FACDD2" },
  sand: { bg: "#241F14", ink: "#D9C18C", deep: "#EFE2C5" },
  grey: { bg: "#161D33", ink: "#A9B0C8", deep: "#D5DAE8" },
  copper: { bg: "#2C2312", ink: "#E9B44C", deep: "#F5D48A" },
} as const;

/**
 * r129-F5: the 9 pastel families — LIGHT bg/ink/deep triplets (rubric §1.6
 * light block; madarek tokens.css:459-467 via the web bridge
 * globals.css:601-609, byte-equal). Unconsumed follow-up data like their
 * dark siblings — pinned so drift there is still drift.
 */
export const pastelFamiliesLight = {
  peach: { bg: "#FFE9DC", ink: "#E07856", deep: "#6B2D1A" },
  mint: { bg: "#DCF1E2", ink: "#4FA66D", deep: "#1F4F30" },
  lavender: { bg: "#ECE6FA", ink: "#8A6FE0", deep: "#3F2D7A" },
  sky: { bg: "#DDEBF7", ink: "#5C8FCE", deep: "#1F3D63" },
  yellow: { bg: "#FCF1CD", ink: "#D6A330", deep: "#6B4C0B" },
  rose: { bg: "#FCE0E2", ink: "#DD6E78", deep: "#6B2128" },
  sand: { bg: "#F1ECDF", ink: "#B59868", deep: "#5A4623" },
  grey: { bg: "#EFECE7", ink: "#6B665E", deep: "#2D2A24" },
  copper: { bg: "#F4E4D2", ink: "#B57438", deep: "#5C3416" },
} as const;
