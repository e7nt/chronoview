/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#FAFAF9",
          dark: "#1C1C1E",
        },
        border: {
          subtle: "#E7E5E4",
          "subtle-dark": "#2C2C2E",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
