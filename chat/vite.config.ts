import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { envConfig } from "@geprog/vite-plugin-env-config";
import sveltePreprocess from "svelte-preprocess";
import pluginRewriteAll from "vite-plugin-rewrite-all";
import NodeGlobalsPolyfillPlugin from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import rollupNodePolyFill from "rollup-plugin-node-polyfills";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
// @ts-ignore
export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), "");

    const config = {
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
                plugins: [rollupNodePolyFill()],
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
                    "SENTRY_DSN",
                    "SENTRY_ENVIRONMENT",
                    "SENTRY_RELEASE",
                    "SENTRY_TRACES_SAMPLE_RATE",
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
    };

    if (env.SENTRY_ORG && env.SENTRY_PROJECT && env.SENTRY_AUTH_TOKEN && env.SENTRY_RELEASE && env.SENTRY_ENVIRONMENT) {
        console.info("Sentry plugin enabled");
        config.plugins.push(
            sentryVitePlugin({
                url: env.SENTRY_URL || "https://sentry.io/",
                org: env.SENTRY_ORG,
                project: env.SENTRY_PROJECT,
                // Specify the directory containing build artifacts
                include: "./dist",
                // Auth tokens can be obtained from https://sentry.io/settings/account/api/auth-tokens/
                // and needs the `project:releases` and `org:read` scopes
                authToken: env.SENTRY_AUTH_TOKEN,
                // Optionally uncomment the line below to override automatic release name detection
                release: env.SENTRY_RELEASE,
                deploy: {
                    env: env.SENTRY_ENVIRONMENT,
                },
                finalize: true,
                uploadSourceMaps: true,
            })
        );
    } else {
        console.info("Sentry plugin disabled");
    }
    return config;
});
