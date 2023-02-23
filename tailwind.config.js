/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      boxShadow: ({ theme }) => ({
        // x-offsey y-offset blur spread color
        "glow-green-200": "0 0 20px 5px " + theme("colors.green.200"),
        "glow-red-200": "0 0 20px 5px " + theme("colors.red.200"),
      }),
    },
  },
  plugins: [],
}
