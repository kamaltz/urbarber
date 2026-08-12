/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#363062",
          soft: "#8683A1",
          surface: "#EDEFFB",
          accent: "#D2691E",
          accentBright: "#F99417",
          text: "#111827",
          secondary: "#64748B",
          border: "#E5E7EB",
          icon: "#94A3B8",
          rating: "#FACC15",
        },
      },
    },
  },
  plugins: [],
};