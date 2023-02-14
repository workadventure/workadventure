import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
import legacy from "@vitejs/plugin-legacy";

// https://vitejs.dev/config/
export default defineConfig({
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
        legacy({
            //targets: ['defaults', 'not IE 11', 'iOS > 14.3']

            // Structured clone is needed for Safari < 15.4
            polyfills: ["web.structured-clone"],
            modernPolyfills: ["web.structured-clone"],
        }),
    ],
});
