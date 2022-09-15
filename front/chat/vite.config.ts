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
                "ADMIN_API_URL",
                "PUSHER_URL",
                "FALLBACK_LOCALE",
                "UPLOADER_URL",
                "EMBEDLY_KEY",
                "ICON_URL",
                "ENABLE_OPENID",
                "ENABLE_CHAT_UPLOAD"
            ],
        }),
        pluginRewriteAll(),
    ],
    define: {
        "global": {},
    },
});
