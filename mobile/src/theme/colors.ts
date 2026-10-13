/**
 * Phase 6 (P6-2-c): the «Warm Culinary Editorial» palette — the mobile twin
 * of the web Phase-5 contract (src/app/globals.css §light/§dark). This is
 * the SAME discipline the r126-M7 module established (one SSOT for the 400+
 * inline color sites), re-anchored from the retired Madarek night world to
 * the culinary LIGHT-first world:
 *
 *   page ground  cream #FBF7F0 · ink espresso #241811
 *   primary      terracotta #C2452D (hover #A93A26 · pressed/ink #8A2B1D)
 *   amber        #B7791F — sparingly (warning family only)
 *   WhatsApp green #25D366 stays RESERVED for WhatsApp CTAs (the one
 *   sanctioned non-culinary brand color — web globals.css «External brand
 *   colors» rule, byte-identical).
 *
 * LIGHT is the app's DEFAULT (app.json userInterfaceStyle: "light" — Phase 6
 * revokes the Phase-5 mobile exclusion; the app was Madarek night-only).
 * The warm night kitchen (#1D1410 ground + luminous terracotta #E07856) is
 * the opt-in DARK twin — exported below as nightColors, byte-equal to the
 * web .dark block, waiting for the theme-toggle wave (unconsumed follow-up
 * data exactly like the old Madarek lightColors was).
 *
 * Names are the r126 exported vocabulary kept STABLE on purpose this round
 * (re-grade, don't rename): the renames land as a dedicated sweep with all
 * consumers fixed at once (night→page · sand→ink · gold→terracotta ·
 * void→onAccent) — see the Phase-6 commit trail.
 */

/** Light culinary theme — the values every screen consumes. */
export const colors = {
  /** Page ground — warm cream (web --background light = --neutral-50). */
  page: "#FBF7F0",
  /** Raised plate (web --card light = --neutral-0). */
  surface: "#FFFFFF",
  /** Soft-surface well (web --muted light = --neutral-100). */
  surface2: "#F4EDE1",
  /** Warm hairline (web --border light = --neutral-200). */
  hairline: "#E8DECE",
  /** Espresso ink — primary text (web --foreground light = --neutral-900). */
  ink: "#241811",
  /** Secondary text (web --muted-foreground light = --neutral-700, 5.95:1 on cream). */
  muted: "#6B5D4F",
  /** Terracotta primary (web --primary light — 4.70:1 non-text on cream). */
  terracotta: "#C2452D",
  /** Terracotta hover (web --accent-hover light). */
  terracottaHover: "#A93A26",
  /** Terracotta pressed/ink (web --accent-strong light — text grade 8.05:1). */
  terracottaPressed: "#8A2B1D",
  /** Ink on terracotta (web --primary-foreground light — white, 5.02:1 on the fill). */
  onAccent: "#FFFFFF",
  /** Sage success ink (web --c-mint-ink light). */
  mint: "#6FA06A",
  /** Sage soft background (web --c-mint-bg light). */
  mintBg: "#E1EDD9",
  /** Amber warning ink — sparing (web --c-yellow-ink light). */
  yellow: "#B7791F",
  /** Info steel ink (web --c-sky-ink light). */
  sky: "#6B8CA3",
  /** Deep rose danger ink (web --destructive light = --c-rose-ink). */
  rose: "#C96873",
  /** WhatsApp brand green (reserved for WhatsApp CTAs — the one sanctioned non-culinary brand color). */
  whatsapp: "#25D366",
  /** Text/glyph ink ON the WhatsApp green (web --whatsapp-ink light — deep forest, 4.5:1+ on the fill). */
  whatsappInk: "#1F4F30",
  /** Elevation shadow base (web light --elev-* rgb(64,46,28,*) espresso dust). */
  shadow: "#402E1C",
  /** Menu dot-leader ink (web --menu-leader light — warm tan, decorative). */
  menuLeader: "#CBB08C",

  // The deep warm ramp + status soft-backgrounds (web globals.css §light
  // --neutral-150/300/800 + §1.6 -bg families).
  /** Deeper paper (web --neutral-150 light = --surface-3). */
  surface3: "#EFE6D6",
  /** Strong divider (web --neutral-300 light = --border-strong). */
  hairlineStrong: "#D8CBB2",
  /** Secondary body text (web --text-secondary light = --neutral-700). */
  textSecondary: "#6B5D4F",
  /** Near-espresso emphasis (web --neutral-800 light). */
  textStrong2: "#3E332A",
  /** Terracotta soft fill (web --accent-soft light = --c-copper-bg). */
  terracottaSoft: "#F7E2D9",
  /** Amber soft background (web --c-yellow-bg light). */
  yellowBg: "#F9EEDA",
  /** Info soft background (web --c-sky-bg light). */
  skyBg: "#E3EBEF",
  /** Rose soft background (web --c-rose-bg light). */
  roseBg: "#F9E5E6",

  // Alpha spellings (tokenized so 8-digit hexes stop drifting, A6 P3-12):
  /** Sheet/scrim backdrop — espresso veil at 40% (web --overlay light #2A1B1066). */
  scrim: "rgba(42,27,16,0.4)",
  /** Overlay chrome fill — surface2 at 92%. */
  surface2Scrim: "rgba(244,237,225,0.92)",
  /** Rose at ~14% — soft danger fills (sold-out badge, modifier errors). */
  roseSoft: "#C9687324",
  /** Rose at ~33% — danger borders. */
  roseBorder: "#C9687355",
} as const;

export type ColorToken = keyof typeof colors;

/**
 * The warm night kitchen — the DARK opt-in twin (web .dark block,
 * byte-equal). Unconsumed follow-up data: the app renders LIGHT by default
 * and the toggle wave adopts these when it lands (mirroring the web
 * next-themes .dark opt-in). Pinned by tests/design/parity.mjs so drift
 * here is still drift.
 */
