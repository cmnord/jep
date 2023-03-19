const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      animation: {
        bouncein: "showSweetAlert 0.3s",
        slideIn: "0.5s ease-out 0s 1 slideInFromTopLeft forwards",
        slideOut: "0.5s ease-in 0s 1 slideOutToTopLeft forwards",
      },
      boxShadow: ({ theme }) => ({
        // x-offsey y-offset blur spread color
        "glow-green-200": "0 0 20px 5px " + theme("colors.green.200"),
        "glow-red-200": "0 0 20px 5px " + theme("colors.red.200"),
      }),
      borderWidth: {
        12: "12px",
      },
      backgroundColor: {
        "blue-1000": "#120081",
      },
      colors: {
        "blue-1000": "#120081",
        "yellow-1000": "#d69f4c",
      },
      fontFamily: {
        korinna: ["Korinna-Agency", "Times New Roman", "Times", "serif"],
        impact: ["Impact", "Times New Roman", "Times", "serif"],
      },
      keyframes: {
        showSweetAlert: {
          "0%": {
            "-webkit-transform": "scale(1)",
            transform: "scale(1)",
          },
          "1%": {
            "-webkit-transform": "scale(0.5)",
            transform: "scale(0.5)",
          },
          "45%": {
            "-webkit-transform": "scale(1.05)",
            transform: "scale(1.05)",
          },
          "80%": {
            "-webkit-transform": "scale(0.95)",
            transform: "scale(0.95)",
          },
          to: {
            "-webkit-transform": "scale(1)",
            transform: "scale(1)",
          },
        },
        slideInFromTopLeft: {
          "0%": { transform: "translate(-100%, -100%)" },
          "100%": { transform: "translate(0, 0)" },
        },
        slideOutToTopLeft: {
          "0%": { transform: "translate(0, 0)" },
          "100%": { transform: "translate(-100%, -100%)" },
        },
      },
      maxHeight: {
        "1/2": "50%",
      },
    },
  },
  plugins: [
    plugin(function ({ addBase }) {
      addBase({
        "@font-face": {
          "font-family": "Korinna-Agency",
          src: 'url("/fonts/Korinna-Agency.ttf.woff") format("woff"), url("/fonts/Korinna-Agency.ttf.eot") format("eot")',
        },
      });
    }),
  ],
};
