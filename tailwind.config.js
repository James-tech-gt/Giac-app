/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")], // <--- Add ONLY this line
  theme: {
    extend: {},
  },
  plugins: [],
};