export const nightColors = {
  /** Espresso night ground (web --background dark). */
  page: "#1D1410",
  /** Night surface (web --card dark = --neutral-0 dark). */
  surface: "#2A1E15",
  /** Surface-2 well (web --muted dark = --neutral-100 dark). */
  surface2: "#241A13",
  /** Deeper night step (web --neutral-150 dark). */
  surface3: "#2E2118",
  /** Warm night hairline (web --border dark). */
  hairline: "#38291D",
  /** Night divider (web --neutral-300 dark). */
  hairlineStrong: "#4A3626",
  /** Cream ink (web --foreground dark = --neutral-900 dark). */
  ink: "#F7EFE2",
  /** Night secondary text (web --muted-foreground dark = --neutral-700 dark). */
  muted: "#CDBFA9",
  /** Near-cream emphasis (web --neutral-800 dark). */
  textStrong2: "#E5D9C4",
  /** Secondary body text (web --text-secondary dark). */
  textSecondary: "#CDBFA9",
  /** Luminous terracotta (web --primary dark — 6.03:1 text on night). */
  terracotta: "#E07856",
  /** Terracotta pressed/depth (web --c-ember dark). */
  terracottaHover: "#C2452D",
  /** Deep pressed grade. */
  terracottaPressed: "#A93A26",
  /** Terracotta soft wash (web --accent dark rgba — as the night copper bg). */
  terracottaSoft: "#3A211A",
  /** Void ink on the luminous fill (web --primary-foreground dark). */
  onAccent: "#2A130D",
  /** Luminous sage (web --c-mint-ink dark). */
  mint: "#8FBB8A",
  /** Night mint well (web --c-mint-bg dark). */
  mintBg: "#1E2B1A",
  /** Luminous amber (web --c-yellow-ink dark). */
  yellow: "#E3B15E",
  /** Night amber well (web --c-yellow-bg dark). */
  yellowBg: "#33270F",
  /** Luminous steel (web --c-sky-ink dark). */
  sky: "#9FB6C9",
  /** Night steel well (web --c-sky-bg dark). */
  skyBg: "#1F2A33",
  /** Luminous rose (web --c-rose-ink dark). */
  rose: "#E8918E",
  /** Night rose well (web --c-rose-bg dark). */
  roseBg: "#36191D",
  /** WhatsApp green (theme-independent). */
  whatsapp: "#25D366",
  /** WhatsApp ink on green, night shade (web --whatsapp-ink dark). */
  whatsappInk: "#0F241C",
  /** Night shadow base (web dark --elev-* rgb(8,5,3,*)). */
  shadow: "#080503",
  /** Night dot-leader ink (web --menu-leader dark). */
  menuLeader: "#57402D",
  /** Night modal scrim (web --overlay dark #0C08059E). */
  scrim: "rgba(12,8,5,0.62)",
  /** Night overlay chrome fill. */
  surface2Scrim: "rgba(36,26,19,0.92)",
  /** Rose at ~14%, night spelling. */
  roseSoft: "#E8918E24",
  /** Rose at ~33%, night spelling. */
  roseBorder: "#E8918E55",
} as const;

/**
 * The 9 warm section families — LIGHT bg/ink/deep triplets (web globals.css
 * §1.6 light block, byte-equal: peach/mint/lavender/sky/yellow/rose/sand/
 * grey/copper). ink = fill · deep = TEXT on the bg pastel (all ≥6:1). The
 * toast wells, the EmptyState grey tile and the sold-out rose chips ride
 * these; the night variants live below.
 */
export const pastelFamilies = {
  peach: { bg: "#FBE3D9", ink: "#C25A43", deep: "#7A2E1D" },
  mint: { bg: "#E1EDD9", ink: "#6FA06A", deep: "#2E5230" },
  lavender: { bg: "#EFE9F6", ink: "#8A76C9", deep: "#453578" },
  sky: { bg: "#E3EBEF", ink: "#6B8CA3", deep: "#2E4A5C" },
  yellow: { bg: "#F9EEDA", ink: "#B7791F", deep: "#7A5210" },
  rose: { bg: "#F9E5E6", ink: "#C96873", deep: "#8E2F3D" },
  ink: { bg: "#F1E9D8", ink: "#A98D5F", deep: "#5C4620" },
  grey: { bg: "#EFEAE2", ink: "#6E6154", deep: "#33302A" },
  copper: { bg: "#F7E2D9", ink: "#C2452D", deep: "#8A2B1D" },
} as const;

/**
 * The 9 warm section families — NIGHT variants (web globals.css §1.6 dark
 * block, byte-equal). Unconsumed opt-in twin of the light set above.
 */
export const pastelFamiliesNight = {
  peach: { bg: "#3A2016", ink: "#E99070", deep: "#F7CBB5" },
  mint: { bg: "#1E2B1A", ink: "#8FBB8A", deep: "#CBE8C4" },
  lavender: { bg: "#2A2136", ink: "#B7A0DB", deep: "#D9CDF0" },
  sky: { bg: "#1F2A33", ink: "#9FB6C9", deep: "#CFE0EA" },
  yellow: { bg: "#33270F", ink: "#E3B15E", deep: "#F4E2B8" },
  rose: { bg: "#36191D", ink: "#E8918E", deep: "#F8CFD0" },
  ink: { bg: "#2C2416", ink: "#D6BC8A", deep: "#EFE3C6" },
  grey: { bg: "#262019", ink: "#A79A87", deep: "#D8CFC0" },
  copper: { bg: "#3A211A", ink: "#E07856", deep: "#F2C4B0" },
} as const;
