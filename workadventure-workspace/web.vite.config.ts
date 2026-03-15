import 'dotenv/config';
import { defineConfig } from "vite";
import { getMaps, getMapsOptimizers, getMapsScripts, LogLevel, OptimizeOptions } from "wa-map-optimizer-vite";
import {VitePluginNode} from "vite-plugin-node";

const maps = getMaps();

let optimizerOptions: OptimizeOptions = {
    logs: process.env.LOG_LEVEL && process.env.LOG_LEVEL in LogLevel ? LogLevel[process.env.LOG_LEVEL] : LogLevel.NORMAL,
};

if (process.env.TILESET_OPTIMIZATION && process.env.TILESET_OPTIMIZATION === "true") {
    const qualityMin = process.env.TILESET_OPTIMIZATION_QUALITY_MIN ? parseInt(process.env.TILESET_OPTIMIZATION_QUALITY_MIN) : 0.9;
    const qualityMax = process.env.TILESET_OPTIMIZATION_QUALITY_MAX ? parseInt(process.env.TILESET_OPTIMIZATION_QUALITY_MAX) : 1;

    optimizerOptions.output = {
        tileset: {
            compress: {
                quality: [qualityMin, qualityMax],
            }
        }
    }
}

export default defineConfig({
    base: "./",
    build: {
        sourcemap: true,
        rollupOptions: {
            input: {
                index: "./index.html",
                ...getMapsScripts(maps),
            },
        },
    },
    plugins: [
        ...getMapsOptimizers(maps, optimizerOptions),
        ...VitePluginNode({
            // Nodejs native Request adapter
            // currently this plugin support 'express', 'nest', 'koa' and 'fastify' out of box,
            // you can also pass a function if you are using other frameworks, see Custom Adapter section
            adapter: 'express',

            // tell the plugin where is your project entry
            appPath: './app/app.ts',

            // Optional, default: 'viteNodeApp'
            // the name of named export of you app from the appPath file
            exportName: 'viteNodeApp',

            // Optional, default: false
            // if you want to init your app on boot, set this to true
            initAppOnBoot: false,

            // Optional, default: false
            // if you want to reload your app on file changes, set this to true, rebounce delay is 500ms
            reloadAppOnFileChange: false,
        })
    ],
    server: {
        host: "127.0.0.1",
        port: 5173,
        strictPort: true,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization",
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
        open: "/",
        // Ensure Vite transforms TypeScript files when served directly
        middlewareMode: false,
    },
    // Ensure TypeScript files are transformed
    esbuild: {
        include: /\.tsx?$/,
    },
});
