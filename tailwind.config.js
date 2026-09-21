/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          500: "#0f6fde",
          600: "#0c5bb8",
          700: "#0a4890",
        },
        danger: "#dc2626",
        success: "#16a34a",
        warning: "#d97706",
      },
    },
  },
  plugins: [],
};
