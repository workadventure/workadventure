const merge = require('webpack-merge');
const common = require('./webpack.config.js');

module.exports = env => {
  console.log('FRONT_URL is: ' + env.FRONT_URL);
  return merge(common, {
      mode: 'production',
      devtool: 'source-map',
      devServer: {'public': env.FRONT_URL}
    });
};
