const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/index.ts',
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './dist',
        host: '0.0.0.0',
        disableHostCheck: true,
        historyApiFallback: {
            rewrites: [
                { from: /^_\/.*$/, to: '/index.html' }
            ],
            disableDotRule: true
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
    },
    output: {
        filename: '[name].[contenthash].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/'
    },
    externals:[
        require('webpack-require-http')
    ],
    plugins: [
        new HtmlWebpackPlugin(
            {
                template: './dist/index.html'
            }
        ),
        new webpack.ProvidePlugin({
            Phaser: 'phaser'
        }),
        new webpack.EnvironmentPlugin([
          'API_URL', 'UPLOADER_URL', 'ADMIN_URL', 'MAPS_URL',
          'DEBUG_MODE', 'TURN_SERVER', 'TURN_USER', 'TURN_PASSWORD', 'JITSI_URL', 'JITSI_PRIVATE_MODE', 'START_ROOM_URL'
        ])
    ],

};
