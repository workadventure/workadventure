module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  corePlugins: {
    preflight: false
  },
  prefix: 'tw-',
  theme: {
    colors: {
      'darker': '#171723',
      'dark-blue': '#14304C',
      'light-purple': '#A8A7C9',
      'pop-blue': {
        500: '#365DFF',
        700: '#1f3fc5',
      },
      'pop-green': '#04F17A',
      'pop-yellow': '#F9E81E',
      'pop-red': '#FF475a',
      'grey': '#f6f6f6',
      'white': '#FFFFFF',
      'black': '#000000',
      'transparent': 'rgba(0,0,0,0)'
    },
    extend: {}
  },
  plugins: []
};