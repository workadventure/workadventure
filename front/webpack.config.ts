import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import fs from 'fs/promises';
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import path from "path";
import sveltePreprocess from "svelte-preprocess";
import type { Configuration } from "webpack";
import webpack from "webpack";
import type WebpackDevServer from "webpack-dev-server";

const mode = process.env.NODE_ENV ?? "development";
const buildNpmTypingsForApi = !!process.env.BUILD_TYPINGS;
const isProduction = mode === "production";
const isDevelopment = !isProduction;

const entries: { [key: string]: string } = {};
if (!buildNpmTypingsForApi) {
    entries.main = "./src/index.ts";
}
entries.iframe_api = "./src/iframe_api.ts";

module.exports = {
    entry: entries,
    mode: mode,
    devtool: isDevelopment ? "inline-source-map" : "source-map",
    devServer: {
        contentBase: "./dist",
        host: "0.0.0.0",
        sockPort: 80,
        disableHostCheck: true,
        historyApiFallback: {
            rewrites: [{ from: /^_\/.*$/, to: "/index.html" }],
            disableDotRule: true,
        },
        liveReload: process.env.LIVE_RELOAD != "0" && process.env.LIVE_RELOAD != "false",
        before: (app) => {
            let appConfigContent = '';
            const TEMPLATE_PATH = path.join(__dirname, 'dist', 'env-config.template.js');

            function renderTemplateWithEnvVars(content: string): string {
                let result = content;
                const regex = /\$\{([a-zA-Z_]+[a-zA-Z0-9_]*?)\}/g;

                let matched: RegExpExecArray | null;
                while ((matched = regex.exec(content))) {
                  result = result.replace(`\${${matched[1]}}`, process.env[matched[1]] || '');
                }

                return result;
            }

            void (async () => {
              const content = (await fs.readFile(TEMPLATE_PATH)).toString();
              appConfigContent = renderTemplateWithEnvVars(content);
            })();

            app.get('/env-config.js', (_, response) => {
                response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                response.setHeader('Cache-Control', 'no-cache');
                response.setHeader('Content-Length', Buffer.byteLength(appConfigContent, 'utf8'));

                response.send(appConfigContent);
            });
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                //use: 'ts-loader',
                exclude: /node_modules/,
                loader: "ts-loader",
                options: {
                    transpileOnly: !buildNpmTypingsForApi,
                    compilerOptions: {
                        declaration: buildNpmTypingsForApi,
                    },
                },
            },
            {
                test: /\.(sc|c)ss$/,
                exclude: /node_modules/,
                use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
            },
            {
                test: /\.(html|svelte)$/,
                exclude: /node_modules/,
                use: {
                    loader: "svelte-loader",
                    options: {
                        compilerOptions: {
                            // Dev mode must be enabled for HMR to work!
                            dev: isDevelopment,
                        },
                        emitCss: isProduction,
                        hotReload: isDevelopment,
                        hotOptions: {
                            // List of options and defaults: https://www.npmjs.com/package/svelte-loader-hot#usage
                            noPreserveState: false,
                            optimistic: true,
                        },
                        preprocess: sveltePreprocess({
                            scss: true,
                            sass: true,
                        }),
                        onwarn: function (
                            warning: { code: string },
                            handleWarning: (warning: { code: string }) => void
                        ) {
                            // See https://github.com/sveltejs/svelte/issues/4946#issuecomment-662168782

                            if (warning.code === "a11y-no-onchange") {
                                return;
                            }
                            if (warning.code === "a11y-autofocus") {
                                return;
                            }
                            if (warning.code === "a11y-media-has-caption") {
                                return;
                            }

                            // process as usual
                            handleWarning(warning);
                        },
                    },
                },
            },

            // Required to prevent errors from Svelte on Webpack 5+, omit on Webpack 4
            // See: https://github.com/sveltejs/svelte-loader#usage
            {
                test: /node_modules\/svelte\/.*\.mjs$/,
                resolve: {
                    fullySpecified: false,
                },
            },
            {
                test: /\.(eot|svg|png|gif|jpg)$/,
                exclude: /node_modules/,
                type: "asset",
            },
            {
                test: /\.(woff(2)?|ttf)$/,
                type: "asset",
                generator: {
                    filename: "fonts/[name][ext]",
                },
            },
            {
                test: /\.json$/,
                exclude: /node_modules/,
                type: "asset",
            },
        ],
    },
    resolve: {
        alias: {
            svelte: path.resolve("node_modules", "svelte"),
        },
        extensions: [".tsx", ".ts", ".js", ".svelte"],
        mainFields: ["svelte", "browser", "module", "main"],
    },
    optimization: {
        minimize: isProduction,
        minimizer: [new CssMinimizerPlugin(), "..."],
    },
    output: {
        filename: (pathData) => {
            // Add a content hash only for the main bundle.
            // We want the iframe_api.js file to keep its name as it will be referenced from outside iframes.
            return pathData.chunk?.name === "main" ? "js/[name].[contenthash].js" : "[name].js";
        },
        path: path.resolve(__dirname, "dist"),
        publicPath: "/",
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new ForkTsCheckerWebpackPlugin({
            eslint: {
                files: "./src/**/*.ts",
            },
        }),
        new MiniCssExtractPlugin({ filename: "[name].[contenthash].css" }),
        new HtmlWebpackPlugin({
            template: "./dist/index.ejs",
            minify: {
                collapseWhitespace: true,
                keepClosingSlash: true,
                removeComments: false,
                removeRedundantAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
                useShortDoctype: true,
            },
            chunks: ["main"],
        }),
        new webpack.ProvidePlugin({
            Phaser: "phaser",
        }),
        new NodePolyfillPlugin(),
    ],
} as Configuration & WebpackDevServer.Configuration;
