import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import WindiCSS from "vite-plugin-windicss";
import path from "path";

export default defineConfig({
    resolve: {
        alias: {
            "~": `${path.resolve(__dirname, "src")}/`,
        },
    },
    plugins: [
        svelte(),
        WindiCSS(),
    ],
});
