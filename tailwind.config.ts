import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    "border-red-700/50",
    "bg-red-700/10",
    "border-red-600/50",
    "bg-red-600/10",
    "border-red-500/50",
    "bg-red-500/10",
    "border-red-400/50",
    "bg-red-400/10",
    "text-red-300",
    "border-yellow-600/50",
    "bg-yellow-600/10",
    "border-yellow-500/50",
    "bg-yellow-500/10",
    "border-yellow-400/50",
    "bg-yellow-400/10",
    "text-yellow-300",
    "border-green-600/50",
    "bg-green-600/10",
    "border-green-500/50",
    "bg-green-500/10",
    "border-green-400/50",
    "bg-green-400/10",
    "text-green-300",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
