import plugin from "tailwindcss/plugin";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      animation: {
        borderPulse: "borderPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        contentShow: "contentShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        hide: "hide 100ms ease-in",
        overlayShow: "overlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        slideIn: "slideIn 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        slideInFromTopLeft: "0.5s ease-out 0s 1 slideInFromTopLeft forwards",
        slideOut: "0.5s ease-in 0s 1 slideOutToTopLeft forwards",
        slideDownAndFade:
          "slideDownAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        slideLeftAndFade:
          "slideLeftAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        slideUpAndFade: "slideUpAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        slideRightAndFade:
          "slideRightAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        swipeOut: "swipeOut 100ms ease-out",
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
        handwriting: ["Caveat", "cursive"],
      },
      keyframes: {
        // borderPulse must include the color of the border
        borderPulse: {
          "0%, 100%": { borderColor: "rgba(252, 211, 77, 1)" },
          "50%": { borderColor: "rgba(252, 211, 77, 0.5)" },
        },
        contentShow: {
          from: { opacity: 0, transform: "translate(-50%, -48%) scale(0.96)" },
          to: { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
        },
        hide: {
          from: { opacity: 1 },
          to: { opacity: 0 },
        },
        overlayShow: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideIn: {
          from: {
            transform: "translateX(calc(100% + var(--viewport-padding)))",
          },
          to: { transform: "translateX(0)" },
        },
        slideInFromTopLeft: {
          "0%": { transform: "translate(-100%, -100%)" },
          "100%": { transform: "translate(0, 0)" },
        },
        slideOutToTopLeft: {
          "0%": { transform: "translate(0, 0)" },
          "100%": { transform: "translate(-100%, -100%)" },
        },
        slideDownAndFade: {
          from: { opacity: 0, transform: "translateY(-2px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        slideLeftAndFade: {
          from: { opacity: 0, transform: "translateX(2px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
        slideUpAndFade: {
          from: { opacity: 0, transform: "translateY(2px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        slideRightAndFade: {
          from: { opacity: 0, transform: "translateX(2px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
        swipeOut: {
          from: { transform: "translateX(var(--radix-toast-swipe-end-x))" },
          to: { transform: "translateX(calc(100% + var(--viewport-padding)))" },
        },
      },
      maxHeight: {
        "1/2": "50%",
      },
      minWidth: (theme) => ({
        48: theme("spacing.48"),
      }),
      spacing: {
        "1/6": "16.666667%",
      },
    },
  },
  plugins: [
    plugin(function ({ addBase }) {
      addBase({
        "@font-face": {
          "font-family": "Korinna-Agency",
          src: 'url("/fonts/Korinna-Agency.ttf.woff") format("woff"), url("/fonts/Korinna-Agency.ttf.eot") format("eot")',
          fontDisplay: "swap",
        },
      });
    }),
  ],
};
