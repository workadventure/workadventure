import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import WindiCSS from "vite-plugin-windicss";
import { svelteSVG } from "rollup-plugin-svelte-svg";
import path from "path";
import { fileURLToPath, URL } from "url";

export default defineConfig({
    resolve: {
        alias: {
            "~": `${path.resolve(__dirname, "src")}/`,
        },
    },
    build: {
        rollupOptions: {
            input: {
                main: fileURLToPath(new URL('./index.html', import.meta.url)),
                overlay: fileURLToPath(new URL('./overlay.html', import.meta.url)),
            },
        },
    },
    plugins: [
        svelte(),
        svelteSVG({
            // optional SVGO options
            // pass empty object to enable defaults
            svgo: {},
            // vite-specific
            // https://vitejs.dev/guide/api-plugin.html#plugin-ordering
            // enforce: 'pre' | 'post'
            enforce: "pre",
        }),
        WindiCSS(),
    ],
});
