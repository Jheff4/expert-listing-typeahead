import type { Config } from "tailwindcss";

// Palette pulled from Expert Listing's own site: the two exact fills their
// logo SVG ships with (#A8DC66 for the dark-background variant, #105B48 for
// the light-background variant - see components/Logo.tsx) anchor `400` and
// `900` below; the rest of the scale is interpolated around them for
// tints/shades Tailwind needs elsewhere (hover states, tinted backgrounds)
// that their two-color logo doesn't itself define. The exact font in their
// wordmark isn't identifiable from a screenshot alone, so `sans` uses Plus
// Jakarta Sans as the closest widely-available match (same rounded,
// geometric, single-story-g character) - swap for the real brand font file
// if Expert Listing shares one. See CONTEXT.md.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3faec",
          100: "#e3f4d1",
          200: "#c8e8a5",
          300: "#c4ea8e",
          400: "#A8DC66", // exact - logo mark on dark backgrounds
          500: "#8fc94a",
          600: "#6fa832",
          700: "#4f8323",
          800: "#2f5f1c",
          900: "#105B48", // exact - logo mark on light backgrounds
          950: "#0a3a2e",
        },
        night: {
          50: "#f4f5f3",
          200: "#c8cbc4",
          400: "#7c8274",
          600: "#33362f",
          800: "#191b16",
          900: "#0c0d0a", // hero / nav background
          950: "#050603",
        },
        ink: {
          50: "#f5f6f7",
          100: "#e7e9ec",
          300: "#b6bcc4",
          500: "#6b7480",
          700: "#3a4149",
          900: "#171b1f",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-jakarta)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      boxShadow: {
        panel: "0 12px 32px -12px rgba(10, 65, 47, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
