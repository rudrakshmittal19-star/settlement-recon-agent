import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1A1A18",
        paper: "#F3F2ED",
        paperRaised: "#FBFAF6",
        line: "#DAD7CC",
        matched: "#0E6B4E",
        matchedBg: "#E4EFE9",
        exception: "#9A3324",
        exceptionBg: "#F3E4E0",
        pending: "#9C7A17",
        pendingBg: "#F1E9D3",
        accent: "#2F3C7E",
        accentBg: "#E4E6F0",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
