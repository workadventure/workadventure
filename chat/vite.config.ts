import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { envConfig } from "@geprog/vite-plugin-env-config";
import sveltePreprocess from "svelte-preprocess";
import pluginRewriteAll from "vite-plugin-rewrite-all";
import NodeGlobalsPolyfillPlugin from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import rollupNodePolyFill from "rollup-plugin-node-polyfills";

export default defineConfig({
    server: {
        port: 8080,
        hmr: {
            // workaround for development in docker
            clientPort: 80,
        },
    },
    base: "./",
    build: {
        sourcemap: true,
        rollupOptions: {
            plugins: [
                //@ts-ignore
                rollupNodePolyFill(),
            ],
        },
    },
    plugins: [
        svelte({
            preprocess: sveltePreprocess(),
            onwarn(warning, defaultHandler) {
                // don't warn on:
                if (warning.code === "a11y-click-events-have-key-events") return;
                if (warning.code === "security-anchor-rel-noreferrer") return;

                // handle all other warnings normally
                if (defaultHandler) {
                    defaultHandler(warning);
                }
            },
        }),
        envConfig({
            variables: [
                "ADMIN_API_URL",
                "PUSHER_URL",
                "FALLBACK_LOCALE",
                "UPLOADER_URL",
                "EMBEDLY_KEY",
                "ICON_URL",
                "ENABLE_OPENID",
                "ENABLE_CHAT_UPLOAD",
                "EJABBERD_WS_URI",
                "EJABBERD_DOMAIN",
            ],
        }),
        pluginRewriteAll(),
    ],
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: "globalThis",
            },
            plugins: [
                NodeGlobalsPolyfillPlugin({
                    process: true,
                    buffer: true,
                }),
                NodeModulesPolyfillPlugin(),
            ],
        },
    },
    resolve: {
        alias: [
            { find: "events", replacement: "rollup-plugin-node-polyfills/polyfills/events" },
            { find: "child_process", replacement: "rollup-plugin-node-polyfills" },
            { find: "path", replacement: "rollup-plugin-node-polyfills/polyfills/path" },
        ],
    },
});
