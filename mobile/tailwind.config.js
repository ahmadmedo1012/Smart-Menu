/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#bc4700",
          50: "#fdf5ec", 100: "#fbe5cd", 200: "#f6c896", 300: "#f1aa60",
          400: "#ed8c30", 500: "#bc4700", 600: "#a33e00", 700: "#7d2f00",
          800: "#521f00", 900: "#291000",
        },
        background: "#010000",
        foreground: "#ebe7e2",
        card: "#070503",
        muted: "#1a1410",
        "muted-foreground": "#9c948a",
        border: "#1f1813",
        input: "#241c16",
        ring: "#bc4700",
        flame: "#e85d2c",
        ember: "#c0392b",
        saffron: "#f1aa60",
        whatsapp: "#25d366",
        success: "#5b8c5a",
        warning: "#f1aa60",
        info: "#3a8eb5",
        destructive: "#c0392b",
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
