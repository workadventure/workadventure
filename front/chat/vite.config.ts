import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { envConfig } from "@geprog/vite-plugin-env-config";
import sveltePreprocess from "svelte-preprocess";
import pluginRewriteAll from "vite-plugin-rewrite-all";

export default defineConfig({
    server: {
        port: 8080,
        hmr: {
            // workaround for development in docker
            clientPort: 80,
        },
    },
    build: {
        sourcemap: true,
    },
    plugins: [
        svelte({
            preprocess: sveltePreprocess(),
        }),
        envConfig({
            variables: [
                "PUSHER_URL",
                "FALLBACK_LOCALE",
                "AWS_BUCKET",
                "AWS_ACCESS_KEY_ID",
                "AWS_SECRET_ACCESS_KEY",
                "AWS_DEFAULT_REGION",
                "AWS_ENDPOINT"
            ],
        }),
        pluginRewriteAll(),
    ],
    define: {
        "global": {},
    },
});
