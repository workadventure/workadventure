import type {Configuration} from "webpack";
import type WebpackDevServer from "webpack-dev-server";
import SveltePreprocess from 'svelte-preprocess';
import Autoprefixer from 'autoprefixer';

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")

const mode = process.env.NODE_ENV ?? 'development';
const isProduction = mode === 'production';
const isDevelopment = !isProduction;

module.exports = {
    entry: {
        'main': './src/index.ts',
        'iframe_api': './src/iframe_api.ts'
    },
    mode: mode,
    devtool: isDevelopment ? 'inline-source-map' : 'source-map',
    devServer: {
        contentBase: './dist',
        host: '0.0.0.0',
        sockPort: 80,
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
            {
                test: /\.(html|svelte)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'svelte-loader',
                    options: {
                        compilerOptions: {
                            // Dev mode must be enabled for HMR to work!
                            dev: isDevelopment
                        },
                        emitCss: isProduction,
                        hotReload: isDevelopment,
                        hotOptions: {
                            // List of options and defaults: https://www.npmjs.com/package/svelte-loader-hot#usage
                            noPreserveState: false,
                            optimistic: true,
                        },
                        preprocess: SveltePreprocess({
                            scss: true,
                            sass: true,
                            postcss: {
                                plugins: [
                                    Autoprefixer
                                ]
                            }
                        })
                    }
                }
            },

            // Required to prevent errors from Svelte on Webpack 5+, omit on Webpack 4
            // See: https://github.com/sveltejs/svelte-loader#usage
            {
                test: /node_modules\/svelte\/.*\.mjs$/,
                resolve: {
                    fullySpecified: false
                }
            },

        ],
    },
    resolve: {
        alias: {
            svelte: path.resolve('node_modules', 'svelte')
        },
        extensions: [ '.tsx', '.ts', '.js', '.svelte' ],
        mainFields: ['svelte', 'browser', 'module', 'main']
    },
    output: {
        filename: (pathData) => {
            // Add a content hash only for the main bundle.
            // We want the iframe_api.js file to keep its name as it will be referenced from outside iframes.
            return pathData.chunk?.name === 'main' ? 'js/[name].[contenthash].js': '[name].js';
        },
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/'
    },
    /*externals:[
        require('webpack-require-http')
    ],*/
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
        new NodePolyfillPlugin(),
        new webpack.EnvironmentPlugin({
            'API_URL': null,
            'SKIP_RENDER_OPTIMIZATIONS': false,
            'DISABLE_NOTIFICATIONS': false,
            'PUSHER_URL': undefined,
            'UPLOADER_URL': null,
            'ADMIN_URL': null,
            'DEBUG_MODE': null,
            'STUN_SERVER': null,
            'TURN_SERVER': null,
            'TURN_USER': null,
            'TURN_PASSWORD': null,
            'JITSI_URL': null,
            'JITSI_PRIVATE_MODE': null,
            'START_ROOM_URL': null,
            'MAX_USERNAME_LENGTH': 8,
            'MAX_PER_GROUP': 4
        })
    ],
    stats: {
        chunks: false,
        chunkModules: false,
        modules: false,
        assets: true,
        entrypoints: false,
        errorDetails: false
    }

} as Configuration & WebpackDevServer.Configuration;
