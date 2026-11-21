import type { Config } from "tailwindcss";

// Design tokens — see docs/DESIGN_SYSTEM.md
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pista: { DEFAULT: "#2F4A2A", dark: "#1F3320", light: "#E7EDDC" }, // pistachio-shell green: brand
        marigold: { DEFAULT: "#F2A900", light: "#FFF3D1" }, // rate-board highlight, CTAs
        khata: { DEFAULT: "#A3201B", light: "#FBE9E7" }, // ledger red: price drops, discounts
        ink: { DEFAULT: "#1E1A16", soft: "#5B544C", mute: "#6F675E" },
        paper: { DEFAULT: "#FBFAF6", line: "#E6E1D6" }
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"]
      },
      borderRadius: { tile: "14px" }
    }
  },
  plugins: []
};
export default config;
