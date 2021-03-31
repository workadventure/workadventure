const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: {
        'main': './src/index.ts',
        'iframe_api': './src/iframe_api.ts'
    },
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
            {
                test: /\.scss$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader?url=false', 'sass-loader'],
            },
        ],
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
    },
    output: {
        filename: (pathData) => {
            // Add a content hash only for the main bundle.
            // We want the iframe_api.js file to keep its name as it will be referenced from outside iframes.
            return pathData.chunk.name === 'main' ? 'js/[name].[contenthash].js': '[name].js';
        },
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/'
    },
    externals:[
        require('webpack-require-http')
    ],
    plugins: [
        new MiniCssExtractPlugin({filename: 'style.[contenthash].css'}),
        new HtmlWebpackPlugin(
            {
                template: './dist/index.tmpl.html.tmp',
                minify: {
                    collapseWhitespace: true,
                    keepClosingSlash: true,
                    removeComments: false,
                    removeRedundantAttributes: true,
                    removeScriptTypeAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    useShortDoctype: true
                },
                chunks: ['main']
            }
        ),
        new webpack.ProvidePlugin({
            Phaser: 'phaser'
        }),
        new webpack.EnvironmentPlugin([
            'API_URL',
            'PUSHER_URL',
            'UPLOADER_URL',
            'ADMIN_URL',
            'DEBUG_MODE',
            'STUN_SERVER',
            'TURN_SERVER',
            'TURN_USER',
            'TURN_PASSWORD',
            'JITSI_URL',
            'JITSI_PRIVATE_MODE',
            'START_ROOM_URL'
        ])
    ],

};
