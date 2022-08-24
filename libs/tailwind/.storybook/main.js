const path = require('path');

module.exports = {
  "stories": [
    "../src/**/*.stories.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    {
      name: '@storybook/addon-postcss',
      options: {
        postcssLoaderOptions: {
          implementation: require('postcss'),
        },
      },
    },
  ],
  webpackFinal: config => {
    /**
     * Add *.scss support
     * @see https://nebulab.it/blog/nextjs-tailwind-storybook/
     */
    config.module.rules.push({
      test: /\.scss$/,
      use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader'],
    })

    // @see https://github.com/storybookjs/storybook/issues/11989#issuecomment-715524391
    config.resolve.alias = {
      ...config.resolve?.alias,
      '@': [path.resolve(__dirname, '../src/'), path.resolve(__dirname, '../')],
    }
    return config
  },
  "framework": "@storybook/html",
  "core": {
    "builder": "@storybook/builder-webpack5"
  }
}