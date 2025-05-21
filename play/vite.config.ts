import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
import legacy from "@vitejs/plugin-legacy";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import Icons from "unplugin-icons/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import NodeGlobalsPolyfillPlugin from "@esbuild-plugins/node-globals-polyfill";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), "");
    const config = {
        server: {
            host: "0.0.0.0",
            port: 8080,
            hmr: {
                // workaround for development in docker
                clientPort: 80,
            },
            watch: {
                ignored: ["./src/pusher"],
            },
        },
        build: {
            sourcemap: true,
            outDir: "./dist/public",
            rollupOptions: {
                plugins: [NodeGlobalsPolyfillPlugin({ buffer: true })],
                //plugins: [inject({ Buffer: ["buffer/", "Buffer"] })],
            },
        },
        plugins: [
            svelte({
                preprocess: sveltePreprocess(),
                onwarn(warning, defaultHandler) {
                    // don't warn on:
                    if (warning.code === "a11y-click-events-have-key-events") return;
                    if (warning.code === "security-anchor-rel-noreferrer") return;
                    if (warning.code === "Unknown at rule @container (css)") return;
                    if (warning.message.includes("Unknown at rule @container")) return;

                    // handle all other warnings normally
                    if (defaultHandler) {
                        defaultHandler(warning);
                    }
                },
            }),
            Icons({ compiler: "svelte" }),
            legacy({
                //targets: ['defaults', 'not IE 11', 'iOS > 14.3']

                // Structured clone is needed for Safari < 15.4
                polyfills: ["web.structured-clone"],
                modernPolyfills: ["web.structured-clone"],
            }),
            tsconfigPaths(),
        ],
        test: {
            environment: "jsdom",
            globals: true,
            coverage: {
                all: true,
                include: ["src/*.ts", "src/**/*.ts"],
                exclude: ["src/i18n", "src/enum"],
            },
        },
        optimizeDeps: {
            include: ["olm"],
            exclude: ["svelte-modals"],
            esbuildOptions: {
                define: {
                    global: "globalThis",
                },
            },
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
                include: "./dist/public",
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
