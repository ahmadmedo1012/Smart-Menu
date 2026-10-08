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
          // gold accent ramp anchored on canonical values:
          // 200 = accent-hover/pale #F5D48A · 500 = accent #E9B44C ·
          // 600 = accent-strong #C9962F (was the flame #bc4700 ramp)
          DEFAULT: "#E9B44C",
          50: "#FCF3DE", 100: "#F8E5BC", 200: "#F5D48A", 300: "#EFC46B",
          400: "#EABF5D", 500: "#E9B44C", 600: "#C9962F", 700: "#AB7C28",
          800: "#8A6420", 900: "#6A4B18",
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
      spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, "2xl": 48, "3xl": 64, "4xl": 96 },
    },
  },
  plugins: [],
};
