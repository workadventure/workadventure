const plugin = require("tailwindcss/plugin");
module.exports = {
  content: [
    "./src/**/*.{html,js,svelte,ts}"
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    containers: {
      'xxs': '320px',
      'xs': '448px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // OLD DEPRECATED COLORS
        //UI colors
        "dark-purple": "#1B1B29",
        "medium-purple": "#38384A",
        "light-purple": "#4D4B67",
        "lighter-purple": "#928EBB",
        "light-purple-alt": '#7D7B9E',
        "dark-blue": "#1B1B29",
        "light-blue": "#56EAFF",
        "brand-blue": "#14304C",
        "pop-blue": "#365DFF",
        "pop-green": "#04F17A",
        "pop-yellow": "#F9E81E",
        "pop-red": "#FF475a",
        grey: "#f6f6f6",
        dark: "#0F1F2D",


        // END OLD DEPRECATED COLORS
      },
      zIndex: {

      },
      minHeight: {
        10: "2.5rem",
      },
      scale: {
        '01': '0.1',
        140: "1.4",
      },
      keyframes: {
        shake: {
          '0%': { transform: 'rotate(0.0deg)' },
          '10%': { transform: 'rotate(14deg)' },
          '20%': { transform: 'rotate(-8deg)' },
          '30%': { transform: 'rotate(14deg)' },
          '40%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(10.0deg)' },
          '60%': { transform: 'rotate(0.0deg)' },
          '100%': { transform: 'rotate(0.0deg)' },
        },
        'pulse-bg': {
          '0%': { backgroundColor: 'var(--tw-gradient-from)' },
          '50%': { backgroundColor: 'var(--tw-gradient-to)' },
          '100%': { backgroundColor: 'var(--tw-gradient-from)' },
        },
      },
      animation: {
        'shake': 'shake 0.6s ease-in-out infinite',
        'pulse-bg': 'pulse-bg 3s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
    require("@tailwindcss/forms"),
    require("@workadventure/design-system"),
    plugin(function({ addVariant }) {
      // Mobile screens are typically small AND have a touch screen (coarse pointer)
      // See https://github.com/tailwindlabs/tailwindcss/discussions/2397
      // Note: if this is modified, don't forget to update the corresponding media query in the BreakpointUtils.ts file
      addVariant('mobile', '@media (((max-height: 960px) and (max-width: 480px)) or ((max-height: 480px) and (max-width: 960px))) and (pointer: coarse)');
      addVariant('picture-in-picture', '@media (display-mode: picture-in-picture)');
    })
  ],
  workadventureUi: {
    oswaldFontUrl: './fonts/Oswald.ttf',
  },

};
