import { basename } from "path";
import fs from "fs";
import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { sveltePreprocess } from "svelte-preprocess";
import legacy from "@vitejs/plugin-legacy";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import Icons from "unplugin-icons/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";

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
            sourcemap: env.GENERATE_SOURCEMAP !== "false",
            outDir: "./dist/public",
            rollupOptions: {
                plugins: [mediapipe_workaround()],
                // external: ["@mediapipe/tasks-vision"],
                //plugins: [inject({ Buffer: ["buffer/", "Buffer"] })],
            },
            assetsInclude: ["**/*.tflite", "**/*.wasm"],
        },
        plugins: [
            nodePolyfills({
                include: ["events", "buffer"],
                globals: {
                    Buffer: true,
                },
            }),
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
            Icons({
                compiler: "svelte",
            }),
            // Conditional plugin inclusion
            ...(env.DISABLE_LEGACY_BROWSERS === "true"
                ? []
                : [
                      legacy({
                          //targets: ['defaults', 'not IE 11', 'iOS > 14.3']
                          // Structured clone is needed for Safari < 15.4
                          polyfills: ["web.structured-clone"],
                          modernPolyfills: ["web.structured-clone"],
                      }),
                  ]),
            tsconfigPaths(),
        ],
        resolve: {
            alias: {
                events: "events",
            },
        },
        test: {
            environment: "jsdom",
            globals: true,
            setupFiles: ["./tests/setup/vitest.setup.ts"],
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
                sourcemaps: {
                    assets: "./dist/public/**",
                },
                // Auth tokens can be obtained from https://sentry.io/settings/account/api/auth-tokens/
                // and needs the `project:releases` and `org:read` scopes
                authToken: env.SENTRY_AUTH_TOKEN,
                // Optionally uncomment the line below to override automatic release name detection
                release: {
                    name: env.SENTRY_RELEASE,
                    deploy: {
                        env: env.SENTRY_ENVIRONMENT,
                    },
                    finalize: true,
                },
            })
        );
    } else {
        console.info("Sentry plugin disabled");
    }
    return config;
});

// use to fix the build issue with mediapipe ==> https://github.com/tensorflow/tfjs/issues/7165
// TODO: remove this when we migrate to mediapipe/tasks-vision
function mediapipe_workaround() {
    return {
        name: "mediapipe_workaround",
        load(id: string) {
            if (basename(id) === "selfie_segmentation.js") {
                let code = fs.readFileSync(id, "utf-8");
                code += "exports.SelfieSegmentation = SelfieSegmentation;";
                return { code };
            } else {
                return null;
            }
        },
    };
}
