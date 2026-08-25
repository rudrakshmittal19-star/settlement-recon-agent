import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12141A",
        paper: "#F7F7F5",
        line: "#E3E3DE",
        matched: "#1F7A4D",
        exception: "#B5482C",
        pending: "#B08A2E",
        accent: "#2563EB",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
