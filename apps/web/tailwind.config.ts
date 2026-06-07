import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        border: "var(--border)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        input: "var(--input)",
        track: "var(--track)",
        ink: {
          950: "#0a0d14",
          900: "#0e1320",
          800: "#141a2b",
          700: "#1b2236",
          600: "#272f47",
        },
        accent: {
          DEFAULT: "#8b9cff",
          soft: "#5f6fd0",
          deep: "#3b46a8",
        },
        warm: {
          DEFAULT: "#f7c59f",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
