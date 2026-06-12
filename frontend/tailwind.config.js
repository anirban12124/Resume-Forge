/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "rgba(255, 255, 255, 0.1)",
        background: "#030712", // dark bg
        foreground: "#f9fafb",
        primary: {
          DEFAULT: "#6366f1", // indigo accent
          foreground: "#ffffff",
          hover: "#4f46e5",
        },
        secondary: {
          DEFAULT: "#1f2937",
          foreground: "#f3f4f6",
        },
        muted: {
          DEFAULT: "#374151",
          foreground: "#9ca3af",
        },
        accent: {
          DEFAULT: "#10b981", // emerald green
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "#111827", // slate-900
          foreground: "#f9fafb",
        },
      },
    },
  },
  plugins: [],
};
