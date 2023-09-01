const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: [
    "./src/**/*.{html,js,svelte,ts}"
  ],
  corePlugins: {
    preflight: false,
  },
  prefix: "tw-", //Prefixes every tailwind class with tw- to prevent incompatibilities with existing css
  theme: {
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

        //WA brand colors
        "brand-blue": "#14304C",
        "pop-blue": "#365DFF",
        "pop-green": "#04F17A",
        "pop-yellow": "#F9E81E",
        "pop-red": "#FF475a",
        grey: "#f6f6f6",
        dark: "#0F1F2D",
        //green: "#94ff60",
        //orange: "#FF9F45",

        //gray: "#7b7b7b",


        // END OLD DEPRECATED COLORS

        'neutral': {
          100: '#FAFBFC',
          200: '#EFF0F2',
          300: '#DCDEE3',
          400: '#D6D8E0',
          500: '#AEB2BC',
          600: '#9499A5',
          DEFAULT: '#7F8493',
          800: '#6B7180',
          900: '#595E6A',
          1000: '#474B55',
          1100: '#363840',
          1200: '#24262B',
          1300: '#121315',
        },
        'contrast': {
          100: '#D4DEED',
          200: '#A9BDDB',
          300: '#779CD3',
          400: '#3C5E90',
          500: '#365481',
          600: '#2A4265',
          DEFAULT: '#1B2A41',
          800: '#1B2A41',
          900: '#0B1A31',
          1000: '#071224',
          1100: '#020E1E',
        },
        'primary': {
          100: '#8629FC',
          200: '#8629FC',
          300: '#8629FC',
          400: '#8629FC',
          500: '#8629FC',
          600: '#8629FC',
          DEFAULT: '#8629FC',
          800: '#8629FC',
          900: '#8629FC',
          1000: '#8629FC',
          1100: '#8629FC',
          1200: '#8629FC',
          1300: '#8629FC',
        },
        'secondary': {
          100: '#F2F4FD',
          200: '#D3D8F9',
          300: '#B9C0EE',
          400: '#939DDF',
          500: '#7583E3',
          600: '#5F71F5',
          DEFAULT: '#4156F6',
          800: '#3045E3',
          900: '#2738BE',
          1000: '#14249B',
          1100: '#091678',
        },
        'danger': {
          100: '#F9EEEE',
          200: '#F2DBDB',
          300: '#F4D5CB',
          400: '#FFBFB1',
          500: '#F39884',
          600: '#F98369',
          DEFAULT: '#E96D51',
          800: '#E55A5A',
          900: '#CC5050',
          1000: '#B24646',
          1100: '#993C3C',
          1200: '#7F3232',
        },
        'success': {
          100: '#DCFFE1',
          200: '#CEFBD5',
          300: '#A2F7AF',
          400: '#94EDA1',
          500: '#7BE78B',
          600: '#69E47B',
          DEFAULT: '#66E979',
          800: '#53DC67',
          900: '#46D45B',
          1000: '#42BC54',
          1100: '#45A553',
          1200: '#308B3D',
        },
        'warning': {
          100: '#FFFBED',
          200: '#FDF5D8',
          300: '#FDF0C1',
          400: '#FAE7A1',
          500: '#F6DC7C',
          600: '#EACE69',
          DEFAULT: '#E9C74C',
          800: '#D48538',
          900: '#BC7632',
          1000: '#A5672C',
          1100: '#8D5825',
          1200: '#764A1F'
        },
      },
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
        }
      },
      animation: {
        'shake': 'shake 0.6s ease-in-out infinite',
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
