/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // «Warm Culinary Editorial» — LIGHT-first (Phase 6 / P6-2-c). SSOT
        // for INLINE styles is src/theme/colors.ts; this NativeWind map
        // mirrors the same values (a JS config cannot require the TS module
        // — keep them in sync). Token names keep the r102-M8 semantic map;
        // values are the web Phase-5 culinary bridge (src/app/globals.css
        // §light): cream ground · espresso ink · terracotta primary · warm
        // hairlines. `input` intentionally keeps the mobile composition:
        // web uses --input as a border tint (#D8CBB2) while mobile composes
        // it as the field FILL (soft well #F4EDE1 on the cream page).
        // Phase 6: display/heading flip to the Baloo Bhaijaan 2 chain
        // (font-display); body stays IBM Plex Sans Arabic.
        brand: {
          // The terracotta trio (web --primary #C2452D / --accent-hover
          // #A93A26 / --accent-strong #8A2B1D). Kept keys mirror the parity
          // pins (tests/design/parity.mjs TW_BRAND).
          DEFAULT: "#C2452D",   // --primary / terracotta
          200: "#A93A26",       // --accent-hover (terracotta hover)
          500: "#C2452D",       // --primary (bg-brand-500 consumers)
          600: "#8A2B1D",       // --accent-strong (pressed/ink)
        },
        background: "#FBF7F0",        // cream page ground
        foreground: "#241811",        // espresso ink
        card: "#FFFFFF",             // raised plate
        muted: "#F4EDE1",             // soft-surface well
        "muted-foreground": "#6B5D4F", // secondary espresso text (5.95:1)
        border: "#E8DECE",            // warm hairline
        input: "#F4EDE1",             // field fill (mobile composition)
        ring: "#C2452D",              // terracotta focus ring
        "on-accent": "#FFFFFF",       // white on terracotta (5.02:1)
        whatsapp: "#25D366",          // WhatsApp brand green (reserved)
        "whatsapp-ink": "#1F4F30",   // text on brand green (web --whatsapp-ink)
        success: "#6FA06A",           // sage ink
        warning: "#B7791F",           // amber ink (sparing)
        info: "#6B8CA3",              // steel ink
        destructive: "#C96873",       // deep rose ink
      },
      fontFamily: {
        // Body stays IBM Plex Sans Arabic 400/500/600/700 — the same face
        // the web app self-hosts. Loaded in App.tsx via
        // @expo-google-fonts/ibm-plex-sans-arabic + expo-font.
        sans: ["IBM Plex Sans Arabic", "System"],
        // Phase 6 (P6-2-c): the DISPLAY chain flips to Baloo Bhaijaan 2
        // (warm rounded culinary display, Arabic+Latin, 400-800 via
        // @expo-google-fonts/baloo-bhaijaan-2) with the Plex body behind it
        // — the mobile twin of the web --font-display stack.
        display: ["Baloo Bhaijaan 2", "IBM Plex Sans Arabic", "System"],
        heading: ["Baloo Bhaijaan 2", "IBM Plex Sans Arabic", "System"],
        // mono is the REAL mono face — IBM Plex Mono (400/500, the web
        // --ln-mono stack) with the brand sans as the Arabic-run fallback
        // (RN falls back per glyph; mono is Latin/digits-only voice).
        mono: ["IBM Plex Mono", "IBM Plex Sans Arabic", "System"],
      },
      // «Plate-round» ladder (Phase 5 culinary contract): 10/12/14/16/20/24/28
      // with 16 = the plate-card rung (web --radius-*). + full 9999 via default.
      borderRadius: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, "2xl": 24, "3xl": 28 },
      // Motion ladder: 80/160/240/380/520/720ms + canonical easings (unchanged —
      // the culinary identity inherits the fleet motion contract).
      transitionDuration: { 80: "80ms", 160: "160ms", 240: "240ms", 380: "380ms", 520: "520ms", 720: "720ms" },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        soft: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      // Spacing mirror snapped to the canonical --sp-* rungs
      // (tokens.css:19-22: xs=sp1 4 · sm=sp2 8 · md=sp4 16 · lg=sp6 24 ·
      // xl=sp7 32 · 2xl=sp9 48 · 3xl=sp11 72 · 4xl=sp12 96). The full ladder
      // lives in src/theme/spacing.ts (sp1…sp16, pinned by tests/design/parity.mjs).
      spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, "2xl": 48, "3xl": 72, "4xl": 96 },
    },
  },
  plugins: [],
};
