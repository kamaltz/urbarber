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
          50: "#F5F7F2",
          100: "#E8EDDF",
          500: "#718355",
          600: "#5F7047",
          700: "#4C5C38",
        },
      },
    },
  },
  plugins: [],
};