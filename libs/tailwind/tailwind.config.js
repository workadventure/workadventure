module.exports = {
  content: [
    "./src/**/*.{html,js,svelte,ts}"
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/forms"), require("@workadventure/design-system")],
};
