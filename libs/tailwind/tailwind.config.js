const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  corePlugins: {
    preflight: false,
  },
  prefix: "tw-", //Prefixes every tailwind class with tw- to prevent incompatibilities with existing css
  theme: {
    colors: {
      //UI colors
      "dark-purple": "#1B1B29",
      "medium-purple": "#38384A",
      "light-purple": "#4D4B67",
      "lighter-purple": "#928EBB",
      "light-purple-alt": '#7D7B9E',
      "dark-blue": "#1B1B29",
      "light-blue": "#56EAFF",

      //WA brand colors
      "brand-blue": "#14304C",
      "pop-blue": "#365DFF",
      "pop-green": "#04F17A",
      "pop-yellow": "#F9E81E",
      "pop-red": "#FF475a",
      grey: "#f6f6f6",
      dark: "#0F1F2D",
      green: "#94ff60",
      orange: "#FF9F45",

      gray: "#7b7b7b",

      //Useful adds
      white: "#FFFFFF",
      black: "#000000",
      transparent: "rgba(0,0,0,0)",
    },
    extend: {
      fontSize: {
        xxxs: [
          `${(0.50)}rem`,
          {
            lineHeight: `${(0.70)}rem`
          },
        ],
        xxs: [
          `${(0.65)}rem`,
          {
            lineHeight: `${(0.85)}rem`
          },
        ],
      },
      minHeight: {
        10: "2.5rem",
      },
      fontFamily: {
        sans: ["Roboto", defaultTheme.fontFamily.sans],
        condensed: ["Roboto Condensed", defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
