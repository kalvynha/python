import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        kid: ["Lexend", "system-ui", "sans-serif"],
      },
      colors: {
        sky: {
          50: "#f0f9ff",
          500: "#0ea5e9",
          600: "#0284c7",
        },
        sun: {
          400: "#facc15",
          500: "#eab308",
        },
      },
      fontSize: {
        "kid-xl": ["3rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "kid-lg": ["2rem", { lineHeight: "1.2" }],
      },
    },
  },
  plugins: [],
};

export default config;
