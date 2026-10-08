/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Madarek design system — night (dark) theme. SSOT for INLINE styles is
        // src/theme/colors.ts (r126-M7); this NativeWind map mirrors the same
        // values (a JS config cannot require the TS module — keep them in
        // sync). Token names kept from the r102-M8 semantic map, values
        // flipped 1:1 to the Madarek bridge in the web app
        // (src/app/globals.css). `input` intentionally keeps the mobile
        // composition: web uses --input as a border tint (#263052) while
        // mobile composes it as the field FILL (surface-2 #121A36 on top of
        // card #0D1428).
        // r126-M9: legacy flame/ember/saffron aliases deleted (zero class
        // consumers — only Button's dead `flame` variant referenced them).
        brand: {
          // r130 W2-4: canonical Madarek accent vocabulary ONLY (audit W1-C
          // P2-19 — "invents a 50-900 gold ramp"). Madarek carries exactly
          // accent #E9B44C / accent-hover #F5D48A (= copper-deep dark,
          // tokens.css:712,750) / accent-strong #C9962F; the old 50/100/300/
          // 400/700/800/900 steps were off-token interpolations with zero
          // className consumers (only bg-brand-500 exists in src/).
          // Kept keys mirror the parity pins (tests/design/parity.mjs TW_BRAND).
          DEFAULT: "#E9B44C",   // --accent / --accent-solid
          200: "#F5D48A",       // --accent-hover (= copper-deep dark #F5D48A)
          500: "#E9B44C",       // --accent (bg-brand-500 consumers)
          600: "#C9962F",       // --accent-strong
        },
        background: "#070B16",        // night page ground
        foreground: "#F2EFE6",        // warm sand ink
        card: "#0D1428",             // surface-1 (raised card)
        muted: "#121A36",             // surface-2 (soft bg / secondary control)
        "muted-foreground": "#8E97B8", // muted text
        border: "#1B2444",            // hairline
        input: "#121A36",             // field fill (mobile composition)
        ring: "#E9B44C",              // gold focus ring
        "on-accent": "#05070F",       // void ink on gold (accent-fg)
        whatsapp: "#25D366",          // WhatsApp brand green (sanctioned non-Madarek)
        success: "#7FD39A",           // mint ink
        warning: "#ECC97D",           // yellow ink
        info: "#8FBBF2",              // sky ink
        destructive: "#F0938F",       // rose ink
      },
      fontFamily: {
        // Madarek ships IBM Plex Sans Arabic 400/500/600/700 (no 800) — the
        // same face the web app self-hosts. Loaded in App.tsx via
        // @expo-google-fonts/ibm-plex-sans-arabic + expo-font.
        sans: ["IBM Plex Sans Arabic", "System"],
        heading: ["IBM Plex Sans Arabic", "System"],
        // r129-F5: mono is the REAL mono face now — IBM Plex Mono (400/500,
        // the web --ln-mono stack) with the brand sans as the Arabic-run
        // fallback (RN falls back per glyph; mono is Latin/digits-only
        // voice). Previously aliased to the Sans face (no mono shipped).
        mono: ["IBM Plex Mono", "IBM Plex Sans Arabic", "System"],
      },
      // Madarek radius ladder: 6/8/10/12/16/20/28 (+ full 9999 via default)
      borderRadius: { xs: 6, sm: 8, md: 10, lg: 12, xl: 16, "2xl": 20, "3xl": 28 },
      // Madarek motion ladder: 80/160/240/380/520/720ms + canonical easings
      transitionDuration: { 80: "80ms", 160: "160ms", 240: "240ms", 380: "380ms", 520: "520ms", 720: "720ms" },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        soft: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      // r130 W2-4: spacing mirror snapped to the canonical --sp-* rungs
      // (audit W1-C P2-20 — "3xl: 64 is not a Madarek rung"). Named steps
      // map onto tokens.css:19-22: xs=sp1 4 · sm=sp2 8 · md=sp4 16 ·
      // lg=sp6 24 · xl=sp7 32 · 2xl=sp9 48 · 3xl=sp11 72 (was the invented
      // 64 — canonical neighbors are sp10 56 / sp11 72; 72 keeps the
      // 48→72→96 ladder even) · 4xl=sp12 96. The full ladder lives in
      // src/theme/spacing.ts (sp1…sp16, pinned by tests/design/parity.mjs).
      spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, "2xl": 48, "3xl": 72, "4xl": 96 },
    },
  },
  plugins: [],
};
