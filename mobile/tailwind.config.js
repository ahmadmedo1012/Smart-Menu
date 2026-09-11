/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // r102-M8: semantic tokens aligned 1:1 with the web design system
        // (src/app/globals.css — r95 SmartBot AA-tuned dark palette). The web
        // values are the single source of truth for cross-platform parity.
        // `input` intentionally keeps the mobile value: web uses --input as a
        // border tint while mobile composes it as the field FILL (#241c16).
        brand: {
          DEFAULT: "#bc4700",
          50: "#fdf5ec", 100: "#fbe5cd", 200: "#f6c896", 300: "#f0a646",
          400: "#ed8c30", 500: "#bc4700", 600: "#a33e00", 700: "#7d2f00",
          800: "#521f00", 900: "#291000",
        },
        background: "#010000",
        foreground: "#ebe7e2",
        card: "#070503",
        muted: "#0c0806",
        "muted-foreground": "#8c857d",
        border: "#211c18",
        input: "#241c16",
        ring: "#bc4700",
        flame: "#bc4700",
        ember: "#863800",
        saffron: "#f0a646",
        whatsapp: "#25D366",
        success: "#23a136",
        warning: "#ce9200",
        info: "#348dcf",
        destructive: "#e62b34",
      },
      fontFamily: {
        sans: ["Cairo", "System"],
        heading: ["ReadexPro", "Cairo", "System"],
        mono: ["Cairo", "System"],
      },
      borderRadius: { sm: 8, md: 12, lg: 18, xl: 28 },
      spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, "2xl": 48, "3xl": 64, "4xl": 96 },
    },
  },
  plugins: [],
};
