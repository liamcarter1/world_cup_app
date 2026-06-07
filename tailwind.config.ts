import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        wc: {
          navy: "#1A2B6B",
          red: "#E4002B",
          green: "#00843D",
          gold: "#FFC72C",
          sky: "#3AAEE0",
          purple: "#6A1B9A",
          teal: "#0FB5A0",
          charcoal: "#0E1330",
          offwhite: "#F7F7FB",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "wc-gradient":
          "linear-gradient(135deg, #0E1330 0%, #1A2B6B 45%, #3a1d7a 100%)",
        "wc-stripe":
          "linear-gradient(90deg, #E4002B 0%, #FFC72C 33%, #00843D 66%, #3AAEE0 100%)",
      },
      boxShadow: {
        glow: "0 0 24px -6px rgba(255,199,44,0.55)",
      },
      keyframes: {
        "pulse-live": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "deal-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "pulse-live": "pulse-live 1.2s ease-in-out infinite",
        "deal-in": "deal-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
