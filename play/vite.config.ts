import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";

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
        }),
    ],
});
