import { defineConfig } from "vite";

export default defineConfig({
    publicDir: false,
    build: {
        outDir: "public",
        emptyOutDir: false,
        sourcemap: true,
        lib: {
            entry: new URL("src/iframe_api.ts", import.meta.url).pathname,
            name: "iframe_api",
            formats: ["iife"],
            fileName: () => "iframe_api.js",
        },
    },
});
