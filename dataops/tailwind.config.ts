import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#04050A", 900: "#070912", 850: "#0A0D18", 800: "#0E1220", 700: "#151a2c", 600: "#1e2540" },
        lime: { DEFAULT: "#C6FF3D", soft: "#DDFF8A" },
        cyan: { DEFAULT: "#3DE0FF" },
        violet: { DEFAULT: "#8B7CFF" },
        rose: { DEFAULT: "#FF5C8A" },
        amber: { DEFAULT: "#FFB547" },
        mute: "#8A93A6",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        "marquee-rev": { from: { transform: "translateX(-50%)" }, to: { transform: "translateX(0)" } },
        float: { "0%,100%": { transform: "translate(0,0) scale(1)" }, "50%": { transform: "translate(30px,-20px) scale(1.08)" } },
        spin: { to: { transform: "rotate(360deg)" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
        pulseDot: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".35" } },
        scan: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100%)" } },
      },
      animation: {
        marquee: "marquee 45s linear infinite",
        "marquee-rev": "marquee-rev 50s linear infinite",
        float: "float 14s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
        shimmer: "shimmer 6s linear infinite",
        "pulse-dot": "pulseDot 1.6s ease-in-out infinite",
        scan: "scan 3.5s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
