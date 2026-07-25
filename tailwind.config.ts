import type { Config } from "tailwindcss";

// TinyWins visual direction: a small creature that lives in soft, mossy
// light rather than a "productivity app" palette. Warm paper background,
// deep moss ink for text, one coral "spark" accent reserved for streaks
// and the effort multiplier — the only place we let color get loud.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F2E9",
        moss: {
          50: "#EEF2E9",
          200: "#C7D3B8",
          500: "#5B7052",
          700: "#33422C",
          900: "#1E2618",
        },
        spark: "#E8623D",
        gold: "#D9A441",
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
      },
      borderRadius: {
        blob: "38% 62% 63% 37% / 41% 44% 56% 59%",
      },
    },
  },
  plugins: [],
};

export default config;
